import React, { useState } from 'react';
import './Watchlist.css';

const Watchlist = ({ selectedTeam, userData }) => {
  const [watchlistItems, setWatchlistItems] = useState([
    {
      id: 1,
      player: {
        name: 'Patrick Mahomes',
        position: 'QB',
        team: 'KC',
        status: 'Active'
      },
      reason: 'Potential trade target',
      priority: 'high',
      notes: 'Looking to upgrade QB position',
      addedDate: '2024-01-15'
    },
    {
      id: 2,
      player: {
        name: 'Christian McCaffrey',
        position: 'RB',
        team: 'SF',
        status: 'Active'
      },
      reason: 'Monitor injury status',
      priority: 'medium',
      notes: 'Check weekly injury reports',
      addedDate: '2024-01-14'
    },
    {
      id: 3,
      player: {
        name: 'Tyreek Hill',
        position: 'WR',
        team: 'MIA',
        status: 'Questionable'
      },
      reason: 'Injury concern',
      priority: 'high',
      notes: 'Ankle injury - monitor practice reports',
      addedDate: '2024-01-13'
    }
  ]);

  const [newItem, setNewItem] = useState({
    playerName: '',
    position: '',
    team: '',
    reason: '',
    priority: 'medium',
    notes: ''
  });

  const [showAddForm, setShowAddForm] = useState(false);

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
        <p>Please select a team to manage your watchlist.</p>
      </div>
    );
  }

  const addToWatchlist = () => {
    if (newItem.playerName && newItem.position && newItem.team) {
      const item = {
        id: Date.now(),
        player: {
          name: newItem.playerName,
          position: newItem.position,
          team: newItem.team,
          status: 'Active'
        },
        reason: newItem.reason,
        priority: newItem.priority,
        notes: newItem.notes,
        addedDate: new Date().toISOString().split('T')[0]
      };
      
      setWatchlistItems([...watchlistItems, item]);
      setNewItem({
        playerName: '',
        position: '',
        team: '',
        reason: '',
        priority: 'medium',
        notes: ''
      });
      setShowAddForm(false);
    }
  };

  const removeFromWatchlist = (id) => {
    setWatchlistItems(watchlistItems.filter(item => item.id !== id));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'var(--accent-red)';
      case 'medium': return 'var(--accent-orange)';
      case 'low': return 'var(--accent-green)';
      default: return 'var(--text-secondary)';
    }
  };

  const getPriorityLabel = (priority) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <div className="watchlist-content">
      <div className="watchlist-header">
        <h2>👀 Watchlist</h2>
        <button 
          className="add-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '➕ Add Player'}
        </button>
      </div>

      {/* Add Player Form */}
      {showAddForm && (
        <div className="add-player-form">
          <h3>Add Player to Watchlist</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Player Name</label>
              <input
                type="text"
                value={newItem.playerName}
                onChange={(e) => setNewItem({...newItem, playerName: e.target.value})}
                placeholder="e.g., Patrick Mahomes"
              />
            </div>
            
            <div className="form-group">
              <label>Position</label>
              <select
                value={newItem.position}
                onChange={(e) => setNewItem({...newItem, position: e.target.value})}
              >
                <option value="">Select Position</option>
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="K">K</option>
                <option value="DEF">DEF</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Team</label>
              <input
                type="text"
                value={newItem.team}
                onChange={(e) => setNewItem({...newItem, team: e.target.value})}
                placeholder="e.g., KC"
                maxLength="3"
              />
            </div>
            
            <div className="form-group">
              <label>Priority</label>
              <select
                value={newItem.priority}
                onChange={(e) => setNewItem({...newItem, priority: e.target.value})}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="form-group full-width">
              <label>Reason</label>
              <input
                type="text"
                value={newItem.reason}
                onChange={(e) => setNewItem({...newItem, reason: e.target.value})}
                placeholder="e.g., Potential trade target, injury concern, etc."
              />
            </div>
            
            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={newItem.notes}
                onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                placeholder="Additional notes about this player..."
                rows="3"
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button className="save-button" onClick={addToWatchlist}>
              💾 Add to Watchlist
            </button>
          </div>
        </div>
      )}

      {/* Watchlist Items */}
      <div className="watchlist-items">
        {watchlistItems.length === 0 ? (
          <div className="empty-watchlist">
            <p>No players in your watchlist yet.</p>
            <p>Click "Add Player" to start tracking players of interest.</p>
          </div>
        ) : (
          watchlistItems.map(item => (
            <div key={item.id} className="watchlist-item">
              <div className="player-info">
                <div className="player-details">
                  <span className="player-name">{item.player.name}</span>
                  <span className="player-position">{item.player.position}</span>
                  <span className="player-team">{item.player.team}</span>
                  <span className={`player-status ${item.player.status.toLowerCase()}`}>
                    {item.player.status}
                  </span>
                </div>
                
                <div className="priority-badge" style={{ backgroundColor: getPriorityColor(item.priority) }}>
                  {getPriorityLabel(item.priority)}
                </div>
              </div>
              
              <div className="watchlist-details">
                <div className="reason">
                  <strong>Reason:</strong> {item.reason}
                </div>
                {item.notes && (
                  <div className="notes">
                    <strong>Notes:</strong> {item.notes}
                  </div>
                )}
                <div className="added-date">
                  Added: {item.addedDate}
                </div>
              </div>
              
              <div className="watchlist-actions">
                <button className="edit-button">✏️ Edit</button>
                <button 
                  className="remove-button"
                  onClick={() => removeFromWatchlist(item.id)}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Watchlist Stats */}
      {watchlistItems.length > 0 && (
        <div className="watchlist-stats">
          <div className="stat-item">
            <span className="stat-label">Total Players:</span>
            <span className="stat-value">{watchlistItems.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">High Priority:</span>
            <span className="stat-value">
              {watchlistItems.filter(item => item.priority === 'high').length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">By Position:</span>
            <span className="stat-value">
              {Object.entries(
                watchlistItems.reduce((acc, item) => {
                  acc[item.player.position] = (acc[item.player.position] || 0) + 1;
                  return acc;
                }, {})
              ).map(([pos, count]) => `${pos}: ${count}`).join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
