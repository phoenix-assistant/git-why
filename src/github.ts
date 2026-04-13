import { execSync } from 'child_process';
import type { PRInfo, IssueInfo } from './types.js';

function ghApi(path: string): unknown {
  try {
    const out = execSync(`gh api "${path}" 2>/dev/null`, { encoding: 'utf8' });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

export function fetchPR(owner: string, repo: string, prNumber: number): PRInfo | null {
  const data = ghApi(`/repos/${owner}/${repo}/pulls/${prNumber}`) as Record<string, unknown> | null;
  if (!data) return null;

  // Extract linked issues from body
  const body = (data['body'] as string) ?? '';
  const linkedIssues: number[] = [];
  for (const match of body.matchAll(/(?:closes?|fixes?|resolves?)\s+#(\d+)/gi)) {
    linkedIssues.push(parseInt(match[1]!));
  }
  for (const match of body.matchAll(/#(\d+)/g)) {
    const num = parseInt(match[1]!);
    if (!linkedIssues.includes(num)) {
      linkedIssues.push(num);
    }
  }

  return {
    number: data['number'] as number,
    title: (data['title'] as string) ?? '',
    body: truncate(body, 500),
    author: (data['user'] as Record<string, string>)?.['login'] ?? 'unknown',
    state: (data['state'] as string) ?? '',
    url: (data['html_url'] as string) ?? '',
    mergedAt: (data['merged_at'] as string | null) ?? null,
    linkedIssues,
  };
}

export function fetchIssue(owner: string, repo: string, issueNumber: number): IssueInfo | null {
  const data = ghApi(`/repos/${owner}/${repo}/issues/${issueNumber}`) as Record<string, unknown> | null;
  if (!data) return null;

  // If it's actually a PR, return null
  if (data['pull_request']) return null;

  return {
    number: data['number'] as number,
    title: (data['title'] as string) ?? '',
    body: truncate((data['body'] as string) ?? '', 500),
    author: (data['user'] as Record<string, string>)?.['login'] ?? 'unknown',
    state: (data['state'] as string) ?? '',
    url: (data['html_url'] as string) ?? '',
  };
}

export function fetchPRForCommit(
  owner: string,
  repo: string,
  sha: string
): PRInfo | null {
  try {
    const out = execSync(
      `gh api "/repos/${owner}/${repo}/commits/${sha}/pulls" 2>/dev/null`,
      { encoding: 'utf8' }
    );
    const prs = JSON.parse(out) as Record<string, unknown>[];
    if (!prs || prs.length === 0) return null;

    const pr = prs[0]!;
    const body = (pr['body'] as string) ?? '';
    const linkedIssues: number[] = [];
    for (const match of body.matchAll(/(?:closes?|fixes?|resolves?)\s+#(\d+)/gi)) {
      linkedIssues.push(parseInt(match[1]!));
    }

    return {
      number: pr['number'] as number,
      title: (pr['title'] as string) ?? '',
      body: truncate(body, 500),
      author: (pr['user'] as Record<string, string>)?.['login'] ?? 'unknown',
      state: (pr['state'] as string) ?? '',
      url: (pr['html_url'] as string) ?? '',
      mergedAt: (pr['merged_at'] as string | null) ?? null,
      linkedIssues,
    };
  } catch {
    return null;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.substring(0, max) + '…';
}
