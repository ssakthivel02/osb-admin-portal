const navigationItems = [
  { href: '#audiences', label: 'For everyone' },
  { href: '#tracks', label: 'Learning paths' },
  { href: '#quiz-studio', label: 'Quiz studio' },
  { href: '#mastery', label: 'Mastery' },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="OmSaravanaBhava learning preview home">
        <span className="brand__mark" aria-hidden="true">✦</span>
        <span>
          <strong>OSB Learning</strong>
          <small>Experience preview</small>
        </span>
      </a>
      <nav aria-label="Primary navigation">
        {navigationItems.map((item) => (
          <a key={item.href} href={item.href}>{item.label}</a>
        ))}
      </nav>
      <span className="preview-pill">Non-production</span>
    </header>
  );
}
