import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('states the verified repository and production status', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /OmSaravanaBhava Admin Portal/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Executable scaffold')).toBeInTheDocument();
    expect(
      screen.getByText('Blocked pending quality gates'),
    ).toBeInTheDocument();
  });
});
