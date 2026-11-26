package org.downloadit.app

import android.content.ContentValues
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Environment
import android.os.StatFs
import android.provider.MediaStore
import okhttp3.Dns
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import org.json.JSONTokener
import java.io.ByteArrayOutputStream
import java.net.Inet4Address
import java.net.InetAddress
import java.net.Proxy
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

private fun publicV4(ip: InetAddress): Boolean {
    if (ip !is Inet4Address) return false
    val (a,b,c) = ip.address.map { it.toInt() and 255 }
    return !(a == 0 || a == 10 || a == 127 || a >= 224 || a == 100 && b in 64..127 ||
        a == 169 && b == 254 || a == 172 && b in 16..31 || a == 192 && (b in listOf(0,168) ||
        b == 88 && c == 99 || b == 31 && c == 196 || b == 52 && c == 193 || b == 175 && c == 48) ||
        a == 198 && (b in 18..19 || b == 51 && c == 100) || a == 203 && b == 0 && c == 113)
}
private fun cdn(host: String) = Regex("[a-z0-9-]+\\.googlevideo\\.com").matches(host)

// A missing declaration can be supplied by the other source. A malformed one cannot.
private fun declaredSize(value: String?): Long? {
    if(value==null)return null
    return value.takeIf { it.length in 1..15 && it.all { c -> c in '0'..'9' } }?.toLongOrNull()?.takeIf { it>=12 } ?: -1L
}

internal fun download(context: Context, task: Task, stopped: () -> Boolean) {
    val cm = context.getSystemService(ConnectivityManager::class.java)
    val wifi = context.getSharedPreferences("options",0).getBoolean("wifi",true)
    val network = cm.activeNetwork ?: throw Problem("network")
    if (wifi && cm.getNetworkCapabilities(network)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) != true) throw Problem("network")
    val client = OkHttpClient.Builder().socketFactory(network.socketFactory).dns(object: Dns {
        override fun lookup(hostname: String): List<InetAddress> {
            if (hostname != "www.youtube.com" && hostname!="i.ytimg.com" && !cdn(hostname)) throw UnknownHostException()
            val ips = network.getAllByName(hostname).filterIsInstance<Inet4Address>()
            if (ips.isEmpty() || !ips.all(::publicV4)) throw UnknownHostException()
            return ips
        }
    }).proxy(Proxy.NO_PROXY).followRedirects(false).followSslRedirects(false).retryOnConnectionFailure(false)
        .readTimeout(20,TimeUnit.SECONDS).callTimeout(5,TimeUnit.MINUTES).build()
    fun checkJob() { if (stopped()) throw Problem("interrupted"); Jobs.checkActive(task.key) }
    fun fetch(raw: String, watch: Boolean, cover: Boolean=false): okhttp3.Response {
        checkJob()
        if (raw.length > 8192) throw Problem("unsupported")
        val u = raw.toHttpUrl()
        if (!u.isHttps || u.port != 443 || u.username.isNotEmpty() || u.password.isNotEmpty() || u.fragment != null ||
            (if (cover) u.host!="i.ytimg.com" || u.encodedPath!="/vi/"+task.id+"/hqdefault.jpg" || u.query!=null
             else if (watch) u.host != "www.youtube.com" || u.encodedPath != "/watch" else !cdn(u.host) || u.encodedPath != "/videoplayback")) throw Problem("unsupported")
        val response = client.newCall(Request.Builder().url(u).header("Accept-Encoding","identity").build()).execute()
        if (response.code != 200 || (response.header("Content-Encoding") ?: "identity") != "identity") {
            response.close(); throw Problem("network")
        }
        return response
    }
    try {
        val page = fetch("https://www.youtube.com/watch?v="+task.id,true).use { response ->
            val input = response.body?.byteStream() ?: throw Problem("network")
            val bytes = ByteArrayOutputStream()
            val buf = ByteArray(16384)
            while (true) {
                checkJob(); val n = input.read(buf); if (n < 0) break
                if (bytes.size()+n > 4*1024*1024) throw Problem("limit")
                bytes.write(buf,0,n)
            }
            bytes.toString("UTF-8")
        }
        val marker = Regex("\\bvar ytInitialPlayerResponse\\s*=\\s*(?=\\{)").find(page) ?: throw Problem("unsupported")
        val start=marker.range.last+1
        val data = JSONTokener(page.substring(start,objectEnd(page,start))).nextValue() as? JSONObject ?: throw Problem("unsupported")
        val info = data.getJSONObject("videoDetails")
        if (data.getJSONObject("playabilityStatus").optString("status") != "OK" || info.optString("videoId") != task.id ||
            info.optBoolean("isPrivate",true) || info.optBoolean("isLiveContent",false)) throw Problem("unsupported")
        val audio = task.format == "mp3"
        val extended=context.getSharedPreferences("options",0).getBoolean("extendedLimits",false)
        val maxSeconds=if(audio) { if(extended) 900L*320/task.height else 900L } else if(extended) 7200L else 3600L
        val maxBytes=(if(audio) 16L else if(extended) 512L else 256L)*1024*1024
        if (info.optLong("lengthSeconds",-1) !in 1L..maxSeconds) throw Problem("limit")
        val formats = data.getJSONObject("streamingData").getJSONArray(if(audio)"adaptiveFormats" else "formats")
        val codec = Regex("""video/mp4; codecs="avc1[\w.]+,\s*mp4a[\w.]+"(?=$)""")
        val candidates = (0 until formats.length()).mapNotNull { formats.optJSONObject(it) }.filter {
            it.has("url") && !it.has("signatureCipher") && !it.has("cipher") && !it.has("drmFamilies") && !it.has("licenseInfos") &&
            (if(audio) it.optString("mimeType")=="audio/webm; codecs=\"opus\"" else
                it.optInt("height") in 1..task.height && codec.matches(it.optString("mimeType")))
        }
        if(candidates.isEmpty())throw Problem("unsupported")
        val best=candidates.filter { format ->
            val size=declaredSize(format.opt("contentLength")?.toString())
            size==null || size in 12..maxBytes
        }.maxByOrNull { it.optInt(if(audio)"bitrate" else "height") } ?: throw Problem("limit")
        val formatSize=declaredSize(best.opt("contentLength")?.toString())
        val artwork = if(audio && task.artwork) fetch("https://i.ytimg.com/vi/"+task.id+"/hqdefault.jpg",false,true).use { cover ->
            val body=cover.body ?: throw Problem("network")
            if(body.contentLength() !in 4L..262144L || body.contentType()?.let { it.type+"/"+it.subtype }!="image/jpeg")throw Problem("unsupported")
            val bytes=ByteArray(body.contentLength().toInt())
            java.io.DataInputStream(body.byteStream()).use { input -> input.readFully(bytes);if(input.read()!=-1)throw Problem("limit") }
            bytes
        } else null
        fetch(best.getString("url"),false).use { response ->
            val body = response.body ?: throw Problem("network")
            val headerSize=declaredSize(response.header("Content-Length"))
            if(headerSize!=null && formatSize!=null && headerSize!=formatSize)throw Problem("unsupported")
            val size=headerSize ?: formatSize ?: throw Problem("unsupported")
            if(size>maxBytes)throw Problem("limit")
            if (size<12L || body.contentType()?.let { it.type+"/"+it.subtype } !=
                (if(audio)"audio/webm" else "video/mp4")) throw Problem("unsupported")
            if (StatFs(Environment.getExternalStorageDirectory().path).availableBytes < size+67108864) throw Problem("storage")
            val title = info.optString("title").replace(Regex("[^\\p{L}\\p{N} _-]"),"").trim().take(80).ifEmpty { task.id }
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME,title+"-"+task.key.take(8)+"."+task.format)
                put(MediaStore.MediaColumns.MIME_TYPE,if(audio)"audio/mpeg" else "video/mp4")
                put(MediaStore.MediaColumns.RELATIVE_PATH,(if(audio) Environment.DIRECTORY_MUSIC else Environment.DIRECTORY_MOVIES)+"/"+task.folder+"/")
                put(MediaStore.MediaColumns.IS_PENDING,1)
            }
            val resolver = context.contentResolver
            val collection = if(audio) MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                else MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            val uri = resolver.insert(collection,values) ?: throw Problem("storage")
            var published = false
            try {
                Jobs.pending(task.key,uri)
                val input = java.io.DataInputStream(body.byteStream())
                resolver.openOutputStream(uri,"w")?.use { output ->
                    if(audio){
                        encodeAudio(context,input,size.toInt(),output,task.height,info.optString("title",task.id),
                            info.optString("author"),artwork,extended,::checkJob) { Jobs.progress(task.key,it) }
                        return@use
                    }
                    val header = ByteArray(12); input.readFully(header)
                    if (String(header,4,4,Charsets.US_ASCII) != "ftyp") throw Problem("unsupported")
                    output.write(header); var received = 12L; val buf = ByteArray(65536)
                    while (true) {
                        checkJob(); val n = input.read(buf); if (n < 0) break
                        received += n; if (received > size) throw Problem("limit")
                        output.write(buf,0,n); Jobs.progress(task.key,(received*99/size).toInt())
                    }
                    if (received != size) throw Problem("network")
                } ?: throw Problem("storage")
                Jobs.publish(task.key) {
                    check(resolver.update(uri,ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING,0) },null,null) == 1)
                    published = true
                }
            } finally {
                if (!published) {
                    if(resolver.delete(uri,MediaStore.MediaColumns.IS_PENDING+" = 1",null)!=1)throw Problem("storage")
                    Jobs.discarded(task.key,uri)
                }
            }
        }
    } finally { client.connectionPool.evictAll(); client.dispatcher.executorService.shutdown() }
}
