import { describe, it, expect } from 'vitest';
import { parseBlameOutput, parseBlameRangeOutput, parseGitHubRepo } from '../git.js';

describe('parseBlameOutput', () => {
  const sampleBlame = `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 1 1 1
author Jane Smith
author-mail <jane@example.com>
author-time 1710460800
author-tz +0000
committer Jane Smith
committer-mail <jane@example.com>
committer-time 1710460800
committer-tz +0000
summary Fix auth token expiry
filename src/auth/token.ts
\tconst TOKEN_EXPIRY = 3600 * 24;`;

  it('parses sha correctly', () => {
    const result = parseBlameOutput(sampleBlame, 42);
    expect(result?.sha).toBe('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
    expect(result?.shortSha).toBe('a1b2c3d');
  });

  it('parses author correctly', () => {
    const result = parseBlameOutput(sampleBlame, 42);
    expect(result?.author).toBe('Jane Smith');
  });

  it('parses date correctly', () => {
    const result = parseBlameOutput(sampleBlame, 42);
    expect(result?.date).toBe('2024-03-15');
  });

  it('parses commit message correctly', () => {
    const result = parseBlameOutput(sampleBlame, 42);
    expect(result?.message).toBe('Fix auth token expiry');
  });

  it('parses line content correctly', () => {
    const result = parseBlameOutput(sampleBlame, 42);
    expect(result?.lineContent).toBe('const TOKEN_EXPIRY = 3600 * 24;');
  });

  it('returns null for empty input', () => {
    const result = parseBlameOutput('', 1);
    expect(result).toBeNull();
  });
});

describe('parseGitHubRepo', () => {
  it('parses HTTPS remote', () => {
    const result = parseGitHubRepo('https://github.com/owner/myrepo.git');
    expect(result).toEqual({ owner: 'owner', repo: 'myrepo' });
  });

  it('parses SSH remote', () => {
    const result = parseGitHubRepo('git@github.com:owner/myrepo.git');
    expect(result).toEqual({ owner: 'owner', repo: 'myrepo' });
  });

  it('returns null for non-GitHub remote', () => {
    const result = parseGitHubRepo('https://gitlab.com/owner/repo.git');
    expect(result).toBeNull();
  });
});
