import type { ExtractedRefs } from './types.js';

// Patterns for extracting PR and issue references from commit messages
const PATTERNS = {
  // GitHub #123 style
  hashRef: /#(\d+)/g,
  // GH-123 style
  ghRef: /GH-(\d+)/gi,
  // closes/fixes/resolves #123
  closingKeywords: /(?:closes?|fixes?|resolves?)\s+(?:#|GH-)(\d+)/gi,
  // JIRA-style: PROJECT-123
  jiraRef: /([A-Z]{2,}-\d+)/g,
  // Full GitHub PR URL
  prUrl: /github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/g,
  // Full GitHub issue URL
  issueUrl: /github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/g,
};

export function extractRefs(text: string): ExtractedRefs {
  const raw: string[] = [];
  const issueNumbers = new Set<number>();
  const prNumbers = new Set<number>();

  // Extract closing keyword refs (these are definitely issues)
  for (const match of text.matchAll(PATTERNS.closingKeywords)) {
    const num = parseInt(match[1]!);
    issueNumbers.add(num);
    raw.push(match[0]);
  }

  // Extract PR URLs
  for (const match of text.matchAll(PATTERNS.prUrl)) {
    prNumbers.add(parseInt(match[1]!));
    raw.push(match[0]);
  }

  // Extract issue URLs
  for (const match of text.matchAll(PATTERNS.issueUrl)) {
    issueNumbers.add(parseInt(match[1]!));
    raw.push(match[0]);
  }

  // Extract generic #refs (could be PR or issue — we'll try both)
  for (const match of text.matchAll(PATTERNS.hashRef)) {
    const num = parseInt(match[1]!);
    // Only add if not already classified
    if (!issueNumbers.has(num)) {
      prNumbers.add(num);
    }
    raw.push(match[0]);
  }

  // GH- refs
  for (const match of text.matchAll(PATTERNS.ghRef)) {
    const num = parseInt(match[1]!);
    if (!issueNumbers.has(num)) {
      prNumbers.add(num);
    }
    raw.push(`GH-${match[1]}`);
  }

  return {
    prNumbers: Array.from(prNumbers),
    issueNumbers: Array.from(issueNumbers),
    raw: [...new Set(raw)],
  };
}

export function hasAnyRefs(text: string): boolean {
  return (
    PATTERNS.hashRef.test(text) ||
    PATTERNS.ghRef.test(text) ||
    PATTERNS.closingKeywords.test(text) ||
    PATTERNS.prUrl.test(text) ||
    PATTERNS.issueUrl.test(text)
  );
}
