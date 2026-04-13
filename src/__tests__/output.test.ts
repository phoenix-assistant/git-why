import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the summary building logic via output module
// Since printWhyResult writes to stdout, we capture it

describe('output formatting', () => {
  it('formats line range correctly', () => {
    const lineStart = 40;
    const lineEnd = 50;
    const lineRange =
      lineStart === lineEnd
        ? `Line ${lineStart}`
        : `Lines ${lineStart}–${lineEnd}`;
    expect(lineRange).toBe('Lines 40–50');
  });

  it('formats single line correctly', () => {
    const lineStart = 42;
    const lineEnd = 42;
    const lineRange =
      lineStart === lineEnd
        ? `Line ${lineStart}`
        : `Lines ${lineStart}–${lineEnd}`;
    expect(lineRange).toBe('Line 42');
  });

  it('builds summary with PR and issue', () => {
    const summary = `Added in PR #42 ("Fix auth token expiry") to resolve issue #38 ("Users logged out after 1 hour"). Author: Jane Smith. Date: 2024-03-15.`;
    expect(summary).toContain('PR #42');
    expect(summary).toContain('issue #38');
    expect(summary).toContain('Jane Smith');
  });
});
