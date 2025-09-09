import React, { useState } from 'react';
import './Lineups.css';

const Lineups = ({ 
  selectedTeam, 
  userData, 
  lineupData, 
  freeAgents, 
  onLoadLineup, 
  onLoadFreeAgents, 
  isLoading 
}) => {
  const [activeTab, setActiveTab] = useState('lineup');

  if (!userData) {
    return (
      <div className="lineups-content">
        <h2>🏈 Lineups</h2>
        <p>Please connect to your fantasy platform first to view your lineups.</p>
      </div>
    );
  }

  if (!selectedTeam) {
    return (
      <div className="lineups-content">
        <h2>🏈 Lineups</h2>
        <p>Please select a team to view lineup information.</p>
      </div>
    );
  }

  return (
    <div className="lineups-content">
      <div className="lineups-header">
        <h2>🏈 {selectedTeam.teamName}</h2>
        <div className="header-actions">
          <button 
            onClick={onLoadLineup} 
            disabled={isLoading}
            className="load-button"
          >
            {isLoading ? 'Loading...' : '🔄 Load Lineup'}
          </button>
          <button 
            onClick={onLoadFreeAgents} 
            disabled={isLoading}
            className="load-button"
          >
            {isLoading ? 'Loading...' : '👥 Load Free Agents'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="lineups-tabs">
        <button 
          className={`tab-button ${activeTab === 'lineup' ? 'active' : ''}`}
          onClick={() => setActiveTab('lineup')}
        >
          📋 Current Lineup
        </button>
        <button 
          className={`tab-button ${activeTab === 'free-agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('free-agents')}
        >
          🆓 Free Agents
        </button>
      </div>

      {/* Lineup Tab */}
      {activeTab === 'lineup' && (
        <div className="lineup-tab">
          {!lineupData ? (
            <div className="no-lineup-data">
              <p>No lineup data loaded yet.</p>
              <p>Click "Load Lineup" to view your current roster.</p>
            </div>
          ) : (
            <div className="lineup-display">
              {/* Starters */}
              <div className="lineup-section">
                <h3>🚀 Starters</h3>
                <div className="player-list">
                  {lineupData.starters && lineupData.starters.length > 0 ? (
                    lineupData.starters.map(player => (
                      <div key={player.player_id} className="player-item starter">
                        <span className={`position-badge position-${player.position?.toLowerCase()}`}>
                          {player.position}
                        </span>
                        <span className="player-name">
                          {player.first_name} {player.last_name}
                        </span>
                        <span className="player-team">{player.team}</span>
                        <span className="player-status">{player.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-players">No starters found</p>
                  )}
                </div>
              </div>

              {/* Bench */}
              <div className="lineup-section">
                <h3>🪑 Bench</h3>
                <div className="player-list">
                  {lineupData.bench && lineupData.bench.length > 0 ? (
                    lineupData.bench.map(player => (
                      <div key={player.player_id} className="player-item bench">
                        <span className={`position-badge position-${player.position?.toLowerCase()}`}>
                          {player.position}
                        </span>
                        <span className="player-name">
                          {player.first_name} {player.last_name}
                        </span>
                        <span className="player-team">{player.team}</span>
                        <span className="player-status">{player.status}</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-players">No bench players found</p>
                  )}
                </div>
              </div>

              {/* IR */}
              {lineupData.ir && lineupData.ir.length > 0 && (
                <div className="lineup-section">
                  <h3>🏥 Injured Reserve</h3>
                  <div className="player-list">
                    {lineupData.ir.map(player => (
                      <div key={player.player_id} className="player-item ir">
                        <span className={`position-badge position-${player.position?.toLowerCase()}`}>
                          {player.position}
                        </span>
                        <span className="player-name">
                          {player.first_name} {player.last_name}
                        </span>
                        <span className="player-team">{player.team}</span>
                        <span className="player-status">{player.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lineup Summary */}
              <div className="lineup-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Players:</span>
                  <span className="summary-value">
                    {(lineupData.starters?.length || 0) + 
                     (lineupData.bench?.length || 0) + 
                     (lineupData.ir?.length || 0)}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Starters:</span>
                  <span className="summary-value">{lineupData.starters?.length || 0}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Bench:</span>
                  <span className="summary-value">{lineupData.bench?.length || 0}</span>
                </div>
                {lineupData.ir && lineupData.ir.length > 0 && (
                  <div className="summary-item">
                    <span className="summary-label">IR:</span>
                    <span className="summary-value">{lineupData.ir.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Free Agents Tab */}
      {activeTab === 'free-agents' && (
        <div className="free-agents-tab">
          {!freeAgents || freeAgents.length === 0 ? (
            <div className="no-free-agents">
              <p>No free agents loaded yet.</p>
              <p>Click "Load Free Agents" to view available players.</p>
            </div>
          ) : (
            <div className="free-agents-display">
              <div className="free-agents-header">
                <h3>Available Free Agents</h3>
                <span className="free-agents-count">{freeAgents.length} players</span>
              </div>
              
              <div className="free-agents-list">
                {freeAgents.map(player => (
                  <div key={player.player_id} className="free-agent-item">
                    <span className={`position-badge position-${player.position?.toLowerCase()}`}>
                      {player.position}
                    </span>
                    <span className="player-name">
                      {player.first_name} {player.last_name}
                    </span>
                    <span className="player-team">{player.team}</span>
                    <span className="player-status">{player.status}</span>
                    <div className="free-agent-actions">
                      <button className="add-button">➕ Add</button>
                      <button className="watchlist-button">👀 Watch</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Lineups;
