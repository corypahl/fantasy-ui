# Teams Configuration Guide

This guide explains how to configure multiple teams and leagues across different fantasy football platforms in your Fantasy Football UI application.

## Overview

The application supports multiple teams and leagues across different platforms:
- **Sleeper**: Multiple leagues under one username
- **ESPN**: Multiple teams across different leagues
- **Future**: Support for additional platforms (Yahoo, NFL.com, etc.)

## Configuration Method

Use comma-separated values for multiple teams:

```bash
# Sleeper Configuration
SLEEPER_USERNAME=your_username
SLEEPER_LEAGUE_IDS=league_id_1,league_id_2,league_id_3

# ESPN Configuration
ESPN_LEAGUE_IDS=league_id_1,league_id_2
ESPN_TEAM_IDS=team_id_1,team_id_2
ESPN_SWID=your_espn_swid_cookie
ESPN_ESPNS2=your_espn_espns2_cookie
```

## Finding Your IDs

### Sleeper League IDs

1. Go to your Sleeper league
2. The league ID is in the URL: `https://sleeper.com/league/LEAGUE_ID_HERE`
3. Or check the network tab in browser dev tools when loading the league

### ESPN League and Team IDs

1. Go to your ESPN fantasy league
2. Open browser dev tools (F12)
3. Go to Network tab
4. Refresh the page
5. Look for API calls to find league and team IDs
6. Check cookies for SWID and ESPNS2 values

## Example Configurations

### Example 1: Two Sleeper Leagues

```bash
SLEEPER_USERNAME=john_doe
SLEEPER_LEAGUE_IDS=123456789,987654321
```

### Example 2: One Sleeper League + One ESPN Team

```bash
# Sleeper
SLEEPER_USERNAME=john_doe
SLEEPER_LEAGUE_IDS=123456789

# ESPN
ESPN_LEAGUE_IDS=456789123
ESPN_TEAM_IDS=789123456
ESPN_SWID=your_swid_here
ESPN_ESPNS2=your_espns2_here
```

### Example 3: Multiple Teams on Both Platforms

```bash
# Sleeper - 3 leagues
SLEEPER_USERNAME=john_doe
SLEEPER_LEAGUE_IDS=123456789,987654321,555666777

# ESPN - 2 teams in different leagues
ESPN_LEAGUE_IDS=456789123,111222333
ESPN_TEAM_IDS=789123456,444555666
ESPN_SWID=your_swid_here
ESPN_ESPNS2=your_espns2_here
```

## Security Notes

⚠️ **IMPORTANT**: Never commit your `.env.local` file to GitHub!

1. Copy `env.example` to `.env.local`
2. Fill in your actual values
3. Add `.env.local` to your `.gitignore` file
4. The example file shows the structure without real credentials

## Using the Application

Once configured:

1. **Team Selector**: The overview page shows all configured teams as clickable cards
2. **Auto-Connect**: If Sleeper is configured, the app will automatically connect
3. **Switch Teams**: Click on any team card to switch between teams
4. **Platform Support**: Different features are available based on the platform

## Troubleshooting

### Common Issues

1. **"No platforms configured"**
   - Check that your `.env.local` file exists
   - Verify environment variable names (no REACT_APP_ prefix needed)
   - Restart the development server after changing environment variables

2. **"Failed to auto-connect"**
   - Verify your Sleeper username is correct
   - Check that league IDs exist and are accessible
   - Ensure you're logged into the correct Sleeper account

3. **ESPN cookies not working**
   - Cookies expire regularly, you may need to refresh them
   - Check that you're logged into ESPN fantasy
   - Verify the cookie values are complete

### Validation

The app automatically validates your configuration and shows:
- ✅ Configured platforms
- ❌ Missing configurations
- ⚠️ Warnings for incomplete setups

## Future Enhancements

Planned features for multi-team support:
- Team comparison tools
- Cross-league analytics
- Unified player tracking across teams
- League-specific settings and preferences

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your configuration matches the examples
3. Ensure all required fields are filled
4. Check that your fantasy platforms are accessible
