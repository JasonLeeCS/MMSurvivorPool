export function formatInTimeZone(value: string | undefined, timeZone: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return 'TBD';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  }).format(new Date(value));
}

export function formatDateLabel(value: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00Z`));
}

export function getCountdownLabel(lockTime: string | undefined) {
  if (!lockTime) {
    return 'No lock time';
  }

  const diffMs = new Date(lockTime).getTime() - Date.now();
  if (diffMs <= 0) {
    return 'Locked';
  }

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m remaining`;
  }

  return `${remainingMinutes}m remaining`;
}
