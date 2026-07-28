import { AudienceSection } from './components/AudienceSection';
import { HeroSection } from './components/HeroSection';
import { LearningTracksSection } from './components/LearningTracksSection';
import { MasteryJourneySection } from './components/MasteryJourneySection';
import { MetricStrip } from './components/MetricStrip';
import { ProductConceptSection } from './components/ProductConceptSection';
import { QuizStudioSection } from './components/QuizStudioSection';
import { RepositoryStatus } from './components/RepositoryStatus';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { TrustSection } from './components/TrustSection';

export function App() {
  return (
    <div className="site-shell" id="top">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <MetricStrip />
        <AudienceSection />
        <LearningTracksSection />
        <QuizStudioSection />
        <MasteryJourneySection />
        <ProductConceptSection />
        <TrustSection />
        <RepositoryStatus />
      </main>
      <SiteFooter />
    </div>
  );
}
