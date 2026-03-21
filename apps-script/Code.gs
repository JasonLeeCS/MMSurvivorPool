function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action ? e.parameter.action : 'snapshot';
    if (action === 'snapshot') {
      return jsonResponse_(buildSnapshot_());
    }
    return jsonError_('Unsupported GET action.');
  } catch (error) {
    return jsonError_(error.message);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action;

    switch (action) {
      case 'eligibleTeams':
        return jsonResponse_(getEligibleTeamsForUser_(body.userId));
      case 'submitPick':
        return jsonResponse_(submitPick_(body.userId, body.teamId));
      case 'validateAdminPasscode':
        return jsonResponse_(validateAdminPasscode_(body.passcode));
      case 'upsertUser':
        requireAdminToken_(body.adminToken);
        return jsonResponse_(upsertUser_(body));
      case 'adminOverridePick':
        requireAdminToken_(body.adminToken);
        return jsonResponse_(adminOverridePick_(body));
      case 'recordBuyback':
        requireAdminToken_(body.adminToken);
        return jsonResponse_(recordBuyback_(body));
      case 'updateTeamStatus':
        requireAdminToken_(body.adminToken);
        return jsonResponse_(updateTeamStatus_(body));
      case 'refreshTeams':
        requireAdminToken_(body.adminToken);
        return jsonResponse_(refreshTeams_());
      default:
        return jsonError_('Unsupported POST action.');
    }
  } catch (error) {
    return jsonError_(error.message);
  }
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: data })).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(message) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: message })).setMimeType(ContentService.MimeType.JSON);
}

function buildSnapshot_() {
  var users = getUsers_();
  var teams = getTeams_();
  var games = getGames_();
  var picks = getPicks_();
  var buybacks = getBuybacks_();
  var dayContext = getDayContext_(games);
  var settings = getFrontendSettings_(dayContext);
  var missingUserIds = getMissingUserIds_(users, picks, dayContext.currentDate);
  var visiblePicks = dayContext.picksLocked
    ? picks.filter(function(pick) { return pick.date === dayContext.currentDate; })
    : picks.filter(function(pick) { return pick.date !== dayContext.currentDate; });

  var userStatusRows = users.map(function(user) {
    var historicalPicks = picks.filter(function(pick) { return pick.userId === user.userId; });
    var todayPick = historicalPicks.filter(function(pick) { return pick.date === dayContext.currentDate; })[0];
    return {
      user: user,
      todayPick: todayPick || null,
      historicalPicks: historicalPicks,
      missingPick: missingUserIds.indexOf(user.userId) !== -1,
      effectiveStatus: user.eliminated ? 'eliminated' : 'alive',
      buybackActive: user.buybackCount > 0,
    };
  });

  return {
    settings: settings,
    dayContext: dayContext,
    users: users,
    teams: teams,
    games: games,
    picks: picks,
    buybacks: buybacks,
    userStatusRows: userStatusRows,
    missingUserIds: missingUserIds,
    visiblePicks: visiblePicks,
  };
}

function getFrontendSettings_(dayContext) {
  var settings = getSettingsMap_();
  return {
    seasonYear: Number(settings.season_year || new Date().getFullYear()),
    timezone: settings.timezone || 'America/Chicago',
    currentDate: dayContext.currentDate,
    lockTime: dayContext.lockTime,
    picksLocked: dayContext.picksLocked,
    syncStatus: settings.last_sync_status || 'idle',
    syncMessage: settings.last_sync_message || 'No sync has run yet.',
    lastUpdated: settings.last_sync_at || isoNow_(),
    uniqueLinkFlowEnabled: String(settings.unique_link_flow_enabled).toLowerCase() === 'true',
  };
}

function getUsers_() {
  return getRows_(TAB_NAMES.USERS).map(function(row) {
    return {
      userId: sanitizeText_(row.user_id),
      displayName: sanitizeText_(row.display_name),
      active: parseBool_(row.active),
      eliminated: parseBool_(row.eliminated),
      buybackCount: Number(row.buyback_count || 0),
      notes: sanitizeText_(row.notes),
    };
  });
}

function getTeams_() {
  return getRows_(TAB_NAMES.TEAMS).map(function(row) {
    return {
      teamId: sanitizeText_(row.team_id),
      teamName: sanitizeText_(row.team_name),
      seed: sanitizeText_(row.seed),
      region: sanitizeText_(row.region),
      alive: parseBool_(row.alive),
      sourceUpdatedAt: sanitizeText_(row.source_updated_at),
      manualOverride: parseBool_(row.manual_override),
    };
  });
}

function getGames_() {
  return getRows_(TAB_NAMES.GAMES).map(function(row) {
    return {
      gameId: sanitizeText_(row.game_id),
      date: sanitizeText_(row.date),
      tipoffTime: sanitizeText_(row.tipoff_time),
      team1: sanitizeText_(row.team1),
      team2: sanitizeText_(row.team2),
      winner: sanitizeText_(row.winner),
      round: sanitizeText_(row.round),
      status: sanitizeText_(row.status || 'scheduled'),
    };
  });
}

function getPicks_() {
  return getRows_(TAB_NAMES.PICKS).map(function(row) {
    return {
      pickId: sanitizeText_(row.pick_id),
      date: sanitizeText_(row.date),
      userId: sanitizeText_(row.user_id),
      teamId: sanitizeText_(row.team_id),
      teamName: sanitizeText_(row.team_name),
      submittedAt: sanitizeText_(row.submitted_at),
      updatedAt: sanitizeText_(row.updated_at),
      submittedBy: sanitizeText_(row.submitted_by || 'user'),
      lockSnapshot: sanitizeText_(row.lock_snapshot),
      result: sanitizeText_(row.result || 'pending'),
      overridden: parseBool_(row.overridden),
    };
  });
}

function getBuybacks_() {
  return getRows_(TAB_NAMES.BUYBACKS).map(function(row) {
    return {
      userId: sanitizeText_(row.user_id),
      date: sanitizeText_(row.date),
      countChange: Number(row.count_change || 0),
      reason: sanitizeText_(row.reason),
      enteredBy: sanitizeText_(row.entered_by),
    };
  });
}

function getDayContext_(games) {
  var settings = getSettingsMap_();
  var timezone = settings.timezone || 'America/Chicago';
  var currentDate = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
  var todaysGames = games.filter(function(game) {
    return game.date === currentDate;
  }).sort(function(a, b) {
    return new Date(a.tipoffTime).getTime() - new Date(b.tipoffTime).getTime();
  });
  var firstTip = todaysGames.length ? todaysGames[0].tipoffTime : '';
  var locked = firstTip ? new Date().getTime() >= new Date(firstTip).getTime() : false;
  return {
    currentDate: currentDate,
    displayLabel: Utilities.formatDate(new Date(), timezone, 'EEE, MMM d'),
    lockTime: firstTip,
    picksLocked: locked,
    firstTipDisplay: firstTip ? Utilities.formatDate(new Date(firstTip), timezone, 'MMM d h:mm a') : 'No games scheduled',
  };
}

function getMissingUserIds_(users, picks, currentDate) {
  var pickedMap = {};
  picks.forEach(function(pick) {
    if (pick.date === currentDate) {
      pickedMap[pick.userId] = true;
    }
  });

  return users.filter(function(user) {
    return user.active && !user.eliminated && !pickedMap[user.userId];
  }).map(function(user) {
    return user.userId;
  });
}

function getEligibleTeamsForUser_(userId) {
  var users = getUsers_();
  var teams = getTeams_();
  var picks = getPicks_();
  var user = users.filter(function(entry) { return entry.userId === sanitizeText_(userId); })[0];
  if (!user) {
    throw new Error('User not found.');
  }

  var used = {};
  picks.forEach(function(pick) {
    if (pick.userId === user.userId) {
      used[pick.teamId] = true;
    }
  });

  var dayContext = getDayContext_(getGames_());
  return {
    userId: user.userId,
    eligibleTeams: teams.filter(function(team) {
      return team.alive && !used[team.teamId];
    }),
    usedTeamIds: Object.keys(used),
    existingPick: picks.filter(function(pick) {
      return pick.userId === user.userId && pick.date === dayContext.currentDate;
    })[0] || null,
  };
}

function submitPick_(userId, teamId) {
  var users = getUsers_();
  var teams = getTeams_();
  var picks = getPicks_();
  var games = getGames_();
  var dayContext = getDayContext_(games);
  var safeUserId = sanitizeText_(userId);
  var safeTeamId = sanitizeText_(teamId);
  var user = users.filter(function(entry) { return entry.userId === safeUserId; })[0];

  if (!user || !user.active) {
    throw new Error('Invalid user.');
  }
  if (dayContext.picksLocked) {
    throw new Error('Picks are locked for today.');
  }

  var team = teams.filter(function(entry) { return entry.teamId === safeTeamId; })[0];
  if (!team || !team.alive) {
    throw new Error('Selected team is not alive.');
  }

  var priorUse = picks.filter(function(pick) {
    return pick.userId === safeUserId && pick.teamId === safeTeamId && pick.date !== dayContext.currentDate;
  })[0];
  if (priorUse) {
    throw new Error('That team has already been used.');
  }

  var existing = picks.filter(function(pick) {
    return pick.userId === safeUserId && pick.date === dayContext.currentDate;
  })[0];

  var payload = {
    pick_id: existing ? existing.pickId : 'pick_' + Utilities.getUuid(),
    date: dayContext.currentDate,
    user_id: safeUserId,
    team_id: team.teamId,
    team_name: team.teamName,
    submitted_at: existing ? existing.submittedAt : isoNow_(),
    updated_at: isoNow_(),
    submitted_by: 'user',
    lock_snapshot: dayContext.lockTime,
    result: existing ? existing.result : 'pending',
    overridden: false,
  };

  upsertPickRow_(payload);
  return {
    pickId: payload.pick_id,
    date: payload.date,
    userId: payload.user_id,
    teamId: payload.team_id,
    teamName: payload.team_name,
    submittedAt: payload.submitted_at,
    updatedAt: payload.updated_at,
    submittedBy: payload.submitted_by,
    lockSnapshot: payload.lock_snapshot,
    result: payload.result,
    overridden: payload.overridden,
  };
}

function upsertPickRow_(row) {
  var sheet = getSheet_(TAB_NAMES.PICKS);
  var values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    sheet.appendRow(['pick_id', 'date', 'user_id', 'team_id', 'team_name', 'submitted_at', 'updated_at', 'submitted_by', 'lock_snapshot', 'result', 'overridden']);
    values = sheet.getDataRange().getValues();
  }

  var headers = values[0].map(String);
  var dateIndex = headers.indexOf('date');
  var userIndex = headers.indexOf('user_id');
  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][dateIndex]) === row.date && String(values[i][userIndex]) === row.user_id) {
      var updated = headers.map(function(header) {
        return row[header] !== undefined ? row[header] : values[i][headers.indexOf(header)];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([updated]);
      return;
    }
  }

  appendRow_(TAB_NAMES.PICKS, headers, row);
}

function validateAdminPasscode_(passcode) {
  var settings = getSettingsMap_();
  var salt = sanitizeText_(settings.admin_passcode_salt);
  var expectedHash = sanitizeText_(settings.admin_passcode_hash);
  if (!salt || !expectedHash) {
    throw new Error('Admin passcode is not configured.');
  }

  var actualHash = sha256Hex_(sanitizeText_(passcode) + ':' + salt);
  if (actualHash !== expectedHash) {
    throw new Error('Invalid passcode.');
  }

  var token = Utilities.getUuid();
  var expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  CacheService.getScriptCache().put('admin_token_' + token, '1', 6 * 60 * 60);
  return { token: token, expiresAt: expiresAt };
}

function requireAdminToken_(token) {
  if (!token || !CacheService.getScriptCache().get('admin_token_' + token)) {
    throw new Error('Admin session invalid or expired.');
  }
}

function upsertUser_(body) {
  var safeId = sanitizeText_(body.userId || 'u_' + body.displayName.toLowerCase().replace(/\s+/g, '_'));
  var row = {
    user_id: safeId,
    display_name: sanitizeText_(body.displayName),
    active: Boolean(body.active),
    eliminated: Boolean(body.eliminated),
    buyback_count: Number(body.buybackCount || 0),
    notes: sanitizeText_(body.notes),
    created_at: isoNow_(),
    updated_at: isoNow_(),
  };

  upsertRow_(TAB_NAMES.USERS, 'user_id', row);
  return {
    userId: row.user_id,
    displayName: row.display_name,
    active: row.active,
    eliminated: row.eliminated,
    buybackCount: row.buyback_count,
    notes: row.notes,
  };
}

function adminOverridePick_(body) {
  var team = getTeams_().filter(function(entry) {
    return entry.teamId === sanitizeText_(body.teamId);
  })[0];
  if (!team) {
    throw new Error('Team not found for override.');
  }

  var row = {
    pick_id: 'pick_' + Utilities.getUuid(),
    date: sanitizeText_(body.date),
    user_id: sanitizeText_(body.userId),
    team_id: team.teamId,
    team_name: team.teamName,
    submitted_at: isoNow_(),
    updated_at: isoNow_(),
    submitted_by: 'admin',
    lock_snapshot: '',
    result: 'pending',
    overridden: true,
  };

  upsertPickRow_(row);
  return {
    pickId: row.pick_id,
    date: row.date,
    userId: row.user_id,
    teamId: row.team_id,
    teamName: row.team_name,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    submittedBy: row.submitted_by,
    lockSnapshot: row.lock_snapshot,
    result: row.result,
    overridden: row.overridden,
  };
}

function recordBuyback_(body) {
  var userId = sanitizeText_(body.userId);
  var users = getRows_(TAB_NAMES.USERS);
  var user = users.filter(function(entry) {
    return sanitizeText_(entry.user_id) === userId;
  })[0];
  if (!user) {
    throw new Error('User not found.');
  }

  var updatedCount = Number(user.buyback_count || 0) + Number(body.countChange || 0);
  upsertRow_(TAB_NAMES.USERS, 'user_id', {
    user_id: user.user_id,
    display_name: user.display_name,
    active: user.active,
    eliminated: false,
    buyback_count: updatedCount,
    notes: user.notes,
    created_at: user.created_at || isoNow_(),
    updated_at: isoNow_(),
  });

  appendRow_(TAB_NAMES.BUYBACKS, ['user_id', 'date', 'count_change', 'reason', 'entered_by'], {
    user_id: userId,
    date: Utilities.formatDate(new Date(), getSettingsMap_().timezone || 'America/Chicago', 'yyyy-MM-dd'),
    count_change: Number(body.countChange || 0),
    reason: sanitizeText_(body.reason),
    entered_by: 'admin',
  });

  return {
    userId: userId,
    date: Utilities.formatDate(new Date(), getSettingsMap_().timezone || 'America/Chicago', 'yyyy-MM-dd'),
    countChange: Number(body.countChange || 0),
    reason: sanitizeText_(body.reason),
    enteredBy: 'admin',
  };
}

function updateTeamStatus_(body) {
  var teams = getRows_(TAB_NAMES.TEAMS);
  var team = teams.filter(function(entry) {
    return sanitizeText_(entry.team_id) === sanitizeText_(body.teamId);
  })[0];
  if (!team) {
    throw new Error('Team not found.');
  }

  var row = {
    team_id: team.team_id,
    team_name: team.team_name,
    seed: team.seed,
    region: team.region,
    alive: Boolean(body.alive),
    source_updated_at: isoNow_(),
    manual_override: Boolean(body.manualOverride),
  };
  upsertRow_(TAB_NAMES.TEAMS, 'team_id', row);
  return {
    teamId: row.team_id,
    teamName: row.team_name,
    seed: row.seed,
    region: row.region,
    alive: row.alive,
    sourceUpdatedAt: row.source_updated_at,
    manualOverride: row.manual_override,
  };
}

function refreshTeams_() {
  setSetting_('last_sync_status', 'syncing', 'Sync status');
  setSetting_('last_sync_message', 'Refreshing NCAA data...', 'Sync message');
  setSetting_('last_sync_at', isoNow_(), 'Last sync timestamp');

  var provider = getSyncProvider_();
  var result = provider.sync();

  setSetting_('last_sync_status', result.status, 'Sync status');
  setSetting_('last_sync_message', result.message, 'Sync message');
  setSetting_('last_sync_at', isoNow_(), 'Last sync timestamp');

  return { message: result.message };
}

function createAdminHashForSetup(passcode) {
  var salt = Utilities.getUuid().replace(/-/g, '');
  var hash = sha256Hex_(sanitizeText_(passcode) + ':' + salt);
  return { salt: salt, hash: hash };
}

function sha256Hex_(value) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return digest.map(function(byte) {
    var normalized = byte < 0 ? byte + 256 : byte;
    var hex = normalized.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}
