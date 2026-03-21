import { config } from '../config';
import { getEligibleTeams } from '../lib/rules';
import {
  getMockSnapshot,
  saveMockPick,
  updateMockBuyback,
  updateMockTeam,
  updateMockUser,
} from './mockData';
import type {
  AdminPickOverrideInput,
  AdminSession,
  AdminUserInput,
  AppSnapshot,
  Buyback,
  EligibleTeamResponse,
  Pick,
  SubmitPickPayload,
  Team,
  TeamUpdateInput,
  User,
} from '../types/domain';

const ADMIN_SESSION_KEY = 'mmsp_admin_session';

function getMockEligibleTeams(userId: string): EligibleTeamResponse {
  const snapshot = getMockSnapshot();
  const usedTeamIds = snapshot.picks.filter((pick) => pick.userId === userId).map((pick) => pick.teamId);
  return {
    userId,
    eligibleTeams: getEligibleTeams(userId, snapshot.teams, snapshot.picks),
    usedTeamIds,
    existingPick: snapshot.picks.find((pick) => pick.userId === userId && pick.date === snapshot.dayContext.currentDate) ?? null,
  };
}

async function request<T>(method: 'GET' | 'POST', action: string, body?: object, admin = false): Promise<T> {
  if (!config.appsScriptBaseUrl) {
    throw new Error('Missing Apps Script base URL.');
  }

  const url = method === 'GET' ? `${config.appsScriptBaseUrl}?action=${encodeURIComponent(action)}` : config.appsScriptBaseUrl;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (admin) {
    const session = getAdminSession();
    if (!session) {
      throw new Error('Admin session expired.');
    }
    headers['X-Admin-Token'] = session.token;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify({ action, ...(body ? (body as object) : {}), adminToken: admin ? getAdminSession()?.token : undefined }) : undefined,
  });

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error || 'Unknown API error');
  }

  return payload.data as T;
}

export function getAdminSession() {
  const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) {
    return null;
  }
  const parsed = JSON.parse(raw) as AdminSession;
  if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
  return parsed;
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export async function fetchSnapshot(): Promise<AppSnapshot> {
  if (config.useMockApi) {
    return Promise.resolve(getMockSnapshot());
  }
  return request<AppSnapshot>('GET', 'snapshot');
}

export async function fetchEligibleTeams(userId: string): Promise<EligibleTeamResponse> {
  if (config.useMockApi) {
    return Promise.resolve(getMockEligibleTeams(userId));
  }
  return request<EligibleTeamResponse>('POST', 'eligibleTeams', { userId });
}

export async function submitPick(payload: SubmitPickPayload): Promise<Pick> {
  if (config.useMockApi) {
    return Promise.resolve(saveMockPick(payload.userId, payload.teamId));
  }
  return request<Pick>('POST', 'submitPick', payload);
}

export async function validateAdminPasscode(passcode: string): Promise<AdminSession> {
  if (config.useMockApi) {
    const session = {
      token: `mock-${Math.random().toString(36).slice(2)}`,
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return session;
  }

  const session = await request<AdminSession>('POST', 'validateAdminPasscode', { passcode });
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function upsertUser(input: AdminUserInput): Promise<User> {
  if (config.useMockApi) {
    return Promise.resolve(
      updateMockUser({
        userId: input.userId || `u_${input.displayName.toLowerCase().replace(/\s+/g, '_')}`,
        displayName: input.displayName,
        active: input.active,
        eliminated: input.eliminated,
        buybackCount: input.buybackCount,
        notes: input.notes,
      }),
    );
  }
  return request<User>('POST', 'upsertUser', input, true);
}

export async function overridePick(input: AdminPickOverrideInput): Promise<Pick> {
  if (config.useMockApi) {
    return Promise.resolve(saveMockPick(input.userId, input.teamId));
  }
  return request<Pick>('POST', 'adminOverridePick', input, true);
}

export async function updateTeam(input: TeamUpdateInput): Promise<Team> {
  if (config.useMockApi) {
    return Promise.resolve(updateMockTeam(input.teamId, input.alive, input.manualOverride));
  }
  return request<Team>('POST', 'updateTeamStatus', input, true);
}

export async function recordBuyback(userId: string, countChange: number, reason: string): Promise<Buyback> {
  if (config.useMockApi) {
    return Promise.resolve(updateMockBuyback(userId, countChange, reason));
  }
  return request<Buyback>('POST', 'recordBuyback', { userId, countChange, reason }, true);
}

export async function refreshTeams(): Promise<{ message: string }> {
  if (config.useMockApi) {
    return Promise.resolve({ message: 'Mock sync completed. Seed data remains active.' });
  }
  return request<{ message: string }>('POST', 'refreshTeams', {}, true);
}
