import React, { useState, useEffect } from 'react';
import './Watchlist.css';
import nflMatchupsService from '../services/nflMatchupsService';
import fantasyDataService from '../services/fantasyDataService';

const Watchlist = ({ 
  selectedTeam, 
  userData, 
  onTeamSelection,
  allTeams,
  isLoading 
}) => {
  const [matchups, setMatchups] = useState([]);
  const [allPlayers, setAllPlayers] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('current');

  // Auto-load first team when component mounts
  useEffect(() => {
    if (allTeams && allTeams.length > 0 && !selectedTeam) {
      const firstTeam = allTeams[0];
      onTeamSelection(firstTeam);
    }
  }, [allTeams, selectedTeam, onTeamSelection]);

  // Load NFL matchups and player data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [matchupsData, playersData] = await Promise.all([
          nflMatchupsService.getNflMatchups(),
          fantasyDataService.getPlayersWithCache()
        ]);
        
        setMatchups(matchupsData);
        setAllPlayers(playersData);
      } catch (error) {
        console.error('Error loading watchlist data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (!userData) {
    return (
      <div className="watchlist-content">
        <h2>👀 Watchlist</h2>
        <p>Please connect to your fantasy platform first to manage your watchlist.</p>
      </div>
    );
  }

  if (!selectedTeam) {
    return (
      <div className="watchlist-content">
        <h2>👀 Watchlist</h2>
        <p>Please select a team to view your players in NFL matchups.</p>
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

  // Get team abbreviation from full name
  const getTeamAbbr = (teamName) => {
    return nflMatchupsService.getTeamAbbreviation(teamName);
  };

  // Format game time
  const formatGameTime = (gameTime) => {
    return nflMatchupsService.formatGameTime(gameTime);
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

  return (
    <div className="watchlist-content">
      <div className="watchlist-header">
        <div className="header-left">
          <h2>👀 NFL Matchups</h2>
          {allTeams && allTeams.length > 0 && (
            <div className="league-selector">
              <select 
                value={selectedTeam ? `${selectedTeam.platform}-${selectedTeam.teamId}` : ''}
                onChange={(e) => {
                  const [platform, teamId] = e.target.value.split('-');
                  const team = allTeams.find(t => t.platform === platform && t.teamId === teamId);
                  if (team && onTeamSelection) {
                    onTeamSelection(team);
                  }
                }}
                className="league-dropdown"
              >
                <option value="">Select a league...</option>
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
          {loading && (
            <div className="loading-indicator">
              <span>🔄 Loading matchups...</span>
            </div>
          )}
        </div>
      </div>

      {/* NFL Matchups */}
      <div className="matchups-container">
        {loading ? (
          <div className="loading-state">
            <p>Loading NFL matchups and player data...</p>
          </div>
        ) : matchups.length === 0 ? (
          <div className="no-matchups">
            <p>No NFL matchups found for this week.</p>
          </div>
        ) : (
          <div className="matchups-list">
            {matchups.map(matchup => (
              <div key={matchup.id} className="matchup-card">
                <div className="matchup-header">
                  <div className="matchup-teams">
                    <div className="team-info">
                      <span className="team-name">{getTeamAbbr(matchup.awayTeam)}</span>
                      <span className="team-spread">
                        {matchup.spreads.find(s => s.team === matchup.awayTeam)?.spread > 0 ? '+' : ''}
                        {matchup.spreads.find(s => s.team === matchup.awayTeam)?.spread || 'N/A'}
                      </span>
                    </div>
                    <div className="vs-divider">@</div>
                    <div className="team-info">
                      <span className="team-name">{getTeamAbbr(matchup.homeTeam)}</span>
                      <span className="team-spread">
                        {matchup.spreads.find(s => s.team === matchup.homeTeam)?.spread > 0 ? '+' : ''}
                        {matchup.spreads.find(s => s.team === matchup.homeTeam)?.spread || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="matchup-details">
                    <div className="game-time">
                      {formatGameTime(matchup.gameTime)}
                    </div>
                    <div className="game-total">
                      O/U: {matchup.total || 'N/A'}
                    </div>
                    <div 
                      className="game-status"
                      style={{ color: getStatusColor(matchup.status) }}
                    >
                      {matchup.status.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Players in this game */}
                <div className="players-in-game">
                  <div className="players-section">
                    <h4>{getTeamAbbr(matchup.awayTeam)} Players</h4>
                    <div className="players-list">
                      {/* This would show players from your teams on the away team */}
                      <div className="no-players">
                        No players from your teams on {getTeamAbbr(matchup.awayTeam)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="players-section">
                    <h4>{getTeamAbbr(matchup.homeTeam)} Players</h4>
                    <div className="players-list">
                      {/* This would show players from your teams on the home team */}
                      <div className="no-players">
                        No players from your teams on {getTeamAbbr(matchup.homeTeam)}
                      </div>
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
