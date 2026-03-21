interface StatusBadgeProps {
  tone: 'alive' | 'eliminated' | 'bought-back' | 'missing' | 'locked' | 'info' | 'warning';
  label: string;
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
