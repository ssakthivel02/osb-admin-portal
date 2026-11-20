import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AudienceSection } from './AudienceSection';

describe('AudienceSection', () => {
  it('renders distinct pathways for all intended audiences', () => {
    render(<AudienceSection />);

    expect(screen.getByRole('heading', { name: 'Learners' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Parents and carers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Teachers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lifelong learners' })).toBeInTheDocument();
  });

  it('states the teacher daily-use value explicitly', () => {
    render(<AudienceSection />);

    expect(
      screen.getByText(/reason to sign in daily: today’s class pulse and priority actions/i),
    ).toBeInTheDocument();
  });
});
