import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('accessibility baseline', () => {
  it('provides keyboard bypass navigation to the focusable main landmark', () => {
    render(<App />);

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    const main = screen.getByRole('main');

    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('keeps a single page-level heading and named primary navigation', () => {
    render(<App />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument();
  });

  it('gives every informative image a non-empty accessible name', () => {
    render(<App />);

    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);

    for (const image of images) {
      expect(image.getAttribute('alt')?.trim()).toBeTruthy();
    }
  });

  it('uses discernible link text and valid in-page destinations', () => {
    render(<App />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      expect(link.textContent?.trim()).toBeTruthy();

      const href = link.getAttribute('href');
      expect(href).toBeTruthy();

      if (href?.startsWith('#') === true) {
        const targetId = href.slice(1);
        expect(targetId).not.toHaveLength(0);
        expect(document.getElementById(targetId)).not.toBeNull();
      }
    }
  });
});
