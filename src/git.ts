import { execSync, spawnSync } from 'child_process';
import type { BlameResult, CommitInfo } from './types.js';

export function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function isGhCliAvailable(): boolean {
  const result = spawnSync('gh', ['--version'], { stdio: 'ignore' });
  return result.status === 0;
}

export function getRepoRemote(): string | null {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    return remote;
  } catch {
    return null;
  }
}

export function parseGitHubRepo(remote: string): { owner: string; repo: string } | null {
  // Handle HTTPS: https://github.com/owner/repo.git
  // Handle SSH: git@github.com:owner/repo.git
  const httpsMatch = remote.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2].replace(/\.git$/, '') };
  }
  return null;
}

export function gitBlame(file: string, lineNum: number): BlameResult | null {
  try {
    const output = execSync(
      `git blame -L ${lineNum},${lineNum} --porcelain "${file}"`,
      { encoding: 'utf8' }
    );
    return parseBlameOutput(output, lineNum);
  } catch {
    return null;
  }
}

export function gitBlameRange(file: string, start: number, end: number): BlameResult[] {
  try {
    const output = execSync(
      `git blame -L ${start},${end} --porcelain "${file}"`,
      { encoding: 'utf8' }
    );
    return parseBlameRangeOutput(output, start);
  } catch {
    return [];
  }
}

export function parseBlameOutput(output: string, lineNum: number): BlameResult | null {
  const lines = output.split('\n');
  if (lines.length < 2) return null;

  const shaLine = lines[0];
  const sha = shaLine.substring(0, 40);
  if (!sha || sha.length < 40) return null;

  const meta: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    if (line.startsWith('\t')) continue;
    const spaceIdx = line.indexOf(' ');
    if (spaceIdx > 0) {
      meta[line.substring(0, spaceIdx)] = line.substring(spaceIdx + 1);
    }
  }

  // Find the actual line content (starts with tab)
  const contentLine = lines.find(l => l.startsWith('\t')) ?? '';
  const lineContent = contentLine.substring(1);

  return {
    sha,
    shortSha: sha.substring(0, 7),
    author: meta['author'] ?? 'Unknown',
    email: meta['author-mail']?.replace(/[<>]/g, '') ?? '',
    date: meta['author-time']
      ? new Date(parseInt(meta['author-time']) * 1000).toISOString().split('T')[0]
      : '',
    message: meta['summary'] ?? '',
    lineNumber: lineNum,
    lineContent,
  };
}

export function parseBlameRangeOutput(output: string, startLine: number): BlameResult[] {
  const results: BlameResult[] = [];
  const blocks = output.split(/(?=^[0-9a-f]{40} )/m);

  let currentLineNum = startLine;
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    const shaLine = lines[0];
    const sha = shaLine.substring(0, 40);
    if (!sha || sha.length < 40) continue;

    const meta: Record<string, string> = {};
    for (const line of lines.slice(1)) {
      if (line.startsWith('\t')) continue;
      const spaceIdx = line.indexOf(' ');
      if (spaceIdx > 0) {
        meta[line.substring(0, spaceIdx)] = line.substring(spaceIdx + 1);
      }
    }

    const contentLine = lines.find(l => l.startsWith('\t')) ?? '';
    const lineContent = contentLine.substring(1);

    results.push({
      sha,
      shortSha: sha.substring(0, 7),
      author: meta['author'] ?? 'Unknown',
      email: meta['author-mail']?.replace(/[<>]/g, '') ?? '',
      date: meta['author-time']
        ? new Date(parseInt(meta['author-time']) * 1000).toISOString().split('T')[0]
        : '',
      message: meta['summary'] ?? '',
      lineNumber: currentLineNum++,
      lineContent,
    });
  }

  return results;
}

export function getCommitInfo(sha: string): CommitInfo | null {
  try {
    const output = execSync(
      `git log -1 --format="%H%n%an%n%ae%n%ad%n%s%n%b" --date=short "${sha}"`,
      { encoding: 'utf8' }
    );
    const lines = output.split('\n');
    return {
      sha: lines[0] ?? sha,
      shortSha: (lines[0] ?? sha).substring(0, 7),
      author: lines[1] ?? 'Unknown',
      email: lines[2] ?? '',
      date: lines[3] ?? '',
      message: lines[4] ?? '',
      body: lines.slice(5).join('\n').trim(),
    };
  } catch {
    return null;
  }
}

export function getFileHistory(file: string): CommitInfo[] {
  try {
    const output = execSync(
      `git log --format="%H%n%an%n%ae%n%ad%n%s%n%b%n---END---" --date=short -- "${file}"`,
      { encoding: 'utf8' }
    );
    const commits: CommitInfo[] = [];
    const blocks = output.split('---END---\n').filter(b => b.trim());
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines[0]?.length !== 40) continue;
      commits.push({
        sha: lines[0],
        shortSha: lines[0].substring(0, 7),
        author: lines[1] ?? 'Unknown',
        email: lines[2] ?? '',
        date: lines[3] ?? '',
        message: lines[4] ?? '',
        body: lines.slice(5).join('\n').trim(),
      });
    }
    return commits;
  } catch {
    return [];
  }
}

export function getAllCommits(limit = 500): CommitInfo[] {
  try {
    const output = execSync(
      `git log --format="%H%n%an%n%ae%n%ad%n%s%n%b%n---END---" --date=short -${limit}`,
      { encoding: 'utf8' }
    );
    const commits: CommitInfo[] = [];
    const blocks = output.split('---END---\n').filter(b => b.trim());
    for (const block of blocks) {
      const lines = block.split('\n');
      if (!lines[0] || lines[0].length < 40) continue;
      commits.push({
        sha: lines[0],
        shortSha: lines[0].substring(0, 7),
        author: lines[1] ?? 'Unknown',
        email: lines[2] ?? '',
        date: lines[3] ?? '',
        message: lines[4] ?? '',
        body: lines.slice(5).join('\n').trim(),
      });
    }
    return commits;
  } catch {
    return [];
  }
}

export function findFunctionBoundaries(
  file: string,
  funcName: string
): { start: number; end: number } | null {
  const { readFileSync } = require('fs');
  try {
    const content = readFileSync(file, 'utf8') as string;
    const lines = content.split('\n');

    // Simple regex-based function detection for common patterns
    const patterns = [
      // JS/TS: function name(...) {
      new RegExp(`^\\s*(export\\s+)?(async\\s+)?function\\s+${funcName}\\s*\\(`),
      // JS/TS: const/let name = (...) => {
      new RegExp(`^\\s*(export\\s+)?(const|let)\\s+${funcName}\\s*=\\s*(async\\s+)?`),
      // JS/TS: name(...) { (class methods)
      new RegExp(`^\\s*(async\\s+)?${funcName}\\s*\\(`),
      // Python: def name(
      new RegExp(`^\\s*def\\s+${funcName}\\s*\\(`),
      // Ruby: def name
      new RegExp(`^\\s*def\\s+${funcName}\\b`),
    ];

    let startLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (patterns.some(p => p.test(lines[i]!))) {
        startLine = i + 1; // 1-indexed
        break;
      }
    }

    if (startLine === -1) return null;

    // Find end by tracking braces or indentation
    let braceDepth = 0;
    let endLine = startLine;
    let foundOpen = false;

    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i]!;
      for (const ch of line) {
        if (ch === '{') { braceDepth++; foundOpen = true; }
        if (ch === '}') { braceDepth--; }
      }
      if (foundOpen && braceDepth === 0) {
        endLine = i + 1;
        break;
      }
      endLine = i + 1;
    }

    return { start: startLine, end: endLine };
  } catch {
    return null;
  }
}
