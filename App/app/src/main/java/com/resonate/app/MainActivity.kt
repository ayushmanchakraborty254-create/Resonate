package com.resonate.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val RECORD_AUDIO_PERMISSION_REQUEST = 1001
    private val POST_NOTIF_PERMISSION_REQUEST = 1002
    private var pendingPermissionRequest: PermissionRequest? = null

    companion object {
        var activeMediaSession: MediaSession? = null
        var activeMediaNotification: Notification? = null
    }

    private var mediaSession: MediaSession? = null
    private val NOTIFICATION_ID = 777
    private val CHANNEL_ID = "resonate_playback_channel"

    private var cachedArtworkUrl: String = ""
    private var cachedArtworkBitmap: Bitmap? = null

    // Broadcast receiver for hardware/notification media actions
    private val mediaActionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                "com.resonate.app.ACTION_PLAY" -> dispatchRemote("play")
                "com.resonate.app.ACTION_PAUSE" -> dispatchRemote("pause")
                "com.resonate.app.ACTION_NEXT" -> dispatchRemote("next")
                "com.resonate.app.ACTION_PREV" -> dispatchRemote("prev")
            }
        }
    }

    private fun dispatchRemote(action: String, param: Double? = null) {
        runOnUiThread {
            if (::webView.isInitialized) {
                val script = if (param != null) {
                    "window.resonateRemoteControl && window.resonateRemoteControl('$action', $param);"
                } else {
                    "window.resonateRemoteControl && window.resonateRemoteControl('$action');"
                }
                webView.evaluateJavascript(script, null)
            }
        }
    }

    inner class AppNativeBridge {
        @android.webkit.JavascriptInterface
        fun isNative(): Boolean = true

        @android.webkit.JavascriptInterface
        fun openExternalUrl(url: String) {
            try {
                val uri = Uri.parse(url)
                val intent = Intent(Intent.ACTION_VIEW, uri)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                val chooser = Intent.createChooser(intent, "Download Resonate Update")
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                this@MainActivity.startActivity(chooser)
            } catch (_: Exception) {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    this@MainActivity.startActivity(intent)
                } catch (_: Exception) {}
            }
        }

        @android.webkit.JavascriptInterface
        fun searchYouTubeNative(query: String): String {
            return try {
                val future = Executors.newSingleThreadExecutor().submit(java.util.concurrent.Callable {
                    // 1. YouTube InnerTube ANDROID Client endpoint (Zero CORS, zero auth/cookies required, pristine JSON response)
                    try {
                        val androidUrl = URL("https://www.youtube.com/youtubei/v1/search")
                        val aConn = androidUrl.openConnection() as HttpURLConnection
                        aConn.requestMethod = "POST"
                        aConn.setRequestProperty("Content-Type", "application/json")
                        aConn.setRequestProperty("User-Agent", "com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip")
                        aConn.connectTimeout = 5000
                        aConn.readTimeout = 5000
                        aConn.doOutput = true

                        val body = """{"context":{"client":{"clientName":"ANDROID","clientVersion":"19.09.37","hl":"en","gl":"US"}},"query":${org.json.JSONObject.quote(query)}}"""
                        aConn.outputStream.use { os ->
                            os.write(body.toByteArray(Charsets.UTF_8))
                        }

                        if (aConn.responseCode in 200..299) {
                            val resp = aConn.inputStream.bufferedReader().use { it.readText() }
                            aConn.disconnect()
                            if (resp.isNotBlank() && resp.length > 50) {
                                return@Callable resp
                            }
                        } else {
                            aConn.disconnect()
                        }
                    } catch (_: Exception) {}

                    // 2. Fallback to YouTube Music InnerTube endpoint
                    try {
                        val itUrl = URL("https://music.youtube.com/youtubei/v1/search")
                        val itConn = itUrl.openConnection() as HttpURLConnection
                        itConn.requestMethod = "POST"
                        itConn.setRequestProperty("Content-Type", "application/json")
                        itConn.setRequestProperty(
                            "User-Agent",
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                        )
                        itConn.setRequestProperty("Origin", "https://music.youtube.com")
                        itConn.setRequestProperty("Referer", "https://music.youtube.com/")
                        itConn.connectTimeout = 5000
                        itConn.readTimeout = 5000
                        itConn.doOutput = true

                        val body = """{"context":{"client":{"clientName":"WEB_REMIX","clientVersion":"1.20240318.01.00","hl":"en","gl":"US"}},"query":${org.json.JSONObject.quote(query)}}"""
                        itConn.outputStream.use { os ->
                            os.write(body.toByteArray(Charsets.UTF_8))
                        }

                        if (itConn.responseCode in 200..299) {
                            val resp = itConn.inputStream.bufferedReader().use { it.readText() }
                            itConn.disconnect()
                            if (resp.isNotBlank() && resp.length > 50) {
                                return@Callable resp
                            }
                        } else {
                            itConn.disconnect()
                        }
                    } catch (_: Exception) {}

                    // 3. Fallback to scraping YouTube HTML with linear brace extraction
                    try {
                        val encoded = java.net.URLEncoder.encode(query, "UTF-8")
                        val url = URL("https://www.youtube.com/results?search_query=$encoded")
                        val conn = url.openConnection() as HttpURLConnection
                        conn.requestMethod = "GET"
                        conn.setRequestProperty(
                            "User-Agent",
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                        )
                        conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9")
                        conn.connectTimeout = 5000
                        conn.readTimeout = 5000
                        val html = conn.inputStream.bufferedReader().use { it.readText() }
                        conn.disconnect()

                        val startIdx = html.indexOf("ytInitialData")
                        if (startIdx != -1) {
                            val firstBrace = html.indexOf('{', startIdx)
                            if (firstBrace != -1) {
                                var depth = 0
                                var endIdx = -1
                                var inString = false
                                var escape = false
                                for (i in firstBrace until html.length) {
                                    val c = html[i]
                                    if (escape) { escape = false; continue }
                                    if (c == '\\') { escape = true; continue }
                                    if (c == '"') { inString = !inString; continue }
                                    if (!inString) {
                                        if (c == '{') depth++
                                        else if (c == '}') {
                                            depth--
                                            if (depth == 0) {
                                                endIdx = i + 1
                                                break
                                            }
                                        }
                                    }
                                }
                                if (endIdx != -1) {
                                    return@Callable html.substring(firstBrace, endIdx)
                                }
                            }
                        }
                    } catch (_: Exception) {}

                    "[]"
                })
                future.get(8, java.util.concurrent.TimeUnit.SECONDS)
            } catch (e: Exception) {
                "[]"
            }
        }

        @android.webkit.JavascriptInterface
        fun updateMediaNotification(
            title: String,
            artist: String,
            album: String,
            artworkUrl: String,
            isPlaying: Boolean,
            duration: Double,
            position: Double
        ) {
            Executors.newSingleThreadExecutor().execute {
                var art = cachedArtworkBitmap
                if (artworkUrl.isNotEmpty() && artworkUrl != cachedArtworkUrl) {
                    try {
                        val url = URL(artworkUrl)
                        val conn = url.openConnection() as HttpURLConnection
                        conn.connectTimeout = 3000
                        conn.readTimeout = 3000
                        conn.doInput = true
                        conn.connect()
                        art = BitmapFactory.decodeStream(conn.inputStream)
                        cachedArtworkUrl = artworkUrl
                        cachedArtworkBitmap = art
                    } catch (_: Exception) {}
                }

                runOnUiThread {
                    syncMediaSessionAndNotification(title, artist, album, art, isPlaying, duration, position)
                }
            }
        }

        // ==========================================
        // Media3 Native Playback Engine Bridge (Phase 1 & 2)
        // ==========================================

        private fun isTrustedOrigin(): Boolean {
            val currentUrl = webView.url ?: return false
            return currentUrl.startsWith("https://resonate.app")
        }

        private fun isValidAuthorizedStreamUrl(streamUrl: String): Boolean {
            return try {
                val uri = Uri.parse(streamUrl)
                val scheme = uri.scheme?.lowercase() ?: return false
                if (scheme != "https" && scheme != "android.resource") return false

                val host = uri.host?.lowercase() ?: return false
                // Reject loopback or private networks
                if (host == "localhost" || host == "127.0.0.1" || host.startsWith("192.168.") ||
                    host.startsWith("10.") || host.startsWith("172.16.") || host.endsWith(".local")
                ) {
                    return false
                }
                true
            } catch (_: Exception) {
                false
            }
        }

        @android.webkit.JavascriptInterface
        fun runNativeAudioSelfTest(): String {
            return try {
                if (!isTrustedOrigin()) {
                    return org.json.JSONObject().apply {
                        put("success", false)
                        put("error", "Unauthorized origin: ${webView.url}")
                    }.toString()
                }

                val serviceIntent = Intent(this@MainActivity, MediaPlaybackService::class.java).apply {
                    action = MediaPlaybackService.ACTION_PLAY_TEST
                }
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        this@MainActivity.startForegroundService(serviceIntent)
                    } else {
                        this@MainActivity.startService(serviceIntent)
                    }
                } catch (e: Exception) {
                    android.util.Log.e("MainActivity", "startForegroundService failed: ${e.message}", e)
                }

                // If service instance is already alive, dispatch on MainLooper immediately
                runOnUiThread {
                    MediaPlaybackService.instance?.playTestStream()
                }

                org.json.JSONObject().apply {
                    put("success", true)
                    put("track", MediaPlaybackService.TEST_TRACK_TITLE)
                    put("artist", MediaPlaybackService.TEST_TRACK_ARTIST)
                    put("streamUrl", MediaPlaybackService.AUTHORIZED_TEST_STREAM_URL)
                    put("engine", "AndroidX Media3 ExoPlayer")
                }.toString()
            } catch (e: Throwable) {
                android.util.Log.e("MainActivity", "runNativeAudioSelfTest error", e)
                org.json.JSONObject().apply {
                    put("success", false)
                    put("error", "${e.javaClass.simpleName}: ${e.message}")
                }.toString()
            }
        }

        @android.webkit.JavascriptInterface
        fun getNativePlaybackStatus(): String {
            return try {
                if (!isTrustedOrigin()) return """{"error":"Unauthorized origin"}"""
                val snapshot = MediaPlaybackService.instance?.getPlaybackSnapshot()
                if (snapshot != null) {
                    org.json.JSONObject().apply {
                        put("isPlaying", snapshot.isPlaying)
                        put("positionMs", snapshot.currentPositionMs)
                        put("durationMs", snapshot.durationMs)
                        put("bufferedPositionMs", snapshot.bufferedPositionMs)
                        put("trackId", snapshot.currentTrackId)
                        put("playbackState", snapshot.playbackState)
                        put("isTestStream", snapshot.isTestStream)
                    }.toString()
                } else {
                    """{"isPlaying":false,"status":"service_inactive"}"""
                }
            } catch (e: Throwable) {
                """{"isPlaying":false,"error":"${e.message}"}"""
            }
        }

        @android.webkit.JavascriptInterface
        fun playTrackNative(
            trackId: String,
            title: String,
            artist: String,
            album: String,
            artworkUrl: String,
            streamUrl: String,
            canCache: Boolean
        ): Boolean {
            return try {
                if (!isTrustedOrigin()) return false
                if (!isValidAuthorizedStreamUrl(streamUrl)) return false

                val serviceIntent = Intent(this@MainActivity, MediaPlaybackService::class.java).apply {
                    action = MediaPlaybackService.ACTION_PLAY_AUTHORIZED
                    putExtra(MediaPlaybackService.EXTRA_TRACK_ID, trackId)
                    putExtra(MediaPlaybackService.EXTRA_TITLE, title)
                    putExtra(MediaPlaybackService.EXTRA_ARTIST, artist)
                    putExtra(MediaPlaybackService.EXTRA_ALBUM, album)
                    putExtra(MediaPlaybackService.EXTRA_ARTWORK_URL, artworkUrl)
                    putExtra(MediaPlaybackService.EXTRA_STREAM_URL, streamUrl)
                    putExtra(MediaPlaybackService.EXTRA_CAN_CACHE, canCache)
                }
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        this@MainActivity.startForegroundService(serviceIntent)
                    } else {
                        this@MainActivity.startService(serviceIntent)
                    }
                } catch (e: Exception) {
                    android.util.Log.e("MainActivity", "startForegroundService failed: ${e.message}", e)
                }

                runOnUiThread {
                    MediaPlaybackService.instance?.playAuthorizedTrack(
                        trackId = trackId,
                        title = title,
                        artist = artist,
                        album = album,
                        artworkUrl = artworkUrl,
                        streamUrl = streamUrl,
                        clientCanCache = canCache
                    )
                }
                true
            } catch (e: Throwable) {
                false
            }
        }

        @android.webkit.JavascriptInterface
        fun pauseNative() {
            try {
                if (!isTrustedOrigin()) return
                val serviceIntent = Intent(this@MainActivity, MediaPlaybackService::class.java).apply {
                    action = MediaPlaybackService.ACTION_PAUSE
                }
                startService(serviceIntent)
                runOnUiThread {
                    MediaPlaybackService.instance?.pause()
                }
            } catch (_: Exception) {}
        }

        @android.webkit.JavascriptInterface
        fun resumeNative() {
            try {
                if (!isTrustedOrigin()) return
                val serviceIntent = Intent(this@MainActivity, MediaPlaybackService::class.java).apply {
                    action = MediaPlaybackService.ACTION_RESUME
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
                runOnUiThread {
                    MediaPlaybackService.instance?.resume()
                }
            } catch (_: Exception) {}
        }

        @android.webkit.JavascriptInterface
        fun seekNative(positionSeconds: Double) {
            try {
                if (!isTrustedOrigin()) return
                runOnUiThread {
                    MediaPlaybackService.instance?.seekTo((positionSeconds * 1000).toLong())
                }
            } catch (_: Exception) {}
        }

        @android.webkit.JavascriptInterface
        fun areNotificationsEnabled(): Boolean {
            return androidx.core.app.NotificationManagerCompat.from(this@MainActivity).areNotificationsEnabled()
        }

        @android.webkit.JavascriptInterface
        fun requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                runOnUiThread {
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                        POST_NOTIF_PERMISSION_REQUEST
                    )
                }
            }
        }
    }

    private fun syncMediaSessionAndNotification(
        title: String,
        artist: String,
        album: String,
        artBitmap: Bitmap?,
        isPlaying: Boolean,
        duration: Double,
        position: Double
    ) {
        val session = mediaSession ?: return

        try {
            // 1. Update MediaSession PlaybackState
            val stateBuilder = PlaybackState.Builder()
                .setActions(
                    PlaybackState.ACTION_PLAY or
                    PlaybackState.ACTION_PAUSE or
                    PlaybackState.ACTION_PLAY_PAUSE or
                    PlaybackState.ACTION_SKIP_TO_NEXT or
                    PlaybackState.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackState.ACTION_SEEK_TO or
                    PlaybackState.ACTION_STOP
                )
                .setState(
                    if (isPlaying) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,
                    (position * 1000).toLong(),
                    1.0f
                )
            session.setPlaybackState(stateBuilder.build())

            // 2. Update MediaSession Metadata
            val metaBuilder = MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, album.ifEmpty { "Resonate" })
                .putLong(MediaMetadata.METADATA_KEY_DURATION, (duration * 1000).toLong())

            if (artBitmap != null) {
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, artBitmap)
                metaBuilder.putBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON, artBitmap)
            }
            session.setMetadata(metaBuilder.build())
            session.isActive = true

            // 3. Post System Notification for Media Controls
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val contentIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val contentPending = PendingIntent.getActivity(
                this, 0, contentIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val prevIntent = Intent("com.resonate.app.ACTION_PREV").setPackage(packageName)
            val prevPending = PendingIntent.getBroadcast(
                this, 1, prevIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val toggleIntent = Intent(if (isPlaying) "com.resonate.app.ACTION_PAUSE" else "com.resonate.app.ACTION_PLAY").setPackage(packageName)
            val togglePending = PendingIntent.getBroadcast(
                this, 2, toggleIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val nextIntent = Intent("com.resonate.app.ACTION_NEXT").setPackage(packageName)
            val nextPending = PendingIntent.getBroadcast(
                this, 3, nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notifBuilder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, CHANNEL_ID)
            } else {
                Notification.Builder(this)
            }

            val mediaStyle = Notification.MediaStyle()
                .setMediaSession(session.sessionToken)
                .setShowActionsInCompactView(0, 1, 2)

            notifBuilder.setStyle(mediaStyle)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(artist)
                .setSubText(album.ifEmpty { "Resonate" })
                .setContentIntent(contentPending)
                .setOngoing(isPlaying)
                .setVisibility(Notification.VISIBILITY_PUBLIC)

            if (artBitmap != null) {
                notifBuilder.setLargeIcon(artBitmap)
            }

            notifBuilder.addAction(
                Notification.Action.Builder(
                    android.R.drawable.ic_media_previous,
                    "Previous",
                    prevPending
                ).build()
            )

            notifBuilder.addAction(
                Notification.Action.Builder(
                    if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play,
                    if (isPlaying) "Pause" else "Play",
                    togglePending
                ).build()
            )

            notifBuilder.addAction(
                Notification.Action.Builder(
                    android.R.drawable.ic_media_next,
                    "Next",
                    nextPending
                ).build()
            )

            val notif = notifBuilder.build()
            activeMediaNotification = notif
            nm.notify(NOTIFICATION_ID, notif)

            // Start Android Foreground Media Service to guarantee continuous background audio
            try {
                val serviceIntent = Intent(this@MainActivity, MediaPlaybackService::class.java).apply {
                    putExtra("title", title)
                    putExtra("artist", artist)
                    putExtra("isPlaying", isPlaying)
                }
                if (isPlaying) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent)
                    } else {
                        startService(serviceIntent)
                    }
                }
            } catch (_: Exception) {}
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Initialize Notification Channel for background media playback
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Resonate Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows mini player notification in drawer"
                setShowBadge(false)
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }

        // Request POST_NOTIFICATIONS on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    POST_NOTIF_PERMISSION_REQUEST
                )
            }
        }

        // 2. Initialize MediaSession for system media controls
        mediaSession = MediaSession(this, "Resonate").apply {
            setCallback(object : MediaSession.Callback() {
                override fun onPlay() {
                    dispatchRemote("play")
                }

                override fun onPause() {
                    dispatchRemote("pause")
                }

                override fun onSkipToNext() {
                    dispatchRemote("next")
                }

                override fun onSkipToPrevious() {
                    dispatchRemote("prev")
                }

                override fun onSeekTo(pos: Long) {
                    dispatchRemote("seek", pos / 1000.0)
                }

                override fun onStop() {
                    dispatchRemote("pause")
                }
            })
        }
        activeMediaSession = mediaSession

        // Register BroadcastReceiver for media button actions
        val filter = IntentFilter().apply {
            addAction("com.resonate.app.ACTION_PLAY")
            addAction("com.resonate.app.ACTION_PAUSE")
            addAction("com.resonate.app.ACTION_NEXT")
            addAction("com.resonate.app.ACTION_PREV")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(mediaActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(mediaActionReceiver, filter)
        }

        // 3. Initialize FrameLayout container and WebView
        val rootLayout = FrameLayout(this)
        rootLayout.setBackgroundColor(Color.parseColor("#0a0a0a"))

        webView = WebView(this)
        rootLayout.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        setContentView(rootLayout)

        // 4. Safe Window Insets and dark theme styling (adapts to 3-button nav and gesture nav)
        try {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.statusBarColor = Color.parseColor("#0a0a0a")
            window.navigationBarColor = Color.parseColor("#0a0a0a")

            val insetsController = WindowCompat.getInsetsController(window, window.decorView)
            insetsController.isAppearanceLightStatusBars = false
            insetsController.isAppearanceLightNavigationBars = false

            ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { _, windowInsets ->
                val insets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
                )
                val lp = webView.layoutParams as? FrameLayout.LayoutParams ?: FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
                if (lp.topMargin != insets.top || lp.bottomMargin != insets.bottom ||
                    lp.leftMargin != insets.left || lp.rightMargin != insets.right
                ) {
                    lp.setMargins(insets.left, insets.top, insets.right, insets.bottom)
                    webView.layoutParams = lp
                }
                windowInsets
            }
            ViewCompat.requestApplyInsets(rootLayout)
        } catch (_: Exception) {}

        // 5. Configure AssetLoader for loading bundled web app assets securely
        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("resonate.app")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
            userAgentString = "$userAgentString ResonateNativeApp/1.0.0"
        }

        webView.addJavascriptInterface(AppNativeBridge(), "ResonateNative")

        // Enhanced Bridge Security (Requirement 1):
        // Prefer WebViewCompat.addWebMessageListener with explicit trusted origin allowlist
        // Chromium enforces this at the C++ process level, preventing cross-origin framing/injection attacks
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            val allowedOrigins = setOf("https://resonate.app")
            try {
                WebViewCompat.addWebMessageListener(
                    webView,
                    "ResonateNativeSecure",
                    allowedOrigins
                ) { _, message, _, _, replyProxy ->
                    try {
                        val raw = message.data ?: return@addWebMessageListener
                        val json = org.json.JSONObject(raw)
                        val action = json.optString("action")
                        when (action) {
                            "runSelfTest" -> {
                                val serviceIntent = Intent(this@MainActivity, MediaPlaybackService::class.java).apply {
                                    this.action = MediaPlaybackService.ACTION_PLAY_TEST
                                }
                                try {
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                        this@MainActivity.startForegroundService(serviceIntent)
                                    } else {
                                        this@MainActivity.startService(serviceIntent)
                                    }
                                } catch (e: Exception) {
                                    android.util.Log.e("MainActivity", "startForegroundService failed: ${e.message}", e)
                                }
                                runOnUiThread {
                                    MediaPlaybackService.instance?.playTestStream()
                                }
                                val resp = org.json.JSONObject().apply {
                                    put("success", true)
                                    put("track", MediaPlaybackService.TEST_TRACK_TITLE)
                                    put("artist", MediaPlaybackService.TEST_TRACK_ARTIST)
                                    put("streamUrl", MediaPlaybackService.AUTHORIZED_TEST_STREAM_URL)
                                    put("engine", "AndroidX Media3 ExoPlayer")
                                }
                                replyProxy.postMessage(resp.toString())
                            }
                            "getStatus" -> {
                                val snapshot = MediaPlaybackService.instance?.getPlaybackSnapshot()
                                val resp = if (snapshot != null) {
                                    org.json.JSONObject().apply {
                                        put("isPlaying", snapshot.isPlaying)
                                        put("positionMs", snapshot.currentPositionMs)
                                        put("durationMs", snapshot.durationMs)
                                        put("bufferedPositionMs", snapshot.bufferedPositionMs)
                                        put("trackId", snapshot.currentTrackId)
                                        put("playbackState", snapshot.playbackState)
                                        put("isTestStream", snapshot.isTestStream)
                                    }
                                } else {
                                    org.json.JSONObject().apply {
                                        put("isPlaying", false)
                                        put("status", "service_inactive")
                                    }
                                }
                                replyProxy.postMessage(resp.toString())
                            }
                            "pause" -> {
                                MediaPlaybackService.instance?.pause()
                                replyProxy.postMessage("""{"status":"paused"}""")
                            }
                            "resume" -> {
                                MediaPlaybackService.instance?.resume()
                                replyProxy.postMessage("""{"status":"resumed"}""")
                            }
                            "seek" -> {
                                val posSec = json.optDouble("positionSeconds", 0.0)
                                MediaPlaybackService.instance?.seekTo((posSec * 1000).toLong())
                                replyProxy.postMessage("""{"status":"seeked"}""")
                            }
                        }
                    } catch (_: Exception) {}
                }
            } catch (_: Exception) {}
        }
        webView.setBackgroundColor(Color.parseColor("#0a0a0a"))

        webView.setDownloadListener { url, _, _, _, _ ->
            try {
                val uri = Uri.parse(url)
                val intent = Intent(Intent.ACTION_VIEW, uri)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                this@MainActivity.startActivity(intent)
            } catch (_: Exception) {}
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Metrolist-Style Uninterrupted Background Audio:
                // Spoof Page Visibility API so WebView never pauses media or YouTube iframes when minimized
                view?.evaluateJavascript(
                    """
                    (function() {
                        try {
                            Object.defineProperty(document, 'hidden', { get: function() { return false; }, configurable: true });
                            Object.defineProperty(document, 'visibilityState', { get: function() { return 'visible'; }, configurable: true });
                            window.addEventListener('visibilitychange', function(e) { e.stopImmediatePropagation(); }, true);
                        } catch(e) {}
                    })();
                    """.trimIndent(), null
                )
            }

            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                request?.url?.let { uri ->
                    val assetResponse = assetLoader.shouldInterceptRequest(uri)
                    if (assetResponse != null) return assetResponse
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                if (!url.startsWith("https://resonate.app")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        this@MainActivity.startActivity(intent)
                        return true
                    } catch (_: Exception) {}
                }
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.let { permRequest ->
                    val hasAudio = permRequest.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                    if (hasAudio) {
                        if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED
                        ) {
                            permRequest.grant(permRequest.resources)
                        } else {
                            pendingPermissionRequest = permRequest
                            ActivityCompat.requestPermissions(
                                this@MainActivity,
                                arrayOf(Manifest.permission.RECORD_AUDIO),
                                RECORD_AUDIO_PERMISSION_REQUEST
                            )
                        }
                    } else {
                        permRequest.grant(permRequest.resources)
                    }
                }
            }
        }

        // Back navigation dispatcher
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // Load bundled web app dist via secure local domain
        webView.loadUrl("https://resonate.app/assets/dist/index.html")
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == RECORD_AUDIO_PERMISSION_REQUEST) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingPermissionRequest?.grant(pendingPermissionRequest?.resources)
            } else {
                pendingPermissionRequest?.deny()
            }
            pendingPermissionRequest = null
        }
    }

    // Keep music player state cleanly synced across window focus and minimize/restore events
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        try {
            if (::webView.isInitialized) {
                if (hasFocus) {
                    webView.onResume()
                    webView.resumeTimers()
                    dispatchRemote("appResumed")
                }
            }
        } catch (_: Exception) {}
    }

    override fun onResume() {
        super.onResume()
        try {
            if (::webView.isInitialized) {
                webView.onResume()
                webView.resumeTimers()
                dispatchRemote("appResumed")
            }
        } catch (_: Exception) {}
    }

    override fun onPause() {
        super.onPause()
        // Do NOT call webView.onPause() while minimized.
        // webView.onPause() explicitly stops HTML5 media playback and timer loops in Chromium!
        // Leaving the WebView active in background allows MediaPlaybackService (foreground service
        // with PARTIAL_WAKE_LOCK) to continue playing audio seamlessly without getting killed or paused.
    }

    override fun onStop() {
        super.onStop()
        // Maintain active background execution for audio streaming
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(mediaActionReceiver)
        } catch (_: Exception) {}

        try {
            stopService(Intent(this, MediaPlaybackService::class.java))
        } catch (_: Exception) {}

        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(NOTIFICATION_ID)
        } catch (_: Exception) {}

        try {
            mediaSession?.isActive = false
            mediaSession?.release()
            mediaSession = null
        } catch (_: Exception) {}

        try {
            webView.onPause()
            webView.pauseTimers()
            webView.stopLoading()
            webView.destroy()
        } catch (_: Exception) {}

        super.onDestroy()
    }
}
