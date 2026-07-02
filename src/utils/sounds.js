/**
 * Sound manager — wraps react-native-sound for game audio.
 * All sound files live in src/assets/sounds/.
 * Music and effects are toggleable independently.
 */
import Sound from 'react-native-sound';

Sound.setCategory('Ambient');

import { NativeModules, Vibration } from 'react-native';
const { SoundPoolManager } = NativeModules;

let musicEnabled = true;
let sfxEnabled = true;

let bgMusic = null;

const SOUND_FILES = {
  bg_music: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=stranger-things-124008.mp3'
};

export const preloadSounds = () => {
  // SoundPoolManager preloads its own raw files automatically on init!
  // We only need to preload react-native-sound if we want to use it
};

export const playSound = (name, options = {}) => {
  if (!sfxEnabled) return;
  
  if (SoundPoolManager) {
    let pitchVariation = 0;
    if (options.randomizePitch) {
      // random pitch between -3% and +3%
      pitchVariation = (Math.random() * 6) - 3;
    }
    
    // The dice roll sound has a built-in 1 second stop in JS if we were using it, 
    // but with raw files we can let the raw file play out fully.
    SoundPoolManager.playSound(name, pitchVariation);
  } else {
    console.log(`SoundPoolManager missing. Cannot play: ${name}`);
  }
};

/**
 * Play haptic vibration (obeys SFX toggle)
 */
export const playVibration = (pattern) => {
  if (!sfxEnabled) return;
  Vibration.vibrate(pattern);
};

/**
 * Start background music (looping)
 */
export const startMusic = () => {
  if (!musicEnabled) return;
  if (bgMusic) {
    bgMusic.play();
    return;
  }
  bgMusic = new Sound(SOUND_FILES.bg_music, null, (err) => {
    if (err) {
      console.log('Music load error:', err);
      bgMusic = null; // Reset so the user can try tapping the button again to reload it!
      return;
    }
    bgMusic.setNumberOfLoops(-1); // infinite loop
    bgMusic.setVolume(0.2); // Lower BG music so SFX (like taps) punch through!
    // Only play if the user hasn't toggled it off while it was loading!
    if (musicEnabled) {
      bgMusic.play();
    }
  });
};

/**
 * Stop / pause background music
 */
export const stopMusic = () => {
  if (bgMusic) {
    bgMusic.stop(() => {
      // safely stopped
    });
  }
};

/**
 * Toggle music on/off
 */
export const toggleMusic = () => {
  musicEnabled = !musicEnabled;
  if (musicEnabled) {
    startMusic();
  } else {
    stopMusic();
  }
  return musicEnabled;
};

/**
 * Toggle SFX on/off
 */
export const toggleSfx = () => {
  sfxEnabled = !sfxEnabled;
  return sfxEnabled;
};

export const isMusicEnabled = () => musicEnabled;
export const isSfxEnabled = () => sfxEnabled;

/**
 * Release all sound resources (call on app unmount)
 */
export const releaseSounds = () => {
  if (bgMusic) bgMusic.release();
};

// Automatically preload sounds when this module is evaluated (handles Fast Refresh)
preloadSounds();

export default {
  preloadSounds,
  playSound,
  playVibration,
  startMusic,
  stopMusic,
  toggleMusic,
  toggleSfx,
  isMusicEnabled,
  isSfxEnabled,
  releaseSounds,
};
