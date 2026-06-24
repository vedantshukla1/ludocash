/**
 * Sound manager — wraps react-native-sound for game audio.
 * All sound files live in src/assets/sounds/.
 * Music and effects are toggleable independently.
 */
import Sound from 'react-native-sound';

Sound.setCategory('Ambient');

let musicEnabled = true;
let sfxEnabled = true;

let bgMusic = null;

// Preloaded sound instances
const sounds = {};

// Using remote URLs since local mp3 assets are not bundled
const SOUND_FILES = {
  dice: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_29fb6bd126.mp3?filename=dice-roll-105574.mp3',
  move: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=wooden-block-click-1-105820.mp3',
  kill: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_6506307ec3.mp3?filename=punch-140236.mp3',
  home: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_228c460773.mp3?filename=success-1-6297.mp3',
  win: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3?filename=success-trumpet-8717.mp3',
  lose: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_c6ccf3232f.mp3?filename=negative_beeps-6008.mp3',
  click: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8b1bb7ec7.mp3?filename=click-button-140881.mp3',
  coin: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_34d193eb70.mp3?filename=coin-drop-39914.mp3',
  countdown: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_0b02993b4e.mp3?filename=countdown-154942.mp3',
  bg_music: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=stranger-things-124008.mp3'
};

/**
 * Load all SFX into memory
 */
export const preloadSounds = () => {
  Object.entries(SOUND_FILES).forEach(([key, file]) => {
    if (key === 'bg_music') return;
    sounds[key] = new Sound(file, null, (err) => {
      if (err) {
        console.log(`Sound load error [${key}]:`, err);
      }
    });
  });
};

/**
 * Play a named sound effect
 */
export const playSound = (name) => {
  if (!sfxEnabled) return;
  const sound = sounds[name];
  if (!sound) return;
  sound.stop(() => {
    sound.play((success) => {
      if (!success) console.log(`Sound play failed: ${name}`);
    });
  });
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
      return;
    }
    bgMusic.setNumberOfLoops(-1); // infinite loop
    bgMusic.setVolume(0.4);
    bgMusic.play();
  });
};

/**
 * Stop / pause background music
 */
export const stopMusic = () => {
  if (bgMusic) bgMusic.pause();
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
  Object.values(sounds).forEach((s) => s && s.release());
  if (bgMusic) bgMusic.release();
};

export default {
  preloadSounds,
  playSound,
  startMusic,
  stopMusic,
  toggleMusic,
  toggleSfx,
  isMusicEnabled,
  isSfxEnabled,
  releaseSounds,
};
