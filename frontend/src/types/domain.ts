export interface Settings {
  seasonYear: number;
  timezone: string;
  currentDate: string;
  lockTime?: string;
  picksLocked: boolean;
  syncStatus: 'idle' | 'ok' | 'warning' | 'error' | 'syncing';
  syncMessage: string;
  lastUpdated: string;
  uniqueLinkFlowEnabled: boolean;
}

export interface User {
  userId: string;
  displayName: string;
  active: boolean;
  eliminated: boolean;
  buybackCount: number;
  notes?: string;
}

export interface Team {
  teamId: string;
  teamName: string;
  seed: string;
  region: string;
  alive: boolean;
  sourceUpdatedAt?: string;
  manualOverride: boolean;
}

export interface Game {
  gameId: string;
  date: string;
  tipoffTime: string;
  team1: string;
  team2: string;
  team1Score?: number;
  team2Score?: number;
  winner?: string;
  round: string;
  status: 'scheduled' | 'live' | 'final';
}

export interface Pick {
  pickId: string;
  date: string;
  userId: string;
  teamId: string;
  teamName: string;
  submittedAt: string;
  updatedAt: string;
  submittedBy: 'user' | 'admin';
  lockSnapshot?: string;
  result?: 'won' | 'lost' | 'pending';
  overridden: boolean;
}

export interface Buyback {
  userId: string;
  date: string;
  countChange: number;
  reason: string;
  enteredBy: string;
}

export interface DayContext {
  currentDate: string;
  displayLabel: string;
  lockTime?: string;
  picksLocked: boolean;
  firstTipDisplay: string;
}

export interface UserStatusRow {
  user: User;
  todayPick?: Pick | null;
  historicalPicks: Pick[];
  missingPick: boolean;
  effectiveStatus: 'alive' | 'eliminated';
  buybackActive: boolean;
}

export interface AppSnapshot {
  settings: Settings;
  dayContext: DayContext;
  users: User[];
  teams: Team[];
  games: Game[];
  picks: Pick[];
  buybacks: Buyback[];
  userStatusRows: UserStatusRow[];
  missingUserIds: string[];
  visiblePicks: Pick[];
}

export interface EligibleTeamResponse {
  userId: string;
  eligibleTeams: Team[];
  usedTeamIds: string[];
  existingPick?: Pick | null;
}

export interface SubmitPickPayload {
  userId: string;
  teamId: string;
}

export interface AdminSession {
  token: string;
  expiresAt: string;
}

export interface AdminUserInput {
  userId?: string;
  displayName: string;
  active: boolean;
  eliminated: boolean;
  buybackCount: number;
  notes?: string;
}

export interface AdminPickOverrideInput {
  date: string;
  userId: string;
  teamId: string;
  overridden: boolean;
}

export interface TeamUpdateInput {
  teamId: string;
  alive: boolean;
  manualOverride: boolean;
}
