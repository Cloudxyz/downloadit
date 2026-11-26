package org.downloadit.app

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

class MainActivity: ComponentActivity() {
    private val receiver by lazy { PeerServer(applicationContext) }
    override fun onStop() { receiver.close(); super.onStop() }
    private val notifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }
    private val es get() = resources.configuration.locales[0].language == "es"
    internal fun tr(en: String, sp: String) = if (es) sp else en
    private fun message(code: String) = when (code) {
        "network" -> tr("Check the connection and Wi-Fi preference.","Comprueba la conexión y la preferencia de Wi-Fi.")
        "storage" -> tr("Check available storage.","Comprueba el almacenamiento.")
        "duplicate" -> tr("This profile is already in history.","Este perfil ya está en el historial.")
        "limit" -> tr("Queue, file or retry limit reached.","Se alcanzó el límite de cola, archivo o intentos.")
        "unsupported" -> tr("A compatible public stream or verified converter is unavailable.","Falta una transmisión pública compatible o un conversor verificado.")
        "interrupted" -> tr("Interrupted. Retry when ready.","Interrumpido. Reintenta cuando puedas.")
        else -> tr("Check the YouTube link and folder name.","Comprueba el enlace y el nombre de carpeta.")
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)
        Jobs.init(this)
        val prefs = getSharedPreferences("options",0)
        val shared = if (intent.action == Intent.ACTION_SEND && intent.type == "text/plain")
            try { intent.getStringExtra(Intent.EXTRA_TEXT) ?: "" } catch (_: RuntimeException) { "" } else null
        val initialLink=shareLink(shared)
        setContent {
            MaterialTheme(colorScheme = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()) {
                Surface(Modifier.fillMaxSize()) {
                    var link by remember { mutableStateOf(initialLink) }
                    var folder by remember { mutableStateOf(prefs.getString("folder","DownloadIT") ?: "DownloadIT") }
                    var wifi by remember { mutableStateOf(prefs.getBoolean("wifi",true)) }
                    var height by remember { mutableIntStateOf(prefs.getInt("height",720)) }
                    var bitrate by remember { mutableIntStateOf(prefs.getInt("bitrate",192)) }
                    var artwork by remember { mutableStateOf(prefs.getBoolean("artwork",false)) }
                    var problem by remember { mutableStateOf(if(shared!=null&&initialLink.isEmpty())message("invalid") else "") }
                    var jobs by remember { mutableStateOf(Jobs.snapshot()) }
                    LaunchedEffect(Unit) { while (true) { jobs = Jobs.snapshot(); delay(700) } }
                    fun act(action: () -> Unit) {
                        try { action(); problem = ""; jobs = Jobs.snapshot() }
                        catch (e: Problem) { problem = message(e.reason) }
                        catch (_: Exception) { problem = message("interrupted") }
                    }
                    fun start() {
                        if (Build.VERSION.SDK_INT >= 33 && !prefs.getBoolean("notificationAsked",false)) {
                            prefs.edit().putBoolean("notificationAsked",true).apply()
                            notifications.launch(Manifest.permission.POST_NOTIFICATIONS)
                        }
                        startQueue(this@MainActivity)
                    }
                    Column(Modifier.safeDrawingPadding().verticalScroll(rememberScrollState()).padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Download IT",style=MaterialTheme.typography.headlineLarge)
                        OutlinedTextField(link,{ link = it.take(2048) },Modifier.fillMaxWidth(),singleLine=true,label={ Text(tr("YouTube link","Enlace de YouTube")) })
                        Text(tr("Download only media you are authorized to save.","Descarga solo contenido que tengas autorización para guardar."))
                        if(initialLink==link && shared?.startsWith("Download IT · MP3")==true)
                            Text(tr("Selected in Brave: MP3","Seleccionado en Brave: MP3"))
                        if(initialLink==link && shared?.startsWith("Download IT · MP4")==true)
                            Text(tr("Selected in Brave: MP4","Seleccionado en Brave: MP4"))
                        Text(tr("Video resolution","Resolución de video"))
                        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                            for (n in listOf(480,720,1080)) FilterChip(height == n,{ height=n; prefs.edit().putInt("height",n).apply() },{ Text(n.toString()+"p") })
                        }
                        Text(tr("Audio bitrate","Tasa de bits de audio"))
                        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                            for(n in listOf(128,192,320)) FilterChip(bitrate==n,{bitrate=n;prefs.edit().putInt("bitrate",n).apply()},{Text(n.toString()+" kbps")})
                        }
                        OutlinedTextField(folder,{ folder=it.take(32); if(Jobs.folderValid(folder)) prefs.edit().putString("folder",folder).apply() },
                            Modifier.fillMaxWidth(),singleLine=true,label={ Text(tr("Folder in Movies and Music","Carpeta en Movies y Music")) })
                        Row(verticalAlignment=Alignment.CenterVertically) {
                            Text(tr("Embed MP3 cover artwork","Incluir portada en MP3"),Modifier.weight(1f))
                            Switch(artwork,{artwork=it;prefs.edit().putBoolean("artwork",it).apply()})
                        }
                        Row(verticalAlignment=Alignment.CenterVertically) {
                            Text(tr("Wi-Fi only","Solo Wi-Fi"),Modifier.weight(1f))
                            Switch(wifi,{wifi=it; prefs.edit().putBoolean("wifi",it).apply()})
                        }
                        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                            Button(onClick={ act {
                                Jobs.add(sharedId(link) ?: throw Problem("invalid"),height,folder)
                                start()
                            } },enabled=sharedId(link)!=null && Jobs.folderValid(folder)) { Text(tr("Download MP4","Descargar MP4")) }
                            OutlinedButton(onClick={act {
                                Jobs.add(sharedId(link) ?: throw Problem("invalid"),bitrate,folder,"mp3",artwork);start()
                            }},enabled=sharedId(link)!=null && Jobs.folderValid(folder)) { Text(tr("Download MP3","Descargar MP3")) }
                        }
                        if(problem.isNotEmpty()) Text(problem,color=MaterialTheme.colorScheme.error)
                        Text(tr("Download history","Historial de descargas"),style=MaterialTheme.typography.titleLarge)
                        for(r in jobs.reversed()) {
                            HorizontalDivider()
                            val state = when(r.state) {
                                "done" -> tr("Completed","Completado")
                                "failed" -> message(r.error)
                                "running" -> r.progress.toString()+"%"
                                "queued" -> tr("Queued","En cola")
                                else -> tr("Cancelled","Cancelado")
                            }
                            Text(r.id+" · "+r.format.uppercase()+" "+r.height+(if(r.format=="mp3")" kbps" else "p")+" · "+state)
                            if(r.state == "running") LinearProgressIndicator(progress={r.progress/100f},modifier=Modifier.fillMaxWidth())
                            when(r.state) {
                                "queued","running" -> TextButton({act { Jobs.cancel(r.key) }}) {Text(tr("Cancel","Cancelar"))}
                                "cancelled","failed" -> TextButton({act { Jobs.retry(r.key); start() }},enabled=r.attempts<3) {Text(tr("Retry","Reintentar"))}
                            }
                        }
                        if(jobs.any { it.state=="queued" }) TextButton({act { start() }}) {Text(tr("Resume queue","Continuar cola"))}
                        TextButton({act { Jobs.clear() }}) { Text(tr("Clear finished history","Borrar historial finalizado")) }
                        Pairing(receiver)
                    }
                }
            }
        }
    }
}
