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

const SOUND_FILES = {
  dice: 'dice_roll.mp3',
  move: 'piece_move.mp3',
  kill: 'piece_kill.mp3',
  home: 'piece_home.mp3',
  win: 'win.mp3',
  lose: 'lose.mp3',
  click: 'click.mp3',
  coin: 'coin.mp3',
  countdown: 'countdown.mp3',
};

/**
 * Load all SFX into memory
 */
export const preloadSounds = () => {
  Object.entries(SOUND_FILES).forEach(([key, file]) => {
    sounds[key] = new Sound(file, Sound.MAIN_BUNDLE, (err) => {
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
  bgMusic = new Sound('bg_music.mp3', Sound.MAIN_BUNDLE, (err) => {
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
