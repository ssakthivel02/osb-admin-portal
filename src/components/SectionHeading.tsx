interface SectionHeadingProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly align?: 'left' | 'centre';
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: SectionHeadingProps) {
  return (
    <header className={`section-heading section-heading--${align}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}
