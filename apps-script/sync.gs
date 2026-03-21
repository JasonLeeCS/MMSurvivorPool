function getSyncProvider_() {
  var settings = getSettingsMap_();
  var provider = settings.ncaa_provider || 'ncaa';
  if (provider !== 'ncaa') {
    return {
      name: provider,
      sync: function() {
        return { status: 'warning', message: 'Unknown sync provider. Manual sheet data remains active.' };
      },
    };
  }

  return {
    name: 'ncaa',
    sync: function() {
      var settingsMap = getSettingsMap_();
      if (String(settingsMap.sync_enabled).toLowerCase() === 'false') {
        return { status: 'warning', message: 'Sync disabled in Settings.' };
      }

      var timezone = settingsMap.timezone || 'America/Chicago';
      var targetDate = Utilities.formatDate(new Date(), timezone, 'yyyy/MM/dd');
      var baseUrl = settingsMap.ncaa_scoreboard_base_url || 'https://data.ncaa.com/casablanca/scoreboard/basketball-men/d1';
      var url = baseUrl + '/' + targetDate + '/scoreboard.json';

      try {
        var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        if (response.getResponseCode() !== 200) {
          return { status: 'warning', message: 'NCAA feed unavailable. Using last known sheet data.' };
        }

        var payload = JSON.parse(response.getContentText());
        applyScoreboardPayload_(payload);
        return { status: 'ok', message: 'NCAA sync completed successfully.' };
      } catch (error) {
        return { status: 'error', message: 'NCAA sync failed. Using last known sheet data. ' + error.message };
      }
    },
  };
}

function applyScoreboardPayload_(payload) {
  if (!payload || !payload.games) {
    throw new Error('Invalid NCAA scoreboard payload.');
  }

  var existingTeams = getRows_(TAB_NAMES.TEAMS);
  var teamMap = {};

  existingTeams.forEach(function(team) {
    teamMap[String(team.team_id)] = team;
  });

  payload.games.forEach(function(game) {
    var home = game.home || {};
    var away = game.away || {};
    var gameId = sanitizeText_(game.gameID || game.game && game.game.id || Utilities.getUuid());
    var gameDate = sanitizeText_(game.game && game.game.gameDate || payload.date || '');
    var tipoff = sanitizeText_(game.startTimeEpoch ? new Date(Number(game.startTimeEpoch) * 1000).toISOString() : game.startTime || '');
    var winnerName = '';
    if (sanitizeText_(game.gameState) === 'final') {
      winnerName = Number(home.score) > Number(away.score) ? sanitizeText_(home.names && home.names.short || home.name) : sanitizeText_(away.names && away.names.short || away.name);
    }

    upsertRow_(TAB_NAMES.GAMES, 'game_id', {
      game_id: gameId,
      date: gameDate ? gameDate.slice(0, 10) : '',
      tipoff_time: tipoff,
      team1: sanitizeText_(home.names && home.names.short || home.name),
      team2: sanitizeText_(away.names && away.names.short || away.name),
      winner: winnerName,
      round: sanitizeText_(game.round || game.bracketRound || ''),
      status: sanitizeText_(game.gameState || game.status || 'scheduled').toLowerCase(),
    });

    [home, away].forEach(function(side) {
      var teamId = sanitizeText_(side.ncaaOrgId || side.id || side.shortName || side.name).toLowerCase().replace(/\s+/g, '-');
      var teamName = sanitizeText_(side.names && side.names.short || side.shortName || side.name);
      if (!teamId || !teamName) {
        return;
      }

      var existing = teamMap[teamId] || {};
      upsertRow_(TAB_NAMES.TEAMS, 'team_id', {
        team_id: teamId,
        team_name: teamName,
        seed: sanitizeText_(side.seed),
        region: sanitizeText_(side.region || existing.region || ''),
        alive: existing.manual_override ? existing.alive : true,
        source_updated_at: isoNow_(),
        manual_override: existing.manual_override || false,
      });
    });
  });

  markEliminatedTeamsFromCompletedGames_();
}

function markEliminatedTeamsFromCompletedGames_() {
  var games = getRows_(TAB_NAMES.GAMES);
  var teams = getRows_(TAB_NAMES.TEAMS);
  var teamMap = {};

  teams.forEach(function(team) {
    teamMap[String(team.team_name)] = team;
  });

  games.forEach(function(game) {
    if (String(game.status).toLowerCase() !== 'final' || !game.winner) {
      return;
    }

    [game.team1, game.team2].forEach(function(teamName) {
      if (!teamName) {
        return;
      }

      var team = teamMap[String(teamName)];
      if (!team || parseBool_(team.manual_override)) {
        return;
      }

      upsertRow_(TAB_NAMES.TEAMS, 'team_id', {
        team_id: team.team_id,
        team_name: team.team_name,
        seed: team.seed,
        region: team.region,
        alive: String(teamName) === String(game.winner),
        source_updated_at: isoNow_(),
        manual_override: team.manual_override,
      });
    });
  });
}
