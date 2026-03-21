interface SummaryCardProps {
  label: string;
  value: string | number;
  subtext: string;
}

export function SummaryCard({ label, value, subtext }: SummaryCardProps) {
  return (
    <article className="card summary-card">
      <p className="eyebrow">{label}</p>
      <h3>{value}</h3>
      <p className="muted">{subtext}</p>
    </article>
  );
}
