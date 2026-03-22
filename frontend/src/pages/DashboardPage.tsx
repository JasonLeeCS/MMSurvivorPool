import { useMemo, useState } from 'react';
import { Panel } from '../components/Panel';
import { StatusBadge } from '../components/StatusBadge';
import { SummaryCard } from '../components/SummaryCard';
import { useAppData } from '../hooks/useAppData';
import { formatInTimeZone, getCountdownLabel } from '../lib/date';
import type { Game } from '../types/domain';

function getSlateStatus(game: Game) {
  if (game.status === 'final') {
    return 'Final';
  }
  if (game.status === 'live') {
    return 'Pending';
  }
  return 'Scheduled';
}

function getSlateScore(game: Game) {
  if (game.team1Score === undefined || game.team2Score === undefined) {
    return null;
  }
  return `${game.team1Score}-${game.team2Score}`;
}

export function DashboardPage() {
  const { data, loading, error, reload } = useAppData();
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'buybacks'>('name');

  const filteredRows = useMemo(() => {
    if (!data) {
      return [];
    }
    const rows = data.userStatusRows.filter((row) => row.user.displayName.toLowerCase().includes(filter.toLowerCase()));
    return [...rows].sort((left, right) => {
      if (sortKey === 'status') {
        const leftRank = left.effectiveStatus === 'alive' ? 0 : 1;
        const rightRank = right.effectiveStatus === 'alive' ? 0 : 1;
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }
        return left.user.displayName.localeCompare(right.user.displayName);
      }

      if (sortKey === 'buybacks') {
        if (right.user.buybackCount !== left.user.buybackCount) {
          return right.user.buybackCount - left.user.buybackCount;
        }
        return left.user.displayName.localeCompare(right.user.displayName);
      }

      return left.user.displayName.localeCompare(right.user.displayName);
    });
  }, [data, filter, sortKey]);

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
            <select className="input input-compact" value={sortKey} onChange={(event) => setSortKey(event.target.value as 'name' | 'status' | 'buybacks')}>
              <option value="name">Sort: Name</option>
              <option value="status">Sort: Status</option>
              <option value="buybacks">Sort: Buy-Backs</option>
            </select>
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
                    <span>
                      {game.status === 'scheduled'
                        ? formatInTimeZone(game.tipoffTime, data.settings.timezone)
                        : getSlateScore(game) || formatInTimeZone(game.tipoffTime, data.settings.timezone)}
                    </span>
                    <StatusBadge tone={game.status === 'final' ? 'locked' : 'info'} label={getSlateStatus(game)} />
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
