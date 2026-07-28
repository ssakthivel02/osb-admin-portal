import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

function BrokenComponent(): never {
  throw new Error('Synthetic render failure');
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <AppErrorBoundary>
        <p>Portal content</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText('Portal content')).toBeInTheDocument();
  });

  it('fails closed with an accessible recovery message', () => {
    const onError = vi.fn();

    render(
      <AppErrorBoundary onError={onError}>
        <BrokenComponent />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /portal could not finish loading/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No data was changed/i)).toBeInTheDocument();
    expect(onError).toHaveBeenCalledOnce();
  });

  it('offers an explicit reload recovery action', () => {
    render(
      <AppErrorBoundary>
        <BrokenComponent />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('button', { name: /reload portal/i })).toHaveAttribute(
      'type',
      'button',
    );
  });
});
