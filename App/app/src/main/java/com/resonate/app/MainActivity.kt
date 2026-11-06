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
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val RECORD_AUDIO_PERMISSION_REQUEST = 1001
    private val POST_NOTIF_PERMISSION_REQUEST = 1002
    private var pendingPermissionRequest: PermissionRequest? = null

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
                    val encoded = java.net.URLEncoder.encode(query, "UTF-8")
                    val url = URL("https://www.youtube.com/results?search_query=$encoded")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "GET"
                    conn.setRequestProperty(
                        "User-Agent",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                    )
                    conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9")
                    conn.connectTimeout = 7000
                    conn.readTimeout = 7000
                    val html = conn.inputStream.bufferedReader().use { it.readText() }
                    conn.disconnect()

                    val regex = Regex("ytInitialData\\s*=\\s*(\\{.+?\\});<\\/script>", RegexOption.DOT_MATCHES_ALL)
                    val match = regex.find(html) ?: Regex("var ytInitialData\\s*=\\s*(\\{.+?\\});").find(html)
                    if (match != null) {
                        match.groupValues[1]
                    } else {
                        "[]"
                    }
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

            nm.notify(NOTIFICATION_ID, notifBuilder.build())
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
            cacheMode = WebSettings.LOAD_NO_CACHE
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            useWideViewPort = true
            loadWithOverviewMode = true
            userAgentString = "$userAgentString ResonateNativeApp/1.0.0"
        }

        webView.clearCache(true)
        webView.addJavascriptInterface(AppNativeBridge(), "ResonateNative")
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

    // Keep music playing in background when app is minimized
    override fun onPause() {
        super.onPause()
        // DO NOT pause webView or webView timers here so background audio continues
    }

    override fun onStop() {
        super.onStop()
        // DO NOT stop webView here so background audio continues
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(mediaActionReceiver)
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
            webView.stopLoading()
            webView.destroy()
        } catch (_: Exception) {}

        super.onDestroy()
    }
}
