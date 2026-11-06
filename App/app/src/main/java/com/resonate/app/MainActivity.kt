package com.resonate.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Color
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

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val RECORD_AUDIO_PERMISSION_REQUEST = 1001
    private var pendingPermissionRequest: PermissionRequest? = null

    inner class AppNativeBridge {
        @android.webkit.JavascriptInterface
        fun isNative(): Boolean = true

        @android.webkit.JavascriptInterface
        fun openExternalUrl(url: String) {
            try {
                val uri = android.net.Uri.parse(url)
                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, uri)
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                val chooser = android.content.Intent.createChooser(intent, "Download Resonate Update")
                chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                this@MainActivity.startActivity(chooser)
            } catch (_: Exception) {
                try {
                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                    this@MainActivity.startActivity(intent)
                } catch (_: Exception) {}
            }
        }

        @android.webkit.JavascriptInterface
        fun searchYouTubeNative(query: String): String {
            return try {
                val future = java.util.concurrent.Executors.newSingleThreadExecutor().submit(java.util.concurrent.Callable {
                    val encoded = java.net.URLEncoder.encode(query, "UTF-8")
                    val url = java.net.URL("https://www.youtube.com/results?search_query=$encoded")
                    val conn = url.openConnection() as java.net.HttpURLConnection
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
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Initialize FrameLayout container and WebView
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

        // 2. Safe Window Insets and dark theme styling (adapts to 3-button nav and gesture nav)
        try {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.statusBarColor = Color.parseColor("#0a0a0a")
            window.navigationBarColor = Color.parseColor("#0a0a0a")

            val insetsController = WindowCompat.getInsetsController(window, window.decorView)
            insetsController.isAppearanceLightStatusBars = false
            insetsController.isAppearanceLightNavigationBars = false

            // Automatically inset the WebView margins so system status bar (clock/notch) and 3-button/gesture navigation bar NEVER overlap web content
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
        } catch (_: Exception) {
            // Graceful fallback for OEM-specific insets controllers
        }

        // 3. Configure AssetLoader for loading bundled web app assets securely
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

        // Clear stale WebView cache to ensure newly compiled assets load immediately
        webView.clearCache(true)

        // Inject Native App detection bridge
        webView.addJavascriptInterface(AppNativeBridge(), "ResonateNative")

        webView.setBackgroundColor(Color.parseColor("#0a0a0a"))

        // Route any file download or APK download link to external browser / download manager
        webView.setDownloadListener { url, _, _, _, _ ->
            try {
                val uri = android.net.Uri.parse(url)
                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, uri)
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
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
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
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
                            // Only prompt when user explicitly taps mic/recognizer, and Android saves their choice
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

        // 4. Back navigation dispatcher
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // 5. Load bundled web app dist via secure local domain (bypasses all file:// restrictions)
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

    override fun onDestroy() {
        try {
            webView.stopLoading()
            webView.destroy()
        } catch (_: Exception) {}
        super.onDestroy()
    }
}
