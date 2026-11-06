package com.resonate.app.playback

import android.content.Context
import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import java.io.File

/**
 * Native Media3 Cache Manager (Metrolist-Inspired Architecture, Clean-Room Implementation)
 *
 * Enforces native caching permissions and manages an LRU disk cache for authorized audio streams.
 * Adheres strictly to terms of service and content copyright policies.
 */
@OptIn(UnstableApi::class)
object NativeCacheManager {

    private const val MAX_CACHE_SIZE_BYTES = 250 * 1024 * 1024L // 250 MB
    private const val CACHE_DIR_NAME = "resonate_media3_cache"

    @Volatile
    private var simpleCache: SimpleCache? = null

    /**
     * Prohibited domains for caching (adheres to YouTube Terms of Service and proprietary CDNs).
     * Any stream from these domains will NEVER be written to the local disk cache under any circumstance.
     */
    private val PROHIBITED_CACHE_DOMAINS = listOf(
        "googlevideo.com",
        "youtube.com",
        "youtu.be",
        "ytimg.com",
        "music.youtube.com"
    )

    /**
     * Initializes or returns the singleton SimpleCache instance.
     */
    @Synchronized
    fun getCache(context: Context): SimpleCache {
        return simpleCache ?: run {
            val cacheDir = File(context.cacheDir, CACHE_DIR_NAME)
            if (!cacheDir.exists()) {
                cacheDir.mkdirs()
            }
            val evictor = LeastRecentlyUsedCacheEvictor(MAX_CACHE_SIZE_BYTES)
            val databaseProvider = StandaloneDatabaseProvider(context.applicationContext)
            SimpleCache(cacheDir, evictor, databaseProvider).also {
                simpleCache = it
            }
        }
    }

    /**
     * Enforces native permission validation for audio stream caching.
     * Guarantees that unauthorized or prohibited streams cannot be cached even if requested by JS.
     */
    fun isStreamPermittedForNativeCache(uri: Uri, clientCanCacheFlag: Boolean): Boolean {
        // 1. Client must indicate intent to cache
        if (!clientCanCacheFlag) return false

        // 2. Must be standard HTTPS or android.resource
        val scheme = uri.scheme?.lowercase() ?: return false
        if (scheme != "https" && scheme != "android.resource") return false

        // 3. Prohibit internal network or loopback IPs
        val host = uri.host?.lowercase() ?: return false
        if (host == "localhost" || host == "127.0.0.1" || host.startsWith("192.168.") ||
            host.startsWith("10.") || host.startsWith("172.16.") || host.endsWith(".local")
        ) {
            return false
        }

        // 4. Prohibit YouTube and proprietary video CDNs
        for (banned in PROHIBITED_CACHE_DOMAINS) {
            if (host == banned || host.endsWith(".$banned")) {
                return false
            }
        }

        return true
    }

    /**
     * Builds a DataSource.Factory configured for caching if authorized, or direct streaming if not.
     */
    fun createDataSourceFactory(context: Context, uri: Uri, clientCanCacheFlag: Boolean): DataSource.Factory {
        val appContext = context.applicationContext
        val httpDataSourceFactory = DefaultHttpDataSource.Factory()
            .setUserAgent("ResonateNativeMedia3/1.0.0 (Linux; Android)")
            .setConnectTimeoutMs(8000)
            .setReadTimeoutMs(8000)
            .setAllowCrossProtocolRedirects(true)

        val defaultDataSourceFactory = DefaultDataSource.Factory(appContext, httpDataSourceFactory)

        // Only attach CacheDataSource if natively validated
        return if (isStreamPermittedForNativeCache(uri, clientCanCacheFlag)) {
            val cache = getCache(appContext)
            CacheDataSource.Factory()
                .setCache(cache)
                .setUpstreamDataSourceFactory(defaultDataSourceFactory)
                .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
        } else {
            defaultDataSourceFactory
        }
    }
}

