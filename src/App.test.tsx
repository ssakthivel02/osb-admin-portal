import { render, screen, within } from '@testing-library/react';
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

  it('exposes the status card through an accessible labelled region', () => {
    render(<App />);

    const statusRegion = screen.getByRole('region', {
      name: /OmSaravanaBhava Admin Portal/i,
    });

    expect(
      within(statusRegion).getByText('Verified implementation baseline'),
    ).toBeInTheDocument();
    expect(
      within(statusRegion).getByText(/Authentication, API access, and editorial workflows remain intentionally disabled/i),
    ).toBeInTheDocument();
  });

  it('keeps repository and production labels paired with their values', () => {
    render(<App />);

    expect(screen.getByText('Repository state').tagName).toBe('DT');
    expect(screen.getByText('Executable scaffold').tagName).toBe('DD');
    expect(screen.getByText('Production state').tagName).toBe('DT');
    expect(screen.getByText('Blocked pending quality gates').tagName).toBe('DD');
  });
});
