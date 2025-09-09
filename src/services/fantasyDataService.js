// Fantasy Data Service
// Handles business logic for fantasy football data using Sleeper and ESPN APIs

import sleeperApi from './sleeperApi';
import espnApi from './espnApi';
import projectionsService from './projectionsService';
import appConfig from '../config/appConfig';

class FantasyDataService {
  constructor() {
    this.playerCache = null;
    this.lastPlayerUpdate = null;
    this.CACHE_DURATION = appConfig.playerCacheDuration;
    
    // League-specific caches
    this.leagueCache = new Map();
    this.rostersCache = new Map();
    this.usersCache = new Map();
    this.leagueSettingsCache = new Map();
    this.LEAGUE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for league data
  }

  // Cache management helpers for league data
  getCachedLeagueData(cacheKey, cache) {
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.LEAGUE_CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  setCachedLeagueData(cacheKey, data, cache) {
    cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Get league rosters with caching
  async getLeagueRostersWithCache(leagueId) {
    const cacheKey = `rosters_${leagueId}`;
    const cached = this.getCachedLeagueData(cacheKey, this.rostersCache);
    
    if (cached) {
      return cached;
    }

    const rosters = await sleeperApi.getLeagueRosters(leagueId);
    this.setCachedLeagueData(cacheKey, rosters, this.rostersCache);
    return rosters;
  }

  // Get league users with caching
  async getLeagueUsersWithCache(leagueId) {
    const cacheKey = `users_${leagueId}`;
    const cached = this.getCachedLeagueData(cacheKey, this.usersCache);
    
    if (cached) {
      return cached;
    }

    const users = await sleeperApi.getLeagueUsers(leagueId);
    this.setCachedLeagueData(cacheKey, users, this.usersCache);
    return users;
  }

  // Get league settings with caching
  async getLeagueSettingsWithCache(leagueId) {
    const cacheKey = `settings_${leagueId}`;
    const cached = this.getCachedLeagueData(cacheKey, this.leagueSettingsCache);
    
    if (cached) {
      return cached;
    }

    const league = await sleeperApi.getLeague(leagueId);
    const settings = league.scoring_settings || {};
    this.setCachedLeagueData(cacheKey, settings, this.leagueSettingsCache);
    return settings;
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
          this.getLeagueRostersWithCache(leagueId),
          this.getLeagueUsersWithCache(leagueId),
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
        // If no week specified, get current week from NFL state
        if (!week) {
          week = await projectionsService.getCurrentNFLWeek();
        }

        const [matchups, users, players] = await Promise.all([
          sleeperApi.getLeagueMatchups(leagueId, week),
          this.getLeagueUsersWithCache(leagueId),
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
          this.getLeagueRostersWithCache(leagueId),
          this.getPlayersWithCache()
        ]);

        // Get all rostered player IDs
        const rosteredPlayerIds = new Set();
        rosters.forEach(roster => {
          roster.players.forEach(playerId => {
            rosteredPlayerIds.add(playerId);
          });
        });

        console.log(`Found ${rosteredPlayerIds.size} rostered players out of ${Object.keys(players).length} total players`);
        console.log(`Looking for free agents with position filter: ${position || 'none'}`);

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
          if (position) {
            // For defenses, check both position and fantasy_positions
            if (position === 'DEF') {
              if (player.position !== 'DEF' && (!player.fantasy_positions || !player.fantasy_positions.includes('DEF'))) {
                return false;
              }
            } else {
              // For other positions, check fantasy_positions
              if (!player.fantasy_positions || !player.fantasy_positions.includes(position)) {
                return false;
              }
            }
          }

          return true;
        });

        console.log(`After filtering: ${freeAgents.length} free agents found`);
        if (position && freeAgents.length > 0) {
          console.log(`Sample free agents for ${position}:`, 
            freeAgents.slice(0, 3).map(p => `${p.first_name} ${p.last_name} (position: ${p.position}, fantasy_positions: ${p.fantasy_positions?.join(', ') || 'none'})`));
        }

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

  // Get top free agents by position with projections
  async getTopFreeAgentsByPosition(leagueId, platform = 'sleeper', season = null) {
    try {
      const currentSeason = season || await projectionsService.getCurrentNFLSeason();
      const currentWeek = await projectionsService.getCurrentNFLWeek();
      
      console.log(`Fetching top free agents by position for league ${leagueId}, week ${currentWeek}`);
      
      // Get league settings for scoring
      const leagueSettings = await this.getLeagueSettingsWithCache(leagueId);
      const scoringSettings = leagueSettings?.scoring_settings;
      const scoringType = this.getScoringType(scoringSettings);
      const pointsField = scoringType === 'ppr' ? 'pts_ppr' : 'pts_half_ppr';
      
      console.log(`Using scoring type: ${scoringType}, points field: ${pointsField}`);
      
      // Test: Get some free agents without position filter first
      console.log('Testing free agents fetch without position filter...');
      const testFreeAgents = await this.getFreeAgents(leagueId, null, 10, platform);
      console.log(`Test found ${testFreeAgents.length} free agents without position filter`);
      
      // Get free agents for each position
      const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
      const topFreeAgentsByPosition = {};
      
      for (const position of positions) {
        console.log(`Fetching free agents for position: ${position}`);
        
        // Get free agents for this position
        const freeAgents = await this.getFreeAgents(leagueId, position, 50, platform); // Get more to ensure we have enough with projections
        
        console.log(`Found ${freeAgents.length} free agents for position ${position}:`, 
          freeAgents.slice(0, 3).map(p => `${p.first_name} ${p.last_name} (${p.player_id})`));
        
        if (freeAgents.length === 0) {
          console.log(`No free agents found for position: ${position}`);
          topFreeAgentsByPosition[position] = [];
          continue;
        }
        
        // Get player IDs for projections and stats
        const playerIds = freeAgents.map(player => player.player_id);
        
        // Get projections and stats for these players (same as roster players)
        const projections = await projectionsService.getPlayerProjections(playerIds, currentSeason, currentWeek, 'regular', scoringType);
        const stats = await projectionsService.getHistoricalStats(currentSeason, currentWeek - 1, 'regular');
        
        // Use the same enhancement logic as roster players
        console.log(`Enhancing ${freeAgents.length} free agents for position ${position}...`);
        let enhancedFreeAgents = [];
        try {
          enhancedFreeAgents = await this.enhancePlayerData(freeAgents, projections, stats, scoringSettings, currentWeek, currentSeason);
          console.log(`Enhanced ${enhancedFreeAgents.length} free agents for position ${position}`);
        } catch (error) {
          console.error(`Error enhancing free agents for position ${position}:`, error);
          // Fallback to simple enhancement if the full enhancement fails
          enhancedFreeAgents = freeAgents.map(player => ({
            ...player,
            projections: {
              projected_points: 0,
              stats: {}
            },
            stats: {
              previous_week: { points: 0, stats: {} },
              season_avg: 0,
              weekly_stats: {}
            }
          }));
        }
        
        // Sort by projected points (descending) and take top 3
        let topFreeAgents = enhancedFreeAgents
          .filter(player => player.projections && player.projections.projected_points > 0) // Only include players with projections
          .sort((a, b) => b.projections.projected_points - a.projections.projected_points)
          .slice(0, 3);

        // If no players have projections, show top 3 free agents anyway
        if (topFreeAgents.length === 0 && enhancedFreeAgents.length > 0) {
          console.log(`No projections found for ${position}, showing top 3 free agents anyway`);
          topFreeAgents = enhancedFreeAgents.slice(0, 3);
        }
        
        console.log(`Top ${topFreeAgents.length} free agents for ${position}:`, 
          topFreeAgents.map(p => `${p.first_name} ${p.last_name} (${p.projections.projected_points.toFixed(1)} pts)`));
        
        topFreeAgentsByPosition[position] = topFreeAgents;
      }
      
      return topFreeAgentsByPosition;
    } catch (error) {
      console.error('Error fetching top free agents by position:', error);
      return {};
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
        this.getLeagueUsersWithCache(leagueId),
        this.getLeagueRostersWithCache(leagueId)
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
              this.getLeagueUsersWithCache(league.league_id),
              this.getLeagueRostersWithCache(league.league_id)
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

  // Get league scoring settings
  async getLeagueScoringSettings(leagueId) {
    try {
      return await this.getLeagueSettingsWithCache(leagueId);
    } catch (error) {
      console.error('Error fetching league scoring settings:', error);
      return {};
    }
  }

  // Get enhanced lineup data with projections and stats
  async getEnhancedLineups(userId, leagueId, platform = 'sleeper', week = null, season = null) {
    try {
      // Get basic lineup data
      const lineup = await this.getCurrentLineups(userId, leagueId, platform);
      
      // Always use current week for now
      const currentWeek = await projectionsService.getCurrentNFLWeek();
      const currentSeason = season || await projectionsService.getCurrentNFLSeason();
      
      // Get league scoring settings
      const scoringSettings = await this.getLeagueScoringSettings(leagueId);
      
      // Get all player IDs from the lineup, but prioritize starters
      const starterIds = (lineup.starters || []).map(p => p.player_id).filter(id => id);
      const benchIds = (lineup.bench || []).map(p => p.player_id).filter(id => id);
      const irIds = (lineup.ir || []).map(p => p.player_id).filter(id => id);
      
      // Get all players for projections
      const priorityPlayerIds = [
        ...starterIds,
        ...benchIds,
        ...irIds
      ];

      if (priorityPlayerIds.length === 0) {
        return lineup;
      }

      console.log(`Fetching current week projections (Week ${currentWeek}) for ${priorityPlayerIds.length} priority players`);

      // Clear projections cache to force fresh API call
      projectionsService.clearProjectionsCache();

      // Only fetch projections - this should contain all the data we need for current week
      const projections = await projectionsService.getPlayerProjections(priorityPlayerIds, currentSeason, currentWeek, 'regular', 'ppr');
      const projectionsData = projections || {};
      
      // Fetch previous week stats for historical data
      const previousWeek = currentWeek > 1 ? currentWeek - 1 : 1;
      console.log(`Fetching previous week stats (Week ${previousWeek}) for historical data`);
      const previousWeekStats = await projectionsService.getHistoricalStats(currentSeason, previousWeek, 'regular');
      console.log(`Retrieved stats for ${Object.keys(previousWeekStats).length} players from Week ${previousWeek}`);
      
      const statsData = previousWeekStats;

      // Enhance lineup data with projections and stats
      const enhancedLineup = {
        ...lineup,
        starters: await this.enhancePlayerData(lineup.starters, projectionsData, statsData, scoringSettings, currentWeek, currentSeason),
        bench: await this.enhancePlayerData(lineup.bench, projectionsData, statsData, scoringSettings, currentWeek, currentSeason),
        ir: await this.enhancePlayerData(lineup.ir, projectionsData, statsData, scoringSettings, currentWeek, currentSeason),
        metadata: {
          week: currentWeek,
          season: currentSeason,
          scoringSettings: scoringSettings,
          lastUpdated: new Date().toISOString(),
        dataQuality: {
          projectionsLoaded: Object.keys(projectionsData).length > 0,
          statsLoaded: Object.keys(statsData).length > 0,
          totalPlayers: priorityPlayerIds.length,
          projectionsCount: Object.keys(projectionsData).length,
          statsCount: Object.keys(statsData).length,
          previousWeek: previousWeek
        }
        }
      };

      return enhancedLineup;
    } catch (error) {
      console.error('Error fetching enhanced lineups:', error);
      // Return basic lineup if enhanced data fails
      return await this.getCurrentLineups(userId, leagueId, platform);
    }
  }

  // Determine scoring type based on league settings
  getScoringType(scoringSettings) {
    if (!scoringSettings) return 'half_ppr';
    
    console.log('Analyzing scoring settings:', scoringSettings);
    
    // Check reception scoring
    const rec = scoringSettings.rec || 0;
    const rec_half = scoringSettings.rec_half || 0;
    
    console.log('Reception scoring - rec:', rec, 'rec_half:', rec_half);
    
    if (rec === 1) {
      console.log('League uses PPR scoring (rec = 1)');
      return 'ppr';
    } else if (rec === 0.5 || rec_half === 0.5) {
      console.log('League uses Half-PPR scoring (rec = 0.5 or rec_half = 0.5)');
      return 'half_ppr';
    } else if (rec === 0 && rec_half === 0) {
      console.log('League uses Standard scoring (no reception points)');
      return 'half_ppr'; // Default to half_ppr for standard
    } else {
      console.log('League uses custom scoring, defaulting to half_ppr');
      return 'half_ppr';
    }
  }

  // Enhance player data with projections and stats
  async enhancePlayerData(players, projections, stats, scoringSettings, currentWeek, currentSeason) {
    if (!Array.isArray(players)) return [];

    // Determine scoring type for this league
    const scoringType = this.getScoringType(scoringSettings);
    const pointsField = scoringType === 'ppr' ? 'pts_ppr' : 'pts_half_ppr';
    
    console.log('Enhancing player data:', {
      playersCount: players.length,
      projectionsKeys: Object.keys(projections),
      statsKeys: Object.keys(stats),
      scoringSettings,
      currentWeek,
      scoringType,
      pointsField
    });

    const enhancedPlayers = [];
    
    for (const player of players) {
      const playerId = player.player_id;
      const playerProjections = projections[playerId] || {};
      const playerStats = stats[playerId] || {};

      console.log(`Processing player ${playerId}:`, {
        playerName: `${player.first_name} ${player.last_name}`,
        playerProjections,
        playerStats,
        statsKeys: Object.keys(playerStats)
      });

      // Get projected points directly from the API response
      let projectedPoints = 0;
      if (playerProjections.projected_points !== undefined) {
        projectedPoints = playerProjections.projected_points;
        console.log(`✅ Player ${playerId} projected points from bulk API: ${projectedPoints}`, playerProjections);
      } else {
        // Try to get player-specific projections as fallback
        try {
          const playerSpecificProjections = await projectionsService.getPlayerSpecificProjections(playerId, currentSeason, 'regular');
          const currentWeekProjection = playerSpecificProjections[currentWeek];
          if (currentWeekProjection && currentWeekProjection[pointsField] !== undefined) {
            projectedPoints = currentWeekProjection[pointsField];
            console.log(`✅ Player ${playerId} projected points from player-specific API: ${projectedPoints} (using ${pointsField})`);
          } else {
            console.log(`❌ No projection data found for player ${playerId} in any API`);
          }
        } catch (error) {
          console.log(`❌ Error fetching player-specific projections for ${playerId}:`, error);
        }
      }

      // Get previous week points from historical stats
      let previousWeekPoints = 0;
      let previousWeekStats = {};
      if (playerStats && playerStats[pointsField] !== undefined) {
        previousWeekPoints = playerStats[pointsField];
        previousWeekStats = playerStats;
        console.log(`📊 Player ${playerId} previous week points: ${previousWeekPoints} (using ${pointsField})`);
      } else {
        console.log(`📊 No previous week stats found for player ${playerId} (looking for ${pointsField})`);
      }

      // Calculate season average from player-specific stats
      let seasonAvg = 0;
      try {
        console.log(`🔍 Starting season average calculation for player ${playerId}...`);
        seasonAvg = await projectionsService.getPlayerSeasonAverage(playerId, currentSeason, 'regular', scoringType);
        console.log(`📈 Player ${playerId} season average result: ${seasonAvg.toFixed(2)}`);
      } catch (error) {
        console.log(`📈 Error calculating season average for player ${playerId}:`, error);
        seasonAvg = 0;
      }

      // Calculate Rest of Year projections (sum of all future weeks)
      let restOfYearPoints = 0;
      try {
        console.log(`🔮 Calculating Rest of Year projections for player ${playerId}...`);
        const playerSpecificProjections = await projectionsService.getPlayerSpecificProjections(playerId, currentSeason, 'regular');
        console.log(`🔮 Player-specific projections data for ${playerId}:`, playerSpecificProjections);
        
        if (!playerSpecificProjections || typeof playerSpecificProjections !== 'object') {
          console.log(`🔮 No projections data found for player ${playerId} - playerSpecificProjections:`, playerSpecificProjections);
          restOfYearPoints = 0;
        } else {
          console.log(`🔮 Available weeks in player projections:`, Object.keys(playerSpecificProjections));
          
          // Sum projections for all weeks after current week
          for (let week = currentWeek + 1; week <= 18; week++) { // Regular season goes to week 18
            const weekProjection = playerSpecificProjections[week];
            console.log(`🔮 Processing week ${week} for player ${playerId}:`, weekProjection);
            
            if (weekProjection && weekProjection.stats && weekProjection.stats[pointsField] !== undefined) {
              restOfYearPoints += weekProjection.stats[pointsField];
              console.log(`  Week ${week}: ${weekProjection.stats[pointsField]} points (using ${pointsField})`);
            } else if (weekProjection && weekProjection[pointsField] !== undefined) {
              // Fallback: check if points are directly on the week object
              restOfYearPoints += weekProjection[pointsField];
              console.log(`  Week ${week}: ${weekProjection[pointsField]} points (direct field, using ${pointsField})`);
            } else {
              console.log(`  Week ${week}: No valid projection data for ${pointsField} (weekProjection:`, weekProjection, ')');
            }
          }
        }
        console.log(`🔮 Player ${playerId} Rest of Year total: ${restOfYearPoints.toFixed(2)} points`);
      } catch (error) {
        console.log(`🔮 Error calculating Rest of Year for player ${playerId}:`, error);
        restOfYearPoints = 0;
      }
      
      console.log(`Player ${playerId} - Projected: ${projectedPoints}, Previous: ${previousWeekPoints}, Season Avg: ${seasonAvg}, Rest of Year: ${restOfYearPoints}`);

      const enhancedPlayer = {
        ...player,
        projections: {
          projected_points: projectedPoints,
          rest_of_year: restOfYearPoints,
          stats: playerProjections.stats || {}
        },
        stats: {
          previous_week: {
            points: previousWeekPoints,
            stats: previousWeekStats
          },
          season_avg: seasonAvg,
          weekly_stats: playerStats
        }
      };

      console.log(`🎯 Enhanced player ${playerId} result:`, {
        playerName: `${player.first_name} ${player.last_name}`,
        projected: enhancedPlayer.projections.projected_points,
        restOfYear: enhancedPlayer.projections.rest_of_year,
        previousWeek: enhancedPlayer.stats.previous_week.points,
        seasonAvg: enhancedPlayer.stats.season_avg,
        fullProjections: enhancedPlayer.projections
      });

      enhancedPlayers.push(enhancedPlayer);
    }
    
    return enhancedPlayers;
  }

  // Get NFL games for current week from Sleeper
  async getCurrentNFLGames() {
    try {
      const currentSeason = await projectionsService.getCurrentNFLSeason();
      const currentWeek = await projectionsService.getCurrentNFLWeek();
      
      console.log(`Fetching NFL games for Week ${currentWeek} of ${currentSeason}`);
      console.log('Current NFL state:', { currentSeason, currentWeek });
      
      // Since Sleeper doesn't have a direct NFL schedule endpoint, let's use a fallback approach
      // We'll create mock data for now based on the known Week 2 schedule
      const mockGames = this.getMockNFLGames(currentWeek);
      
      console.log(`Found ${mockGames.length} NFL games for Week ${currentWeek}`);
      
      return mockGames;
    } catch (error) {
      console.error('Error fetching NFL games:', error);
      return [];
    }
  }

  // Get user's matchup for a specific league and week
  async getUserMatchup(leagueId, rosterId, week) {
    try {
      console.log(`Fetching matchups for league ${leagueId}, week ${week}, roster ${rosterId}`);
      const matchups = await sleeperApi.getLeagueMatchups(leagueId, week);
      console.log(`Received ${matchups.length} matchups:`, matchups);
      
      // Find the matchup where the user is playing
      const userMatchup = matchups.find(matchup => {
        console.log(`Checking matchup: roster_id=${matchup.roster_id}, matchup_id=${matchup.matchup_id}`);
        return matchup.roster_id === rosterId;
      });
      
      console.log(`Found user matchup:`, userMatchup);
      return { userMatchup, allMatchups: matchups };
    } catch (error) {
      console.error('Error getting user matchup:', error);
      return null;
    }
  }

  // Get all players in a specific NFL game across all leagues
  async getPlayersInGame(game, allTeams) {
    try {
      const myPlayers = [];
      const opposingPlayers = [];
      
      console.log(`Getting players for game: ${game.awayTeam} @ ${game.homeTeam}`);
      console.log('All teams data:', allTeams);
      console.log('Team structure sample:', allTeams[0]);
      
      // Get all players data
      const allPlayers = await this.getPlayersWithCache();
      
      // Process each team/league
      for (const team of allTeams) {
        try {
          // Validate team data
          if (!team.leagueId) {
            console.warn('Team missing leagueId:', team);
            continue;
          }
          
          console.log(`Processing team: ${team.leagueName} (${team.leagueId})`);
          
          // Get roster data for this league
          const rosters = await this.getLeagueRostersWithCache(team.leagueId);
          const users = await this.getLeagueUsersWithCache(team.leagueId);
          
          console.log(`Found ${rosters.length} rosters and ${users.length} users for ${team.leagueName}`);
          console.log('Looking for user:', team.username);
          console.log('Available roster owners:', rosters.map(r => r.owner_id));
          console.log('Available users:', users.map(u => ({ id: u.user_id, name: u.display_name })));
          
          // Find the user by display name first, then get their roster
          const user = users.find(u => u.display_name === team.username);
          if (!user) {
            console.log(`No user found with display name ${team.username} in ${team.leagueName}`);
            continue;
          }
          
          console.log(`Found user: ${user.display_name} (${user.user_id})`);
          
          // Find the user's roster
          const userRoster = rosters.find(roster => roster.owner_id === user.user_id);
          if (!userRoster) {
            console.log(`No roster found for user ${user.display_name} (${user.user_id}) in ${team.leagueName}`);
            continue;
          }
          
          console.log(`Found user roster with ${userRoster.players?.length || 0} players`);
          
          // Get all players in this league
          const allLeaguePlayers = userRoster.players || [];
          
          // Check each player to see if they're in this game
          console.log(`Checking ${allLeaguePlayers.length} players for game ${game.awayTeam} @ ${game.homeTeam}`);
          let playersInGame = 0;
          
          for (const playerId of allLeaguePlayers) {
            const player = allPlayers[playerId];
            if (!player) continue;
            
            // Check if player is on one of the teams in this game
            if (player.team === game.awayTeam || player.team === game.homeTeam) {
              const isStarter = userRoster.starters?.includes(playerId) || false;
              
              // Only include starters
              if (isStarter) {
                playersInGame++;
                console.log(`Found starter in game: ${player.first_name} ${player.last_name} (${player.team})`);
                
                const playerData = {
                  ...player,
                  leagueName: team.leagueName,
                  leagueId: team.leagueId,
                  isStarter: true
                };
                
                myPlayers.push(playerData);
              }
            }
          }
          
          console.log(`Found ${playersInGame} players from ${team.leagueName} in game ${game.awayTeam} @ ${game.homeTeam}`);
          
          // Get opposing players (only starters from teams you're playing against this week)
          const currentWeek = await projectionsService.getCurrentNFLWeek();
          
          // First, find the user's roster ID (not owner ID)
          const userRosterForMatchup = rosters.find(roster => roster.owner_id === user.user_id);
          const userRosterId = userRosterForMatchup ? userRosterForMatchup.roster_id : null;
          
          console.log(`User roster ID for ${team.leagueName}: ${userRosterId} (owner: ${user.user_id})`);
          
          const matchupData = await this.getUserMatchup(team.leagueId, userRosterId, currentWeek);
          
          console.log(`Matchup data for ${team.leagueName}:`, matchupData);
          
          // Get opponent roster ID from matchup
          let opponentRosterId = null;
          if (matchupData && matchupData.userMatchup) {
            const userMatchup = matchupData.userMatchup;
            const allMatchups = matchupData.allMatchups;
            
            console.log(`Full matchup data for ${team.leagueName}:`, userMatchup);
            
            // Find the opponent by looking for the matchup with the same matchup_id but different roster_id
            const opponentMatchup = allMatchups.find(matchup => 
              matchup.matchup_id === userMatchup.matchup_id && 
              matchup.roster_id !== userMatchup.roster_id
            );
            
            if (opponentMatchup) {
              opponentRosterId = opponentMatchup.roster_id;
              console.log(`Your roster ID: ${userMatchup.roster_id}, Opponent roster ID: ${opponentRosterId}`);
            } else {
              console.log(`Could not find opponent matchup for ${team.leagueName}`);
            }
          } else {
            console.log(`No matchup found for ${team.leagueName} - will show all opposing players`);
          }
          
          console.log(`Final opponent roster ID for ${team.leagueName}:`, opponentRosterId);
          
          for (const roster of rosters) {
            if (roster.owner_id === user.user_id) continue; // Skip user's own roster
            
            console.log(`Checking roster: ${roster.roster_id} (owner: ${roster.owner_id})`);
            
          // Only include players from teams you're playing against this week
          if (opponentRosterId && roster.roster_id !== opponentRosterId) {
            console.log(`Skipping roster ${roster.roster_id} - not opponent (${opponentRosterId})`);
            continue;
          }
          
          if (opponentRosterId) {
            console.log(`Including roster ${roster.roster_id} - this is your opponent!`);
          } else {
            console.log(`Including roster ${roster.roster_id} - no matchup found, showing all players`);
          }
            
            const rosterUser = users.find(u => u.user_id === roster.owner_id);
            const rosterPlayers = roster.players || [];
            
            for (const playerId of rosterPlayers) {
              const player = allPlayers[playerId];
              if (!player) continue;
              
              // Check if player is on one of the teams in this game
              if (player.team === game.awayTeam || player.team === game.homeTeam) {
                const isStarter = roster.starters?.includes(playerId) || false;
                
                // Only include starters
                if (isStarter) {
                  const playerData = {
                    ...player,
                    leagueName: team.leagueName,
                    leagueId: team.leagueId,
                    opponentName: rosterUser?.display_name || 'Unknown',
                    isStarter: true
                  };
                  
                  opposingPlayers.push(playerData);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error processing team ${team.leagueName}:`, error);
        }
      }
      
      console.log(`Found ${myPlayers.length} my players and ${opposingPlayers.length} opposing players in game ${game.awayTeam} @ ${game.homeTeam}`);
      
      return {
        myPlayers: myPlayers.sort((a, b) => {
          // Sort by team, then by position, then by name
          if (a.team !== b.team) return a.team.localeCompare(b.team);
          if (a.position !== b.position) return a.position.localeCompare(b.position);
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        }),
        opposingPlayers: opposingPlayers.sort((a, b) => {
          // Sort by team, then by position, then by name
          if (a.team !== b.team) return a.team.localeCompare(b.team);
          if (a.position !== b.position) return a.position.localeCompare(b.position);
          return `${a.first_name} ${b.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        })
      };
    } catch (error) {
      console.error('Error getting players in game:', error);
      return { myPlayers: [], opposingPlayers: [] };
    }
  }

  // Mock NFL games data for testing (based on known Week 2 2025 schedule)
  getMockNFLGames(week) {
    if (week !== 2) {
      return [];
    }

    return [
      {
        id: 'game_1',
        awayTeam: 'WAS',
        homeTeam: 'GB',
        gameTime: '2025-09-11T20:15:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_2',
        awayTeam: 'CLE',
        homeTeam: 'BAL',
        gameTime: '2025-09-14T13:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_3',
        awayTeam: 'JAX',
        homeTeam: 'CIN',
        gameTime: '2025-09-14T13:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_4',
        awayTeam: 'NYG',
        homeTeam: 'DAL',
        gameTime: '2025-09-14T13:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_5',
        awayTeam: 'CHI',
        homeTeam: 'DET',
        gameTime: '2025-09-14T13:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_6',
        awayTeam: 'NE',
        homeTeam: 'MIA',
        gameTime: '2025-09-14T13:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_7',
        awayTeam: 'SF',
        homeTeam: 'NO',
        gameTime: '2025-09-14T13:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_8',
        awayTeam: 'BUF',
        homeTeam: 'NYJ',
        gameTime: '2025-09-14T13:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_9',
        awayTeam: 'SEA',
        homeTeam: 'PIT',
        gameTime: '2025-09-14T13:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_10',
        awayTeam: 'LAR',
        homeTeam: 'TEN',
        gameTime: '2025-09-14T13:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_11',
        awayTeam: 'CAR',
        homeTeam: 'ARI',
        gameTime: '2025-09-14T16:05:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_12',
        awayTeam: 'DEN',
        homeTeam: 'IND',
        gameTime: '2025-09-14T16:05:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_13',
        awayTeam: 'PHI',
        homeTeam: 'KC',
        gameTime: '2025-09-14T16:25:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_14',
        awayTeam: 'ATL',
        homeTeam: 'MIN',
        gameTime: '2025-09-14T20:20:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_15',
        awayTeam: 'TB',
        homeTeam: 'HOU',
        gameTime: '2025-09-15T19:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      },
      {
        id: 'game_16',
        awayTeam: 'LAC',
        homeTeam: 'LV',
        gameTime: '2025-09-15T22:00:00-04:00',
        status: 'upcoming',
        week: 2,
        season: 2025
      }
    ].sort((a, b) => new Date(a.gameTime) - new Date(b.gameTime));
  }

  // Clear all caches (for testing or emergency reset)
  clearAllCaches() {
    this.playerCache = null;
    this.lastPlayerUpdate = null;
    this.leagueCache.clear();
    this.rostersCache.clear();
    this.usersCache.clear();
    this.leagueSettingsCache.clear();
    
    // Also clear projections service cache
    if (projectionsService.clearAllCaches) {
      projectionsService.clearAllCaches();
    }
  }

  // Get cache status information
  getCacheStatus() {
    const now = Date.now();
    const playerCacheAge = this.lastPlayerUpdate ? now - this.lastPlayerUpdate : null;
    const playerCacheValid = playerCacheAge && playerCacheAge < this.CACHE_DURATION;
    
    // Calculate league cache statistics
    const leagueCacheStats = {
      rosters: this.rostersCache.size,
      users: this.usersCache.size,
      settings: this.leagueSettingsCache.size,
      total: this.rostersCache.size + this.usersCache.size + this.leagueSettingsCache.size
    };
    
    return {
      playerCache: {
        lastUpdate: this.lastPlayerUpdate ? new Date(this.lastPlayerUpdate) : null,
        age: playerCacheAge,
        isValid: playerCacheValid,
        duration: this.CACHE_DURATION,
        remaining: playerCacheValid ? this.CACHE_DURATION - playerCacheAge : 0
      },
      leagueCache: {
        ...leagueCacheStats,
        duration: this.LEAGUE_CACHE_DURATION
      },
      projectionsCache: projectionsService.getCacheStatus(),
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
