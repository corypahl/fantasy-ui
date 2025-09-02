// Teams Configuration Service
// Manages personal team information from environment variables
// Supports multiple teams and leagues across different platforms
// WARNING: Never commit actual team credentials to GitHub!

import appConfig from './appConfig';

class TeamsConfig {
  constructor() {
    this.loadTeamConfiguration();
  }

  loadTeamConfiguration() {
    // Sleeper Configuration
    this.sleeper = this.loadSleeperConfig();

    // ESPN Configuration
    this.espn = this.loadEspnConfig();

    // Log configuration status in development
    if (appConfig.isDebugEnabled && appConfig.isDevelopment) {
      console.log('Teams Configuration Status:', {
        sleeper: {
          configured: this.sleeper.isConfigured,
          username: this.sleeper.username,
          totalLeagues: this.sleeper.leagues.length,
          leagues: this.sleeper.leagues.map(l => ({ id: l.id, name: l.name }))
        },
        espn: {
          configured: this.espn.isConfigured,
          totalLeagues: this.espn.leagues.length,
          totalTeams: this.espn.teams.length,
          hasCookies: this.espn.hasCookies,
          teams: this.espn.teams.map(t => ({ id: t.id, name: t.name, leagueId: t.leagueId }))
        }
      });
    }
  }

  loadSleeperConfig() {
    const config = {
      username: null,
      leagues: [],
      isConfigured: false
    };

    // Debug logging
    console.log('🔍 Debug: Loading Sleeper config...');
    console.log('🔍 Debug: SLEEPER_USERNAME =', process.env.SLEEPER_USERNAME);
    console.log('🔍 Debug: REACT_APP_SLEEPER_USERNAME =', process.env.REACT_APP_SLEEPER_USERNAME);
    console.log('🔍 Debug: SLEEPER_LEAGUE_IDS =', process.env.SLEEPER_LEAGUE_IDS);
    console.log('🔍 Debug: REACT_APP_SLEEPER_LEAGUE_IDS =', process.env.REACT_APP_SLEEPER_LEAGUE_IDS);

    // Load username (try clean name first, fallback to REACT_APP_ prefix)
    config.username = process.env.SLEEPER_USERNAME || process.env.REACT_APP_SLEEPER_USERNAME || null;

    // Load league IDs (try clean name first, fallback to REACT_APP_ prefix)
    const leagueIds = process.env.SLEEPER_LEAGUE_IDS || process.env.REACT_APP_SLEEPER_LEAGUE_IDS;
    if (leagueIds) {
      config.leagues = leagueIds.split(',').map(id => ({
        id: id.trim(),
        name: `League ${id.trim()}`,
        type: 'unknown'
      }));
    }

    // Check if configuration is complete
    config.isConfigured = !!(config.username && config.leagues.length > 0);
    
    console.log('🔍 Debug: Final Sleeper config:', config);

    return config;
  }

  loadEspnConfig() {
    const config = {
      leagues: [],
      teams: [],
      cookies: {
        swid: null,
        espns2: null
      },
      isConfigured: false
    };

    // Load league and team IDs (try clean names first, fallback to REACT_APP_ prefix)
    const leagueIds = process.env.ESPN_LEAGUE_IDS || process.env.REACT_APP_ESPN_LEAGUE_IDS;
    const teamIds = process.env.ESPN_TEAM_IDS || process.env.REACT_APP_ESPN_TEAM_IDS;
    
    if (leagueIds && teamIds) {
      const leagueIdArray = leagueIds.split(',').map(id => id.trim());
      const teamIdArray = teamIds.split(',').map(id => id.trim());
      
      // Create simple league and team mappings
      config.leagues = leagueIdArray.map((id, index) => ({
        id,
        name: `ESPN League ${id}`,
        teams: teamIdArray[index] ? [{ id: teamIdArray[index], name: `Team ${teamIdArray[index]}` }] : []
      }));
      
      config.teams = teamIdArray.map((id, index) => ({
        id,
        name: `Team ${id}`,
        leagueId: leagueIdArray[index] || 'unknown',
        leagueName: `ESPN League ${leagueIdArray[index] || 'unknown'}`
      }));
    }

    // Load cookies (try clean names first, fallback to REACT_APP_ prefix)
    config.cookies.swid = process.env.ESPN_SWID || process.env.REACT_APP_ESPN_SWID || null;
    config.cookies.espns2 = process.env.ESPN_ESPNS2 || process.env.REACT_APP_ESPN_ESPNS2 || null;

    // Check if configuration is complete
    config.hasCookies = !!(config.cookies.swid && config.cookies.espns2);
    config.isConfigured = config.hasCookies && config.teams.length > 0;

    return config;
  }

  // Sleeper team configuration
  get sleeperConfig() {
    return this.sleeper;
  }

  get sleeperUsername() {
    return this.sleeper.username;
  }

  get sleeperLeagues() {
    return this.sleeper.leagues;
  }

  get sleeperLeagueIds() {
    return this.sleeper.leagues.map(league => league.id);
  }

  get isSleeperConfigured() {
    return this.sleeper.isConfigured;
  }

  // Get a specific Sleeper league by ID
  getSleeperLeague(leagueId) {
    return this.sleeper.leagues.find(league => league.id === leagueId);
  }

  // ESPN team configuration
  get espnConfig() {
    return this.espn;
  }

  get espnLeagues() {
    return this.espn.leagues;
  }

  get espnTeams() {
    return this.espn.teams;
  }

  get espnLeagueIds() {
    return this.espn.leagues.map(league => league.id);
  }

  get espnTeamIds() {
    return this.espn.teams.map(team => team.id);
  }

  get espnSwid() {
    return this.espn.cookies.swid;
  }

  get espnEspns2() {
    return this.espn.cookies.espns2;
  }

  get isEspnConfigured() {
    return this.espn.isConfigured;
  }

  // Get a specific ESPN team by ID
  getEspnTeam(teamId) {
    return this.espn.teams.find(team => team.id === teamId);
  }

  // Get all teams for a specific ESPN league
  getEspnTeamsForLeague(leagueId) {
    return this.espn.teams.filter(team => team.leagueId === leagueId);
  }

  // Get all configured platforms
  get configuredPlatforms() {
    const platforms = [];
    if (this.isSleeperConfigured) platforms.push('sleeper');
    if (this.isEspnConfigured) platforms.push('espn');
    return platforms;
  }

  // Check if any platform is configured
  get hasAnyPlatform() {
    return this.configuredPlatforms.length > 0;
  }

  // Get total count of teams across all platforms
  get totalTeamCount() {
    let count = 0;
    if (this.isSleeperConfigured) count += this.sleeper.leagues.length;
    if (this.isEspnConfigured) count += this.espn.teams.length;
    return count;
  }

  // Get configuration status for all platforms
  get configurationStatus() {
    return {
      sleeper: {
        configured: this.isSleeperConfigured,
        username: this.sleeperUsername,
        totalLeagues: this.sleeper.leagues.length,
        leagues: this.sleeper.leagues.map(l => ({ id: l.id, name: l.name, type: l.type }))
      },
      espn: {
        configured: this.isEspnConfigured,
        totalLeagues: this.espn.leagues.length,
        totalTeams: this.espn.teams.length,
        hasCookies: this.espn.hasCookies,
        teams: this.espn.teams.map(t => ({ id: t.id, name: t.name, leagueId: t.leagueId }))
      },
      totalPlatforms: this.configuredPlatforms.length,
      totalTeams: this.totalTeamCount,
      hasAnyPlatform: this.hasAnyPlatform
    };
  }

  // Get all teams across all platforms in a unified format
  getAllTeams() {
    const teams = [];

    // Add Sleeper teams
    if (this.isSleeperConfigured) {
      this.sleeper.leagues.forEach(league => {
        teams.push({
          platform: 'sleeper',
          leagueId: league.id,
          leagueName: league.name,
          leagueType: league.type,
          teamId: league.id, // For Sleeper, league ID serves as team identifier
          teamName: `${league.name} (Sleeper)`,
          username: this.sleeperUsername
        });
      });
    }

    // Add ESPN teams
    if (this.isEspnConfigured) {
      this.espn.teams.forEach(team => {
        teams.push({
          platform: 'espn',
          leagueId: team.leagueId,
          leagueName: team.leagueName,
          teamId: team.id,
          teamName: team.name,
          cookies: this.espn.cookies
        });
      });
    }

    return teams;
  }

  // Validate team configuration
  validate() {
    const errors = [];
    const warnings = [];

    // Check Sleeper configuration
    if (!this.sleeper.username) {
      errors.push('Sleeper username is not configured');
    }
    if (this.sleeper.leagues.length === 0) {
      errors.push('No Sleeper leagues are configured');
    }

    // Check ESPN configuration
    if (!this.espn.hasCookies) {
      warnings.push('ESPN cookies are not configured');
    }
    if (this.espn.teams.length === 0) {
      warnings.push('No ESPN teams are configured');
    }

    // Check if at least one platform is fully configured
    if (!this.hasAnyPlatform) {
      errors.push('No fantasy football platforms are fully configured');
    }

    return {
      isValid: errors.length === 0,
      hasWarnings: warnings.length > 0,
      errors,
      warnings,
      recommendations: this.getRecommendations()
    };
  }

  // Get configuration recommendations
  getRecommendations() {
    const recommendations = [];

    if (!this.isSleeperConfigured) {
      recommendations.push({
        platform: 'Sleeper',
        action: 'Add REACT_APP_SLEEPER_USERNAME and REACT_APP_SLEEPER_LEAGUE_IDS to .env.local',
        priority: 'high'
      });
    }

    if (!this.isEspnConfigured) {
      recommendations.push({
        platform: 'ESPN',
        action: 'Add ESPN configuration variables to .env.local for full ESPN support',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  // Method to reload configuration (useful for testing)
  reload() {
    this.loadTeamConfiguration();
  }

  // Get environment variable names for documentation
  getEnvironmentVariableNames() {
    return {
      sleeper: [
        'REACT_APP_SLEEPER_USERNAME',
        'REACT_APP_SLEEPER_LEAGUE_IDS'
      ],
      espn: [
        'REACT_APP_ESPN_LEAGUE_IDS',
        'REACT_APP_ESPN_TEAM_IDS',
        'REACT_APP_ESPN_SWID',
        'REACT_APP_ESPN_ESPNS2'
      ]
    };
  }
}

// Create and export a singleton instance
const teamsConfig = new TeamsConfig();

// Validate configuration on load
const validation = teamsConfig.validate();
if (!validation.isValid) {
  console.error('Teams configuration validation failed:', validation.errors);
}
if (validation.hasWarnings) {
  console.warn('Teams configuration warnings:', validation.warnings);
}

export default teamsConfig;
