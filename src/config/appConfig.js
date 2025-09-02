// App Configuration Service
// Centralized configuration management using environment variables

class AppConfig {
  constructor() {
    this.loadConfiguration();
  }

  loadConfiguration() {
    // Sleeper API Configuration
    this.sleeper = {
      baseUrl: process.env.SLEEPER_BASE_URL || 'https://api.sleeper.app/v1',
      rateLimit: parseInt(process.env.SLEEPER_RATE_LIMIT) || 1000,
    };

    // App Configuration
    this.app = {
      name: process.env.APP_NAME || 'Fantasy Football Manager',
      version: process.env.APP_VERSION || '1.0.0',
      defaultSport: 'nfl', // Hardcoded since this is NFL-only
      defaultSeason: this.getCurrentSeason(),
    };

    // Feature Flags
    this.features = {
      debugLogging: process.env.ENABLE_DEBUG_LOGGING === 'true',
      analytics: process.env.ENABLE_ANALYTICS === 'true',
      offlineMode: process.env.ENABLE_OFFLINE_MODE !== 'false',
    };

    // Cache Configuration
    this.cache = {
      playerDuration: parseInt(process.env.PLAYER_CACHE_DURATION) || 24 * 60 * 60 * 1000, // 24 hours
      leagueDuration: parseInt(process.env.LEAGUE_CACHE_DURATION) || 5 * 60 * 1000, // 5 minutes
    };

    // UI Configuration
    this.ui = {
      defaultTheme: process.env.DEFAULT_THEME || 'dark',
      autoRefreshInterval: parseInt(process.env.AUTO_REFRESH_INTERVAL) || 5 * 60 * 1000, // 5 minutes
      maxPlayersDisplay: parseInt(process.env.MAX_PLAYERS_DISPLAY) || 50,
    };

    // Environment Detection
    this.environment = {
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isTest: process.env.NODE_ENV === 'test',
    };

    // Log configuration in development
    if (this.features.debugLogging && this.environment.isDevelopment) {
      console.log('App Configuration Loaded:', this);
    }
  }

  // Get current season based on current date
  getCurrentSeason() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // January is 0
    
    // If environment variable is set, use it
    if (process.env.DEFAULT_SEASON) {
      return process.env.DEFAULT_SEASON;
    }
    
    // Auto-detect season: if we're in the first half of the year (Jan-June), 
    // use the previous year as the season (since NFL season runs Aug-Jan)
    // If we're in the second half (July-Dec), use the current year
    if (currentMonth <= 6) {
      return (currentYear - 1).toString();
    } else {
      return currentYear.toString();
    }
  }

  // Getter methods for backward compatibility
  get sleeperBaseUrl() {
    return this.sleeper.baseUrl;
  }

  get sleeperRateLimit() {
    return this.sleeper.rateLimit;
  }

  get appName() {
    return this.app.name;
  }

  get appVersion() {
    return this.app.version;
  }

  get defaultSport() {
    return this.app.defaultSport;
  }

  get defaultSeason() {
    return this.app.defaultSeason;
  }

  get isDebugEnabled() {
    return this.features.debugLogging;
  }

  get isAnalyticsEnabled() {
    return this.features.analytics;
  }

  get isOfflineModeEnabled() {
    return this.features.offlineMode;
  }

  get playerCacheDuration() {
    return this.cache.playerDuration;
  }

  get leagueCacheDuration() {
    return this.cache.leagueDuration;
  }

  get defaultTheme() {
    return this.ui.defaultTheme;
  }

  get autoRefreshInterval() {
    return this.ui.autoRefreshInterval;
  }

  get maxPlayersDisplay() {
    return this.ui.maxPlayersDisplay;
  }

  get isDevelopment() {
    return this.environment.isDevelopment;
  }

  get isProduction() {
    return this.environment.isProduction;
  }

  get isTest() {
    return this.environment.isTest;
  }

  // Validate configuration
  validate() {
    const errors = [];
    
    if (!this.sleeper.baseUrl) {
      errors.push('Sleeper base URL is required');
    }
    
    if (this.sleeper.rateLimit <= 0) {
      errors.push('Sleeper rate limit must be positive');
    }
    
    if (!this.app.defaultSport) {
      errors.push('Default sport is required');
    }
    
    if (!this.app.defaultSeason) {
      errors.push('Default season is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Reload configuration (useful for testing)
  reload() {
    this.loadConfiguration();
  }
}

const appConfig = new AppConfig();

export default appConfig;
