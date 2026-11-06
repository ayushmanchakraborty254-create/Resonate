package com.resonate.app

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Bundle
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.session.CommandButton
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.resonate.app.playback.NativeCacheManager

/**
 * Native AndroidX Media3 Playback Service (Clean-Room Implementation)
 *
 * Provides:
 * - Uninterrupted background audio and screen-off playback
 * - Android system lock-screen controls, MediaStyle notifications, and Bluetooth AVRCP
 * - Transient and permanent Audio Focus management (ducks on navigation, pauses on calls)
 * - MediaSession.Callback.onPlaybackResumption() for state restoration across process recreation
 * - Native caching permission enforcement for authorized media
 */
@OptIn(UnstableApi::class)
class MediaPlaybackService : MediaSessionService() {

    companion object {
        const val PREFS_NAME = "resonate_media3_playback_prefs"
        const val KEY_LAST_TRACK_ID = "last_track_id"
        const val KEY_LAST_TITLE = "last_title"
        const val KEY_LAST_ARTIST = "last_artist"
        const val KEY_LAST_ALBUM = "last_album"
        const val KEY_LAST_ARTWORK_URL = "last_artwork_url"
        const val KEY_LAST_MEDIA_URI = "last_media_uri"
        const val KEY_LAST_POSITION_MS = "last_position_ms"
        const val KEY_REPEAT_MODE = "last_repeat_mode"
        const val KEY_SHUFFLE_MODE = "last_shuffle_mode"
        const val KEY_CAN_CACHE = "last_can_cache"

        // Authorized public royalty-free test stream (Google ExoPlayer public media library)
        const val AUTHORIZED_TEST_STREAM_URL = "https://storage.googleapis.com/exoplayer-test-media-0/Jazz_In_Paris.mp3"
        const val TEST_TRACK_TITLE = "Jazz In Paris"
        const val TEST_TRACK_ARTIST = "Media3 Verification Stream (Royalty-Free)"

        @Volatile
        var instance: MediaPlaybackService? = null
            private set
    }

    private var player: ExoPlayer? = null
    private var mediaSession: MediaSession? = null
    private lateinit var prefs: SharedPreferences

    data class PlaybackStateSnapshot(
        val isPlaying: Boolean,
        val currentPositionMs: Long,
        val durationMs: Long,
        val bufferedPositionMs: Long,
        val currentTrackId: String,
        val playbackState: Int,
        val isTestStream: Boolean = false
    )

    override fun onCreate() {
        super.onCreate()
        instance = this
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        initializePlayerAndSession()
    }

    private fun initializePlayerAndSession() {
        // 1. Configure AudioAttributes for Audio Focus management
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .setUsage(C.USAGE_MEDIA)
            .build()

        // 2. Build native ExoPlayer instance
        val exo = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, /* handleAudioFocus= */ true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .setHandleAudioBecomingNoisy(true) // Automatically pauses playback when headphones disconnect
            .build()

        // 3. Attach Player state listeners for status tracking and state persistence
        exo.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                if (!isPlaying) {
                    persistCurrentPlaybackState()
                }
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                persistCurrentPlaybackState()
            }

            override fun onPositionDiscontinuity(
                oldPosition: Player.PositionInfo,
                newPosition: Player.PositionInfo,
                reason: Int
            ) {
                persistCurrentPlaybackState()
            }
        })

        player = exo

        // 4. PendingIntent to open MainActivity when user taps the media notification
        val sessionActivityPendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 5. Initialize Media3 MediaSession with Callback
        val sessionCallback = object : MediaSession.Callback {
            override fun onConnect(
                session: MediaSession,
                controller: MediaSession.ControllerInfo
            ): MediaSession.ConnectionResult {
                val availableSessionCommands = MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS.buildUpon()
                return MediaSession.ConnectionResult.AcceptedResultBuilder(session)
                    .setAvailableSessionCommands(availableSessionCommands.build())
                    .build()
            }

            /**
             * Implements proper Media3 playback resumption:
             * Reconstructs playlist queue, metadata, playback position, repeat and shuffle mode.
             */
            override fun onPlaybackResumption(
                mediaSession: MediaSession,
                controller: MediaSession.ControllerInfo
            ): ListenableFuture<MediaSession.MediaItemsWithStartPosition> {
                val lastUriStr = prefs.getString(KEY_LAST_MEDIA_URI, null)
                val lastTrackId = prefs.getString(KEY_LAST_TRACK_ID, null)
                val lastPositionMs = prefs.getLong(KEY_LAST_POSITION_MS, 0L)

                if (!lastUriStr.isNullOrEmpty() && !lastTrackId.isNullOrEmpty()) {
                    val uri = Uri.parse(lastUriStr)
                    val metadata = MediaMetadata.Builder()
                        .setTitle(prefs.getString(KEY_LAST_TITLE, "Resonate Track"))
                        .setArtist(prefs.getString(KEY_LAST_ARTIST, "Authorized Audio"))
                        .setAlbumTitle(prefs.getString(KEY_LAST_ALBUM, "Resonate"))
                        .setArtworkUri(prefs.getString(KEY_LAST_ARTWORK_URL, null)?.let { Uri.parse(it) })
                        .build()

                    val item = MediaItem.Builder()
                        .setMediaId(lastTrackId)
                        .setUri(uri)
                        .setMediaMetadata(metadata)
                        .build()

                    val repeatMode = prefs.getInt(KEY_REPEAT_MODE, Player.REPEAT_MODE_OFF)
                    val shuffleMode = prefs.getBoolean(KEY_SHUFFLE_MODE, false)

                    player?.repeatMode = repeatMode
                    player?.shuffleModeEnabled = shuffleMode

                    val result = MediaSession.MediaItemsWithStartPosition(
                        listOf(item),
                        0,
                        lastPositionMs
                    )
                    return Futures.immediateFuture(result)
                }

                // If no saved state exists, return empty
                return Futures.immediateFuture(
                    MediaSession.MediaItemsWithStartPosition(emptyList(), 0, 0L)
                )
            }
        }

        mediaSession = MediaSession.Builder(this, exo)
            .setSessionActivity(sessionActivityPendingIntent)
            .setCallback(sessionCallback)
            .build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    /**
     * Persists current track, position, repeat and shuffle settings to SharedPreferences.
     */
    private fun persistCurrentPlaybackState() {
        val p = player ?: return
        val currentItem = p.currentMediaItem ?: return

        prefs.edit().apply {
            putString(KEY_LAST_TRACK_ID, currentItem.mediaId)
            putString(KEY_LAST_TITLE, currentItem.mediaMetadata.title?.toString() ?: "")
            putString(KEY_LAST_ARTIST, currentItem.mediaMetadata.artist?.toString() ?: "")
            putString(KEY_LAST_ALBUM, currentItem.mediaMetadata.albumTitle?.toString() ?: "")
            putString(KEY_LAST_ARTWORK_URL, currentItem.mediaMetadata.artworkUri?.toString() ?: "")
            putString(KEY_LAST_MEDIA_URI, currentItem.localConfiguration?.uri?.toString() ?: "")
            putLong(KEY_LAST_POSITION_MS, p.currentPosition)
            putInt(KEY_REPEAT_MODE, p.repeatMode)
            putBoolean(KEY_SHUFFLE_MODE, p.shuffleModeEnabled)
            apply()
        }
    }

    /**
     * Plays an authorized audio stream natively via ExoPlayer.
     * Enforces native caching permissions and domain validation.
     */
    fun playAuthorizedTrack(
        trackId: String,
        title: String,
        artist: String,
        album: String,
        artworkUrl: String,
        streamUrl: String,
        clientCanCache: Boolean,
        startPositionMs: Long = 0L
    ): Boolean {
        val exo = player ?: return false
        val uri = Uri.parse(streamUrl)

        // Native validation: enforce source allowlist & caching permission check
        val dataSourceFactory = NativeCacheManager.createDataSourceFactory(this, uri, clientCanCache)
        val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)

        val metadata = MediaMetadata.Builder()
            .setTitle(title)
            .setArtist(artist)
            .setAlbumTitle(album)
            .setArtworkUri(if (artworkUrl.isNotEmpty()) Uri.parse(artworkUrl) else null)
            .build()

        val mediaItem = MediaItem.Builder()
            .setMediaId(trackId)
            .setUri(uri)
            .setMediaMetadata(metadata)
            .build()

        val mediaSource = mediaSourceFactory.createMediaSource(mediaItem)

        exo.setMediaSource(mediaSource)
        exo.prepare()
        if (startPositionMs > 0) {
            exo.seekTo(startPositionMs)
        }
        exo.play()

        // Persist track info
        prefs.edit().apply {
            putString(KEY_LAST_TRACK_ID, trackId)
            putString(KEY_LAST_TITLE, title)
            putString(KEY_LAST_ARTIST, artist)
            putString(KEY_LAST_ALBUM, album)
            putString(KEY_LAST_ARTWORK_URL, artworkUrl)
            putString(KEY_LAST_MEDIA_URI, streamUrl)
            putBoolean(KEY_CAN_CACHE, clientCanCache)
            apply()
        }

        return true
    }

    /**
     * Executes the Phase 2 Native Self-Test routine using an authorized royalty-free audio source.
     */
    fun playTestStream(): Boolean {
        return playAuthorizedTrack(
            trackId = "test_jazz_in_paris",
            title = TEST_TRACK_TITLE,
            artist = TEST_TRACK_ARTIST,
            album = "Public Domain Music",
            artworkUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
            streamUrl = AUTHORIZED_TEST_STREAM_URL,
            clientCanCache = true,
            startPositionMs = 0L
        )
    }

    fun pause() {
        player?.pause()
        persistCurrentPlaybackState()
    }

    fun resume() {
        player?.play()
    }

    fun seekTo(positionMs: Long) {
        player?.seekTo(positionMs)
    }

    fun getPlaybackSnapshot(): PlaybackStateSnapshot {
        val p = player
        return if (p != null) {
            val item = p.currentMediaItem
            val trackId = item?.mediaId ?: ""
            PlaybackStateSnapshot(
                isPlaying = p.isPlaying,
                currentPositionMs = p.currentPosition,
                durationMs = if (p.duration > 0) p.duration else 0L,
                bufferedPositionMs = p.bufferedPosition,
                currentTrackId = trackId,
                playbackState = p.playbackState,
                isTestStream = trackId == "test_jazz_in_paris"
            )
        } else {
            PlaybackStateSnapshot(
                isPlaying = false,
                currentPositionMs = 0L,
                durationMs = 0L,
                bufferedPositionMs = 0L,
                currentTrackId = "",
                playbackState = Player.STATE_IDLE
            )
        }
    }

    override fun onDestroy() {
        instance = null
        persistCurrentPlaybackState()

        player?.release()
        player = null

        mediaSession?.release()
        mediaSession = null

        super.onDestroy()
    }
}
