import React, { useState, useEffect } from 'react';
import './App.css';
import sleeperApi from './services/sleeperApi';
import fantasyDataService from './services/fantasyDataService';
import { getStorageValue, setStorageValue, STORAGE_KEYS } from './config/sleeperConfig';
import appConfig from './config/appConfig';
import teamsConfig from './config/teamsConfig';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null);
  const [userLeagues, setUserLeagues] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [lineupData, setLineupData] = useState(null);
  const [matchupData, setMatchupData] = useState(null);
  const [freeAgents, setFreeAgents] = useState([]);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [platformStatus, setPlatformStatus] = useState(null);
  const [allTeams, setAllTeams] = useState([]);

  // Check configured platforms on component mount
  useEffect(() => {
    console.log('🔍 Debug: App mounting, checking teams config...');
    console.log('🔍 Debug: teamsConfig.hasAnyPlatform =', teamsConfig.hasAnyPlatform);
    console.log('🔍 Debug: teamsConfig.isSleeperConfigured =', teamsConfig.isSleeperConfigured);
    console.log('🔍 Debug: teamsConfig.sleeperUsername =', teamsConfig.sleeperUsername);
    console.log('🔍 Debug: teamsConfig.sleeperLeagues =', teamsConfig.sleeperLeagues);
    
    // Test environment variables directly
    console.log('🔍 Debug: Direct env test:');
    console.log('🔍 Debug: process.env.SLEEPER_USERNAME =', process.env.SLEEPER_USERNAME);
    console.log('🔍 Debug: process.env.SLEEPER_LEAGUE_IDS =', process.env.SLEEPER_LEAGUE_IDS);
    console.log('🔍 Debug: process.env.NODE_ENV =', process.env.NODE_ENV);
    
    // Check if we have pre-configured platforms
    if (teamsConfig.hasAnyPlatform) {
      setPlatformStatus(teamsConfig.configurationStatus);
      setAllTeams(teamsConfig.getAllTeams());
      
      // Auto-connect to Sleeper if configured
      if (teamsConfig.isSleeperConfigured) {
        handleAutoConnect();
      }
    }
  }, []);

  // Update cache status periodically
  useEffect(() => {
    if (appConfig.autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        const status = fantasyDataService.getCacheStatus();
        setCacheStatus(status);
      }, appConfig.autoRefreshInterval);

      return () => clearInterval(interval);
    }
  }, []);

  // Auto-connect to configured Sleeper account
  const handleAutoConnect = async () => {
    if (!teamsConfig.isSleeperConfigured) return;

    setIsLoading(true);
    setError('');

    try {
      // Use configured username
      const username = teamsConfig.sleeperUsername;

      // Get user by configured username
      const user = await sleeperApi.getUserByUsername(username);
      setUserData(user);
      setStorageValue(STORAGE_KEYS.SLEEPER_USERNAME, username);
      setStorageValue(STORAGE_KEYS.SLEEPER_USER_ID, user.user_id);

      // Get user's leagues
      const leagues = await fantasyDataService.getUserLeagues(user.user_id);
      setUserLeagues(leagues);

      // Auto-select the first configured league if available
      if (teamsConfig.sleeperLeagues.length > 0) {
        const firstConfiguredLeague = teamsConfig.sleeperLeagues[0];
        const matchingLeague = leagues.find(league => league.league_id === firstConfiguredLeague.id);
        
        if (matchingLeague) {
          setSelectedTeam({
            platform: 'sleeper',
            leagueId: matchingLeague.league_id,
            leagueName: matchingLeague.name,
            teamId: matchingLeague.league_id,
            teamName: `${matchingLeague.name} (Sleeper)`,
            username: username
          });
          setStorageValue(STORAGE_KEYS.SELECTED_LEAGUE_ID, matchingLeague.league_id);
        } else if (leagues.length > 0) {
          // Fallback to first league if configured league not found
          const fallbackLeague = leagues[0];
          setSelectedTeam({
            platform: 'sleeper',
            leagueId: fallbackLeague.league_id,
            leagueName: fallbackLeague.name,
            teamId: fallbackLeague.league_id,
            teamName: `${fallbackLeague.name} (Sleeper)`,
            username: username
          });
          setStorageValue(STORAGE_KEYS.SELECTED_LEAGUE_ID, fallbackLeague.league_id);
        }
      }

    } catch (error) {
      console.error('Auto-connect error:', error);
      setError('Failed to auto-connect to configured Sleeper account. Please check your configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle team selection
  const handleTeamSelection = (team) => {
    setSelectedTeam(team);
    setStorageValue(STORAGE_KEYS.SELECTED_LEAGUE_ID, team.leagueId);
    setLineupData(null);
    setMatchupData(null);
    setFreeAgents([]);
  };

  // Load lineup data for selected team
  const loadLineupData = async () => {
    if (!selectedTeam || !userData) return;

    setIsLoading(true);
    try {
      if (selectedTeam.platform === 'sleeper') {
        const lineup = await fantasyDataService.getCurrentLineups(userData.user_id, selectedTeam.leagueId);
        setLineupData(lineup);
      } else if (selectedTeam.platform === 'espn') {
        // TODO: Implement ESPN lineup loading
        console.log('ESPN lineup loading not yet implemented');
      }
    } catch (error) {
      console.error('Error loading lineup:', error);
      setError('Failed to load lineup data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load matchup data for selected team
  const loadMatchupData = async () => {
    if (!selectedTeam) return;

    setIsLoading(true);
    try {
      if (selectedTeam.platform === 'sleeper') {
        const matchups = await fantasyDataService.getCurrentMatchups(selectedTeam.leagueId);
        setMatchupData(matchups);
      } else if (selectedTeam.platform === 'espn') {
        // TODO: Implement ESPN matchup loading
        console.log('ESPN matchup loading not yet implemented');
      }
    } catch (error) {
      console.error('Error loading matchups:', error);
      setError('Failed to load matchup data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load free agents for selected team
  const loadFreeAgents = async () => {
    if (!selectedTeam) return;

    setIsLoading(true);
    try {
      if (selectedTeam.platform === 'sleeper') {
        const agents = await fantasyDataService.getFreeAgents(selectedTeam.leagueId);
        setFreeAgents(agents);
      } else if (selectedTeam.platform === 'espn') {
        // TODO: Implement ESPN free agents loading
        console.log('ESPN free agents loading not yet implemented');
      }
    } catch (error) {
      console.error('Error loading free agents:', error);
      setError('Failed to load free agent data');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="overview-content">
            <div className="welcome-section">
              <h2>🏈 Welcome to {appConfig.appName}</h2>
              <p>Your comprehensive platform for managing fantasy football teams, analyzing players, and making informed decisions throughout the season.</p>
              {appConfig.isDevelopment && (
                <div className="dev-info">
                  <small>Version {appConfig.appVersion} | Environment: Development</small>
                </div>
              )}
            </div>
            
            {/* Platform Status Display */}
            {platformStatus && (
              <div className="platform-status-section">
                <h3>🔧 Platform Configuration Status</h3>
                <div className="platform-grid">
                  <div className={`platform-card ${platformStatus.sleeper.configured ? 'configured' : 'not-configured'}`}>
                    <h4>🏈 Sleeper</h4>
                    <div className="platform-details">
                      <span className="status-indicator">
                        {platformStatus.sleeper.configured ? '✅ Configured' : '❌ Not Configured'}
                      </span>
                      {platformStatus.sleeper.username && (
                        <span>User: {platformStatus.sleeper.username}</span>
                      )}
                      <span>Leagues: {platformStatus.sleeper.totalLeagues}</span>
                      {platformStatus.sleeper.leagues.map(league => (
                        <span key={league.id}>League: {league.name}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className={`platform-card ${platformStatus.espn.configured ? 'configured' : 'not-configured'}`}>
                    <h4>📺 ESPN</h4>
                    <div className="platform-details">
                      <span className="status-indicator">
                        {platformStatus.espn.configured ? '✅ Configured' : '❌ Not Configured'}
                      </span>
                      <span>Leagues: {platformStatus.espn.totalLeagues}</span>
                      <span>Teams: {platformStatus.espn.totalTeams}</span>
                      <span>Cookies: {platformStatus.espn.hasCookies ? '✅' : '❌'}</span>
                    </div>
                  </div>
                </div>
                
                {!teamsConfig.hasAnyPlatform && (
                  <div className="configuration-warning">
                    <p>⚠️ No platforms are configured. Please set up your team information in the .env.local file.</p>
                    <button onClick={() => window.open('https://github.com/corypahl/fantasy-ui/blob/main/env.example', '_blank')}>
                      View Configuration Example
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Team Selector */}
            {allTeams.length > 0 && (
              <div className="team-selector-section">
                <h3>🏆 Select Your Team</h3>
                <div className="team-grid">
                  {allTeams.map(team => (
                    <div 
                      key={`${team.platform}-${team.teamId}`}
                      className={`team-card ${selectedTeam && selectedTeam.teamId === team.teamId ? 'selected' : ''}`}
                      onClick={() => handleTeamSelection(team)}
                    >
                      <div className="team-header">
                        <span className="platform-icon">
                          {team.platform === 'sleeper' ? '🏈' : '📺'}
                        </span>
                        <h4>{team.teamName}</h4>
                      </div>
                      <div className="team-details">
                        <span className="league-name">{team.leagueName}</span>
                        <span className="platform-name">{team.platform.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Connection Section */}
            {!userData ? (
              <div className="connection-section">
                {teamsConfig.isSleeperConfigured ? (
                  <div className="configured-connection">
                    <h3>🚀 Ready to Connect</h3>
                    <p>Your Sleeper account is configured. Click below to connect and view your leagues.</p>
                    <button 
                      onClick={handleAutoConnect}
                      disabled={isLoading}
                      className="connect-button"
                    >
                      {isLoading ? 'Connecting...' : 'Connect to Sleeper'}
                    </button>
                    {error && <div className="error-message">{error}</div>}
                  </div>
                ) : (
                  <div className="no-configuration">
                    <h3>⚙️ Configuration Required</h3>
                    <p>Please configure your Sleeper account in the .env.local file to get started.</p>
                    <button onClick={() => window.open('https://github.com/corypahl/fantasy-ui/blob/main/env.example', '_blank')}>
                      View Configuration Example
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="user-info-section">
                <h3>👤 Connected as {userData.display_name || userData.username}</h3>
                <p>User ID: {userData.user_id}</p>
                
                {/* Selected Team Display */}
                {selectedTeam && (
                  <div className="selected-team-display">
                    <h4>Currently Viewing:</h4>
                    <div className="selected-team-info">
                      <span className="team-name">{selectedTeam.teamName}</span>
                      <span className="league-name">{selectedTeam.leagueName}</span>
                      <span className="platform-name">{selectedTeam.platform.toUpperCase()}</span>
                    </div>
                  </div>
                )}
                
                {/* Cache Status Display */}
                {cacheStatus && appConfig.isDebugEnabled && (
                  <div className="cache-status">
                    <h4>System Status</h4>
                    <div className="status-grid">
                      <div className="status-item">
                        <span className="status-label">Player Cache:</span>
                        <span className={`status-value ${cacheStatus.playerCache.isValid ? 'valid' : 'expired'}`}>
                          {cacheStatus.playerCache.isValid ? 'Valid' : 'Expired'}
                        </span>
                      </div>
                      <div className="status-item">
                        <span className="status-label">API Calls:</span>
                        <span className="status-value">
                          {cacheStatus.rateLimit.currentCount}/{cacheStatus.rateLimit.maxCount}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Team Analytics</h3>
                <p>Comprehensive team analysis with advanced statistics and performance metrics.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🎯</div>
                <h3>Player Research</h3>
                <p>In-depth player research with injury updates, news, and expert insights.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📈</div>
                <h3>Performance Tracking</h3>
                <p>Track your team's performance week by week with detailed analytics.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🏆</div>
                <h3>League Management</h3>
                <p>Manage multiple leagues and track standings across different platforms.</p>
              </div>
            </div>
          </div>
        );
      
      case 'teams':
        return (
          <div className="teams-content">
            <h2>🏈 My Teams</h2>
            {!userData ? (
              <p>Please connect to Sleeper first to view your teams.</p>
            ) : !selectedTeam ? (
              <p>Please select a team to view team information.</p>
            ) : (
              <div>
                <div className="league-header">
                  <h3>{selectedTeam.teamName}</h3>
                  <button onClick={loadLineupData} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Load Lineup'}
                  </button>
                </div>
                
                {lineupData && (
                  <div className="lineup-display">
                    <h4>Current Lineup</h4>
                    <div className="lineup-section">
                      <h5>Starters</h5>
                      <div className="player-list">
                        {lineupData.starters.map(player => (
                          <div key={player.player_id} className="player-item">
                            <span className={`position-badge position-${player.position?.toLowerCase()}`}>
                              {player.position}
                            </span>
                            <span className="player-name">{player.first_name} {player.last_name}</span>
                            <span className="player-team">{player.team}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="lineup-section">
                      <h5>Bench</h5>
                      <div className="player-list">
                        {lineupData.bench.map(player => (
                          <div key={player.player_id} className="player-item">
                            <span className={`position-badge position-${player.position?.toLowerCase()}`}>
                              {player.position}
                            </span>
                            <span className="player-name">{player.first_name} {player.last_name}</span>
                            <span className="player-team">{player.team}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
      case 'players':
        return (
          <div className="players-content">
            <h2>👥 Player Database</h2>
            {!userData ? (
              <p>Please connect to Sleeper first to view player information.</p>
            ) : !selectedTeam ? (
              <p>Please select a team to view player information.</p>
            ) : (
              <div>
                <div className="section-header">
                  <h3>Free Agents</h3>
                  <button onClick={loadFreeAgents} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Load Free Agents'}
                  </button>
                </div>
                
                {freeAgents.length > 0 && (
                  <div className="free-agents-list">
                    {freeAgents.slice(0, appConfig.maxPlayersDisplay).map(player => (
                      <div key={player.player_id} className="player-item">
                        <span className={`position-badge position-${player.position?.toLowerCase()}`}>
                          {player.position}
                        </span>
                        <span className="player-name">{player.first_name} {player.last_name}</span>
                        <span className="player-team">{player.team}</span>
                        <span className="player-status">{player.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
      case 'analytics':
        return (
          <div className="analytics-content">
            <h2>📊 Analytics Dashboard</h2>
            {!userData ? (
              <p>Please connect to Sleeper first to view analytics.</p>
            ) : !selectedTeam ? (
              <p>Please select a team to view analytics.</p>
            ) : (
              <div>
                <div className="section-header">
                  <h3>Current Week Matchups</h3>
                  <button onClick={loadMatchupData} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Load Matchups'}
                  </button>
                </div>
                
                {matchupData && (
                  <div className="matchups-display">
                    {matchupData.map(matchup => (
                      <div key={matchup.roster_id} className="matchup-item">
                        <h4>{matchup.user?.display_name || matchup.user?.username || `Team ${matchup.roster_id}`}</h4>
                        <div className="matchup-starters">
                          {matchup.starters.slice(0, 5).map(player => (
                            <span key={player.player_id} className="starter-player">
                              {player.first_name} {player.last_name} ({player.position})
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="overview-content">
            <h2>🏈 Welcome to {appConfig.appName}</h2>
            <p>Your comprehensive platform for managing fantasy football teams.</p>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏈 {appConfig.appName}</h1>
        <p>Your ultimate tool for dominating fantasy football</p>
      </header>

      <main className="App-main">
        {/* Navigation Tabs */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            🏠 Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            🏈 Teams
          </button>
          <button 
            className={`tab-button ${activeTab === 'players' ? 'active' : ''}`}
            onClick={() => setActiveTab('players')}
          >
            👥 Players
          </button>
          <button 
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
        </div>

        <div className="main-content">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
