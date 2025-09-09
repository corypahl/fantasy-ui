# Sleeper Projections & Stats Integration

This document describes the implementation of Sleeper's undocumented projections and stats endpoints in the fantasy UI application.

## Overview

The application now integrates with Sleeper's undocumented API endpoints to fetch:
- Weekly player projections
- Player statistics (weekly and season)
- Player research data

## New Endpoints Added

### 1. Weekly Projections
```
GET https://api.sleeper.app/projections/nfl/<season>/<week>?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF&scoring=ppr
```

### 2. Player Stats
```
GET https://api.sleeper.app/stats/nfl/player/<player_id>?season_type=regular&season=<season>&grouping=week
```

### 3. Player Research
```
GET https://api.sleeper.app/players/nfl/research/<regular|post>/<season>/<week>
```

### 4. NFL State (Current Week)
```
GET https://api.sleeper.app/state/nfl
```

## Implementation Details

### Files Modified/Created

1. **`src/services/sleeperApi.js`**
   - Added `getWeeklyProjections()` method
   - Added `getPlayerStats()` method
   - Added `getPlayerResearch()` method
   - Added `getNFLState()` method for current week detection

2. **`src/services/projectionsService.js`** (NEW)
   - Handles caching of projections and stats data
   - Calculates fantasy points based on league scoring settings
   - Provides batch operations for multiple players
   - Fetches current NFL week/season from Sleeper API (not hardcoded)

3. **`src/services/fantasyDataService.js`**
   - Added `getEnhancedLineups()` method that includes projections and stats
   - Added `getLeagueScoringSettings()` method
   - Added `enhancePlayerData()` method to merge projection/stats data

4. **`src/App.js`**
   - Updated `loadLineupData()` to use enhanced lineup data for Sleeper teams

5. **`src/components/Lineups.jsx`**
   - Updated to display projection and stats data
   - Added metadata section showing week, season, and scoring type
   - Enhanced player metrics display

6. **`src/components/Lineups.css`**
   - Added styling for projections metadata section

## Features

### Enhanced Player Data
Each player now includes:
- **Projected Points**: Calculated based on league scoring settings
- **Current Week Stats**: Actual performance for the current week
- **Season Average**: Average fantasy points per game
- **Weekly Stats**: Historical performance data

### League Scoring Integration
- Automatically fetches league scoring settings from Sleeper
- Calculates fantasy points using league-specific scoring rules
- Supports PPR, Half-PPR, and Standard scoring formats

### Caching System
- 30-minute cache for projections and stats data
- Reduces API calls and improves performance
- Automatic cache invalidation

### Error Handling
- Graceful fallback to basic lineup data if projections fail
- Individual player failures don't break the entire lineup
- Comprehensive error logging

## Usage

### Basic Usage
The enhanced lineup data is automatically loaded when you:
1. Select a Sleeper team
2. Click "Refresh Data" button
3. Switch between teams

### Data Display
The Lineups component now shows:
- **This Week**: Current week's actual points
- **Projected**: Projected points for the current week
- **Season Avg**: Average points per game this season

### Metadata
The interface displays:
- Current NFL week and season
- Last data update time
- League scoring format (PPR/Standard)

## API Rate Limiting

The implementation respects Sleeper's rate limits:
- Built-in rate limiting in `sleeperApi.js`
- Caching reduces redundant API calls
- Batch operations minimize total requests

## Future Enhancements

Potential improvements:
1. **Historical Data**: Store and display historical projections vs actual performance
2. **Trend Analysis**: Show player performance trends over multiple weeks
3. **Injury Updates**: Integrate injury status with projections
4. **Matchup Analysis**: Factor in opponent strength for projections
5. **Custom Scoring**: Allow users to override league scoring settings

## Troubleshooting

### Common Issues

1. **No Projections Data**
   - Check if the current week has projections available
   - Verify league scoring settings are accessible
   - Check browser console for API errors

2. **Incorrect Points Calculation**
   - Verify league scoring settings match your Sleeper league
   - Check if the league uses custom scoring rules

3. **Slow Loading**
   - Projections data may take longer to load due to multiple API calls
   - Caching will improve subsequent loads

### Debug Information
Enable debug mode in `appConfig.js` to see detailed API request logs.

## Notes

- These endpoints are undocumented and may change without notice
- The implementation includes fallback mechanisms for reliability
- Data is cached to minimize API usage and improve performance
- The system gracefully handles missing or incomplete data
