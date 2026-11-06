package com.resonate.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MediaPlaybackService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private val NOTIFICATION_ID = 777
    private val CHANNEL_ID = "resonate_playback_channel"

    inner class LocalBinder : Binder() {
        fun getService(): MediaPlaybackService = this@MediaPlaybackService
    }

    private val binder = LocalBinder()

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()

        // Acquire WakeLock to keep audio streaming uninterrupted in background
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Resonate::MediaWakeLock").apply {
                setReferenceCounted(false)
                acquire(12 * 60 * 60 * 1000L) // 12 hours safe timeout
            }
        } catch (_: Exception) {}

        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Resonate Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Resonate audio playing in background"
                setShowBadge(false)
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val title = intent?.getStringExtra("title") ?: "Resonate"
        val artist = intent?.getStringExtra("artist") ?: "Streaming High-Fidelity Audio"
        val isPlaying = intent?.getBooleanExtra("isPlaying", true) ?: true

        val contentIntent = Intent(this, MainActivity::class.java).apply {
            this.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPending = PendingIntent.getActivity(
            this, 0, contentIntent,
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

        notifBuilder.setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(artist)
            .setContentIntent(contentPending)
            .setOngoing(isPlaying)
            .setVisibility(Notification.VISIBILITY_PUBLIC)

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

        val notification = notifBuilder.build()

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (_: Exception) {}

        return START_STICKY
    }

    override fun onDestroy() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (_: Exception) {}

        try {
            stopForeground(true)
        } catch (_: Exception) {}

        super.onDestroy()
    }
}

