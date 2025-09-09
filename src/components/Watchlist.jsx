import React, { useState, useEffect } from 'react';
import './Watchlist.css';
import fantasyDataService from '../services/fantasyDataService';

const Watchlist = ({ 
  userData, 
  allTeams,
  isLoading 
}) => {
  const [games, setGames] = useState([]);
  const [allPlayers, setAllPlayers] = useState({});
  const [loading, setLoading] = useState(false);
  const [gamePlayers, setGamePlayers] = useState({});
  const [selectedTimes, setSelectedTimes] = useState(new Set());

  // No need for team selection in watchlist - it aggregates across all teams

  // Load NFL games and player data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        console.log('Watchlist loading data with allTeams:', allTeams);
        
        const [gamesData, playersData] = await Promise.all([
          fantasyDataService.getCurrentNFLGames(),
          fantasyDataService.getPlayersWithCache()
        ]);
        
        setGames(gamesData);
        setAllPlayers(playersData);
        
        // Initialize all unique times as selected by default
        const uniqueTimes = getUniqueStartTimes(gamesData);
        setSelectedTimes(new Set(uniqueTimes));
        
        // Load players for each game
        const gamePlayersData = {};
        for (const game of gamesData) {
          try {
            const players = await fantasyDataService.getPlayersInGame(game, allTeams);
            gamePlayersData[game.id] = players;
          } catch (error) {
            console.error(`Error loading players for game ${game.id}:`, error);
            gamePlayersData[game.id] = { myPlayers: [], opposingPlayers: [] };
          }
        }
        
        setGamePlayers(gamePlayersData);
      } catch (error) {
        console.error('Error loading watchlist data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (allTeams && allTeams.length > 0) {
      loadData();
    }
  }, [allTeams]);

  if (!userData) {
    return (
      <div className="watchlist-content">
        <h2>👀 Watchlist</h2>
        <p>Please connect to your fantasy platform first to manage your watchlist.</p>
      </div>
    );
  }

  if (!allTeams || allTeams.length === 0) {
    return (
      <div className="watchlist-content">
        <h2>👀 Watchlist</h2>
        <p>No teams found. Please connect to your fantasy platform first.</p>
      </div>
    );
  }

  // Get players from all teams for a specific NFL team
  const getPlayersForNflTeam = (nflTeamAbbr) => {
    const players = [];
    
    // Get all teams' rosters
    allTeams.forEach(team => {
      // This would need to be implemented to get roster data for each team
      // For now, we'll use mock data structure
    });
    
    return players;
  };

  // Get team abbreviation from team code
  const getTeamAbbr = (teamCode) => {
    // Sleeper uses team codes like 'BUF', 'KC', etc.
    return teamCode || 'N/A';
  };

  // Format game time
  const formatGameTime = (gameTime) => {
    if (!gameTime) return 'TBD';
    const date = new Date(gameTime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return '#00d4aa';
      case 'today': return '#ffa500';
      case 'live': return '#ff4444';
      case 'completed': return '#888888';
      default: return '#888888';
    }
  };

  // Get unique start times from games
  const getUniqueStartTimes = (games) => {
    const timeObjects = [];
    games.forEach(game => {
      if (game.gameTime) {
        const date = new Date(game.gameTime);
        const timeString = date.toLocaleString('en-US', {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        timeObjects.push({
          timeString,
          date
        });
      }
    });
    
    // Remove duplicates and sort by date
    const uniqueTimes = timeObjects.reduce((acc, current) => {
      const existing = acc.find(item => item.timeString === current.timeString);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    return uniqueTimes
      .sort((a, b) => a.date - b.date)
      .map(item => item.timeString);
  };

  // Toggle time selection
  const toggleTime = (time) => {
    const newSelectedTimes = new Set(selectedTimes);
    if (newSelectedTimes.has(time)) {
      newSelectedTimes.delete(time);
    } else {
      newSelectedTimes.add(time);
    }
    setSelectedTimes(newSelectedTimes);
  };


  // Filter games based on selected times
  const getFilteredGames = () => {
    if (selectedTimes.size === 0) return games; // Show all if none selected
    
    return games.filter(game => {
      if (!game.gameTime) return false;
      const date = new Date(game.gameTime);
      const timeString = date.toLocaleString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return selectedTimes.has(timeString);
    });
  };

  return (
    <div className="watchlist-content">
      <div className="watchlist-header">
        <div className="header-left">
          <h2>👀 NFL Matchups</h2>
        </div>
        <div className="header-actions">
          {loading && (
            <div className="loading-indicator">
              <span>🔄 Loading matchups...</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="filter-buttons">
        {getUniqueStartTimes(games).map(time => (
          <button 
            key={time}
            className={`filter-btn ${selectedTimes.has(time) ? 'active' : ''}`}
            onClick={() => toggleTime(time)}
          >
            {time}
          </button>
        ))}
      </div>

      {/* NFL Games */}
      <div className="games-container">
        {loading ? (
          <div className="loading-state">
            <p>Loading NFL games and player data...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="no-games">
            <p>No NFL games found for this week.</p>
          </div>
        ) : (
          <div className="games-list">
            {getFilteredGames().map(game => (
              <div key={game.id} className="game-card">
                {/* Basic Game Info */}
                <div className="game-header">
                  <div className="game-basic-info">
                    <div className="game-matchup">
                      <span className="away-team">{getTeamAbbr(game.awayTeam)}</span>
                      <span className="vs-divider">@</span>
                      <span className="home-team">{getTeamAbbr(game.homeTeam)}</span>
                    </div>
                    <div className="game-time">
                      {formatGameTime(game.gameTime)}
                    </div>
                    <div className="game-spread">
                      Spread: TBD
                    </div>
                  </div>
                  <div 
                    className="game-status"
                    style={{ color: getStatusColor(game.status) }}
                  >
                    {game.status?.toUpperCase() || 'UPCOMING'}
                  </div>
                </div>

                {/* Players in this game - Two columns */}
                <div className="players-in-game">
                  <div className="players-column my-players">
                    <h4>My Players ({gamePlayers[game.id]?.myPlayers?.length || 0})</h4>
                    <div className="players-list">
                      {gamePlayers[game.id]?.myPlayers?.length > 0 ? (
                        gamePlayers[game.id].myPlayers.map(player => (
                          <div key={`${player.player_id}-${player.leagueId}`} className="player-item">
                            <div className="player-info">
                              <div className={`player-name ${player.leagueName === 'FanDuel' ? 'fanduel-player' : 'jackson-player'}`}>
                                {player.first_name} {player.last_name}
                              </div>
                              <div className="player-details">
                                {player.position} • {player.team} • {player.leagueName}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-players">
                          No players from your teams in this game
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="players-column opposing-players">
                    <h4>Opposing Players ({gamePlayers[game.id]?.opposingPlayers?.length || 0})</h4>
                    <div className="players-list">
                      {gamePlayers[game.id]?.opposingPlayers?.length > 0 ? (
                        gamePlayers[game.id].opposingPlayers.map(player => (
                          <div key={`${player.player_id}-${player.leagueId}`} className="player-item">
                            <div className="player-info">
                              <div className={`player-name ${player.leagueName === 'FanDuel' ? 'fanduel-player' : 'jackson-player'}`}>
                                {player.first_name} {player.last_name}
                              </div>
                              <div className="player-details">
                                {player.position} • {player.team} • vs {player.opponentName}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-players">
                          No opposing players in this game
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
