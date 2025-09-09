import React, { useState, useEffect, useCallback } from 'react';
import './Lineups.css';

const Lineups = ({ 
  selectedTeam, 
  userData, 
  lineupData, 
  onLoadLineup, 
  onTeamSelection,
  allTeams,
  isLoading 
}) => {
  const [hasLoadedLineup, setHasLoadedLineup] = useState(false);

  // Memoized function to load lineup data
  const loadLineupData = useCallback(async () => {
    if (selectedTeam && userData && !hasLoadedLineup) {
      setHasLoadedLineup(true);
      await onLoadLineup();
    }
  }, [selectedTeam, userData, hasLoadedLineup, onLoadLineup]);

  // Auto-load first team when component mounts
  useEffect(() => {
    if (allTeams && allTeams.length > 0 && !selectedTeam) {
      const firstTeam = allTeams[0];
      onTeamSelection(firstTeam);
    }
  }, [allTeams, selectedTeam, onTeamSelection]);

  // Auto-load lineup data when team changes
  useEffect(() => {
    if (selectedTeam && userData) {
      loadLineupData();
    }
  }, [selectedTeam, userData, loadLineupData]);

  // Reset hasLoadedLineup when team changes
  useEffect(() => {
    setHasLoadedLineup(false);
  }, [selectedTeam]);

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
        <div className="header-left">
          <h2>🏈 Lineups</h2>
          {allTeams && allTeams.length > 0 && (
            <div className="team-selector">
              <select 
                value={selectedTeam ? `${selectedTeam.platform}-${selectedTeam.teamId}` : ''}
                onChange={(e) => {
                  const [platform, teamId] = e.target.value.split('-');
                  const team = allTeams.find(t => t.platform === platform && t.teamId === teamId);
                  if (team && onTeamSelection) {
                    onTeamSelection(team);
                    // Auto-load lineup data when team is switched
                    setHasLoadedLineup(false);
                    setTimeout(() => {
                      onLoadLineup();
                    }, 100);
                  }
                }}
                className="team-dropdown"
              >
                <option value="">Select a team...</option>
                {allTeams.map(team => (
                  <option key={`${team.platform}-${team.teamId}`} value={`${team.platform}-${team.teamId}`}>
                    {team.leagueName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="header-actions">
          <button 
            onClick={() => {
              setHasLoadedLineup(false);
              onLoadLineup();
            }}
            disabled={isLoading}
            className="load-button"
          >
            {isLoading ? '🔄 Loading...' : '📊 Refresh Data'}
          </button>
          <button 
            onClick={() => {
              // Clear all caches and reload
              if (window.fantasyDataService) {
                window.fantasyDataService.clearAllCaches();
              }
              if (window.sleeperApi) {
                window.sleeperApi.clearRateLimit();
              }
              setHasLoadedLineup(false);
              onLoadLineup();
            }}
            disabled={isLoading}
            className="clear-cache-button"
            title="Clear all caches and reload data"
          >
            🗑️ Clear Cache
          </button>
          {isLoading && (
            <div className="loading-indicator">
              <span>🔄 Loading lineup data...</span>
            </div>
          )}
        </div>
      </div>

      {/* Projections Metadata */}
      {lineupData?.metadata && (
        <div className="projections-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Week:</span>
            <span className="metadata-value">{lineupData.metadata.week}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Scoring Format:</span>
            <span className="metadata-value">
              {lineupData.metadata.scoringSettings?.rec === 1 ? 'PPR' : 
               lineupData.metadata.scoringSettings?.rec === 0.5 ? 'Half-PPR' : 'Standard'}
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Last Updated:</span>
            <span className="metadata-value">
              {new Date(lineupData.metadata.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}


      {/* Lineup Display */}
      <div className="lineup-tab">
        {!lineupData ? (
          <div className="no-lineup-data">
            <p>No lineup data loaded yet.</p>
            <p>Select a team to view your current roster.</p>
          </div>
        ) : (
            <div className="lineup-display">
              {/* Position-based Lineup View */}
              {(() => {
                // Debug: Log the actual lineup data structure
                console.log('Lineup data structure:', lineupData);
                
                // Combine all players and group by position
                const allPlayers = [
                  ...(lineupData.starters || []).map(p => ({ ...p, isStarter: true })),
                  ...(lineupData.bench || []).map(p => ({ ...p, isStarter: false })),
                  ...(lineupData.ir || []).map(p => ({ ...p, isStarter: false, isIR: true }))
                ];
                
                // Debug: Log the combined players structure
                console.log('Combined players:', allPlayers);
                console.log('Sample player data:', allPlayers[0]);
                console.log('Lineup metadata:', lineupData.metadata);
                
                // Debug: Check if players have projection data
                allPlayers.forEach((player, index) => {
                  if (index < 3) { // Only log first 3 players to avoid spam
                    console.log(`🔍 Player ${index + 1} (${player.first_name} ${player.last_name}):`, {
                      player_id: player.player_id,
                      projected_points: player.projections?.projected_points,
                      rest_of_year: player.projections?.rest_of_year,
                      hasProjections: !!player.projections,
                      projectionsKeys: player.projections ? Object.keys(player.projections) : 'none'
                    });
                  }
                });

                // Check if we have any players at all
                if (allPlayers.length === 0) {
                  return (
                    <div className="no-lineup-data">
                      <p>No players found in lineup data.</p>
                      <p>Check the console for data structure details.</p>
                    </div>
                  );
                }

                // Group players by position
                const playersByPosition = allPlayers.reduce((acc, player) => {
                  const position = player.position || 'UNKNOWN';
                  if (!acc[position]) {
                    acc[position] = [];
                  }
                  acc[position].push(player);
                  return acc;
                }, {});

                // Define position order for display
                const positionOrder = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'FLEX', 'UNKNOWN'];

                return (
                  <div className="position-based-lineup">
                    {positionOrder.map(position => {
                      const players = playersByPosition[position];
                      if (!players || players.length === 0) return null;

                      // Sort players: starters first, then by points (descending)
                      const sortedPlayers = players.sort((a, b) => {
                        if (a.isStarter && !b.isStarter) return -1;
                        if (!a.isStarter && b.isStarter) return 1;
                        return 0; // Keep original order for same starter status
                      });

                      return (
                        <div key={position} className="position-group">
                          <div className="position-header">
                            <h3 className="position-title">{position}</h3>
                            <div className="position-count">
                              {players.filter(p => p.isStarter).length} starting, {players.filter(p => !p.isStarter && !p.isIR).length} bench
                            </div>
                          </div>
                          <div className="position-players">
                            {sortedPlayers.map(player => (
                              <div 
                                key={player.player_id} 
                                className={`player-card ${player.isStarter ? 'starter' : 'bench'} ${player.isIR ? 'ir' : ''}`}
                              >
                                <div className="player-status-indicator">
                                  {player.isStarter ? (
                                    <div className="starter-badge">STARTER</div>
                                  ) : player.isIR ? (
                                    <div className="ir-badge">IR</div>
                                  ) : (
                                    <div className="bench-badge">BENCH</div>
                                  )}
                                </div>
                                
                                <div className="player-name">
                                  {player.first_name || player.full_name || 'Unknown Player'} {player.last_name || ''}
                                  <div className="player-id">ID: {player.player_id || 'N/A'}</div>
                                </div>
                                
                                <div className="player-info">
                                  <div className="player-details">
                                    {player.team || player.team_abbr || 'N/A'} • #{player.jersey_number || player.number || 'N/A'}
                                  </div>
                                  <div className="player-status">
                                    {player.status || player.injury_status || 'Active'}
                                  </div>
                                </div>
                                
                                <div className="player-metrics">
                                  <div className="metric">
                                    <div className="metric-label">Projected</div>
                                    <div className="metric-value">
                                      {player.projections?.projected_points !== undefined 
                                        ? player.projections.projected_points.toFixed(1)
                                        : 'N/A'}
                                    </div>
                                  </div>
                                  <div className="metric">
                                    <div className="metric-label">Last Week</div>
                                    <div className="metric-value">
                                      {player.stats?.previous_week?.points !== undefined 
                                        ? player.stats.previous_week.points.toFixed(1)
                                        : 'N/A'}
                                    </div>
                                  </div>
                                  <div className="metric">
                                    <div className="metric-label">Season Avg</div>
                                    <div className="metric-value">
                                      {player.stats?.season_avg !== undefined 
                                        ? player.stats.season_avg.toFixed(1)
                                        : 'N/A'}
                                    </div>
                                  </div>
                                  <div className="metric">
                                    <div className="metric-label">Rest of Year</div>
                                    <div className="metric-value">
                                      {player.projections?.rest_of_year !== undefined 
                                        ? player.projections.rest_of_year.toFixed(1)
                                        : 'N/A'}
                                    </div>
                                  </div>
                                </div>
                                
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
    </div>
  );
};

export default Lineups;
