package com.vedant.ludocash

import android.media.AudioAttributes
import android.media.SoundPool
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SoundPoolManagerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var soundPool: SoundPool? = null
    private val soundMap = HashMap<String, Int>()

    init {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        soundPool = SoundPool.Builder()
            .setMaxStreams(10)
            .setAudioAttributes(audioAttributes)
            .build()

        preloadSounds(reactContext)
    }

    override fun getName(): String {
        return "SoundPoolManager"
    }

    private fun preloadSounds(context: ReactApplicationContext) {
        try {
            val res = context.resources
            val packageName = context.packageName

            val soundFiles = listOf(
                "piece_move",
                "dice_roll",
                "piece_select",
                "safe_star",
                "kill",
                "home",
                "win",
                "lose",
                "button_click"
            )

            for (sound in soundFiles) {
                val resId = res.getIdentifier(sound, "raw", packageName)
                if (resId != 0) {
                    val soundId = soundPool?.load(context, resId, 1)
                    if (soundId != null) {
                        soundMap[sound] = soundId
                    }
                } else {
                    Log.e("SoundPoolManager", "Resource not found for \$sound")
                }
            }
        } catch (e: Exception) {
            Log.e("SoundPoolManager", "Error preloading sounds", e)
        }
    }

    @ReactMethod
    fun playSound(name: String, pitchVariation: Float) {
        val soundId = soundMap[name]
        if (soundId != null && soundPool != null) {
            val pitch = 1.0f + (pitchVariation / 100f)
            // play(soundID, leftVolume, rightVolume, priority, loop, rate)
            soundPool?.play(soundId, 1.0f, 1.0f, 1, 0, pitch)
        } else {
            Log.e("SoundPoolManager", "Sound not loaded or SoundPool null: \$name")
        }
    }

    @ReactMethod
    fun releasePool() {
        soundPool?.release()
        soundPool = null
        soundMap.clear()
    }
}
