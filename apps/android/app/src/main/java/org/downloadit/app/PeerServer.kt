package org.downloadit.app

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.SystemClock
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.io.DataInputStream
import java.io.DataOutputStream
import java.net.Inet4Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Principal
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.security.spec.ECGenParameterSpec
import java.util.UUID
import javax.net.ssl.*

private val random = SecureRandom()
private fun token() = Base64.encodeToString(ByteArray(32).also(random::nextBytes),Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
private fun digest(value: String) = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.US_ASCII))
private fun privateIp(ip: InetAddress) = ip is Inet4Address && ip.isSiteLocalAddress
private fun JSONObject.keysAre(vararg names: String) = length()==names.size && names.all(::has)
private fun JSONObject.str(name: String) = get(name) as? String ?: throw Problem("invalid")
private fun JSONObject.version() = opt("v") is Int && getInt("v")==1

internal class PeerServer(private val context: Context) {
    private val clients = context.getSharedPreferences("peer-verifiers",0)
    private val alias = "DownloadIT.receiver.v1"
    @Volatile private var server: SSLServerSocket? = null
    @Volatile private var active: SSLSocket? = null
    private var challenge = ""
    private var deadline = 0L
    @Volatile var ip = ""; private set
    fun identities() = clients.all.keys.sorted()
    @Synchronized fun revoke(id: String) { check(clients.edit().remove(id).commit()) }
    private fun identity(): KeyStore {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (!store.containsAlias(alias)) {
            val generator = KeyPairGenerator.getInstance("EC","AndroidKeyStore")
            generator.initialize(KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY)
                .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1")).setDigests(KeyProperties.DIGEST_SHA256,KeyProperties.DIGEST_SHA384,KeyProperties.DIGEST_SHA512).build())
            generator.generateKeyPair()
        }
        return store
    }
    @Synchronized fun start() {
        if(server!=null)return
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val network = cm.activeNetwork ?: throw Problem("network")
        if(cm.getNetworkCapabilities(network)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)!=true) throw Problem("network")
        val local = cm.getLinkProperties(network)?.linkAddresses?.firstOrNull { privateIp(it.address) }?.address ?: throw Problem("network")
        val store = identity()
        val keys = object: X509ExtendedKeyManager() {
            override fun getPrivateKey(name: String?) = if(name==alias) store.getKey(alias,null) as java.security.PrivateKey else null
            override fun getCertificateChain(name: String?) = if(name==alias) arrayOf(store.getCertificate(alias) as X509Certificate) else null
            override fun getServerAliases(type: String?,issuers: Array<out Principal>?) = if(type=="EC") arrayOf(alias) else null
            override fun chooseServerAlias(type: String?,issuers: Array<out Principal>?,socket: Socket?) = if(type=="EC") alias else null
            override fun getClientAliases(type: String?,issuers: Array<out Principal>?): Array<String>? = null
            override fun chooseClientAlias(types: Array<out String>?,issuers: Array<out Principal>?,socket: Socket?): String? = null
        }
        val tls = SSLContext.getInstance("TLSv1.3").apply { init(arrayOf(keys),null,random) }
        val listener = tls.serverSocketFactory.createServerSocket() as SSLServerSocket
        try {
            listener.enabledProtocols=arrayOf("TLSv1.3")
            listener.bind(InetSocketAddress(local,42189),2)
            ip=local.hostAddress ?: throw Problem("network")
            server=listener
        } catch(e:Exception){listener.close();throw e}
        Thread({
            while(!listener.isClosed) {
                try {
                    val socket=listener.accept() as SSLSocket
                    socket.use {
                        active=it
                        if(server!==listener || !privateIp(it.inetAddress) || cm.activeNetwork!=network) return@use
                        it.soTimeout=3500
                        it.startHandshake()
                        serve(it,listener)
                    }
                } catch(_:Exception) { /* A failed handshake or frame ends this connection. */ }
                finally { active=null }
            }
        },"DownloadIT-peer").apply {isDaemon=true;start()}
    }
    @Synchronized fun code(): String {
        check(server!=null && clients.all.size<8)
        challenge=token(); deadline=SystemClock.elapsedRealtime()+90000
        val cert=identity().getCertificate(alias).encoded
        return JSONObject().put("v",1).put("ip",ip).put("cert",Base64.encodeToString(cert,Base64.NO_WRAP)).put("challenge",challenge).toString()
    }
    @Synchronized fun close() {
        challenge="";deadline=0;server?.close();server=null;active?.close();ip=""
    }
    private fun serve(socket: SSLSocket,listener: SSLServerSocket) {
        val out=DataOutputStream(socket.outputStream)
        fun send(json: JSONObject) {
            val bytes=json.toString().toByteArray();require(bytes.size<=32768)
            out.writeInt(bytes.size);out.write(bytes);out.flush()
        }
        val nonce=token()
        send(JSONObject().put("nonce",nonce))
        val input=DataInputStream(socket.inputStream)
        val size=input.readInt();require(size in 2..4096)
        val bytes=ByteArray(size);input.readFully(bytes)
        val msg=JSONObject(bytes.toString(Charsets.UTF_8))
        require(msg.version() && msg.str("nonce")==nonce)
        val response=synchronized(this) {
            require(server===listener)
            when(msg.str("op")) {
                "pair" -> {
                    require(msg.keysAre("v","op","nonce","challenge") && challenge.isNotEmpty() &&
                        SystemClock.elapsedRealtime()<deadline && clients.all.size<8 &&
                        MessageDigest.isEqual(digest(msg.str("challenge")),digest(challenge)))
                    challenge="";deadline=0
                    val id=UUID.randomUUID().toString();val credential=token()
                    check(clients.edit().putString(id,Base64.encodeToString(digest(credential),Base64.NO_WRAP)).commit())
                    JSONObject().put("id",id).put("token",credential)
                }
                "job" -> {
                    require(msg.keysAre("v","op","nonce","id","token","request"))
                    val id=msg.str("id")
                    val verifier=clients.getString(id,null) ?: throw Problem("unavailable")
                    require(MessageDigest.isEqual(Base64.decode(verifier,Base64.NO_WRAP),digest(msg.str("token"))))
                    val req=msg.getJSONObject("request")
                    require(req.version() && req.str("target")==id)
                    try { command(req); JSONObject().put("ok",true).put("jobs",Jobs.wire()) }
                    catch(e:Problem){JSONObject().put("ok",false).put("error",e.reason)}
                }
                else -> throw Problem("invalid")
            }
        }
        send(response)
    }
    private fun command(req: JSONObject) {
        when(req.str("op")) {
            "list","clear" -> {require(req.keysAre("op","v","target"));if(req.str("op")=="clear")Jobs.clear()}
            "submit" -> {
                require(req.keysAre("op","v","target","id","format","quality"))
                val height=req.get("quality") as? Int ?: throw Problem("invalid")
                val folder=context.getSharedPreferences("options",0).getString("folder","DownloadIT") ?: "DownloadIT"
                Jobs.add(req.str("id"),height,folder,req.str("format"));startQueue(context)
            }
            "cancel","retry" -> {
                require(req.keysAre("op","v","target","job"));val id=req.str("job")
                require(UUID.fromString(id).toString()==id)
                if(req.str("op")=="retry"){Jobs.retry(id);startQueue(context)}else Jobs.cancel(id)
            }
            else -> throw Problem("invalid")
        }
    }
}
