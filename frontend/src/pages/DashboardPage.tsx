import { useMemo, useState } from 'react';
import { Panel } from '../components/Panel';
import { StatusBadge } from '../components/StatusBadge';
import { SummaryCard } from '../components/SummaryCard';
import { useAppData } from '../hooks/useAppData';
import { formatInTimeZone, getCountdownLabel } from '../lib/date';

export function DashboardPage() {
  const { data, loading, error, reload } = useAppData();
  const [filter, setFilter] = useState('');

  const filteredRows = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.userStatusRows.filter((row) => row.user.displayName.toLowerCase().includes(filter.toLowerCase()));
  }, [data, filter]);

  if (loading) {
    return <div className="empty-state">Loading survivor pool dashboard...</div>;
  }

  if (error || !data) {
    return (
      <div className="empty-state">
        <p>{error || 'Pool data unavailable.'}</p>
        <button className="button" onClick={() => void reload()}>
          Retry
        </button>
      </div>
    );
  }

  const aliveCount = data.userStatusRows.filter((row) => row.effectiveStatus === 'alive').length;
  const eliminatedCount = data.userStatusRows.length - aliveCount;
  const buybackCount = data.users.reduce((sum, user) => sum + user.buybackCount, 0);

  return (
    <div className="stack">
      <section className="hero card">
        <div>
          <p className="eyebrow">Current Slate</p>
          <h2>{data.dayContext.displayLabel}</h2>
          <p className="muted">
            Picks {data.dayContext.picksLocked ? 'locked' : 'open'}. First tip: {data.dayContext.firstTipDisplay}.
          </p>
        </div>
        <div className="hero-meta">
          <StatusBadge tone={data.dayContext.picksLocked ? 'locked' : 'alive'} label={getCountdownLabel(data.dayContext.lockTime)} />
          <p className="muted">Last updated {formatInTimeZone(data.settings.lastUpdated, data.settings.timezone)}</p>
        </div>
      </section>

      <section className="summary-grid">
        <SummaryCard label="Alive" value={aliveCount} subtext="Still in the hunt" />
        <SummaryCard label="Eliminated" value={eliminatedCount} subtext="Out unless restored" />
        <SummaryCard label="Buy-Backs" value={buybackCount} subtext="Total used so far" />
        <SummaryCard label="Missing Picks" value={data.missingUserIds.length} subtext="Still open players without a pick" />
      </section>

      <div className="two-col">
        <Panel title="Pool Status" subtitle="Alive, eliminated, buy-back, and missing-pick tracking">
          <div className="table-tools">
            <input
              className="input"
              placeholder="Search players"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Status</th>
                  <th>Today</th>
                  <th>Buy-Backs</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.user.userId}>
                    <td>
                      <strong>{row.user.displayName}</strong>
                    </td>
                    <td>
                      {row.effectiveStatus === 'alive' ? <StatusBadge tone="alive" label="Alive" /> : <StatusBadge tone="eliminated" label="Eliminated" />}
                      {' '}
                      {row.buybackActive ? <StatusBadge tone="bought-back" label="Bought Back In" /> : null}
                      {' '}
                      {!data.dayContext.picksLocked && row.missingPick && row.effectiveStatus === 'alive' ? <StatusBadge tone="missing" label="Missing Pick" /> : null}
                    </td>
                    <td>
                      {data.dayContext.picksLocked
                        ? row.todayPick?.teamName || 'No pick'
                        : row.todayPick
                          ? 'Hidden until lock'
                          : 'No pick'}
                    </td>
                    <td>{row.user.buybackCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Today&apos;s Slate" subtitle="Schedule determines the lock time">
          <div className="slate-list">
            {data.games
              .filter((game) => game.date === data.dayContext.currentDate)
              .map((game) => (
                <article className="slate-card" key={game.gameId}>
                  <div>
                    <p>{game.team1} vs {game.team2}</p>
                    <p className="muted">{game.round}</p>
                  </div>
                  <div className="slate-meta">
                    <span>{formatInTimeZone(game.tipoffTime, data.settings.timezone)}</span>
                    <StatusBadge tone={game.status === 'final' ? 'locked' : 'info'} label={game.status} />
                  </div>
                </article>
              ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Pick History"
        subtitle={data.dayContext.picksLocked ? 'Current day picks are now public.' : 'Today’s picks remain hidden until lock.'}
      >
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Player</th>
                <th>Team</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {data.visiblePicks.map((pick) => {
                const user = data.users.find((entry) => entry.userId === pick.userId);
                return (
                  <tr key={pick.pickId}>
                    <td>{pick.date}</td>
                    <td>{user?.displayName || pick.userId}</td>
                    <td>{pick.teamName}</td>
                    <td>{pick.result || 'pending'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
