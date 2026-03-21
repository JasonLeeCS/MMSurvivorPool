import type { Game, Pick, Team, User } from '../types/domain';

export function getUsedTeamIds(userId: string, picks: Pick[]) {
  return Array.from(new Set(picks.filter((pick) => pick.userId === userId).map((pick) => pick.teamId)));
}

export function getEligibleTeams(userId: string, teams: Team[], picks: Pick[]) {
  const usedTeamIds = new Set(getUsedTeamIds(userId, picks));
  return teams.filter((team) => team.alive && !usedTeamIds.has(team.teamId));
}

export function getTodayPick(userId: string, currentDate: string, picks: Pick[]) {
  return picks.find((pick) => pick.userId === userId && pick.date === currentDate);
}

export function getFirstTip(gameDate: string, games: Game[]) {
  const todaysGames = games
    .filter((game) => game.date === gameDate)
    .sort((a, b) => new Date(a.tipoffTime).getTime() - new Date(b.tipoffTime).getTime());

  return todaysGames[0]?.tipoffTime;
}

export function getMissingUserIds(users: User[], currentDate: string, picks: Pick[]) {
  const usersWithPicks = new Set(picks.filter((pick) => pick.date === currentDate).map((pick) => pick.userId));
  return users.filter((user) => user.active && !user.eliminated && !usersWithPicks.has(user.userId)).map((user) => user.userId);
}
