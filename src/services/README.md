# Fantasy Football Services

This directory contains the service layer for the Fantasy Football UI application, providing a clean separation between API calls, business logic, and data processing.

## Service Architecture

### 1. `sleeperApi.js` - Direct API Integration
**Purpose**: Handles all direct interactions with the Sleeper API
**Features**:
- Generic fetch method with error handling
- Rate limiting (1000 calls/minute as per Sleeper docs)
- Specific methods for various Sleeper endpoints
- Automatic error handling and retry logic

**API Endpoints Covered**:
- User endpoints (get user by username/ID)
- League endpoints (get user leagues, league rosters, matchups)
- Draft endpoints (get league drafts)
- Player endpoints (get all players, trending players)
- Avatar endpoints (get user avatars)

**Usage Example**:
```javascript
import sleeperApi from './sleeperApi';

// Get user by username
const user = await sleeperApi.getUserByUsername('username');

// Get user's leagues
const leagues = await sleeperApi.getUserLeagues(user.user_id);
```

### 2. `fantasyDataService.js` - Business Logic & Data Processing
**Purpose**: Handles business logic, data processing, and caching strategies
**Features**:
- Player data caching (24-hour duration as recommended by Sleeper)
- Lineup processing and formatting
- Free agent calculations
- Trending player analysis
- Data validation and error handling

**Key Methods**:
- `getCurrentLineups(userId, leagueId)` - Get current week lineups
- `getCurrentMatchups(leagueId)` - Get current week matchups
- `getFreeAgents(leagueId, position, limit)` - Get available free agents
- `getTrendingPlayers(type, lookbackHours, limit)` - Get trending adds/drops
- `getPlayersWithCache(sport)` - Get players with smart caching

**Usage Example**:
```javascript
import fantasyDataService from './fantasyDataService';

// Get current lineups for a league
const lineups = await fantasyDataService.getCurrentLineups(userId, leagueId);

// Get free agents with position filter
const freeAgents = await fantasyDataService.getFreeAgents(leagueId, 'WR', 25);
```

### 3. `sleeperConfig.js` - Configuration & Storage
**Purpose**: Manages Sleeper-specific configuration and user preferences
**Features**:
- Centralized configuration constants
- User preference storage (localStorage)
- Helper functions for data persistence
- Default values and fallbacks

## Data Flow

```
User Action → Component → Service Layer → API → Data Processing → UI Update
     ↓              ↓           ↓         ↓         ↓           ↓
  Click Team → App.js → fantasyDataService → sleeperApi → Cache/Process → Display
```

## Caching Strategy

### Player Data Cache
- **Duration**: 24 hours (Sleeper recommendation)
- **Storage**: In-memory + localStorage backup
- **Invalidation**: Automatic based on timestamp
- **Fallback**: Uses cached data if API fails

### League Data Cache
- **Duration**: 5 minutes (frequently changing)
- **Storage**: In-memory only
- **Use Case**: Matchups, rosters, standings

## Error Handling

### API Errors
- Network failures → Retry with exponential backoff
- Rate limiting → Queue requests and wait
- Invalid responses → Fallback to cached data
- User errors → Clear error messages

### Data Validation
- Required fields checking
- Type validation
- Fallback values for missing data
- Graceful degradation

## Rate Limiting

### Sleeper API Limits
- **Limit**: 1000 requests per minute
- **Implementation**: In-memory counter with minute-based reset
- **Strategy**: Queue requests when limit reached
- **Monitoring**: Real-time status display

## Future Enhancements

### Planned Features
- **Projections API integration** - Player projections and rankings
- **Advanced analytics** - Player performance trends
- **Trade analysis** - Trade value calculations
- **Injury tracking** - Real-time injury updates
- **News integration** - Player news and updates

### Performance Improvements
- **Service Worker** - Offline functionality
- **Background sync** - Data updates in background
- **Lazy loading** - Load data on demand
- **Compression** - Reduce API response sizes

## Testing

### Unit Tests
- Service method testing
- Error handling validation
- Cache behavior verification
- Rate limiting accuracy

### Integration Tests
- API endpoint testing
- Data flow validation
- Error scenario testing
- Performance benchmarking

## Configuration

### Environment Variables
- `REACT_APP_SLEEPER_BASE_URL` - Sleeper API base URL
- `REACT_APP_SLEEPER_RATE_LIMIT` - API rate limit
- `REACT_APP_ENABLE_DEBUG_LOGGING` - Debug mode toggle
- `REACT_APP_PLAYER_CACHE_DURATION` - Cache duration

### Local Storage Keys
- `sleeper_username` - User's Sleeper username
- `sleeper_user_id` - User's Sleeper user ID
- `selected_league_id` - Currently selected league
- `last_active_tab` - Last active application tab

## Best Practices

### Code Organization
- Single responsibility principle
- Clear separation of concerns
- Consistent error handling
- Comprehensive logging

### Performance
- Efficient caching strategies
- Minimal API calls
- Smart data invalidation
- Background processing

### Security
- No sensitive data in code
- Environment variable usage
- Input validation
- Error message sanitization
