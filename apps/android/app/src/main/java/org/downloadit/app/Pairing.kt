package org.downloadit.app

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.delay

@Composable internal fun MainActivity.Pairing(receiver: PeerServer) {
    var enabled by remember { mutableStateOf(false) }
    var code by remember { mutableStateOf<Bitmap?>(null) }
    var error by remember { mutableStateOf(false) }
    var peers by remember { mutableStateOf(receiver.identities()) }
    LaunchedEffect(code) { if (code!=null) { delay(90000);code=null } }
    LaunchedEffect(Unit) { while(true) {
        val current=receiver.identities()
        if(current.size>peers.size)code=null
        peers=current
        if(receiver.ip.isEmpty()){enabled=false;code=null}
        delay(800)
    } }
    HorizontalDivider()
    Text(tr("Paired computers","Equipos vinculados"),style=MaterialTheme.typography.titleLarge)
    Text(if(enabled) receiver.ip else tr("Receiver offline","Receptor desconectado"))
    Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
        OutlinedButton({
            try { if(enabled){receiver.close();code=null}else receiver.start();enabled=receiver.ip.isNotEmpty();error=false }
            catch(_:Exception){error=true}
        }) {Text(if(enabled)tr("Disconnect","Desconectar") else tr("Connect on Wi-Fi","Conectar por Wi-Fi"))}
    }
    if(enabled && peers.size<8) TextButton({
        try{
            val matrix=QRCodeWriter().encode(receiver.code(),BarcodeFormat.QR_CODE,640,640)
            val pixels=IntArray(640*640){ i -> if(matrix[i%640,i/640]) android.graphics.Color.BLACK else android.graphics.Color.WHITE }
            code=Bitmap.createBitmap(pixels,640,640,Bitmap.Config.ARGB_8888);error=false
        }catch(_:Exception){error=true}
    }){Text(tr("Authorize one computer","Autorizar un equipo"))}
    code?.let{ Image(it.asImageBitmap(),tr("One-time pairing QR, valid for 90 seconds","QR de vinculación válido por 90 segundos"),Modifier.fillMaxWidth().heightIn(max=420.dp)) }
    if(error)Text(tr("Private Wi-Fi or secure identity unavailable.","Wi-Fi privado o identidad segura no disponible."))
    for(id in peers)TextButton({receiver.revoke(id);peers=receiver.identities()}){Text(tr("Revoke PC ","Revocar equipo ")+id.take(8))}
}
