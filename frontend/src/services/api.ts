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
const jsonpWindow = window as unknown as Record<string, unknown>;

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  return search.toString();
}

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

async function jsonpRequest<T>(
  action: string,
  params?: Record<string, string | number | boolean | undefined>,
  admin = false,
  timeoutMs = 20000,
): Promise<T> {
  if (!config.appsScriptBaseUrl) {
    throw new Error('Missing Apps Script base URL.');
  }

  return new Promise<T>((resolve, reject) => {
    const callbackName = `mmsp_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const session = admin ? getAdminSession() : null;
    if (admin && !session) {
      reject(new Error('Admin session expired.'));
      return;
    }

    const query = buildQuery({
      action,
      callback: callbackName,
      ...(params || {}),
      adminToken: session?.token,
    });
    const script = document.createElement('script');
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Apps Script request timed out.'));
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete jsonpWindow[callbackName];
      script.remove();
    }

    jsonpWindow[callbackName] = (payload: { ok: boolean; data?: T; error?: string }) => {
      cleanup();
      if (!payload.ok) {
        reject(new Error(payload.error || 'Unknown API error'));
        return;
      }
      resolve(payload.data as T);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Failed to reach Apps Script. Check deployment access and URL.'));
    };

    script.src = `${config.appsScriptBaseUrl}?${query}`;
    document.body.appendChild(script);
  });
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
  return jsonpRequest<AppSnapshot>('snapshot');
}

export async function fetchEligibleTeams(userId: string): Promise<EligibleTeamResponse> {
  if (config.useMockApi) {
    return Promise.resolve(getMockEligibleTeams(userId));
  }
  return jsonpRequest<EligibleTeamResponse>('eligibleTeams', { userId });
}

export async function submitPick(payload: SubmitPickPayload): Promise<Pick> {
  if (config.useMockApi) {
    return Promise.resolve(saveMockPick(payload.userId, payload.teamId));
  }
  return jsonpRequest<Pick>('submitPick', payload as unknown as Record<string, string | number | boolean | undefined>);
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

  const session = await jsonpRequest<AdminSession>('validateAdminPasscode', { passcode });
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
  return jsonpRequest<User>('upsertUser', input as unknown as Record<string, string | number | boolean | undefined>, true);
}

export async function overridePick(input: AdminPickOverrideInput): Promise<Pick> {
  if (config.useMockApi) {
    return Promise.resolve(saveMockPick(input.userId, input.teamId));
  }
  return jsonpRequest<Pick>('adminOverridePick', input as unknown as Record<string, string | number | boolean | undefined>, true);
}

export async function updateTeam(input: TeamUpdateInput): Promise<Team> {
  if (config.useMockApi) {
    return Promise.resolve(updateMockTeam(input.teamId, input.alive, input.manualOverride));
  }
  return jsonpRequest<Team>('updateTeamStatus', input as unknown as Record<string, string | number | boolean | undefined>, true);
}

export async function recordBuyback(userId: string, countChange: number, reason: string): Promise<Buyback> {
  if (config.useMockApi) {
    return Promise.resolve(updateMockBuyback(userId, countChange, reason));
  }
  return jsonpRequest<Buyback>('recordBuyback', { userId, countChange, reason }, true);
}

export async function refreshTeams(): Promise<{ message: string }> {
  if (config.useMockApi) {
    return Promise.resolve({ message: 'Mock sync completed. Seed data remains active.' });
  }
  return jsonpRequest<{ message: string }>('refreshTeams', {}, true, 90000);
}
