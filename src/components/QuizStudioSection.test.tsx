import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuizStudioSection } from './QuizStudioSection';

describe('QuizStudioSection', () => {
  it('renders the expanded assessment-format catalogue', () => {
    render(<QuizStudioSection />);

    expect(screen.getByRole('heading', { name: 'Quick check' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Scenario choice' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Match and sort' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mastery sprint' })).toBeInTheDocument();
  });

  it('keeps scoring disabled and explains the mastery answer', () => {
    render(<QuizStudioSection />);

    expect(screen.getByText(/scoring and answer submission are deliberately not wired/i)).toBeInTheDocument();
    expect(screen.getByText(/mastery requires durable understanding across contexts/i)).toBeInTheDocument();
  });
});
