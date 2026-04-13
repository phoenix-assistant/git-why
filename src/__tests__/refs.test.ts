import { describe, it, expect } from 'vitest';
import { extractRefs } from '../refs.js';

describe('extractRefs', () => {
  it('extracts simple #123 refs as potential PRs', () => {
    const refs = extractRefs('Fix bug #42 and #100');
    expect(refs.prNumbers).toContain(42);
    expect(refs.prNumbers).toContain(100);
  });

  it('extracts closing keyword refs as issues', () => {
    const refs = extractRefs('feat: add feature\n\nCloses #38');
    expect(refs.issueNumbers).toContain(38);
  });

  it('extracts "fixes #N" as issue', () => {
    const refs = extractRefs('fixes #55');
    expect(refs.issueNumbers).toContain(55);
  });

  it('extracts "resolves #N" as issue', () => {
    const refs = extractRefs('resolves #99');
    expect(refs.issueNumbers).toContain(99);
  });

  it('extracts GH- style refs', () => {
    // 'Fixes GH-123' matches the closing keyword pattern → issue
    const refs = extractRefs('Fixes GH-123');
    expect(refs.issueNumbers).toContain(123);
  });

  it('extracts plain GH- ref (not closing keyword) as PR candidate', () => {
    const refs = extractRefs('See GH-456 for context');
    expect(refs.prNumbers).toContain(456);
  });

  it('extracts GitHub PR URLs', () => {
    const refs = extractRefs('See https://github.com/owner/repo/pull/456');
    expect(refs.prNumbers).toContain(456);
  });

  it('extracts GitHub issue URLs', () => {
    const refs = extractRefs('See https://github.com/owner/repo/issues/789');
    expect(refs.issueNumbers).toContain(789);
  });

  it('returns empty arrays for plain commit messages', () => {
    const refs = extractRefs('chore: update dependencies');
    expect(refs.prNumbers).toHaveLength(0);
    expect(refs.issueNumbers).toHaveLength(0);
  });

  it('handles mixed refs', () => {
    const refs = extractRefs('PR #10 closes #20 and resolves #30');
    // #10 is a PR candidate, #20 and #30 are issues
    expect(refs.issueNumbers).toContain(20);
    expect(refs.issueNumbers).toContain(30);
  });
});
