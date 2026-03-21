import type {
  AppSnapshot,
  Buyback,
  DayContext,
  Game,
  Pick,
  Settings,
  Team,
  User,
  UserStatusRow,
} from '../types/domain';
import { getFirstTip, getMissingUserIds, getTodayPick } from '../lib/rules';
import { formatDateLabel, formatInTimeZone } from '../lib/date';
import { config } from '../config';

const now = new Date();
const todayIso = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(now);

const users: User[] = [
  { userId: 'u_jason', displayName: 'Jason', active: true, eliminated: false, buybackCount: 0, notes: 'Commissioner' },
  { userId: 'u_amy', displayName: 'Amy', active: true, eliminated: false, buybackCount: 1, notes: 'Already used one buy-back' },
  { userId: 'u_marcus', displayName: 'Marcus', active: true, eliminated: true, buybackCount: 0, notes: 'Eliminated on opening weekend' },
  { userId: 'u_sam', displayName: 'Sam', active: true, eliminated: false, buybackCount: 0, notes: '' },
  { userId: 'u_priya', displayName: 'Priya', active: true, eliminated: false, buybackCount: 0, notes: '' },
];

const teams: Team[] = [
  { teamId: 'duke', teamName: 'Duke', seed: '1', region: 'East', alive: true, sourceUpdatedAt: now.toISOString(), manualOverride: false },
  { teamId: 'houston', teamName: 'Houston', seed: '1', region: 'South', alive: true, sourceUpdatedAt: now.toISOString(), manualOverride: false },
  { teamId: 'ucla', teamName: 'UCLA', seed: '3', region: 'West', alive: true, sourceUpdatedAt: now.toISOString(), manualOverride: true },
  { teamId: 'tennessee', teamName: 'Tennessee', seed: '2', region: 'Midwest', alive: true, sourceUpdatedAt: now.toISOString(), manualOverride: false },
  { teamId: 'kansas', teamName: 'Kansas', seed: '4', region: 'Midwest', alive: false, sourceUpdatedAt: now.toISOString(), manualOverride: false },
  { teamId: 'gonzaga', teamName: 'Gonzaga', seed: '8', region: 'West', alive: false, sourceUpdatedAt: now.toISOString(), manualOverride: false },
];

const games: Game[] = [
  { gameId: 'g1', date: todayIso, tipoffTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), team1: 'Duke', team2: 'UCLA', round: 'Sweet 16', status: 'scheduled' },
  { gameId: 'g2', date: todayIso, tipoffTime: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(), team1: 'Houston', team2: 'Tennessee', round: 'Sweet 16', status: 'scheduled' },
  { gameId: 'g3', date: '2026-03-20', tipoffTime: '2026-03-20T17:15:00Z', team1: 'Kansas', team2: 'Houston', winner: 'Houston', round: 'Round of 32', status: 'final' },
];

let picks: Pick[] = [
  {
    pickId: 'p1',
    date: '2026-03-20',
    userId: 'u_jason',
    teamId: 'houston',
    teamName: 'Houston',
    submittedAt: '2026-03-20T12:10:00Z',
    updatedAt: '2026-03-20T12:10:00Z',
    submittedBy: 'user',
    lockSnapshot: '2026-03-20T17:15:00Z',
    result: 'won',
    overridden: false,
  },
  {
    pickId: 'p2',
    date: '2026-03-20',
    userId: 'u_amy',
    teamId: 'duke',
    teamName: 'Duke',
    submittedAt: '2026-03-20T12:22:00Z',
    updatedAt: '2026-03-20T12:22:00Z',
    submittedBy: 'user',
    lockSnapshot: '2026-03-20T17:15:00Z',
    result: 'won',
    overridden: false,
  },
  {
    pickId: 'p3',
    date: '2026-03-20',
    userId: 'u_marcus',
    teamId: 'kansas',
    teamName: 'Kansas',
    submittedAt: '2026-03-20T12:40:00Z',
    updatedAt: '2026-03-20T12:40:00Z',
    submittedBy: 'user',
    lockSnapshot: '2026-03-20T17:15:00Z',
    result: 'lost',
    overridden: false,
  },
  {
    pickId: 'p4',
    date: todayIso,
    userId: 'u_jason',
    teamId: 'ucla',
    teamName: 'UCLA',
    submittedAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
    submittedBy: 'user',
    lockSnapshot: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    result: 'pending',
    overridden: false,
  },
];

let buybacks: Buyback[] = [
  { userId: 'u_amy', date: '2026-03-20', countChange: 1, reason: 'Round 1 buy-back', enteredBy: 'admin' },
];

function buildDayContext(): DayContext {
  const firstTip = getFirstTip(todayIso, games);
  const picksLocked = firstTip ? Date.now() >= new Date(firstTip).getTime() : false;

  return {
    currentDate: todayIso,
    displayLabel: formatDateLabel(todayIso, 'America/Chicago'),
    lockTime: firstTip,
    picksLocked,
    firstTipDisplay: formatInTimeZone(firstTip, 'America/Chicago'),
  };
}

function buildSettings(dayContext: DayContext): Settings {
  return {
    seasonYear: config.seasonYear,
    timezone: 'America/Chicago',
    currentDate: dayContext.currentDate,
    lockTime: dayContext.lockTime,
    picksLocked: dayContext.picksLocked,
    syncStatus: 'warning',
    syncMessage: 'Mock mode is active. Using local seed data.',
    lastUpdated: new Date().toISOString(),
    uniqueLinkFlowEnabled: config.uniqueLinkFlowEnabled,
  };
}

function buildUserStatusRows(dayContext: DayContext): UserStatusRow[] {
  const missingUserIds = new Set(getMissingUserIds(users, dayContext.currentDate, picks));
  return users.map((user) => {
    const historicalPicks = picks.filter((pick) => pick.userId === user.userId);
    return {
      user,
      todayPick: getTodayPick(user.userId, dayContext.currentDate, picks) ?? null,
      historicalPicks,
      missingPick: missingUserIds.has(user.userId),
      effectiveStatus: user.eliminated ? 'eliminated' : 'alive',
      buybackActive: user.buybackCount > 0,
    };
  });
}

export function getMockSnapshot(): AppSnapshot {
  const dayContext = buildDayContext();
  const settings = buildSettings(dayContext);
  const userStatusRows = buildUserStatusRows(dayContext);
  const missingUserIds = getMissingUserIds(users, dayContext.currentDate, picks);
  const visiblePicks = dayContext.picksLocked
    ? picks.filter((pick) => pick.date === dayContext.currentDate)
    : picks.filter((pick) => pick.date !== dayContext.currentDate);

  return {
    settings,
    dayContext,
    users,
    teams,
    games,
    picks,
    buybacks,
    userStatusRows,
    missingUserIds,
    visiblePicks,
  };
}

export function saveMockPick(userId: string, teamId: string) {
  const snapshot = getMockSnapshot();
  if (snapshot.dayContext.picksLocked) {
    throw new Error('Picks are locked for today.');
  }

  const team = teams.find((entry) => entry.teamId === teamId && entry.alive);
  if (!team) {
    throw new Error('Selected team is not available.');
  }

  const priorUse = picks.find((pick) => pick.userId === userId && pick.teamId === teamId && pick.date !== snapshot.dayContext.currentDate);
  if (priorUse) {
    throw new Error('That team has already been used by this player.');
  }

  const existing = picks.find((pick) => pick.userId === userId && pick.date === snapshot.dayContext.currentDate);
  if (existing) {
    existing.teamId = team.teamId;
    existing.teamName = team.teamName;
    existing.updatedAt = new Date().toISOString();
    existing.result = 'pending';
    return existing;
  }

  const created: Pick = {
    pickId: `p_${Date.now()}`,
    date: snapshot.dayContext.currentDate,
    userId,
    teamId: team.teamId,
    teamName: team.teamName,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedBy: 'user',
    lockSnapshot: snapshot.dayContext.lockTime,
    result: 'pending',
    overridden: false,
  };

  picks = [...picks, created];
  return created;
}

export function updateMockUser(input: User) {
  const index = users.findIndex((user) => user.userId === input.userId);
  if (index >= 0) {
    users[index] = input;
    return users[index];
  }

  users.push(input);
  return input;
}

export function updateMockTeam(teamId: string, alive: boolean, manualOverride: boolean) {
  const team = teams.find((entry) => entry.teamId === teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  team.alive = alive;
  team.manualOverride = manualOverride;
  team.sourceUpdatedAt = new Date().toISOString();
  return team;
}

export function updateMockBuyback(userId: string, countChange: number, reason: string) {
  const user = users.find((entry) => entry.userId === userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.buybackCount += countChange;
  user.eliminated = false;
  const event: Buyback = {
    userId,
    date: getMockSnapshot().dayContext.currentDate,
    countChange,
    reason,
    enteredBy: 'admin',
  };
  buybacks = [event, ...buybacks];
  return event;
}
