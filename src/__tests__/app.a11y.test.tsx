import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import React from 'react';
import App from '../App';

describe('App accessibility', () => {
  test('renders with basic landmarks', async () => {
    const { container } = render(<App />);
  expect(screen.getByRole('main')).toBeInTheDocument();
  const results = await axe(container);
  if (results.violations.length) {
    // eslint-disable-next-line no-console
    console.log('\nAXE violations:', results.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description })));
  }
  expect(results.violations.length).toBe(0);
  });

  test('buttons are operable and visible to AT', () => {
    render(<App />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    // All buttons must be named; at least one should be enabled initially
    let enabledCount = 0;
    for (const b of buttons) {
      expect(b).toHaveAccessibleName();
      if (!b.hasAttribute('disabled')) enabledCount++;
    }
    expect(enabledCount).toBeGreaterThan(0);
  });
});
