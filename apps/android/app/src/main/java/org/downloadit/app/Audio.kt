package org.downloadit.app

import android.content.Context
import android.os.SystemClock
import androidx.javascriptengine.IsolateStartupParameters
import androidx.javascriptengine.JavaScriptSandbox
import org.json.JSONObject
import java.io.InputStream
import java.io.OutputStream
import java.security.SecureRandom
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

internal fun encodeAudio(context: Context, input: InputStream, length: Int, output: OutputStream,
    rate: Int, title: String, artist: String, artwork: ByteArray?, extended: Boolean, checkJob: () -> Unit, progress: (Int) -> Unit) {
    if(length !in 12..16*1024*1024 || rate !in listOf(128,192,320) || !JavaScriptSandbox.isSupported()) throw Problem("unsupported")
    val bytes=ByteArray(length)
    var position=0
    while(position<length) {
        checkJob()
        val n=input.read(bytes,position,minOf(65536,length-position))
        if(n<=0)throw Problem("network")
        position+=n;progress(position*65/length)
    }
    if(input.read()!=-1)throw Problem("limit")
    val deadline=SystemClock.elapsedRealtime()+120000
    fun <T> await(f: Future<T>): T {
        while(SystemClock.elapsedRealtime()<deadline) {
            checkJob()
            try {return f.get(250,TimeUnit.MILLISECONDS)} catch(_:TimeoutException){}
        }
        throw Problem("limit")
    }
    JavaScriptSandbox.createConnectedInstanceAsync(context).get(10,TimeUnit.SECONDS).use { sandbox ->
        val features=listOf(JavaScriptSandbox.JS_FEATURE_WASM_COMPILATION,JavaScriptSandbox.JS_FEATURE_PROMISE_RETURN,
            JavaScriptSandbox.JS_FEATURE_PROVIDE_CONSUME_ARRAY_BUFFER,JavaScriptSandbox.JS_FEATURE_ISOLATE_MAX_HEAP_SIZE,
            JavaScriptSandbox.JS_FEATURE_ISOLATE_TERMINATION)
        if(!features.all(sandbox::isFeatureSupported))throw Problem("unsupported")
        val options=IsolateStartupParameters().apply {setMaxHeapSizeBytes(128L*1024*1024)}
        sandbox.createIsolate(options).use { isolate ->
            fun script(code: String) = await(isolate.evaluateJavaScriptAsync(code))
            val info=JSONObject().put("title",title.take(160)).put("artist",artist.take(160)).put("quality",rate).put("artwork",artwork!=null)
                .put("extended",extended)
            if(artwork!=null)isolate.provideNamedData("cover",artwork)
            isolate.provideNamedData("info",info.toString().toByteArray())
            isolate.provideNamedData("media",bytes)
            isolate.provideNamedData("entropy",ByteArray(65536).also(SecureRandom()::nextBytes))
            context.assets.open("av.wasm").use { isolate.provideNamedData("wasm",it.readBytes()) }
            fun asset(name: String) = context.assets.open(name).bufferedReader().use { it.readText() }
            script(asset("environment.js"))
            script(asset("factory.cjs"))
            script(asset("convert.js"))
            // Only constant package source enters the VM. Deliver all external values as byte arrays.
            val size=script(asset("encode.js")).toIntOrNull() ?: throw Problem("unsupported")
            if(size !in 128..37*1024*1024)throw Problem("limit")
            var written=0
            while(written<size){
                val hex=script("audioChunk()")
                if(hex.length !in 2..65536 || hex.length%2!=0)throw Problem("invalid")
                val chunk=ByteArray(hex.length/2){ i ->
                    ((hex[i*2].digitToInt(16) shl 4) or hex[i*2+1].digitToInt(16)).toByte()
                }
                if(written==0 && (chunk.size<3 || String(chunk,0,3,Charsets.US_ASCII)!="ID3"))throw Problem("unsupported")
                written+=chunk.size;if(written>size)throw Problem("limit")
                output.write(chunk);progress(75+written.toLong().times(24).div(size).toInt())
            }
        }
    }
}
