import pc from 'picocolors';
import type { WhyResult, CommitInfo, StatsResult } from './types.js';

export function printWhyResult(result: WhyResult): void {
  const lineRange =
    result.lineStart === result.lineEnd
      ? `Line ${result.lineStart}`
      : `Lines ${result.lineStart}–${result.lineEnd}`;

  console.log();
  console.log(pc.bold(pc.cyan(`📌 ${lineRange}: ${result.file}`)));

  if (result.lineContent) {
    console.log(pc.dim(`   ${result.lineContent.trim()}`));
  }

  console.log();
  console.log(
    pc.yellow(`🔗 Commit: ${result.commit.shortSha}`) +
    pc.dim(` (${result.commit.date})`) +
    ` by ${pc.bold(result.commit.author)}`
  );

  if (result.commit.message) {
    console.log(pc.dim(`   ${result.commit.message}`));
  }

  if (result.pr) {
    console.log();
    console.log(pc.green(`📋 PR #${result.pr.number}: "${result.pr.title}"`));
    if (result.pr.body) {
      printWrapped(result.pr.body, '   ', 80);
    }
    console.log(pc.dim(`   ${result.pr.url}`));
  }

  if (result.issues.length > 0) {
    for (const issue of result.issues) {
      console.log();
      console.log(pc.magenta(`🎯 Issue #${issue.number}: "${issue.title}"`));
      if (issue.body) {
        printWrapped(issue.body, '   ', 80);
      }
      console.log(pc.dim(`   ${issue.url}`));
    }
  }

  console.log();
  // Summary line
  const summary = buildSummary(result);
  console.log(pc.bold(`✅ Intent: ${summary}`));
  console.log();
}

export function printHistoryResult(
  file: string,
  commits: CommitInfo[],
  prMap: Map<string, { pr?: { number: number; title: string }; issues: { number: number; title: string }[] }>
): void {
  console.log();
  console.log(pc.bold(pc.cyan(`📜 History: ${file}`)));
  console.log(pc.dim(`   ${commits.length} commit(s) found`));
  console.log();

  for (const commit of commits) {
    const meta = prMap.get(commit.sha);
    console.log(
      pc.yellow(`  ${commit.shortSha}`) +
      pc.dim(` ${commit.date}`) +
      ` ${pc.bold(commit.author)}`
    );
    console.log(`    ${commit.message}`);

    if (meta?.pr) {
      console.log(pc.green(`    📋 PR #${meta.pr.number}: ${meta.pr.title}`));
    }
    for (const issue of meta?.issues ?? []) {
      console.log(pc.magenta(`    🎯 Issue #${issue.number}: ${issue.title}`));
    }
    console.log();
  }
}

export function printStats(stats: StatsResult): void {
  console.log();
  console.log(pc.bold(pc.cyan('📊 Repository Intent Coverage')));
  console.log();
  console.log(`  Total commits analyzed:  ${pc.bold(String(stats.totalCommits))}`);
  console.log(`  Commits linked to PRs:   ${pc.bold(pct(stats.prCoverage))} (${stats.commitsWithPR})`);
  console.log(`  Commits linked to issues: ${pc.bold(pct(stats.issueCoverage))} (${stats.commitsWithIssue})`);
  console.log();

  const score = stats.intentScore;
  const bar = progressBar(score);
  const color = score >= 70 ? pc.green : score >= 40 ? pc.yellow : pc.red;
  console.log(`  Intent Coverage Score: ${color(pc.bold(`${score.toFixed(0)}%`))} ${bar}`);
  console.log();

  if (score < 40) {
    console.log(pc.dim('  💡 Tip: Link more commits to PRs and issues for better traceability.'));
  } else if (score < 70) {
    console.log(pc.dim('  💡 Tip: Good coverage — consider adding issue descriptions.'));
  } else {
    console.log(pc.dim('  ✅ Excellent intent coverage!'));
  }
  console.log();
}

export function printError(msg: string): void {
  console.error(pc.red(`\n❌ ${msg}\n`));
}

export function printWarning(msg: string): void {
  console.warn(pc.yellow(`\n⚠️  ${msg}\n`));
}

function buildSummary(result: WhyResult): string {
  if (result.pr && result.issues.length > 0) {
    return (
      `Added in PR #${result.pr.number} ("${result.pr.title}") ` +
      `to resolve issue #${result.issues[0]!.number} ("${result.issues[0]!.title}"). ` +
      `Author: ${result.commit.author}. Date: ${result.commit.date}.`
    );
  }
  if (result.pr) {
    return (
      `Added in PR #${result.pr.number} ("${result.pr.title}"). ` +
      `Author: ${result.commit.author}. Date: ${result.commit.date}.`
    );
  }
  if (result.issues.length > 0) {
    return (
      `Related to issue #${result.issues[0]!.number} ("${result.issues[0]!.title}"). ` +
      `Author: ${result.commit.author}. Date: ${result.commit.date}.`
    );
  }
  return `Committed by ${result.commit.author} on ${result.commit.date}. ${result.commit.message}`;
}

function printWrapped(text: string, indent: string, maxWidth: number): void {
  const words = text.replace(/\n+/g, ' ').split(' ');
  let line = indent;
  for (const word of words) {
    if (line.length + word.length + 1 > maxWidth) {
      console.log(pc.dim(line));
      line = indent + word;
    } else {
      line += (line === indent ? '' : ' ') + word;
    }
  }
  if (line.trim()) console.log(pc.dim(line));
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function progressBar(value: number): string {
  const filled = Math.round(value / 5);
  const empty = 20 - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}
