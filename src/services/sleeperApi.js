// Sleeper API Service
// Documentation: https://docs.sleeper.com/

import appConfig from '../config/appConfig';

class SleeperApiService {
  constructor() {
    this.baseUrl = appConfig.sleeperBaseUrl;
    this.rateLimit = appConfig.sleeperRateLimit;
    this.requestCount = 0;
    this.lastResetTime = Date.now();
  }

  // Rate limiting helper
  checkRateLimit() {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    // Reset counter every minute
    if (timeSinceReset >= 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    if (this.requestCount >= this.rateLimit) {
      throw new Error(`Rate limit exceeded. Maximum ${this.rateLimit} requests per minute allowed.`);
    }
    
    this.requestCount++;
  }

  // Generic fetch method with error handling and rate limiting
  async fetchWithErrorHandling(url, options = {}) {
    try {
      // Check rate limit before making request
      this.checkRateLimit();
      
      if (appConfig.isDebugEnabled) {
        console.log(`Sleeper API Request: ${url}`);
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Sleeper API Error:', error);
      throw error;
    }
  }

  // User endpoints
  async getUserByUsername(username) {
    return this.fetchWithErrorHandling(`${this.baseUrl}/user/${username}`);
  }

  async getUserById(userId) {
    return this.fetchWithErrorHandling(`${this.baseUrl}/user/${userId}`);
  }

  // League endpoints
  async getUserLeagues(userId, sport = null, season = null) {
    const sportParam = sport || appConfig.defaultSport;
    const seasonParam = season || appConfig.defaultSeason;
    return this.fetchWithErrorHandling(`${this.baseUrl}/user/${userId}/leagues/${sportParam}/${seasonParam}`);
  }

  async getLeague(leagueId) {
    return this.fetchWithErrorHandling(`${this.baseUrl}/league/${leagueId}`);
  }

  async getLeagueRosters(leagueId) {
    return this.fetchWithErrorHandling(`${this.baseUrl}/league/${leagueId}/rosters`);
  }

  async getLeagueUsers(leagueId) {
    return this.fetchWithErrorHandling(`${this.baseUrl}/league/${leagueId}/users`);
  }

  // Matchup endpoints
  async getLeagueMatchups(leagueId, week) {
    return this.fetchWithErrorHandling(`${this.baseUrl}/league/${leagueId}/matchups/${week}`);
  }

  // Draft endpoints
  async getLeagueDrafts(leagueId) {
    return this.fetchWithErrorHandling(`${this.baseUrl}/league/${leagueId}/drafts`);
  }

  async getDraft(draftId) {
    return this.fetchWithErrorHandling(`${this.baseUrl}/draft/${draftId}`);
  }

  async getDraftPicks(draftId) {
    return this.fetchWithErrorHandling(`${this.baseUrl}/draft/${draftId}/picks`);
  }

  // Player endpoints
  async getAllPlayers(sport = null) {
    const sportParam = sport || appConfig.defaultSport;
    return this.fetchWithErrorHandling(`${this.baseUrl}/players/${sportParam}`);
  }

  async getTrendingPlayers(sport = null, type = 'add', lookbackHours = 24, limit = 25) {
    const sportParam = sport || appConfig.defaultSport;
    const params = new URLSearchParams({
      lookback_hours: lookbackHours.toString(),
      limit: limit.toString(),
    });
    return this.fetchWithErrorHandling(`${this.baseUrl}/players/${sportParam}/trending/${type}?${params}`);
  }

  // Avatar endpoints
  getAvatarUrl(avatarId, thumbnail = false) {
    if (thumbnail) {
      return `https://sleepercdn.com/avatars/thumbs/${avatarId}`;
    }
    return `https://sleepercdn.com/avatars/${avatarId}`;
  }

  // Get current rate limit status
  getRateLimitStatus() {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    const timeUntilReset = Math.max(0, 60000 - timeSinceReset);
    
    return {
      currentCount: this.requestCount,
      maxCount: this.rateLimit,
      remaining: this.rateLimit - this.requestCount,
      timeUntilReset: timeUntilReset,
      resetTime: new Date(this.lastResetTime + 60000)
    };
  }
}

// Create and export a singleton instance
const sleeperApi = new SleeperApiService();
export default sleeperApi;
