import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('presents the intergenerational learning proposition and visual', () => {
    render(<HeroSection />);

    expect(
      screen.getByRole('heading', { name: /premium learning journey for every age/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /children, parents, a teacher, and an older learner/i }),
    ).toHaveAttribute('src', 'assets/ai-learning-community-hero.svg');
  });

  it('labels the preview boundaries and exposes in-page navigation', () => {
    render(<HeroSection />);

    expect(screen.getByText(/sign-in, personalisation, scoring, and data capture are not connected/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore learning paths/i })).toHaveAttribute('href', '#tracks');
    expect(screen.getByRole('link', { name: /see quiz studio/i })).toHaveAttribute('href', '#quiz-studio');
  });
});
