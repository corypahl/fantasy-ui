import React from 'react';
import './Overview.css';
import appConfig from '../config/appConfig';

const Overview = ({ 
  platformStatus, 
  allTeams, 
  selectedTeam, 
  onTeamSelection, 
  userData, 
  cacheStatus 
}) => {
  return (
    <div className="overview-content">
      <div className="welcome-section">
        <h2>🏈 Welcome to {appConfig.appName}</h2>
        <p>Your comprehensive platform for managing fantasy football teams, analyzing players, and making informed decisions throughout the season.</p>
        {appConfig.isDevelopment && (
          <div className="dev-info">
            <small>Version {appConfig.appVersion} | Environment: Development</small>
            <br />
            <small>⚠️ ESPN API calls are using mock data in development mode due to CORS restrictions</small>
          </div>
        )}
      </div>

      {/* Team Selector */}
      {allTeams.length > 0 && (
        <div className="team-selector-section">
          <h3>🏆 Select Your Team</h3>
          <div className="team-grid">
            {allTeams.map(team => (
              <div 
                key={`${team.platform}-${team.teamId}`}
                className={`team-card ${selectedTeam && selectedTeam.teamId === team.teamId ? 'selected' : ''}`}
                onClick={() => onTeamSelection(team)}
              >
                <div className="team-header">
                  <img 
                    src={team.platform === 'sleeper' ? '/sleeper.png' : '/espn.jpg'} 
                    alt={team.platform === 'sleeper' ? 'Sleeper' : 'ESPN'}
                    className="platform-icon"
                  />
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
          <div className="configured-connection">
            <h3>🚀 Ready to Connect</h3>
            <p>Your Sleeper account is configured. Click below to connect and view your leagues.</p>
            <button className="connect-button">
              Connect to Sleeper
            </button>
          </div>
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
                  <span className="status-label">Sleeper API:</span>
                  <span className="status-value">
                    {cacheStatus.rateLimit.sleeper.currentCount}/{cacheStatus.rateLimit.sleeper.maxCount}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">ESPN API:</span>
                  <span className="status-value">
                    {cacheStatus.rateLimit.espn.rateLimit.currentCount}/{cacheStatus.rateLimit.espn.rateLimit.maxCount}
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
};

export default Overview;
