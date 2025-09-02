// Fantasy Data Service
// Handles business logic for fantasy football data using Sleeper and ESPN APIs

import sleeperApi from './sleeperApi';
import espnApi from './espnApi';
import appConfig from '../config/appConfig';

class FantasyDataService {
  constructor() {
    this.playerCache = null;
    this.lastPlayerUpdate = null;
    this.CACHE_DURATION = appConfig.playerCacheDuration;
  }

  // Cache management for players (since Sleeper recommends only calling once per day)
  async getPlayersWithCache(sport = null) {
    const now = Date.now();
    const sportParam = sport || appConfig.defaultSport;
    
    // Check if we have valid cached data
    if (this.playerCache && this.lastPlayerUpdate && 
        (now - this.lastPlayerUpdate) < this.CACHE_DURATION) {
      return this.playerCache;
    }

    try {
      if (appConfig.isDebugEnabled) {
        console.log('Fetching fresh player data from Sleeper...');
      }
      
      const players = await sleeperApi.getAllPlayers(sportParam);
      this.playerCache = players;
      this.lastPlayerUpdate = now;
      
      // Store in localStorage as backup if offline mode is enabled
      if (appConfig.isOfflineModeEnabled) {
        try {
          // Only store essential player data to avoid quota issues
          const essentialPlayers = {};
          Object.values(players).slice(0, 100).forEach(player => {
            if (player.player_id && player.first_name && player.last_name) {
              essentialPlayers[player.player_id] = {
                player_id: player.player_id,
                first_name: player.first_name,
                last_name: player.last_name,
                position: player.position,
                team: player.team,
                status: player.status
              };
            }
          });
          
          localStorage.setItem('sleeper_players', JSON.stringify(essentialPlayers));
          localStorage.setItem('sleeper_players_timestamp', now.toString());
        } catch (storageError) {
          console.warn('Failed to store players in localStorage:', storageError);
          // Continue without localStorage backup
        }
      }
      
      return players;
    } catch (error) {
      console.error('Error fetching players, trying localStorage cache:', error);
      
      // Try to use localStorage cache as fallback if offline mode is enabled
      if (appConfig.isOfflineModeEnabled) {
        const cachedPlayers = localStorage.getItem('sleeper_players');
        const cachedTimestamp = localStorage.getItem('sleeper_players_timestamp');
        
        if (cachedPlayers && cachedTimestamp) {
          const age = now - parseInt(cachedTimestamp);
          if (age < this.CACHE_DURATION) {
            this.playerCache = JSON.parse(cachedPlayers);
            this.lastPlayerUpdate = parseInt(cachedTimestamp);
            return this.playerCache;
          }
        }
      }
      
      throw new Error('Unable to fetch player data and no valid cache available');
    }
  }

  // Get current lineups for a user in a league
  async getCurrentLineups(userId, leagueId, platform = 'sleeper') {
    try {
      if (platform === 'sleeper') {
        const [rosters, users, players] = await Promise.all([
          sleeperApi.getLeagueRosters(leagueId),
          sleeperApi.getLeagueUsers(leagueId),
          this.getPlayersWithCache()
        ]);

        // Find the user's roster
        const userRoster = rosters.find(roster => roster.owner_id === userId);
        if (!userRoster) {
          throw new Error('User roster not found');
        }

        // Get user info
        const userInfo = users.find(user => user.user_id === userId);
        
        // Process lineup data
        const lineup = {
          user: userInfo,
          roster: userRoster,
          starters: this.processPlayerList(userRoster.starters, players),
          bench: this.processPlayerList(userRoster.players.filter(p => !userRoster.starters.includes(p)), players),
          ir: this.processPlayerList(userRoster.reserve, players),
          settings: userRoster.settings
        };

        return lineup;
      } else if (platform === 'espn') {
        try {
          // For ESPN, we need to find the team ID from the league ID
          // This is a simplified approach - in practice, you'd need to map league to team
          const teamId = userId; // In ESPN context, userId might be the team ID
          
          const roster = await espnApi.getTeamRoster(leagueId, teamId);
          if (!roster) {
            throw new Error('ESPN team roster not found');
          }
          
          // Process ESPN roster data
          const lineup = {
            user: { user_id: teamId, display_name: `Team ${teamId}` },
            roster: roster,
            starters: this.processEspnPlayerList(roster.entries?.filter(p => p.lineupSlotId < 20) || []),
            bench: this.processEspnPlayerList(roster.entries?.filter(p => p.lineupSlotId >= 20) || []),
            ir: this.processEspnPlayerList(roster.entries?.filter(p => p.lineupSlotId === 21) || []),
            settings: {}
          };
          
          return lineup;
        } catch (espnError) {
          console.warn('ESPN API error, returning empty lineup:', espnError);
          // Return empty lineup for ESPN teams when API fails
          return {
            user: { user_id: userId, display_name: `ESPN Team ${userId}` },
            roster: { entries: [] },
            starters: [],
            bench: [],
            ir: [],
            settings: {}
          };
        }
      }
      
      throw new Error(`Unsupported platform: ${platform}`);
    } catch (error) {
      console.error('Error fetching current lineups:', error);
      throw error;
    }
  }

  // Get current week matchups
  async getCurrentMatchups(leagueId, week = null, platform = 'sleeper') {
    try {
      if (platform === 'sleeper') {
        // If no week specified, try to determine current week
        if (!week) {
          // For now, we'll use week 1 as default
          // In a real app, you'd want to determine the current NFL week
          week = 1;
        }

        const [matchups, users, players] = await Promise.all([
          sleeperApi.getLeagueMatchups(leagueId, week),
          sleeperApi.getLeagueUsers(leagueId),
          this.getPlayersWithCache()
        ]);

        // Process matchups
        const processedMatchups = matchups.map(matchup => {
          const user = users.find(u => u.user_id === matchup.owner_id);
          return {
            ...matchup,
            user: user,
            starters: this.processPlayerList(matchup.starters, players),
            players: this.processPlayerList(matchup.players, players),
            week: week
          };
        });

        return processedMatchups;
      } else if (platform === 'espn') {
        try {
          const matchups = await espnApi.getMatchups(leagueId, null, week);
          
          // Process ESPN matchups
          const processedMatchups = matchups.map(matchup => ({
            ...matchup,
            starters: this.processEspnPlayerList(matchup.away?.roster?.entries || []),
            players: this.processEspnPlayerList(matchup.away?.roster?.entries?.concat(matchup.home?.roster?.entries || []) || [])
          }));
          
          return processedMatchups;
        } catch (espnError) {
          console.warn('ESPN API error for matchups, returning empty array:', espnError);
          return [];
        }
      }
      
      throw new Error(`Unsupported platform: ${platform}`);
    } catch (error) {
      console.error('Error fetching current matchups:', error);
      throw error;
    }
  }

  // Get free agents (players not on any roster)
  async getFreeAgents(leagueId, position = null, limit = null, platform = 'sleeper') {
    try {
      const maxLimit = limit || appConfig.maxPlayersDisplay;
      
      if (platform === 'sleeper') {
        const [rosters, players] = await Promise.all([
          sleeperApi.getLeagueRosters(leagueId),
          this.getPlayersWithCache()
        ]);

        // Get all rostered player IDs
        const rosteredPlayerIds = new Set();
        rosters.forEach(roster => {
          roster.players.forEach(playerId => {
            rosteredPlayerIds.add(playerId);
          });
        });

        // Filter for free agents
        let freeAgents = Object.values(players).filter(player => {
          // Skip team defenses and other non-player entities
          if (typeof player.player_id !== 'string' || player.player_id.length > 10) {
            return false;
          }
          
          // Check if player is not rostered
          if (rosteredPlayerIds.has(player.player_id)) {
            return false;
          }

          // Filter by position if specified
          if (position && player.fantasy_positions && !player.fantasy_positions.includes(position)) {
            return false;
          }

          return true;
        });

        // Sort by relevance (active players first, then by search rank)
        freeAgents.sort((a, b) => {
          // Active players first
          if (a.status === 'Active' && b.status !== 'Active') return -1;
          if (a.status !== 'Active' && b.status === 'Active') return 1;
          
          // Then by search rank (lower is better)
          if (a.search_rank && b.search_rank) {
            return a.search_rank - b.search_rank;
          }
          
          return 0;
        });

        return freeAgents.slice(0, maxLimit);
      } else if (platform === 'espn') {
        try {
          // For ESPN, we can use the dedicated free agents endpoint
          const freeAgents = await espnApi.getFreeAgents(leagueId, null, position, maxLimit);
          
          // Process ESPN free agents
          return this.processEspnPlayerList(freeAgents);
        } catch (espnError) {
          console.warn('ESPN API error for free agents, returning empty array:', espnError);
          return [];
        }
      }
      
      throw new Error(`Unsupported platform: ${platform}`);
    } catch (error) {
      console.error('Error fetching free agents:', error);
      throw error;
    }
  }

  // Get trending players (adds/drops)
  async getTrendingPlayers(type = 'add', lookbackHours = 24, limit = null) {
    try {
      const maxLimit = limit || appConfig.maxPlayersDisplay;
      const trending = await sleeperApi.getTrendingPlayers(null, type, lookbackHours, maxLimit);
      const players = await this.getPlayersWithCache();
      
      // Enrich trending data with player details
      const enrichedTrending = trending.map(trend => ({
        ...trend,
        player: players[trend.player_id] || null
      }));

      return enrichedTrending;
    } catch (error) {
      console.error('Error fetching trending players:', error);
      throw error;
    }
  }

  // Helper method to process player lists and add player details
  processPlayerList(playerIds, players) {
    if (!Array.isArray(playerIds)) return [];
    
    return playerIds
      .map(playerId => {
        const player = players[playerId];
        return player ? { ...player, player_id: playerId } : null;
      })
      .filter(player => player !== null);
  }

  // Helper method to process ESPN player lists
  processEspnPlayerList(players) {
    if (!players || !Array.isArray(players)) return [];
    
    return players
      .filter(player => player.playerPoolEntry)
      .map(player => ({
        player_id: player.playerPoolEntry.player.id,
        first_name: player.playerPoolEntry.player.firstName,
        last_name: player.playerPoolEntry.player.lastName,
        position: player.playerPoolEntry.player.defaultPositionId,
        team: player.playerPoolEntry.player.proTeamId,
        status: player.playerPoolEntry.player.injured ? 'Injured' : 'Active',
        lineupSlotId: player.lineupSlotId
      }));
  }

  // Get league information
  async getLeagueInfo(leagueId) {
    try {
      const [league, users, rosters] = await Promise.all([
        sleeperApi.getLeague(leagueId),
        sleeperApi.getLeagueUsers(leagueId),
        sleeperApi.getLeagueRosters(leagueId)
      ]);

      return {
        ...league,
        users: users,
        rosters: rosters
      };
    } catch (error) {
      console.error('Error fetching league info:', error);
      throw error;
    }
  }

  // Get user's leagues
  async getUserLeagues(userId, sport = null, season = null) {
    try {
      const sportParam = sport || appConfig.defaultSport;
      const seasonParam = season || appConfig.defaultSeason;
      
      const leagues = await sleeperApi.getUserLeagues(userId, sportParam, seasonParam);
      
      // Enrich league data with additional info
      const enrichedLeagues = await Promise.all(
        leagues.map(async (league) => {
          try {
            const [users, rosters] = await Promise.all([
              sleeperApi.getLeagueUsers(league.league_id),
              sleeperApi.getLeagueRosters(league.league_id)
            ]);
            
            return {
              ...league,
              users: users,
              rosters: rosters
            };
          } catch (error) {
            console.error(`Error enriching league ${league.league_id}:`, error);
            return league;
          }
        })
      );

      return enrichedLeagues;
    } catch (error) {
      console.error('Error fetching user leagues:', error);
      throw error;
    }
  }

  // Get cache status information
  getCacheStatus() {
    const now = Date.now();
    const playerCacheAge = this.lastPlayerUpdate ? now - this.lastPlayerUpdate : null;
    const playerCacheValid = playerCacheAge && playerCacheAge < this.CACHE_DURATION;
    
    return {
      playerCache: {
        lastUpdate: this.lastPlayerUpdate ? new Date(this.lastPlayerUpdate) : null,
        age: playerCacheAge,
        isValid: playerCacheValid,
        duration: this.CACHE_DURATION,
        remaining: playerCacheValid ? this.CACHE_DURATION - playerCacheAge : 0
      },
      rateLimit: {
        sleeper: sleeperApi.getRateLimitStatus(),
        espn: espnApi.getCacheStatus()
      }
    };
  }
}

// Create and export a singleton instance
const fantasyDataService = new FantasyDataService();
export default fantasyDataService;
