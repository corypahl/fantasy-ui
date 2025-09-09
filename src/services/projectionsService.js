// Projections Service
// Handles fetching and processing player projections and stats from Sleeper

import sleeperApi from './sleeperApi';
import appConfig from '../config/appConfig';

class ProjectionsService {
  constructor() {
    this.projectionsCache = new Map();
    this.statsCache = new Map();
    this.nflStateCache = new Map();
    this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  }

  // Get weekly projections for a specific week
  async getWeeklyProjections(season, week, seasonType = 'regular', scoring = 'ppr') {
    console.log('getWeeklyProjections called with:', { season, week, seasonType, scoring });
    
    const cacheKey = `projections_${season}_${week}_${seasonType}_${scoring}`;
    const cached = this.getCachedData(cacheKey, this.projectionsCache);
    
    if (cached) {
      console.log('Returning cached projections data');
      return cached;
    }
    
    // Force fresh data for debugging
    console.log('No cached data found, making fresh API call');

    try {
      // Use the specific endpoint format: /v1/projections/nfl/regular/2025/2
      // Add cache-busting parameter to force fresh data
      const timestamp = Date.now();
      const url = `https://api.sleeper.app/v1/projections/nfl/${seasonType}/${season}/${week}?t=${timestamp}`;
      console.log('Making network request to:', url);
      
      const response = await fetch(url, {
        method: 'GET'
      });
      console.log('Response status:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const projections = await response.json();
      console.log('Raw projections response sample:', Object.keys(projections).slice(0, 5), Object.values(projections).slice(0, 2));
      console.log('Total projections count:', Object.keys(projections).length);
      
      // Check if we have any players with actual projection data
      const playersWithProjections = Object.entries(projections).filter(([id, data]) => data.pts_half_ppr !== undefined);
      console.log('Players with pts_half_ppr data:', playersWithProjections.length);
      console.log('Sample players with projections:', playersWithProjections.slice(0, 3));
      
      // Cache the results
      this.setCachedData(cacheKey, projections, this.projectionsCache);
      
      return projections;
    } catch (error) {
      console.error('Error fetching weekly projections:', error);
      throw error;
    }
  }

  // Get player stats for a specific player
  async getPlayerStats(playerId, season, seasonType = 'regular', grouping = 'week') {
    const cacheKey = `stats_${playerId}_${season}_${seasonType}_${grouping}`;
    const cached = this.getCachedData(cacheKey, this.statsCache);
    
    if (cached) {
      return cached;
    }

    try {
      const stats = await sleeperApi.getPlayerStats(playerId, season, seasonType, grouping);
      
      // Cache the results
      this.setCachedData(cacheKey, stats, this.statsCache);
      
      return stats;
    } catch (error) {
      console.error(`Error fetching stats for player ${playerId}:`, error);
      throw error;
    }
  }

  // Get player research data
  async getPlayerResearch(seasonType, season, week) {
    const cacheKey = `research_${seasonType}_${season}_${week}`;
    const cached = this.getCachedData(cacheKey, this.projectionsCache);
    
    if (cached) {
      return cached;
    }

    try {
      const research = await sleeperApi.getPlayerResearch(seasonType, season, week);
      
      // Cache the results
      this.setCachedData(cacheKey, research, this.projectionsCache);
      
      return research;
    } catch (error) {
      console.error('Error fetching player research:', error);
      throw error;
    }
  }

  // Get projections for specific players
  async getPlayerProjections(playerIds, season, week, seasonType = 'regular', scoring = 'ppr') {
    try {
      console.log('=== getPlayerProjections called ===');
      console.log(`Fetching projections for ${playerIds.length} players:`, {
        playerIds: playerIds.slice(0, 5), // Show first 5 IDs
        season,
        week,
        seasonType,
        scoring
      });

      const allProjections = await this.getWeeklyProjections(season, week, seasonType, scoring);
      console.log('Raw projections response:', {
        type: typeof allProjections,
        isArray: Array.isArray(allProjections),
        keys: typeof allProjections === 'object' ? Object.keys(allProjections).slice(0, 5) : 'N/A',
        sample: Array.isArray(allProjections) ? allProjections.slice(0, 2) : Object.values(allProjections).slice(0, 2)
      });
      
      // Filter projections for the requested players and extract pts_half_ppr
      const playerProjections = {};
      
      console.log('Looking for projections for player IDs:', playerIds);
      console.log('Available projection keys:', Object.keys(allProjections).slice(0, 10));
      
      if (typeof allProjections === 'object' && !Array.isArray(allProjections)) {
        // Projections are returned as an object with player_id as keys
        playerIds.forEach(playerId => {
          if (allProjections[playerId]) {
            const projectionData = allProjections[playerId];
            playerProjections[playerId] = {
              player_id: playerId,
              projected_points: projectionData.pts_half_ppr || 0,
              stats: projectionData // Keep all stats for potential future use
            };
            console.log(`✅ Player ${playerId} projection:`, {
              pts_half_ppr: projectionData.pts_half_ppr,
              hasStats: !!projectionData.pts_half_ppr,
              allKeys: Object.keys(projectionData)
            });
          } else {
            console.log(`❌ No projection data found for player ${playerId}`);
            playerProjections[playerId] = {
              player_id: playerId,
              projected_points: 0,
              stats: {}
            };
          }
        });
      } else {
        // Fallback for array format (shouldn't happen with this endpoint)
        console.log('Unexpected projections format:', typeof allProjections);
        playerIds.forEach(playerId => {
          playerProjections[playerId] = {
            player_id: playerId,
            projected_points: 0,
            stats: {}
          };
        });
      }
      
      console.log(`Filtered projections for ${Object.keys(playerProjections).length} players:`, playerProjections);
      
      return playerProjections;
    } catch (error) {
      console.error('Error fetching player projections:', error);
      // Return empty projections for all players if API fails
      const emptyProjections = {};
      playerIds.forEach(playerId => {
        emptyProjections[playerId] = {
          player_id: playerId,
          projected_points: 0,
          stats: {}
        };
      });
      return emptyProjections;
    }
  }

  // Get stats for specific players with batching to avoid rate limits
  async getPlayerStatsBatch(playerIds, season, seasonType = 'regular', grouping = 'week') {
    try {
      console.log(`Fetching stats for ${playerIds.length} players:`, {
        playerIds: playerIds.slice(0, 5), // Show first 5 IDs
        season,
        seasonType,
        grouping
      });

      // Process in smaller batches to avoid rate limits
      const batchSize = 5; // Process 5 players at a time
      const playerStats = {};
      
      for (let i = 0; i < playerIds.length; i += batchSize) {
        const batch = playerIds.slice(i, i + batchSize);
        console.log(`Processing stats batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(playerIds.length / batchSize)}: ${batch.length} players`);
        
        const statsPromises = batch.map(playerId => 
          this.getPlayerStats(playerId, season, seasonType, grouping)
        );
        
        const statsResults = await Promise.allSettled(statsPromises);
        
        statsResults.forEach((result, index) => {
          const playerId = batch[index];
          if (result.status === 'fulfilled' && result.value) {
            playerStats[playerId] = result.value;
          } else if (result.status === 'rejected') {
            console.log(`Failed to fetch stats for player ${playerId}:`, result.reason);
            // Set empty stats for failed players
            playerStats[playerId] = {};
          }
        });
        
        // Add a small delay between batches to be respectful to the API
        if (i + batchSize < playerIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        }
      }
      
      console.log(`Stats fetched for ${Object.keys(playerStats).length} players:`, {
        playerIds: Object.keys(playerStats).slice(0, 5),
        sampleStats: Object.values(playerStats).slice(0, 2)
      });
      
      return playerStats;
    } catch (error) {
      console.error('Error fetching player stats batch:', error);
      // Return empty stats for all players if batch fails
      const emptyStats = {};
      playerIds.forEach(playerId => {
        emptyStats[playerId] = {};
      });
      return emptyStats;
    }
  }

  // Calculate fantasy points based on league scoring settings
  calculateFantasyPoints(stats, scoringSettings) {
    if (!stats || !scoringSettings) {
      console.log('Missing stats or scoring settings:', { stats, scoringSettings });
      return 0;
    }

    console.log('Calculating fantasy points:', { stats, scoringSettings });
    let points = 0;

    // Passing stats
    if (stats.pass_yds) points += (stats.pass_yds / 25) * (scoringSettings.pass_yd || 0.04);
    if (stats.pass_td) points += stats.pass_td * (scoringSettings.pass_td || 4);
    if (stats.pass_int) points += stats.pass_int * (scoringSettings.pass_int || -2);

    // Rushing stats
    if (stats.rush_yds) points += (stats.rush_yds / 10) * (scoringSettings.rush_yd || 0.1);
    if (stats.rush_td) points += stats.rush_td * (scoringSettings.rush_td || 6);

    // Receiving stats
    if (stats.rec) points += stats.rec * (scoringSettings.rec || 0);
    if (stats.rec_yds) points += (stats.rec_yds / 10) * (scoringSettings.rec_yd || 0.1);
    if (stats.rec_td) points += stats.rec_td * (scoringSettings.rec_td || 6);

    // Kicking stats
    if (stats.fgm) points += stats.fgm * (scoringSettings.fgm || 3);
    if (stats.fga) points += stats.fga * (scoringSettings.fga || 0);
    if (stats.xpm) points += stats.xpm * (scoringSettings.xpm || 1);
    if (stats.xpa) points += stats.xpa * (scoringSettings.xpa || 0);

    // Defense stats
    if (stats.def_td) points += stats.def_td * (scoringSettings.def_td || 6);
    if (stats.sack) points += stats.sack * (scoringSettings.sack || 1);
    if (stats.int) points += stats.int * (scoringSettings.int || 2);
    if (stats.fumble_rec) points += stats.fumble_rec * (scoringSettings.fumble_rec || 2);
    if (stats.safety) points += stats.safety * (scoringSettings.safety || 2);
    if (stats.blocked_kick) points += stats.blocked_kick * (scoringSettings.blocked_kick || 2);

    const finalPoints = Math.round(points * 100) / 100; // Round to 2 decimal places
    console.log(`Final calculated points: ${finalPoints}`);
    return finalPoints;
  }

  // Get current NFL week and season from Sleeper API
  async getCurrentNFLState() {
    const cacheKey = 'nfl_state';
    const cached = this.getCachedData(cacheKey, this.projectionsCache);
    
    if (cached) {
      return cached;
    }

    try {
      const nflState = await sleeperApi.getNFLState();
      
      // Cache the results
      this.setCachedData(cacheKey, nflState, this.projectionsCache);
      
      return nflState;
    } catch (error) {
      console.error('Error fetching NFL state:', error);
      // Fallback to hardcoded values if API fails
      return {
        week: 1,
        season: new Date().getFullYear(),
        season_type: 'regular'
      };
    }
  }

  // Get current NFL week
  async getCurrentNFLWeek() {
    try {
      const nflState = await this.getCurrentNFLState();
      return nflState.week || 1;
    } catch (error) {
      console.error('Error getting current NFL week:', error);
      return 1; // Fallback to week 1
    }
  }

  // Get current NFL season
  async getCurrentNFLSeason() {
    try {
      const nflState = await this.getCurrentNFLState();
      return nflState.season || new Date().getFullYear();
    } catch (error) {
      console.error('Error getting current NFL season:', error);
      return new Date().getFullYear(); // Fallback to current year
    }
  }

  // Cache management helpers
  getCachedData(key, cache) {
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data, cache) {
    cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Clear cache
  clearCache() {
    this.projectionsCache.clear();
    this.statsCache.clear();
  }

  // Clear all caches
  clearAllCaches() {
    this.projectionsCache.clear();
    this.statsCache.clear();
    this.nflStateCache.clear();
  }

  // Clear projections cache specifically
  clearProjectionsCache() {
    this.projectionsCache.clear();
    console.log('Projections cache cleared');
  }

  /**
   * Fetch player-specific projections for a season
   * @param {string} playerId - The player ID
   * @param {number} season - The season year
   * @param {string} seasonType - 'regular' or 'post'
   * @returns {Promise<Object>} Object with week numbers as keys and projection data as values
   */
  async getPlayerSpecificProjections(playerId, season, seasonType = 'regular') {
    console.log('getPlayerSpecificProjections called with:', { playerId, season, seasonType });
    
    const cacheKey = `player_projections_${playerId}_${season}_${seasonType}`;
    const cached = this.getCachedData(cacheKey, this.projectionsCache);
    if (cached) {
      console.log('Returning cached player-specific projections data');
      return cached;
    }

    console.log('No cached player-specific projections found, making fresh API call');
    try {
      const timestamp = Date.now();
      const url = `https://api.sleeper.com/projections/nfl/player/${playerId}?season_type=${seasonType}&season=${season}&grouping=week&t=${timestamp}`;
      console.log('Making network request to:', url);
      
      const response = await fetch(url, {
        method: 'GET'
      });
      console.log('Player-specific projections response status:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const projectionsData = await response.json();
      console.log('Raw player-specific projections response:', projectionsData);

      this.setCachedData(cacheKey, projectionsData, this.projectionsCache);
      return projectionsData;
    } catch (error) {
      console.error('Error fetching player-specific projections:', error);
      return {};
    }
  }

  /**
   * Fetch player-specific stats for a season
   * @param {string} playerId - The player ID
   * @param {number} season - The season year
   * @param {string} seasonType - 'regular' or 'post'
   * @returns {Promise<Object>} Object with week numbers as keys and stats data as values
   */
  async getPlayerSpecificStats(playerId, season, seasonType = 'regular') {
    console.log('getPlayerSpecificStats called with:', { playerId, season, seasonType });
    
    const cacheKey = `player_stats_${playerId}_${season}_${seasonType}`;
    const cached = this.getCachedData(cacheKey, this.statsCache);
    if (cached) {
      console.log('Returning cached player-specific stats data for player', playerId);
      return cached;
    }

    console.log('No cached player-specific stats found, making fresh API call for player', playerId);
    try {
      const timestamp = Date.now();
      const url = `https://api.sleeper.com/stats/nfl/player/${playerId}?season_type=${seasonType}&season=${season}&grouping=week&t=${timestamp}`;
      console.log('Making network request to:', url);
      
      const response = await fetch(url, {
        method: 'GET'
      });
      console.log('Player-specific stats response status:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const statsData = await response.json();
      console.log('Raw player-specific stats response for player', playerId, ':', statsData);
      console.log('Stats data type:', typeof statsData, 'Keys:', Object.keys(statsData || {}));

      this.setCachedData(cacheKey, statsData, this.statsCache);
      return statsData;
    } catch (error) {
      console.error('Error fetching player-specific stats for player', playerId, ':', error);
      return {};
    }
  }

  /**
   * Fetch historical stats for a specific week
   * @param {number} season - The season year
   * @param {number} week - The week number
   * @param {string} seasonType - 'regular' or 'post'
   * @returns {Promise<Object>} Object with player_id as keys and stats as values
   */
  async getHistoricalStats(season, week, seasonType = 'regular') {
    console.log('getHistoricalStats called with:', { season, week, seasonType });
    
    const cacheKey = `historical_stats_${season}_${week}_${seasonType}`;
    const cached = this.getCachedData(cacheKey, this.statsCache);
    if (cached) {
      console.log('Returning cached historical stats data');
      return cached;
    }

    console.log('No cached historical stats found, making fresh API call');
    try {
      const timestamp = Date.now();
      const url = `https://api.sleeper.com/stats/nfl/${season}/${week}?season_type=${seasonType}&position[]=DEF&position[]=FLEX&position[]=K&position[]=QB&position[]=RB&position[]=TE&position[]=WR&order_by=pts_ppr&t=${timestamp}`;
      console.log('Making network request to:', url);
      
      const response = await fetch(url, {
        method: 'GET'
      });
      console.log('Historical stats response status:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const statsData = await response.json();
      console.log('Raw historical stats response sample:', statsData.slice(0, 3));
      console.log('Total historical stats count:', statsData.length);

      // Convert array to object with player_id as keys
      const statsByPlayer = {};
      statsData.forEach(playerStat => {
        if (playerStat.player_id && playerStat.stats) {
          statsByPlayer[playerStat.player_id] = {
            ...playerStat.stats,
            player_info: playerStat.player,
            team: playerStat.team,
            opponent: playerStat.opponent,
            week: playerStat.week
          };
        }
      });

      console.log('Processed historical stats for players:', Object.keys(statsByPlayer).length);
      this.setCachedData(cacheKey, statsByPlayer, this.statsCache);
      return statsByPlayer;
    } catch (error) {
      console.error('Error fetching historical stats:', error);
      return {};
    }
  }

  /**
   * Calculate season average points for a player from their weekly stats
   * @param {string} playerId - The player ID
   * @param {number} season - The season year
   * @param {string} seasonType - 'regular' or 'post'
   * @param {string} scoringType - 'ppr' or 'half_ppr'
   * @returns {Promise<number>} Season average points
   */
  async getPlayerSeasonAverage(playerId, season, seasonType = 'regular', scoringType = 'half_ppr') {
    const pointsField = scoringType === 'ppr' ? 'pts_ppr' : 'pts_half_ppr';
    console.log('getPlayerSeasonAverage called with:', { playerId, season, seasonType, scoringType, pointsField });
    
    try {
      const playerStats = await this.getPlayerSpecificStats(playerId, season, seasonType);
      console.log('Player stats received for season average calculation:', playerStats);
      
      if (!playerStats || typeof playerStats !== 'object') {
        console.log(`No stats data found for player ${playerId} - playerStats:`, playerStats);
        return 0;
      }

      console.log('Available weeks in player stats:', Object.keys(playerStats));

      // Sum up points from all weeks and count games played
      let totalPoints = 0;
      let gamesPlayed = 0;
      
      Object.keys(playerStats).forEach(week => {
        const weekData = playerStats[week];
        console.log(`Processing week ${week} for player ${playerId}:`, weekData);
        
        if (weekData && weekData.stats && weekData.stats[pointsField] !== undefined) {
          totalPoints += weekData.stats[pointsField];
          gamesPlayed++;
          console.log(`Week ${week}: ${weekData.stats[pointsField]} points (using ${pointsField})`);
        } else {
          console.log(`Week ${week}: No valid stats data for ${pointsField} (weekData:`, weekData, ')');
        }
      });

      console.log(`Total calculation for player ${playerId}: ${totalPoints} points, ${gamesPlayed} games`);

      if (gamesPlayed === 0) {
        console.log(`No games played found for player ${playerId} - all weeks had null/undefined data`);
        return 0;
      }

      const seasonAverage = totalPoints / gamesPlayed;
      console.log(`Player ${playerId} season average: ${seasonAverage.toFixed(2)} (${totalPoints} total points / ${gamesPlayed} games using ${pointsField})`);
      
      return seasonAverage;
    } catch (error) {
      console.error('Error calculating season average for player', playerId, ':', error);
      return 0;
    }
  }

  // Get cache status
  getCacheStatus() {
    return {
      projectionsCache: {
        size: this.projectionsCache.size,
        keys: Array.from(this.projectionsCache.keys())
      },
      statsCache: {
        size: this.statsCache.size,
        keys: Array.from(this.statsCache.keys())
      },
      nflStateCache: {
        size: this.nflStateCache.size,
        keys: Array.from(this.nflStateCache.keys())
      }
    };
  }
}

// Create and export a singleton instance
const projectionsService = new ProjectionsService();
export default projectionsService;
