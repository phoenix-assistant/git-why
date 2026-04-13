import {
  isGitRepo,
  isGhCliAvailable,
  getRepoRemote,
  parseGitHubRepo,
  gitBlame,
  gitBlameRange,
  getCommitInfo,
  getFileHistory,
  getAllCommits,
  findFunctionBoundaries,
} from './git.js';
import { extractRefs } from './refs.js';
import { fetchPR, fetchIssue, fetchPRForCommit } from './github.js';
import {
  getCachedPR,
  setCachedPR,
  getCachedIssue,
  setCachedIssue,
} from './cache.js';
import type { WhyResult, PRInfo, IssueInfo, CommitInfo, StatsResult } from './types.js';

export interface WhyOptions {
  file: string;
  lineStart: number;
  lineEnd: number;
}

export interface FunctionOptions {
  file: string;
  functionName: string;
}

export async function explainLines(opts: WhyOptions): Promise<WhyResult | null> {
  const { file, lineStart, lineEnd } = opts;

  const blame =
    lineStart === lineEnd
      ? gitBlame(file, lineStart)
      : gitBlameRange(file, lineStart, lineEnd)[0] ?? null;

  if (!blame) return null;

  const commit = getCommitInfo(blame.sha);
  if (!commit) return null;

  const repoInfo = getGitHubRepo();
  const { pr, issues } = await fetchContext(commit, repoInfo);

  return {
    file,
    lineStart,
    lineEnd,
    lineContent: blame.lineContent,
    commit,
    pr: pr ?? undefined,
    issues,
    refs: extractRefs(commit.message + '\n' + commit.body),
  };
}

export async function explainFunction(
  opts: FunctionOptions
): Promise<WhyResult | null> {
  const bounds = findFunctionBoundaries(opts.file, opts.functionName);
  if (!bounds) return null;

  const blameLines = gitBlameRange(opts.file, bounds.start, bounds.end);
  if (blameLines.length === 0) return null;

  // Use the most recent commit for the function
  const sorted = [...blameLines].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const mostRecent = sorted[0]!;
  const commit = getCommitInfo(mostRecent.sha);
  if (!commit) return null;

  const repoInfo = getGitHubRepo();
  const { pr, issues } = await fetchContext(commit, repoInfo);

  return {
    file: opts.file,
    lineStart: bounds.start,
    lineEnd: bounds.end,
    commit,
    pr: pr ?? undefined,
    issues,
    refs: extractRefs(commit.message + '\n' + commit.body),
  };
}

export async function fileHistory(
  file: string
): Promise<{
  commits: CommitInfo[];
  prMap: Map<string, { pr?: { number: number; title: string }; issues: { number: number; title: string }[] }>;
}> {
  const commits = getFileHistory(file);
  const repoInfo = getGitHubRepo();
  const prMap = new Map<string, { pr?: { number: number; title: string }; issues: { number: number; title: string }[] }>();

  for (const commit of commits) {
    const { pr, issues } = await fetchContext(commit, repoInfo);
    prMap.set(commit.sha, {
      pr: pr ? { number: pr.number, title: pr.title } : undefined,
      issues: issues.map(i => ({ number: i.number, title: i.title })),
    });
  }

  return { commits, prMap };
}

export async function repoStats(): Promise<StatsResult> {
  const commits = getAllCommits(500);
  const repoInfo = getGitHubRepo();

  let commitsWithPR = 0;
  let commitsWithIssue = 0;

  for (const commit of commits) {
    const refs = extractRefs(commit.message + '\n' + commit.body);
    if (refs.prNumbers.length > 0) commitsWithPR++;
    if (refs.issueNumbers.length > 0) commitsWithIssue++;
    else if (repoInfo && refs.prNumbers.length > 0) {
      // Check if PR has linked issues
      const pr = await getPR(repoInfo.owner, repoInfo.repo, refs.prNumbers[0]!);
      if (pr && pr.linkedIssues.length > 0) commitsWithIssue++;
    }
  }

  const total = commits.length || 1;
  const prCoverage = (commitsWithPR / total) * 100;
  const issueCoverage = (commitsWithIssue / total) * 100;
  const intentScore = (prCoverage * 0.6 + issueCoverage * 0.4);

  return {
    totalCommits: commits.length,
    commitsWithPR,
    commitsWithIssue,
    prCoverage,
    issueCoverage,
    intentScore,
  };
}

export function checkPrerequisites(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!isGitRepo()) errors.push('Not inside a git repository.');
  if (!isGhCliAvailable()) {
    errors.push('`gh` CLI not found. Install from: https://cli.github.com/');
  }
  return { ok: errors.length === 0, errors };
}

// ── Private helpers ────────────────────────────────────────────────

function getGitHubRepo(): { owner: string; repo: string } | null {
  const remote = getRepoRemote();
  if (!remote) return null;
  return parseGitHubRepo(remote);
}

async function fetchContext(
  commit: CommitInfo,
  repoInfo: { owner: string; repo: string } | null
): Promise<{ pr: PRInfo | null; issues: IssueInfo[] }> {
  const refs = extractRefs(commit.message + '\n' + commit.body);
  let pr: PRInfo | null = null;
  const issues: IssueInfo[] = [];

  if (!repoInfo) return { pr, issues };
  const { owner, repo } = repoInfo;
  const repoKey = `${owner}/${repo}`;

  // Try to find PR from refs first
  for (const prNum of refs.prNumbers) {
    pr = await getPR(owner, repo, prNum);
    if (pr) break;
  }

  // If no PR found from refs, try GitHub API to find PR for this commit
  if (!pr && isGhCliAvailable()) {
    pr = fetchPRForCommit(owner, repo, commit.sha);
    if (pr) {
      setCachedPR(repoKey, pr.number, pr);
    }
  }

  // Collect issue numbers from refs + PR linked issues
  const issueNums = new Set([
    ...refs.issueNumbers,
    ...(pr?.linkedIssues ?? []),
  ]);

  for (const issueNum of issueNums) {
    const issue = await getIssue(owner, repo, issueNum);
    if (issue) issues.push(issue);
  }

  return { pr, issues };
}

async function getPR(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRInfo | null> {
  const repoKey = `${owner}/${repo}`;
  const cached = getCachedPR(repoKey, prNumber);
  if (cached !== undefined) return cached;

  const pr = fetchPR(owner, repo, prNumber);
  setCachedPR(repoKey, prNumber, pr);
  return pr;
}

async function getIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueInfo | null> {
  const repoKey = `${owner}/${repo}`;
  const cached = getCachedIssue(repoKey, issueNumber);
  if (cached !== undefined) return cached;

  const issue = fetchIssue(owner, repo, issueNumber);
  setCachedIssue(repoKey, issueNumber, issue);
  return issue;
}
