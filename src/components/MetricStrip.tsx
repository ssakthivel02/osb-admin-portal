const metrics = [
  { value: '4', label: 'audience pathways' },
  { value: '8', label: 'quiz formats' },
  { value: '5', label: 'mastery stages' },
  { value: '0', label: 'production data sources' },
] as const;

export function MetricStrip() {
  return (
    <section className="metric-strip" aria-label="Preview scope">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <strong>{metric.value}</strong>
          <span>{metric.label}</span>
        </div>
      ))}
    </section>
  );
}
