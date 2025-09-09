// Sleeper API Service
// Documentation: https://docs.sleeper.com/

import appConfig from '../config/appConfig';

class SleeperApiService {
  constructor() {
    this.baseUrl = appConfig.sleeperBaseUrl;
    this.rateLimit = appConfig.sleeperRateLimit;
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    
    // Request deduplication
    this.pendingRequests = new Map();
    
    // Exponential backoff settings
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
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

  // Exponential backoff helper
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Request deduplication helper
  async deduplicateRequest(url, requestFn) {
    // Check if this request is already pending
    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url);
    }

    // Create the request promise
    const requestPromise = requestFn();
    
    // Store the promise to prevent duplicate requests
    this.pendingRequests.set(url, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Remove the promise from pending requests
      this.pendingRequests.delete(url);
    }
  }

  // Generic fetch method with error handling, rate limiting, and exponential backoff
  async fetchWithErrorHandling(url, options = {}) {
    return this.deduplicateRequest(url, async () => {
      let lastError;
      
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          // Check rate limit before making request
          this.checkRateLimit();
          
          if (appConfig.isDebugEnabled) {
            console.log(`Sleeper API Request (attempt ${attempt + 1}): ${url}`);
          }

          const response = await fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });

          if (!response.ok) {
            // Handle rate limit errors specifically
            if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.baseDelay * Math.pow(2, attempt);
              
              if (appConfig.isDebugEnabled) {
                console.log(`Rate limit hit, waiting ${delay}ms before retry ${attempt + 1}/${this.maxRetries}`);
              }
              
              if (attempt < this.maxRetries) {
                await this.sleep(delay);
                continue;
              }
            }
            
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          lastError = error;
          
          // If it's a rate limit error and we have retries left, wait and retry
          if (error.message.includes('Rate limit exceeded') && attempt < this.maxRetries) {
            const delay = this.baseDelay * Math.pow(2, attempt);
            
            if (appConfig.isDebugEnabled) {
              console.log(`Rate limit exceeded, waiting ${delay}ms before retry ${attempt + 1}/${this.maxRetries}`);
            }
            
            await this.sleep(delay);
            continue;
          }
          
          // For other errors, don't retry
          break;
        }
      }
      
      console.error('Sleeper API Error:', lastError);
      throw lastError;
    });
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

  // Weekly projections endpoint (undocumented)
  async getWeeklyProjections(season, week, seasonType = 'regular', positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'], scoring = 'ppr') {
    const positionParams = positions.map(pos => `position[]=${pos}`).join('&');
    const url = `${this.baseUrl}/projections/nfl/${season}/${week}?season_type=${seasonType}&${positionParams}&scoring=${scoring}`;
    return this.fetchWithErrorHandling(url);
  }

  // Player stats endpoint (undocumented)
  async getPlayerStats(playerId, season, seasonType = 'regular', grouping = 'week') {
    const url = `${this.baseUrl}/stats/nfl/player/${playerId}?season_type=${seasonType}&season=${season}&grouping=${grouping}`;
    return this.fetchWithErrorHandling(url);
  }

  // Player research endpoint (undocumented)
  async getPlayerResearch(seasonType, season, week) {
    const url = `${this.baseUrl}/players/nfl/research/${seasonType}/${season}/${week}`;
    return this.fetchWithErrorHandling(url);
  }

  // Get current NFL state (including current week)
  async getNFLState() {
    return this.fetchWithErrorHandling(`${this.baseUrl}/state/nfl`);
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
      resetTime: new Date(this.lastResetTime + 60000),
      pendingRequests: this.pendingRequests.size
    };
  }

  // Clear rate limit counter (for testing or emergency reset)
  clearRateLimit() {
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.pendingRequests.clear();
  }
}

// Create and export a singleton instance
const sleeperApi = new SleeperApiService();
export default sleeperApi;
