export const READING_SPEED_KEY = 'readingSpeed';
export const READING_SPEED = localStorage.getItem(READING_SPEED_KEY) || 1;

export const SPEAKER_KEY = 'speaker';
export const SPEAKER = localStorage.getItem(SPEAKER_KEY) || 'speaker-1';

export const DEFAULT_MODE_KEY = 'defaultMode';
export const DEFAULT_MODE = localStorage.getItem(DEFAULT_MODE_KEY) || 'ask';

export const AUTO_FLASHLIGHT_KEY = 'autoFlashlight';
export const AUTO_FLASHLIGHT = (() => {
    const val = localStorage.getItem(AUTO_FLASHLIGHT_KEY);
    return val === null ? true : val === 'true';
})();

export const VOICE_FEEDBACK_KEY = 'voiceFeedback';
export const VOICE_FEEDBACK = (() => {
    const val = localStorage.getItem(VOICE_FEEDBACK_KEY);
    return val === null ? true : val === 'true';
})();
