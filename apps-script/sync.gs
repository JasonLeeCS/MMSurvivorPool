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

      try {
        var result = syncNcaaScoresPages_();
        return { status: 'ok', message: result.message };
      } catch (error) {
        return { status: 'error', message: 'NCAA sync failed. Using last known sheet data. ' + error.message };
      }
    },
  };
}

function syncNcaaScoresPages_() {
  var settingsMap = getSettingsMap_();
  var seasonYear = Number(settingsMap.season_year || new Date().getFullYear());
  var start = new Date(Date.UTC(seasonYear, 2, 17, 0, 0, 0));
  var end = new Date(Date.UTC(seasonYear, 3, 7, 0, 0, 0));
  var today = new Date();
  var latest = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
  var cursor = new Date(start.getTime());
  var allGames = [];

  if (latest.getTime() < start.getTime()) {
    latest = start;
  }
  if (latest.getTime() > end.getTime()) {
    latest = end;
  }

  while (cursor.getTime() <= latest.getTime()) {
    allGames = allGames.concat(fetchNcaaGamesForDate_(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  if (!allGames.length) {
    throw new Error('No games found on NCAA scores pages.');
  }

  upsertGamesAndTeamsFromParsedGames_(allGames);
  return { message: 'NCAA sync completed successfully. Imported ' + allGames.length + ' game entries.' };
}

function fetchNcaaGamesForDate_(dateValue) {
  var year = Utilities.formatDate(dateValue, 'UTC', 'yyyy');
  var month = Utilities.formatDate(dateValue, 'UTC', 'MM');
  var day = Utilities.formatDate(dateValue, 'UTC', 'dd');
  var dateKey = Utilities.formatDate(dateValue, 'UTC', 'yyyy-MM-dd');
  var url = 'https://www.ncaa.com/march-madness-live/scores/' + year + '/' + month + '/' + day;
  var response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (response.getResponseCode() !== 200) {
    return [];
  }

  return parseNcaaGamesFromHtml_(response.getContentText(), dateKey);
}

function parseNcaaGamesFromHtml_(html, dateKey) {
  var text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&reg;/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  var chunks = text.match(/((?:Watch Live.*?|\d{1,2}:\d{2}\s(?:AM|PM)\sUTC.*?|FINAL.*?|Final.*?)(?:Second Round|Sweet 16|Elite Eight|Final Four|National Championship)(?:\s*-\s*[A-Z ]+)?)(?=(?:Watch Live|\d{1,2}:\d{2}\s(?:AM|PM)\sUTC|FINAL|Final|NCAA March Madness on|$))/g) || [];
  var games = [];

  chunks.forEach(function(chunk, index) {
    var parsed = parseNcaaGameChunk_(chunk, dateKey, index);
    if (parsed) {
      games.push(parsed);
    }
  });

  return games;
}

function parseNcaaGameChunk_(chunk, dateKey, index) {
  var clean = chunk.replace(/\s+/g, ' ').trim();
  var roundMatch = clean.match(/(Second Round|Sweet 16|Elite Eight|Final Four|National Championship)(?:\s*-\s*([A-Z ]+))?$/);
  if (!roundMatch) {
    return null;
  }

  var round = roundMatch[1] + (roundMatch[2] ? ' - ' + roundMatch[2].trim() : '');
  var prefix = clean.slice(0, roundMatch.index).trim();

  var scheduledMatch = prefix.match(/^(.*?UTC)\s+(\d{1,2})\s+(.+?)\s+\((\d{1,2}-\d{1,2})\)\s+(\d{1,2})\s+(.+?)\s+\((\d{1,2}-\d{1,2})\)$/);
  if (scheduledMatch) {
    if (!isLikelyTeamName_(scheduledMatch[3]) || !isLikelyTeamName_(scheduledMatch[6])) {
      return null;
    }

    return {
      gameId: 'g_' + dateKey.replace(/-/g, '') + '_' + index,
      date: dateKey,
      tipoffTime: buildUtcIsoFromLabel_(dateKey, scheduledMatch[1]),
      team1Seed: scheduledMatch[2],
      team1: scheduledMatch[3].trim(),
      team1Score: '',
      team2Seed: scheduledMatch[5],
      team2: scheduledMatch[6].trim(),
      team2Score: '',
      winner: '',
      status: 'scheduled',
      round: round,
    };
  }

  var liveMatch = prefix.match(/^(.*?)\s+(\d{1,2})\s+(.+?)\s+(\d{1,3})\s+(\d{1,2})\s+(.+?)\s+(\d{1,3})$/);
  if (liveMatch) {
    var label = liveMatch[1].trim();
    var team1Name = liveMatch[3].trim();
    var team2Name = liveMatch[6].trim();
    if (!isLikelyTeamName_(team1Name) || !isLikelyTeamName_(team2Name)) {
      return null;
    }

    var team1Score = Number(liveMatch[4]);
    var team2Score = Number(liveMatch[7]);
    var isFinal = /^final/i.test(label);

    return {
      gameId: 'g_' + dateKey.replace(/-/g, '') + '_' + index,
      date: dateKey,
      tipoffTime: dateKey + 'T00:00:00Z',
      team1Seed: liveMatch[2],
      team1: team1Name,
      team1Score: team1Score,
      team2Seed: liveMatch[5],
      team2: team2Name,
      team2Score: team2Score,
      winner: isFinal ? (team1Score >= team2Score ? team1Name : team2Name) : '',
      status: isFinal ? 'final' : 'live',
      round: round,
    };
  }

  return null;
}

function buildUtcIsoFromLabel_(dateKey, label) {
  var match = label.match(/(\d{1,2}):(\d{2})\s(AM|PM)\sUTC/);
  if (!match) {
    return dateKey + 'T00:00:00Z';
  }

  var hours = Number(match[1]) % 12;
  if (match[3] === 'PM') {
    hours += 12;
  }

  var minutes = Number(match[2]);
  return new Date(Date.UTC(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(5, 7)) - 1,
    Number(dateKey.slice(8, 10)),
    hours,
    minutes,
    0,
  )).toISOString();
}

function slugifyTeamId_(teamName) {
  return sanitizeText_(teamName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isLikelyTeamName_(value) {
  var text = sanitizeText_(value);
  if (!text) {
    return false;
  }

  if (text.length > 40) {
    return false;
  }

  if (/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Today|Tomorrow|Yesterday)/i.test(text)) {
    return false;
  }

  if (/\bGames?\b/i.test(text)) {
    return false;
  }

  if (/\bUTC\b/i.test(text)) {
    return false;
  }

  if (/\d{1,2}:\d{2}/.test(text)) {
    return false;
  }

  return true;
}

function upsertGamesAndTeamsFromParsedGames_(games) {
  var timezone = getSettingsMap_().timezone || 'America/Chicago';
  var existingTeams = getRows_(TAB_NAMES.TEAMS);
  var teamMap = {};

  existingTeams.forEach(function(team) {
    teamMap[String(team.team_id)] = team;
  });

  games.forEach(function(game) {
    var poolDate = derivePoolDateFromTipoff_(game.tipoffTime, timezone, game.date);
    upsertRow_(TAB_NAMES.GAMES, 'game_id', {
      game_id: game.gameId,
      date: poolDate,
      tipoff_time: game.tipoffTime,
      team1: game.team1,
      team1_score: game.team1Score,
      team2: game.team2,
      team2_score: game.team2Score,
      winner: game.winner,
      round: game.round,
      status: game.status,
    });

    [
      { teamId: slugifyTeamId_(game.team1), teamName: game.team1, seed: game.team1Seed },
      { teamId: slugifyTeamId_(game.team2), teamName: game.team2, seed: game.team2Seed },
    ].forEach(function(side) {
      if (!side.teamId || !side.teamName) {
        return;
      }

      var existing = teamMap[side.teamId] || {};
      upsertRow_(TAB_NAMES.TEAMS, 'team_id', {
        team_id: side.teamId,
        team_name: side.teamName,
        seed: sanitizeText_(side.seed),
        region: sanitizeText_(existing.region || ''),
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
