// Sleeper Configuration
// Centralized settings for Sleeper API integration

// Storage keys for user preferences
export const STORAGE_KEYS = {
  SLEEPER_USERNAME: 'sleeper_username',
  SLEEPER_USER_ID: 'sleeper_user_id',
  SELECTED_LEAGUE_ID: 'selected_league_id',
  LAST_ACTIVE_TAB: 'last_active_tab'
};

// Default preferences
export const DEFAULT_PREFERENCES = {
  AUTO_REFRESH: true,
  REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  SHOW_DEBUG_INFO: false,
  THEME: 'dark'
};

// Helper functions for localStorage
export const getStorageValue = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
};

export const setStorageValue = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
};

export const removeStorageValue = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error);
  }
};

export const clearAllStorage = () => {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};
