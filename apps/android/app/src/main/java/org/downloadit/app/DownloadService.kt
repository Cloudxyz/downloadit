package org.downloadit.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import java.util.concurrent.Executors

internal fun startQueue(context: Context) {
    context.startForegroundService(Intent(context,DownloadService::class.java))
}

class DownloadService: Service() {
    private val worker = Executors.newSingleThreadExecutor()
    @Volatile private var stopping = false
    private var running = false
    @Volatile private var latest = 0
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        latest = startId
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("downloads",getString(R.string.downloads),NotificationManager.IMPORTANCE_LOW))
        val link = PendingIntent.getActivity(this,0,Intent(this,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE)
        startForeground(1,Notification.Builder(this,"downloads").setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("Download IT").setContentText(getString(R.string.processing)).setContentIntent(link).setOngoing(true).build())
        Jobs.init(this)
        if (!running) drain()
        return START_NOT_STICKY
    }
    private fun drain() {
        running = true
        worker.execute {
            while (!stopping) {
                val job = Jobs.take() ?: break
                try { download(this,job) { stopping } }
                catch (e: Problem) { Jobs.fail(job.key,e.reason) }
                catch (_: java.io.IOException) { Jobs.fail(job.key,"network") }
                catch (_: Exception) { Jobs.fail(job.key,"unsupported") }
            }
            android.os.Handler(mainLooper).post {
                running = false
                if (!stopping && Jobs.snapshot().any { it.state == "queued" }) drain()
                else stopSelf(latest)
            }
        }
    }
    override fun onTimeout(startId: Int, fgsType: Int) { stopping = true; stopSelf() }
    override fun onDestroy() { stopping = true; worker.shutdownNow(); super.onDestroy() }
}
