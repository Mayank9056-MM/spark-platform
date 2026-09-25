import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatRelativeTime } from './formatters';

describe('formatters', () => {
  it('formats dates consistently', () => {
    const iso = '2026-09-23T12:00:00.000Z';
    const formatted = formatDate(iso);
    expect(formatted).toContain('Sep');
    expect(formatted).toContain('2026');
  });

  it('formats date and time', () => {
    const iso = '2026-09-23T12:34:00.000Z';
    const formatted = formatDateTime(iso);
    expect(formatted).toContain('Sep');
    expect(formatted).toContain('2026');
  });

  it('handles empty and null values', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('')).toBe('—');
    expect(formatRelativeTime(null)).toBe('Never');
    expect(formatRelativeTime(undefined)).toBe('Never');
    expect(formatRelativeTime('')).toBe('Never');
  });

  it('formats relative time across multiple time windows', () => {
    const now = Date.now();
    // Just now (<60s)
    expect(formatRelativeTime(new Date(now - 10_000).toISOString())).toBe('Just now');
    // Minutes ago (<3600s)
    expect(formatRelativeTime(new Date(now - 300_000).toISOString())).toBe('5m ago');
    // Hours ago (<86400s)
    expect(formatRelativeTime(new Date(now - 7_200_000).toISOString())).toBe('2h ago');
    // Days ago (<604800s)
    expect(formatRelativeTime(new Date(now - 172_800_000).toISOString())).toBe('2d ago');
    // Older (>=604800s)
    const oldDate = new Date(now - 1_000_000_000).toISOString();
    expect(formatRelativeTime(oldDate)).toBe(formatDate(oldDate));
  });

  it('handles invalid dates gracefully', () => {
    expect(formatDate('invalid-date')).toBe('—');
    expect(formatDateTime('invalid-date')).toBe('—');
    expect(formatRelativeTime('invalid-date')).toBe('—');
  });
});
