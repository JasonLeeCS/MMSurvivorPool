import { useEffect, useState } from 'react';
import { Panel } from '../components/Panel';
import { StatusBadge } from '../components/StatusBadge';
import { useAppData } from '../hooks/useAppData';
import { fetchEligibleTeams, submitPick } from '../services/api';
import type { EligibleTeamResponse } from '../types/domain';
import { formatInTimeZone } from '../lib/date';

export function SubmitPage() {
  const { data, loading, error, reload } = useAppData();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [eligibility, setEligibility] = useState<EligibleTeamResponse | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedUserId) {
      setEligibility(null);
      setSelectedTeamId('');
      return;
    }

    void (async () => {
      try {
        const response = await fetchEligibleTeams(selectedUserId);
        setEligibility(response);
        setSelectedTeamId(response.existingPick?.teamId || response.eligibleTeams[0]?.teamId || '');
      } catch (fetchError) {
        setStatusMessage(fetchError instanceof Error ? fetchError.message : 'Unable to load eligible teams.');
      }
    })();
  }, [selectedUserId]);

  if (loading) {
    return <div className="empty-state">Loading pick form...</div>;
  }

  if (error || !data) {
    return (
      <div className="empty-state">
        <p>{error || 'Form data unavailable.'}</p>
        <button className="button" onClick={() => void reload()}>
          Retry
        </button>
      </div>
    );
  }

  const selectedUser = data.users.find((user) => user.userId === selectedUserId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUserId || !selectedTeamId) {
      setStatusMessage('Choose your name and a team first.');
      return;
    }

    try {
      setSubmitting(true);
      const pick = await submitPick({ userId: selectedUserId, teamId: selectedTeamId });
      setStatusMessage(`Saved ${selectedUser?.displayName || 'player'} on ${pick.teamName}.`);
      await reload();
      const refreshed = await fetchEligibleTeams(selectedUserId);
      setEligibility(refreshed);
    } catch (submitError) {
      setStatusMessage(submitError instanceof Error ? submitError.message : 'Unable to save pick.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <Panel title="Shared Pick Form" subtitle="Choose your name, choose a team, and submit before the lock">
        <div className="form-grid">
          <label className="field">
            <span>Your name</span>
            <select className="input" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">Select your name</option>
              {data.users.filter((user) => user.active).map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </label>
          <div className="lock-card">
            <StatusBadge tone={data.dayContext.picksLocked ? 'locked' : 'alive'} label={data.dayContext.picksLocked ? 'Locked' : 'Open'} />
            <p>{data.dayContext.displayLabel}</p>
            <p className="muted">Locks at {formatInTimeZone(data.dayContext.lockTime, data.settings.timezone)}</p>
          </div>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Available team</span>
            <select
              className="input"
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
              disabled={!selectedUserId || data.dayContext.picksLocked}
            >
              <option value="">Select a team</option>
              {eligibility?.eligibleTeams.map((team) => (
                <option key={team.teamId} value={team.teamId}>
                  {team.teamName} ({team.seed}, {team.region})
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="submit" disabled={data.dayContext.picksLocked || submitting}>
            {submitting ? 'Saving...' : eligibility?.existingPick ? 'Update Pick' : 'Submit Pick'}
          </button>
        </form>

        {statusMessage ? <p className="notice">{statusMessage}</p> : null}
        {data.dayContext.picksLocked ? <p className="notice warning">Picks are locked because the day’s first game has started. Only admin overrides are allowed now.</p> : null}

        {selectedUser ? (
          <div className="two-col">
            <Panel title="Your Prior Picks" subtitle="Teams already used are removed from the dropdown">
              <div className="chip-list">
                {data.picks
                  .filter((pick) => pick.userId === selectedUser.userId)
                  .map((pick) => (
                    <span className="chip" key={pick.pickId}>
                      {pick.date}: {pick.teamName}
                    </span>
                  ))}
              </div>
            </Panel>
            <Panel title="Eligibility Check" subtitle="Only alive teams you have not used remain available">
              <p className="muted">Used teams: {eligibility?.usedTeamIds.length || 0}</p>
              <p className="muted">Eligible teams: {eligibility?.eligibleTeams.length || 0}</p>
              {eligibility?.existingPick ? (
                <p className="notice">Existing pick for today: {eligibility.existingPick.teamName}</p>
              ) : (
                <p className="muted">No current pick submitted yet.</p>
              )}
            </Panel>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
