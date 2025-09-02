// ESPN API Service
// Handles all direct interactions with the ESPN Fantasy Football API
// Uses cookies (SWID and ESPNS2) for authentication

import appConfig from '../config/appConfig';

class EspnApi {
  constructor() {
    this.baseUrl = 'https://fantasy.espn.com/apis/v3/games/ffl';
    this.rateLimit = 100; // ESPN has stricter rate limits
    this.requestCount = 0;
    this.lastReset = Date.now();
  }

  // Rate limiting helper
  checkRateLimit() {
    const now = Date.now();
    if (now - this.lastReset >= 60000) { // Reset every minute
      this.requestCount = 0;
      this.lastReset = now;
    }
    
    if (this.requestCount >= this.rateLimit) {
      throw new Error('ESPN API rate limit exceeded. Please wait before making more requests.');
    }
    
    this.requestCount++;
  }

  // Generic fetch method with ESPN-specific headers
  async fetch(endpoint, options = {}) {
    this.checkRateLimit();
    
    const url = `${this.baseUrl}${endpoint}`;
    
    // For development, we'll need to handle CORS differently
    // In production, this would be handled by a backend proxy
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fantasy Football Manager/1.0',
        // Remove credentials for now to avoid CORS issues in development
      },
      mode: 'cors',
      ...options
    };

    try {
      // In development, we'll return mock data to avoid CORS issues
      if (process.env.NODE_ENV === 'development') {
        console.log('ESPN API: Development mode - returning mock data for:', endpoint);
        return this.getMockData(endpoint);
      }
      
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('ESPN API fetch error:', error);
      
      // In development, fall back to mock data
      if (process.env.NODE_ENV === 'development') {
        console.log('ESPN API: Falling back to mock data due to error');
        return this.getMockData(endpoint);
      }
      
      throw error;
    }
  }

  // Mock data for development/testing
  getMockData(endpoint) {
    if (endpoint.includes('mRoster')) {
      return {
        entries: [
          {
            playerPoolEntry: {
              player: {
                id: '12345',
                firstName: 'Patrick',
                lastName: 'Mahomes',
                defaultPositionId: 'QB',
                proTeamId: 'KC'
              }
            },
            lineupSlotId: 0
          },
          {
            playerPoolEntry: {
              player: {
                id: '12346',
                firstName: 'Christian',
                lastName: 'McCaffrey',
                defaultPositionId: 'RB',
                proTeamId: 'SF'
              }
            },
            lineupSlotId: 2
          }
        ]
      };
    }
    
    if (endpoint.includes('mMatchup')) {
      return [
        {
          away: { roster: { entries: [] } },
          home: { roster: { entries: [] } }
        }
      ];
    }
    
    if (endpoint.includes('kona_player_info')) {
      return {
        players: [
          {
            playerPoolEntry: {
              player: {
                id: '12347',
                firstName: 'Tyreek',
                lastName: 'Hill',
                defaultPositionId: 'WR',
                proTeamId: 'MIA'
              }
            }
          }
        ]
      };
    }
    
    return {};
  }

  // Get league information
  async getLeague(leagueId, season = null) {
    const seasonParam = season || appConfig.defaultSeason;
    const endpoint = `/seasons/${seasonParam}/segments/0/leagues/${leagueId}`;
    
    try {
      const data = await this.fetch(endpoint);
      return data;
    } catch (error) {
      console.error(`Error fetching ESPN league ${leagueId}:`, error);
      throw error;
    }
  }

  // Get team information
  async getTeam(leagueId, teamId, season = null) {
    const seasonParam = season || appConfig.defaultSeason;
    const endpoint = `/seasons/${seasonParam}/segments/0/leagues/${leagueId}?view=mTeam`;
    
    try {
      const data = await this.fetch(endpoint);
      const team = data.teams?.find(t => t.id === parseInt(teamId));
      return team;
    } catch (error) {
      console.error(`Error fetching ESPN team ${teamId}:`, error);
      throw error;
    }
  }

  // Get team roster
  async getTeamRoster(leagueId, teamId, season = null) {
    const seasonParam = season || appConfig.defaultSeason;
    const endpoint = `/seasons/${seasonParam}/segments/0/leagues/${leagueId}?view=mRoster&forTeamId=${teamId}`;
    
    try {
      const data = await this.fetch(endpoint);
      const team = data.teams?.find(t => t.id === parseInt(teamId));
      return team?.roster;
    } catch (error) {
      console.error(`Error fetching ESPN roster for team ${teamId}:`, error);
      throw error;
    }
  }

  // Get league standings
  async getStandings(leagueId, season = null) {
    const seasonParam = season || appConfig.defaultSeason;
    const endpoint = `/seasons/${seasonParam}/segments/0/leagues/${leagueId}?view=mStandings`;
    
    try {
      const data = await this.fetch(endpoint);
      return data.teams || [];
    } catch (error) {
      console.error(`Error fetching ESPN standings for league ${leagueId}:`, error);
      throw error;
    }
  }

  // Get current week matchups
  async getMatchups(leagueId, season = null, week = null) {
    const seasonParam = season || appConfig.defaultSeason;
    const weekParam = week || 'current';
    const endpoint = `/seasons/${seasonParam}/segments/0/leagues/${leagueId}?view=mMatchup&scoringPeriodId=${weekParam}`;
    
    try {
      const data = await this.fetch(endpoint);
      return data.schedule || [];
    } catch (error) {
      console.error(`Error fetching ESPN matchups for league ${leagueId}:`, error);
      throw error;
    }
  }

  // Get free agents
  async getFreeAgents(leagueId, season = null, position = null, limit = 50) {
    const seasonParam = season || appConfig.defaultSeason;
    let endpoint = `/seasons/${seasonParam}/segments/0/leagues/${leagueId}?view=kona_player_info`;
    
    if (position) {
      endpoint += `&filterPosition=${position}`;
    }
    
    try {
      const data = await this.fetch(endpoint);
      const players = data.players || [];
      return players.slice(0, limit);
    } catch (error) {
      console.error(`Error fetching ESPN free agents for league ${leagueId}:`, error);
      throw error;
    }
  }

  // Get player information
  async getPlayer(playerId, season = null) {
    const seasonParam = season || appConfig.defaultSeason;
    const endpoint = `/seasons/${seasonParam}/players?playerId=${playerId}`;
    
    try {
      const data = await this.fetch(endpoint);
      return data[0]; // ESPN returns an array, we want the first (and only) player
    } catch (error) {
      console.error(`Error fetching ESPN player ${playerId}:`, error);
      throw error;
    }
  }

  // Get cache status (for monitoring)
  getCacheStatus() {
    return {
      rateLimit: {
        currentCount: this.requestCount,
        maxCount: this.rateLimit,
        resetTime: this.lastReset + 60000
      }
    };
  }
}

// Create and export a singleton instance
const espnApi = new EspnApi();

export default espnApi;
