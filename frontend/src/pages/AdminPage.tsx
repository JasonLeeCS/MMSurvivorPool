import { useMemo, useState } from 'react';
import { Panel } from '../components/Panel';
import { StatusBadge } from '../components/StatusBadge';
import { useAppData } from '../hooks/useAppData';
import {
  clearAdminSession,
  getAdminSession,
  overridePick,
  recordBuyback,
  refreshTeams,
  updateTeam,
  upsertUser,
  validateAdminPasscode,
} from '../services/api';
import { buildPicksCsv, downloadCsv } from '../lib/csv';

export function AdminPage() {
  const { data, loading, error, reload } = useAppData();
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    userId: '',
    displayName: '',
    active: true,
    eliminated: false,
    buybackCount: 0,
    notes: '',
  });
  const [pickOverride, setPickOverride] = useState({
    date: '',
    userId: '',
    teamId: '',
  });
  const [buybackForm, setBuybackForm] = useState({
    userId: '',
    countChange: 1,
    reason: '',
  });

  const session = getAdminSession();
  const currentUsers = data?.users ?? [];
  const currentTeams = data?.teams ?? [];

  const missingUsers = useMemo(
    () => currentUsers.filter((user) => data?.missingUserIds.includes(user.userId)),
    [currentUsers, data?.missingUserIds],
  );

  if (loading) {
    return <div className="empty-state">Loading admin tools...</div>;
  }

  if (error || !data) {
    return (
      <div className="empty-state">
        <p>{error || 'Admin data unavailable.'}</p>
        <button className="button" onClick={() => void reload()}>
          Retry
        </button>
      </div>
    );
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await validateAdminPasscode(passcode);
      setPasscode('');
      setAuthError(null);
    } catch (loginError) {
      setAuthError(loginError instanceof Error ? loginError.message : 'Admin login failed.');
    }
  };

  if (!session) {
    return (
      <div className="stack">
        <Panel title="Commissioner Access" subtitle="Admin controls stay hidden until the passcode is validated by Apps Script">
          <form className="stack" onSubmit={handleLogin}>
            <label className="field">
              <span>Admin passcode</span>
              <input className="input" type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} />
            </label>
            <button className="button" type="submit">
              Unlock Admin
            </button>
          </form>
          {authError ? <p className="notice warning">{authError}</p> : null}
          <p className="muted">This route should be deployed behind a secret slug plus passcode validation.</p>
        </Panel>
      </div>
    );
  }

  const handleUserSave = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await upsertUser(userForm);
      setMessage('User saved.');
      await reload();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : 'Failed to save user.');
    }
  };

  const handleOverride = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await overridePick({ ...pickOverride, overridden: true });
      setMessage('Pick override saved.');
      await reload();
    } catch (overrideError) {
      setMessage(overrideError instanceof Error ? overrideError.message : 'Failed to override pick.');
    }
  };

  const handleBuyback = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await recordBuyback(buybackForm.userId, buybackForm.countChange, buybackForm.reason);
      setMessage('Buy-back recorded.');
      await reload();
    } catch (buybackError) {
      setMessage(buybackError instanceof Error ? buybackError.message : 'Failed to record buy-back.');
    }
  };

  const handleSync = async () => {
    try {
      const response = await refreshTeams();
      setMessage(response.message);
      await reload();
    } catch (syncError) {
      setMessage(syncError instanceof Error ? syncError.message : 'Team sync failed.');
    }
  };

  return (
    <div className="stack">
      <section className="hero card">
        <div>
          <p className="eyebrow">Operations Dashboard</p>
          <h2>Commissioner controls</h2>
          <p className="muted">Use these tools to manage users, overrides, sync, and buy-backs.</p>
        </div>
        <div className="hero-meta">
          <StatusBadge tone={data.settings.syncStatus === 'error' ? 'warning' : 'info'} label={`Sync: ${data.settings.syncStatus}`} />
          <button
            className="button button-secondary"
            onClick={() => {
              clearAdminSession();
              window.location.reload();
            }}
          >
            Log Out
          </button>
        </div>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      <div className="summary-grid">
        <div className="card summary-card">
          <p className="eyebrow">Sync Status</p>
          <h3>{data.settings.syncStatus}</h3>
          <p className="muted">{data.settings.syncMessage}</p>
        </div>
        <div className="card summary-card">
          <p className="eyebrow">Missing Picks</p>
          <h3>{data.missingUserIds.length}</h3>
          <p className="muted">{data.dayContext.picksLocked ? 'Lock is active' : 'Still open today'}</p>
        </div>
        <div className="card summary-card">
          <p className="eyebrow">Current Lock</p>
          <h3>{data.dayContext.picksLocked ? 'Locked' : 'Open'}</h3>
          <p className="muted">{data.dayContext.firstTipDisplay}</p>
        </div>
      </div>

      <div className="three-col">
        <Panel title="User Admin" subtitle="Add or update players">
          <form className="stack" onSubmit={handleUserSave}>
            <input className="input" placeholder="user_id optional" value={userForm.userId} onChange={(event) => setUserForm((current) => ({ ...current, userId: event.target.value }))} />
            <input className="input" placeholder="Display name" value={userForm.displayName} onChange={(event) => setUserForm((current) => ({ ...current, displayName: event.target.value }))} />
            <input className="input" placeholder="Notes" value={userForm.notes} onChange={(event) => setUserForm((current) => ({ ...current, notes: event.target.value }))} />
            <div className="inline-fields">
              <label><input type="checkbox" checked={userForm.active} onChange={(event) => setUserForm((current) => ({ ...current, active: event.target.checked }))} /> Active</label>
              <label><input type="checkbox" checked={userForm.eliminated} onChange={(event) => setUserForm((current) => ({ ...current, eliminated: event.target.checked }))} /> Eliminated</label>
            </div>
            <input className="input" type="number" min="0" value={userForm.buybackCount} onChange={(event) => setUserForm((current) => ({ ...current, buybackCount: Number(event.target.value) }))} />
            <button className="button" type="submit">Save User</button>
          </form>
        </Panel>

        <Panel title="Pick Override" subtitle="Bypasses lock and validity checks">
          <form className="stack" onSubmit={handleOverride}>
            <input className="input" type="date" value={pickOverride.date} onChange={(event) => setPickOverride((current) => ({ ...current, date: event.target.value }))} />
            <select className="input" value={pickOverride.userId} onChange={(event) => setPickOverride((current) => ({ ...current, userId: event.target.value }))}>
              <option value="">Player</option>
              {currentUsers.map((user) => <option key={user.userId} value={user.userId}>{user.displayName}</option>)}
            </select>
            <select className="input" value={pickOverride.teamId} onChange={(event) => setPickOverride((current) => ({ ...current, teamId: event.target.value }))}>
              <option value="">Team</option>
              {currentTeams.map((team) => <option key={team.teamId} value={team.teamId}>{team.teamName}</option>)}
            </select>
            <button className="button" type="submit">Save Override</button>
          </form>
        </Panel>

        <Panel title="Buy-Backs" subtitle="Restore a user and increment their count">
          <form className="stack" onSubmit={handleBuyback}>
            <select className="input" value={buybackForm.userId} onChange={(event) => setBuybackForm((current) => ({ ...current, userId: event.target.value }))}>
              <option value="">Player</option>
              {currentUsers.map((user) => <option key={user.userId} value={user.userId}>{user.displayName}</option>)}
            </select>
            <input className="input" type="number" min="1" value={buybackForm.countChange} onChange={(event) => setBuybackForm((current) => ({ ...current, countChange: Number(event.target.value) }))} />
            <input className="input" placeholder="Reason" value={buybackForm.reason} onChange={(event) => setBuybackForm((current) => ({ ...current, reason: event.target.value }))} />
            <button className="button" type="submit">Record Buy-Back</button>
          </form>
        </Panel>
      </div>

      <div className="two-col">
        <Panel
          title="Teams & Sync"
          subtitle="Refresh the NCAA feed or manually override team status"
          actions={<button className="button button-secondary" onClick={() => void handleSync()}>Refresh Teams</button>}
        >
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Alive</th>
                  <th>Manual</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentTeams.map((team) => (
                  <tr key={team.teamId}>
                    <td>{team.teamName}</td>
                    <td>{team.alive ? 'Yes' : 'No'}</td>
                    <td>{team.manualOverride ? 'Yes' : 'No'}</td>
                    <td>
                      <button
                        className="button button-small"
                        onClick={() => void updateTeam({ teamId: team.teamId, alive: !team.alive, manualOverride: true }).then(() => reload())}
                      >
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Operations"
          subtitle="Commissioner-friendly utilities"
          actions={<button className="button button-secondary" onClick={() => downloadCsv(`picks-${data.dayContext.currentDate}.csv`, buildPicksCsv(data.picks, data.users))}>Export Picks CSV</button>}
        >
          <p className="muted">Sync note: {data.settings.syncMessage}</p>
          <p className="muted">Missing today: {missingUsers.map((user) => user.displayName).join(', ') || 'None'}</p>
          <p className="muted">Raw status: {data.settings.syncStatus}</p>
          <p className="muted">Last updated: {data.settings.lastUpdated}</p>
        </Panel>
      </div>
    </div>
  );
}
