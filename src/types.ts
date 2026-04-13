// Core types for git-why

export interface BlameResult {
  sha: string;
  shortSha: string;
  author: string;
  email: string;
  date: string;
  message: string;
  lineNumber: number;
  lineContent: string;
}

export interface CommitInfo {
  sha: string;
  shortSha: string;
  author: string;
  email: string;
  date: string;
  message: string;
  body: string;
}

export interface PRInfo {
  number: number;
  title: string;
  body: string;
  author: string;
  state: string;
  url: string;
  mergedAt: string | null;
  linkedIssues: number[];
}

export interface IssueInfo {
  number: number;
  title: string;
  body: string;
  author: string;
  state: string;
  url: string;
}

export interface WhyResult {
  file: string;
  lineStart: number;
  lineEnd: number;
  lineContent?: string;
  commit: CommitInfo;
  pr?: PRInfo;
  issues: IssueInfo[];
  refs: ExtractedRefs;
}

export interface ExtractedRefs {
  prNumbers: number[];
  issueNumbers: number[];
  raw: string[];
}

export interface CacheEntry {
  pr?: PRInfo;
  issue?: IssueInfo;
  fetchedAt: string;
}

export interface Cache {
  repo: string;
  entries: Record<string, CacheEntry>;
}

export interface StatsResult {
  totalCommits: number;
  commitsWithPR: number;
  commitsWithIssue: number;
  prCoverage: number;
  issueCoverage: number;
  intentScore: number;
}
