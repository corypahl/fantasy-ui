// NFL Matchups Service
// Handles fetching NFL weekly matchups and game data

class NflMatchupsService {
  constructor() {
    this.baseUrl = 'https://api.the-odds-api.com/v4';
    this.apiKey = process.env.REACT_APP_ODDS_API_KEY;
    this.matchupsCache = null;
    this.lastMatchupsUpdate = null;
    this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  }

  // Get current week NFL matchups
  async getNflMatchups() {
    const now = Date.now();
    
    // Check cache first
    if (this.matchupsCache && this.lastMatchupsUpdate && 
        (now - this.lastMatchupsUpdate) < this.CACHE_DURATION) {
      return this.matchupsCache;
    }

    try {
      if (!this.apiKey) {
        console.warn('Odds API key not configured, using mock data');
        return this.getMockMatchups();
      }

      const response = await fetch(
        `${this.baseUrl}/sports/americanfootball_nfl/odds?apiKey=${this.apiKey}&bookmakers=fanduel&markets=spreads,totals&oddsFormat=american`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const processedMatchups = this.processMatchupsData(data);
      
      this.matchupsCache = processedMatchups;
      this.lastMatchupsUpdate = now;
      
      return processedMatchups;
    } catch (error) {
      console.error('Error fetching NFL matchups:', error);
      console.log('Falling back to mock data');
      return this.getMockMatchups();
    }
  }

  // Process raw matchups data from Odds API
  processMatchupsData(rawData) {
    const matchups = [];

    for (const game of rawData) {
      const teams = game.teams || [game.home_team, game.away_team];
      if (teams.length !== 2) continue;

      const commenceTime = game.commence_time;
      
      // Find FanDuel odds
      const sites = game.sites || game.bookmakers || [];
      const fanduelSite = sites.find(s => 
        s.site_key === 'fanduel' || s.key === 'fanduel'
      );

      if (!fanduelSite) continue;

      // Extract spreads and totals
      let spreads = [];
      let total = null;

      if (Array.isArray(fanduelSite.markets)) {
        // New v4 API format
        const spreadsMarket = fanduelSite.markets.find(m => m.key === 'spreads');
        const totalsMarket = fanduelSite.markets.find(m => m.key === 'totals');

        if (spreadsMarket && spreadsMarket.outcomes) {
          spreads = spreadsMarket.outcomes.map(outcome => ({
            team: outcome.name,
            spread: parseFloat(outcome.point) || 0
          }));
        }

        if (totalsMarket && totalsMarket.outcomes && totalsMarket.outcomes.length > 0) {
          total = parseFloat(totalsMarket.outcomes[0].point) || null;
        }
      } else {
        // Legacy format
        const odds = fanduelSite.odds || {};
        const spreadsData = odds.spreads || {};
        const totalsData = odds.totals || {};

        if (spreadsData.points && Array.isArray(spreadsData.points)) {
          spreads = teams.map((team, index) => ({
            team: team,
            spread: parseFloat(spreadsData.points[index]) || 0
          }));
        }

        if (totalsData.points) {
          total = parseFloat(totalsData.points) || null;
        }
      }

      // Create matchup object
      const matchup = {
        id: game.id,
        homeTeam: teams[0],
        awayTeam: teams[1],
        gameTime: commenceTime,
        spreads: spreads,
        total: total,
        status: this.getGameStatus(commenceTime)
      };

      matchups.push(matchup);
    }

    return matchups;
  }

  // Get game status based on start time
  getGameStatus(commenceTime) {
    const gameTime = new Date(commenceTime);
    const now = new Date();
    const timeDiff = gameTime.getTime() - now.getTime();

    if (timeDiff > 24 * 60 * 60 * 1000) { // More than 24 hours
      return 'upcoming';
    } else if (timeDiff > 0) { // Future but within 24 hours
      return 'today';
    } else if (timeDiff > -3 * 60 * 60 * 1000) { // Within 3 hours of start
      return 'live';
    } else {
      return 'completed';
    }
  }

  // Mock data for development/testing
  getMockMatchups() {
    return [
      {
        id: 'mock-1',
        homeTeam: 'Kansas City Chiefs',
        awayTeam: 'Buffalo Bills',
        gameTime: '2024-01-21T20:00:00Z',
        spreads: [
          { team: 'Kansas City Chiefs', spread: -2.5 },
          { team: 'Buffalo Bills', spread: 2.5 }
        ],
        total: 48.5,
        status: 'upcoming'
      },
      {
        id: 'mock-2',
        homeTeam: 'San Francisco 49ers',
        awayTeam: 'Detroit Lions',
        gameTime: '2024-01-21T23:30:00Z',
        spreads: [
          { team: 'San Francisco 49ers', spread: -7.0 },
          { team: 'Detroit Lions', spread: 7.0 }
        ],
        total: 52.0,
        status: 'upcoming'
      },
      {
        id: 'mock-3',
        homeTeam: 'Baltimore Ravens',
        awayTeam: 'Houston Texans',
        gameTime: '2024-01-20T20:00:00Z',
        spreads: [
          { team: 'Baltimore Ravens', spread: -9.5 },
          { team: 'Houston Texans', spread: 9.5 }
        ],
        total: 44.0,
        status: 'completed'
      },
      {
        id: 'mock-4',
        homeTeam: 'Tampa Bay Buccaneers',
        awayTeam: 'Philadelphia Eagles',
        gameTime: '2024-01-20T23:30:00Z',
        spreads: [
          { team: 'Tampa Bay Buccaneers', spread: 3.0 },
          { team: 'Philadelphia Eagles', spread: -3.0 }
        ],
        total: 46.5,
        status: 'completed'
      }
    ];
  }

  // Get team abbreviation from full name
  getTeamAbbreviation(teamName) {
    const teamMap = {
      'Kansas City Chiefs': 'KC',
      'Buffalo Bills': 'BUF',
      'San Francisco 49ers': 'SF',
      'Detroit Lions': 'DET',
      'Baltimore Ravens': 'BAL',
      'Houston Texans': 'HOU',
      'Tampa Bay Buccaneers': 'TB',
      'Philadelphia Eagles': 'PHI',
      'Miami Dolphins': 'MIA',
      'New York Jets': 'NYJ',
      'New England Patriots': 'NE',
      'Cleveland Browns': 'CLE',
      'Pittsburgh Steelers': 'PIT',
      'Cincinnati Bengals': 'CIN',
      'Indianapolis Colts': 'IND',
      'Jacksonville Jaguars': 'JAX',
      'Tennessee Titans': 'TEN',
      'Denver Broncos': 'DEN',
      'Las Vegas Raiders': 'LV',
      'Los Angeles Chargers': 'LAC',
      'Dallas Cowboys': 'DAL',
      'New York Giants': 'NYG',
      'Washington Commanders': 'WAS',
      'Chicago Bears': 'CHI',
      'Green Bay Packers': 'GB',
      'Minnesota Vikings': 'MIN',
      'Atlanta Falcons': 'ATL',
      'Carolina Panthers': 'CAR',
      'New Orleans Saints': 'NO',
      'Arizona Cardinals': 'ARI',
      'Los Angeles Rams': 'LAR',
      'Seattle Seahawks': 'SEA'
    };

    return teamMap[teamName] || teamName;
  }

  // Format game time for display
  formatGameTime(gameTime) {
    const date = new Date(gameTime);
    const now = new Date();
    const timeDiff = date.getTime() - now.getTime();

    if (timeDiff > 0) {
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    } else {
      return 'Started';
    }
  }
}

// Create and export a singleton instance
const nflMatchupsService = new NflMatchupsService();
export default nflMatchupsService;
