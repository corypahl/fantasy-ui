import React, { useState, useEffect } from 'react';
import './Standings.css';

const Standings = ({ 
  selectedTeam, 
  userData, 
  onTeamSelection,
  allTeams,
  isLoading 
}) => {
  const [standingsData] = useState([
    {
      rank: 1,
      team: {
        name: 'Championship Bound',
        owner: 'John Doe',
        wins: 12,
        losses: 2,
        ties: 0,
        pointsFor: 1850.5,
        pointsAgainst: 1650.2
      },
      record: '12-2-0',
      winPercentage: 0.857,
      gamesBack: 0,
      streak: 'W4'
    },
    {
      rank: 2,
      team: {
        name: 'Fantasy Legends',
        owner: 'Jane Smith',
        wins: 10,
        losses: 4,
        ties: 0,
        pointsFor: 1780.3,
        pointsAgainst: 1680.1
      },
      record: '10-4-0',
      winPercentage: 0.714,
      gamesBack: 2,
      streak: 'W2'
    },
    {
      rank: 3,
      team: {
        name: 'Gridiron Warriors',
        owner: 'Mike Johnson',
        wins: 9,
        losses: 5,
        ties: 0,
        pointsFor: 1720.8,
        pointsAgainst: 1690.5
      },
      record: '9-5-0',
      winPercentage: 0.643,
      gamesBack: 3,
      streak: 'L1'
    },
    {
      rank: 4,
      team: {
        name: 'Touchdown Titans',
        owner: 'Sarah Wilson',
        wins: 8,
        losses: 6,
        ties: 0,
        pointsFor: 1680.2,
        pointsAgainst: 1700.3
      },
      record: '8-6-0',
      winPercentage: 0.571,
      gamesBack: 4,
      streak: 'W1'
    },
    {
      rank: 5,
      team: {
        name: 'End Zone Elite',
        owner: 'David Brown',
        wins: 7,
        losses: 7,
        ties: 0,
        pointsFor: 1650.7,
        pointsAgainst: 1680.9
      },
      record: '7-7-0',
      winPercentage: 0.500,
      gamesBack: 5,
      streak: 'L2'
    },
    {
      rank: 6,
      team: {
        name: 'Red Zone Raiders',
        owner: 'Lisa Davis',
        wins: 6,
        losses: 8,
        ties: 0,
        pointsFor: 1620.4,
        pointsAgainst: 1690.6
      },
      record: '6-8-0',
      winPercentage: 0.429,
      gamesBack: 6,
      streak: 'W1'
    },
    {
      rank: 7,
      team: {
        name: 'Goal Line Gang',
        owner: 'Tom Miller',
        wins: 5,
        losses: 9,
        ties: 0,
        pointsFor: 1580.1,
        pointsAgainst: 1720.8
      },
      record: '5-9-0',
      winPercentage: 0.357,
      gamesBack: 7,
      streak: 'L3'
    },
    {
      rank: 8,
      team: {
        name: 'Field Goal Force',
        owner: 'Amy Taylor',
        wins: 4,
        losses: 10,
        ties: 0,
        pointsFor: 1550.3,
        pointsAgainst: 1750.2
      },
      record: '4-10-0',
      winPercentage: 0.286,
      gamesBack: 8,
      streak: 'L1'
    },
    {
      rank: 9,
      team: {
        name: 'Punt Return Pros',
        owner: 'Chris Anderson',
        wins: 3,
        losses: 11,
        ties: 0,
        pointsFor: 1520.6,
        pointsAgainst: 1780.5
      },
      record: '3-11-0',
      winPercentage: 0.214,
      gamesBack: 9,
      streak: 'L4'
    },
    {
      rank: 10,
      team: {
        name: 'Kickoff Kings',
        owner: 'Rachel Garcia',
        wins: 2,
        losses: 12,
        ties: 0,
        pointsFor: 1480.9,
        pointsAgainst: 1820.1
      },
      record: '2-12-0',
      winPercentage: 0.143,
      gamesBack: 10,
      streak: 'L5'
    }
  ]);

  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');

  // Auto-load first team when component mounts
  useEffect(() => {
    if (allTeams && allTeams.length > 0 && !selectedTeam) {
      const firstTeam = allTeams[0];
      onTeamSelection(firstTeam);
    }
  }, [allTeams, selectedTeam, onTeamSelection]);

  if (!userData) {
    return (
      <div className="standings-content">
        <h2>🏆 Standings</h2>
        <p>Please connect to your fantasy platform first to view league standings.</p>
      </div>
    );
  }

  if (!selectedTeam) {
    return (
      <div className="standings-content">
        <h2>🏆 Standings</h2>
        <p>Please select a team to view league standings.</p>
      </div>
    );
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedStandings = [...standingsData].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'rank':
        aValue = a.rank;
        bValue = b.rank;
        break;
      case 'team':
        aValue = a.team.name.toLowerCase();
        bValue = b.team.name.toLowerCase();
        break;
      case 'owner':
        aValue = a.team.owner.toLowerCase();
        bValue = b.team.owner.toLowerCase();
        break;
      case 'wins':
        aValue = a.team.wins;
        bValue = b.team.wins;
        break;
      case 'losses':
        aValue = a.team.losses;
        bValue = b.team.losses;
        break;
      case 'pointsFor':
        aValue = a.team.pointsFor;
        bValue = b.team.pointsFor;
        break;
      case 'pointsAgainst':
        aValue = a.team.pointsAgainst;
        bValue = b.team.pointsAgainst;
        break;
      case 'winPercentage':
        aValue = a.winPercentage;
        bValue = b.winPercentage;
        break;
      default:
        aValue = a.rank;
        bValue = b.rank;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getRankClass = (rank) => {
    if (rank <= 4) return 'playoff';
    if (rank <= 6) return 'bubble';
    return 'out';
  };

  return (
    <div className="standings-content">
      <div className="standings-header">
        <div className="header-left">
          <h2>🏆 League Standings</h2>
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
          {isLoading && (
            <div className="loading-indicator">
              <span>🔄 Loading standings...</span>
            </div>
          )}
        </div>
      </div>

      {/* Standings Table */}
      <div className="standings-table-container">
        <table className="standings-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('rank')} className="sortable">
                Rank {getSortIcon('rank')}
              </th>
              <th onClick={() => handleSort('team')} className="sortable">
                Team {getSortIcon('team')}
              </th>
              <th onClick={() => handleSort('owner')} className="sortable">
                Owner {getSortIcon('owner')}
              </th>
              <th onClick={() => handleSort('wins')} className="sortable">
                W {getSortIcon('wins')}
              </th>
              <th onClick={() => handleSort('losses')} className="sortable">
                L {getSortIcon('losses')}
              </th>
              <th onClick={() => handleSort('winPercentage')} className="sortable">
                PCT {getSortIcon('winPercentage')}
              </th>
              <th onClick={() => handleSort('pointsFor')} className="sortable">
                PF {getSortIcon('pointsFor')}
              </th>
              <th onClick={() => handleSort('pointsAgainst')} className="sortable">
                PA {getSortIcon('pointsAgainst')}
              </th>
              <th>GB</th>
              <th>Streak</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((team, index) => (
              <tr 
                key={team.rank} 
                className={`standings-row ${getRankClass(team.rank)} ${
                  team.team.name === selectedTeam.teamName ? 'selected-team' : ''
                }`}
              >
                <td className="rank-cell">
                  <span className={`rank-number ${getRankClass(team.rank)}`}>
                    {team.rank}
                  </span>
                </td>
                <td className="team-cell">
                  <div className="team-info">
                    <span className="team-name">{team.team.name}</span>
                    {team.team.name === selectedTeam.teamName && (
                      <span className="your-team-badge">Your Team</span>
                    )}
                  </div>
                </td>
                <td className="owner-cell">{team.team.owner}</td>
                <td className="wins-cell">{team.team.wins}</td>
                <td className="losses-cell">{team.team.losses}</td>
                <td className="pct-cell">{(team.winPercentage * 100).toFixed(1)}%</td>
                <td className="pf-cell">{team.team.pointsFor.toFixed(1)}</td>
                <td className="pa-cell">{team.team.pointsAgainst.toFixed(1)}</td>
                <td className="gb-cell">{team.gamesBack}</td>
                <td className="streak-cell">
                  <span className={`streak ${team.streak.startsWith('W') ? 'winning' : 'losing'}`}>
                    {team.streak}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Playoff Picture */}
      <div className="playoff-picture">
        <h3>🏆 Playoff Picture</h3>
        <div className="playoff-teams">
          <div className="playoff-section">
            <h4>Bye Week (Top 2)</h4>
            <div className="playoff-team-list">
              {sortedStandings.slice(0, 2).map(team => (
                <div key={team.rank} className="playoff-team bye">
                  <span className="playoff-rank">#{team.rank}</span>
                  <span className="playoff-team-name">{team.team.name}</span>
                  <span className="playoff-record">{team.record}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="playoff-section">
            <h4>Wild Card (3-6)</h4>
            <div className="playoff-team-list">
              {sortedStandings.slice(2, 6).map(team => (
                <div key={team.rank} className="playoff-team wildcard">
                  <span className="playoff-rank">#{team.rank}</span>
                  <span className="playoff-team-name">{team.team.name}</span>
                  <span className="playoff-record">{team.record}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="playoff-section">
            <h4>Out of Playoffs (7-10)</h4>
            <div className="playoff-team-list">
              {sortedStandings.slice(6).map(team => (
                <div key={team.rank} className="playoff-team out">
                  <span className="playoff-rank">#{team.rank}</span>
                  <span className="playoff-team-name">{team.team.name}</span>
                  <span className="playoff-record">{team.record}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* League Stats */}
      <div className="league-stats">
        <h3>📊 League Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Teams</span>
            <span className="stat-value">{standingsData.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Games Played</span>
            <span className="stat-value">{standingsData[0].team.wins + standingsData[0].team.losses}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Highest Score</span>
            <span className="stat-value">
              {Math.max(...standingsData.map(t => t.team.pointsFor)).toFixed(1)}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Lowest Score</span>
            <span className="stat-value">
              {Math.min(...standingsData.map(t => t.team.pointsFor)).toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Standings;
