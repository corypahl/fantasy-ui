import React from 'react';
import './Live.css';

const Live = ({ selectedTeam, userData }) => {
  if (!userData) {
    return (
      <div className="live-content">
        <h2>📺 Live Updates</h2>
        <p>Please connect to your fantasy platform first to view live updates.</p>
      </div>
    );
  }

  if (!selectedTeam) {
    return (
      <div className="live-content">
        <h2>📺 Live Updates</h2>
        <p>Please select a team to view live updates and scoring.</p>
      </div>
    );
  }

  return (
    <div className="live-content">
      <h2>📺 Live Updates</h2>
      
      <div className="live-header">
        <h3>Live Scoring - {selectedTeam.teamName}</h3>
        <div className="live-status">
          <span className="status-indicator live">● LIVE</span>
          <span className="last-update">Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="live-sections">
        {/* Current Game Status */}
        <div className="live-section">
          <h4>🏈 Current Game Status</h4>
          <div className="game-status">
            <div className="game-info">
              <span className="game-time">Q3 - 8:45</span>
              <span className="game-score">KC 24 - SF 21</span>
            </div>
            <div className="game-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '65%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Scoring */}
        <div className="live-section">
          <h4>⚡ Live Scoring</h4>
          <div className="scoring-updates">
            <div className="scoring-item">
              <div className="player-info">
                <span className="player-name">Patrick Mahomes</span>
                <span className="player-position">QB</span>
              </div>
              <div className="scoring-details">
                <span className="scoring-play">25 yd TD Pass</span>
                <span className="scoring-points">+6.0 pts</span>
              </div>
              <span className="scoring-time">2:15 ago</span>
            </div>
            
            <div className="scoring-item">
              <div className="player-info">
                <span className="player-name">Christian McCaffrey</span>
                <span className="player-position">RB</span>
              </div>
              <div className="scoring-details">
                <span className="scoring-play">12 yd Rush</span>
                <span className="scoring-points">+1.2 pts</span>
              </div>
              <span className="scoring-time">5:30 ago</span>
            </div>
          </div>
        </div>

        {/* Injury Updates */}
        <div className="live-section">
          <h4>🚑 Injury Updates</h4>
          <div className="injury-updates">
            <div className="injury-item">
              <span className="injury-status critical">●</span>
              <span className="player-name">Tyreek Hill</span>
              <span className="injury-details">Questionable - Ankle</span>
              <span className="injury-time">10 min ago</span>
            </div>
          </div>
        </div>

        {/* Weather Updates */}
        <div className="live-section">
          <h4>🌤️ Weather Updates</h4>
          <div className="weather-info">
            <div className="weather-item">
              <span className="weather-icon">🌧️</span>
              <span className="weather-location">Arrowhead Stadium</span>
              <span className="weather-details">Light rain, 45°F, Wind: 8 mph</span>
            </div>
          </div>
        </div>
      </div>

      <div className="live-actions">
        <button className="refresh-button">
          🔄 Refresh Live Data
        </button>
        <button className="notifications-button">
          🔔 Enable Notifications
        </button>
      </div>
    </div>
  );
};

export default Live;
