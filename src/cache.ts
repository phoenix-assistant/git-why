import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import type { Cache, CacheEntry, PRInfo, IssueInfo } from './types.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheDir(): string {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    return join(gitRoot, '.git-why');
  } catch {
    return '.git-why';
  }
}

function getCachePath(): string {
  return join(getCacheDir(), 'cache.json');
}

function loadCache(): Cache {
  const path = getCachePath();
  if (!existsSync(path)) {
    return { repo: '', entries: {} };
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Cache;
  } catch {
    return { repo: '', entries: {} };
  }
}

function saveCache(cache: Cache): void {
  const dir = getCacheDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getCachePath(), JSON.stringify(cache, null, 2));
}

function isFresh(entry: CacheEntry): boolean {
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  return age < CACHE_TTL_MS;
}

export function getCachedPR(repo: string, prNumber: number): PRInfo | null | undefined {
  const cache = loadCache();
  const key = `${repo}/pr/${prNumber}`;
  const entry = cache.entries[key];
  if (!entry || !isFresh(entry)) return undefined; // undefined = not cached
  return entry.pr ?? null;
}

export function setCachedPR(repo: string, prNumber: number, pr: PRInfo | null): void {
  const cache = loadCache();
  const key = `${repo}/pr/${prNumber}`;
  cache.entries[key] = { pr: pr ?? undefined, fetchedAt: new Date().toISOString() };
  saveCache(cache);
}

export function getCachedIssue(repo: string, issueNumber: number): IssueInfo | null | undefined {
  const cache = loadCache();
  const key = `${repo}/issue/${issueNumber}`;
  const entry = cache.entries[key];
  if (!entry || !isFresh(entry)) return undefined;
  return entry.issue ?? null;
}

export function setCachedIssue(repo: string, issueNumber: number, issue: IssueInfo | null): void {
  const cache = loadCache();
  const key = `${repo}/issue/${issueNumber}`;
  cache.entries[key] = { issue: issue ?? undefined, fetchedAt: new Date().toISOString() };
  saveCache(cache);
}
