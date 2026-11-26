package org.downloadit.app

import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

internal val videoIdPattern = Regex("[A-Za-z0-9_-]{11}")
internal fun sharedId(text: String?): String? {
    if (text == null || text.length > 2048 || text.any { it <= ' ' || it == '\\' }) return null
    val u = Uri.parse(text)
    if (u.scheme != "https" || u.userInfo != null || u.port !in listOf(-1, 443)) return null
    val id = when (u.host) {
        "youtu.be" -> u.encodedPath?.removePrefix("/")
        "www.youtube.com", "youtube.com", "m.youtube.com", "music.youtube.com" ->
            if (u.path == "/watch") u.getQueryParameters("v").singleOrNull()
            else Regex("/shorts/([A-Za-z0-9_-]{11})/?").matchEntire(u.encodedPath ?: "")?.groupValues?.get(1)
        else -> null
    }
    return id?.takeIf { videoIdPattern.matches(it) }
}

internal data class Task(val key: String, val id: String, val height: Int, var state: String = "queued",
    var attempts: Int = 1, var error: String = "", var progress: Int = 0, var uri: String = "", val folder: String = "DownloadIT",
    val format: String = "mp4", val artwork: Boolean = false)

internal fun validProfile(format: String, quality: Int) = when(format) {
    "mp3" -> quality in listOf(128,192,320)
    "mp4" -> quality in listOf(480,720,1080)
    else -> false
}

internal class Problem(val reason: String): Exception()
internal object Jobs {
    private lateinit var app: Context
    private val rows = mutableListOf<Task>()
    private val prefs get() = app.getSharedPreferences("queue", Context.MODE_PRIVATE)

    @Synchronized fun init(context: Context) {
        if (::app.isInitialized) return
        app = context.applicationContext
        val array = JSONArray(prefs.getString("items", "[]"))
        require(array.length() <= 64)
        repeat(array.length()) { index ->
            val obj = array.getJSONArray(index)
            val row = Task(obj.getString(0), obj.getString(1), obj.getInt(2), obj.getString(3),
                obj.getInt(4), obj.getString(5), obj.getInt(6), obj.getString(7), obj.getString(8),obj.optString(9,"mp4"),obj.optBoolean(10,false))
            require(UUID.fromString(row.key).toString() == row.key && videoIdPattern.matches(row.id) &&
                validProfile(row.format,row.height) && row.attempts in 1..3 && folderValid(row.folder))
            if (row.state == "running" || row.uri.isNotEmpty()) {
                if(row.state=="running"){row.state = "failed"; row.error = "interrupted"}
                if (row.uri.isNotEmpty()) {
                    val uri = Uri.parse(row.uri)
                    require(uri.scheme == "content" && uri.authority == MediaStore.AUTHORITY)
                    app.contentResolver.query(uri, arrayOf(MediaStore.MediaColumns.IS_PENDING), null,null,null)?.use {
                        if (it.moveToFirst()) {
                            if (it.getInt(0) == 1) app.contentResolver.delete(uri,null,null)
                            else { row.state = "done"; row.progress = 100; row.error = "" }
                        }
                    }
                    row.uri = ""
                }
            }
            rows.add(row)
        }
        save()
    }
    fun folderValid(name: String) = Regex("[A-Za-z0-9_-]{1,32}").matches(name)
    private fun save() {
        val all = JSONArray()
        for (r in rows) all.put(JSONArray(listOf(r.key,r.id,r.height,r.state,r.attempts,r.error,r.progress,r.uri,r.folder,r.format,r.artwork)))
        check(prefs.edit().putString("items",all.toString()).commit())
    }
    @Synchronized fun snapshot() = rows.map { it.copy() }
    @Synchronized fun add(id: String, height: Int, folder: String, format: String = "mp4", artwork: Boolean=false): Task {
        if (!videoIdPattern.matches(id) || !validProfile(format,height) || !folderValid(folder)) throw Problem("invalid")
        if (artwork && format!="mp3")throw Problem("invalid")
        if (rows.any { it.id == id && it.height == height && it.format==format && it.artwork==artwork }) throw Problem("duplicate")
        if (rows.size >= 64) throw Problem("limit")
        val row = Task(UUID.randomUUID().toString(),id,height,folder=folder,format=format,artwork=artwork)
        rows.add(row); save(); return row.copy()
    }
    @Synchronized fun retry(key: String) {
        val row = rows.singleOrNull { it.key == key } ?: throw Problem("invalid")
        if (row.state !in listOf("failed","cancelled") || row.attempts >= 3) throw Problem("limit")
        row.attempts++; row.error = ""; row.progress = 0; row.state = "queued"; save()
    }
    @Synchronized fun take(): Task? {
        val row = rows.firstOrNull { it.state == "queued" } ?: return null
        row.state = "running"; save(); return row.copy()
    }
    @Synchronized fun checkActive(key: String) {
        if (rows.none { it.key == key && it.state == "running" }) throw Problem("cancelled")
    }
    @Synchronized fun pending(key: String, uri: Uri) {
        checkActive(key); rows.single { it.key == key }.uri = uri.toString(); save()
    }
    @Synchronized fun progress(key: String, value: Int) { rows.find { it.key == key }?.progress = value }
    @Synchronized fun publish(key: String, action: () -> Unit) {
        checkActive(key); action()
        rows.single { it.key == key }.apply { state = "done"; progress = 100; uri = "" }; save()
    }
    @Synchronized fun fail(key: String, reason: String) {
        rows.find { it.key == key && it.state == "running" }?.apply { state = "failed"; error = reason; uri = "" }; save()
    }
    @Synchronized fun cancel(key: String) {
        rows.find { it.key == key && it.state in listOf("queued","running") }?.state = "cancelled"; save()
    }
    @Synchronized fun clear() { rows.removeAll { it.state !in listOf("queued","running") }; save() }
    fun wire(): JSONArray = JSONArray().apply { for (r in snapshot()) put(JSONObject()
        .put("job",r.key).put("id",r.id).put("quality",r.height).put("format",r.format).put("state",r.state)
        .put("progress",r.progress).put("error",r.error.ifEmpty { null } ?: JSONObject.NULL)) }
}
