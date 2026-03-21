var TAB_NAMES = {
  SETTINGS: 'Settings',
  USERS: 'Users',
  PICKS: 'Picks',
  TEAMS: 'Teams',
  GAMES: 'Games',
  BUYBACKS: 'Buybacks',
  ADMIN_META: 'AdminMeta',
};

function getSpreadsheet_() {
  var boundSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (boundSpreadsheet) {
    return boundSpreadsheet;
  }

  var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('Spreadsheet not found. Bind the script or set SPREADSHEET_ID.');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function getSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) {
    throw new Error('Missing sheet: ' + name);
  }
  return sheet;
}

function getRows_(name) {
  var sheet = getSheet_(name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return [];
  }

  var headers = values[0];
  return values.slice(1).filter(function(row) {
    return row.join('') !== '';
  }).map(function(row) {
    var entry = {};
    headers.forEach(function(header, index) {
      entry[String(header)] = row[index];
    });
    return entry;
  });
}

function appendRow_(name, headers, row) {
  var sheet = getSheet_(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  sheet.appendRow(headers.map(function(header) {
    return row[header] !== undefined ? row[header] : '';
  }));
}

function upsertRow_(name, keyField, row) {
  var sheet = getSheet_(name);
  var values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    throw new Error('Cannot upsert into empty sheet without headers: ' + name);
  }

  var headers = values[0].map(String);
  var keyIndex = headers.indexOf(keyField);
  if (keyIndex === -1) {
    throw new Error('Key column not found: ' + keyField);
  }

  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][keyIndex]) === String(row[keyField])) {
      var updated = headers.map(function(header) {
        return row[header] !== undefined ? row[header] : values[i][headers.indexOf(header)];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([updated]);
      return row;
    }
  }

  appendRow_(name, headers, row);
  return row;
}

function getSettingsMap_() {
  var settingsRows = getRows_(TAB_NAMES.SETTINGS);
  return settingsRows.reduce(function(accumulator, row) {
    accumulator[String(row.key)] = String(row.value || '');
    return accumulator;
  }, {});
}

function setSetting_(key, value, description) {
  var sheet = getSheet_(TAB_NAMES.SETTINGS);
  var values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    sheet.appendRow(['key', 'value', 'description']);
    values = sheet.getDataRange().getValues();
  }

  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      if (description !== undefined) {
        sheet.getRange(i + 1, 3).setValue(description);
      }
      return;
    }
  }

  sheet.appendRow([key, value, description || '']);
}

function isoNow_() {
  return new Date().toISOString();
}

function parseBool_(value) {
  return String(value).toLowerCase() === 'true';
}

function sanitizeText_(value) {
  return String(value || '').trim();
}
