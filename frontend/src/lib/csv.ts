import type { Pick, User } from '../types/domain';

export function buildPicksCsv(picks: Pick[], users: User[]) {
  const userMap = new Map(users.map((user) => [user.userId, user.displayName]));
  const rows = [
    ['date', 'user_id', 'display_name', 'team_id', 'team_name', 'submitted_at', 'updated_at', 'submitted_by', 'result', 'overridden'],
    ...picks.map((pick) => [
      pick.date,
      pick.userId,
      userMap.get(pick.userId) ?? pick.userId,
      pick.teamId,
      pick.teamName,
      pick.submittedAt,
      pick.updatedAt,
      pick.submittedBy,
      pick.result ?? '',
      String(pick.overridden),
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          return value.includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(','),
    )
    .join('\n');
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
