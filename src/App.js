import React, { useState } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="overview-content">
            <div className="welcome-section">
              <h2>🏈 Welcome to Fantasy Football Manager</h2>
              <p>Your comprehensive platform for managing fantasy football teams, analyzing players, and making informed decisions throughout the season.</p>
            </div>
            
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
            <p>Team management features coming soon...</p>
          </div>
        );
      
      case 'players':
        return (
          <div className="players-content">
            <h2>👥 Player Database</h2>
            <p>Player research and analysis tools coming soon...</p>
          </div>
        );
      
      case 'analytics':
        return (
          <div className="analytics-content">
            <h2>📊 Analytics Dashboard</h2>
            <p>Advanced analytics and insights coming soon...</p>
          </div>
        );
      
      default:
        return (
          <div className="overview-content">
            <h2>🏈 Welcome to Fantasy Football Manager</h2>
            <p>Your comprehensive platform for managing fantasy football teams.</p>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏈 Fantasy Football Manager</h1>
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
