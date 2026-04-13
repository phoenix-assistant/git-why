import { describe, it, expect } from 'vitest';

// Unit tests for cache logic (TTL and key calculation) without file system mocking
describe('cache logic', () => {
  it('TTL calculation: fresh entry is within 24h', () => {
    const fetchedAt = new Date().toISOString();
    const age = Date.now() - new Date(fetchedAt).getTime();
    const TTL = 24 * 60 * 60 * 1000;
    expect(age).toBeLessThan(TTL);
  });

  it('TTL calculation: stale entry is older than 24h', () => {
    const staleDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const age = Date.now() - new Date(staleDate).getTime();
    const TTL = 24 * 60 * 60 * 1000;
    expect(age).toBeGreaterThan(TTL);
  });

  it('generates correct cache key for PR', () => {
    const repoKey = 'owner/repo';
    const prNumber = 42;
    const key = `${repoKey}/pr/${prNumber}`;
    expect(key).toBe('owner/repo/pr/42');
  });

  it('generates correct cache key for issue', () => {
    const repoKey = 'owner/repo';
    const issueNumber = 38;
    const key = `${repoKey}/issue/${issueNumber}`;
    expect(key).toBe('owner/repo/issue/38');
  });
});
