#!/usr/bin/env node
import { Command } from 'commander';
import { explainLines, explainFunction, fileHistory, repoStats, checkPrerequisites } from './why.js';
import {
  printWhyResult,
  printHistoryResult,
  printStats,
  printError,
  printWarning,
} from './output.js';
import { isGitRepo } from './git.js';

const program = new Command();

program
  .name('git-why')
  .description('git blame tells you WHO. git-why tells you WHY.')
  .version('0.1.0');

// Main command: git-why <file>:<line> or <file>:<start>-<end>
program
  .argument('[target]', 'file:line or file:start-end (e.g. src/auth.ts:42 or src/auth.ts:40-50)')
  .option('-f, --function <name>', 'Explain why a function exists')
  .option('--history', 'Show evolution timeline for a file')
  .option('--stats', 'Show repository intent coverage stats')
  .option('--no-gh', 'Skip GitHub API lookups (offline mode)')
  .action(async (target: string | undefined, options: { function?: string; history?: boolean; stats?: boolean; noGh?: boolean }) => {
    // Stats mode
    if (options.stats) {
      if (!isGitRepo()) {
        printError('Not inside a git repository.');
        process.exit(1);
      }
      const stats = await repoStats();
      printStats(stats);
      return;
    }

    if (!target) {
      program.help();
      return;
    }

    // Check prerequisites
    const { ok, errors } = checkPrerequisites();
    if (!isGitRepo()) {
      printError('Not inside a git repository.');
      process.exit(1);
    }
    if (!ok) {
      for (const err of errors) printWarning(err);
    }

    // History mode
    if (options.history) {
      const { commits, prMap } = await fileHistory(target);
      if (commits.length === 0) {
        printError(`No git history found for: ${target}`);
        process.exit(1);
      }
      printHistoryResult(target, commits, prMap);
      return;
    }

    // Function mode
    if (options.function) {
      const result = await explainFunction({ file: target, functionName: options.function });
      if (!result) {
        printError(`Function "${options.function}" not found in ${target}`);
        process.exit(1);
      }
      printWhyResult(result);
      return;
    }

    // Line(s) mode: parse file:line or file:start-end
    const colonIdx = target.lastIndexOf(':');
    if (colonIdx === -1) {
      printError('Invalid format. Use: git-why <file>:<line> or <file>:<start>-<end>');
      process.exit(1);
    }

    const file = target.substring(0, colonIdx);
    const lineSpec = target.substring(colonIdx + 1);

    let lineStart: number;
    let lineEnd: number;

    if (lineSpec.includes('-')) {
      const [s, e] = lineSpec.split('-');
      lineStart = parseInt(s!);
      lineEnd = parseInt(e!);
    } else {
      lineStart = lineEnd = parseInt(lineSpec);
    }

    if (isNaN(lineStart) || isNaN(lineEnd)) {
      printError('Invalid line number. Use: git-why src/file.ts:42 or src/file.ts:40-50');
      process.exit(1);
    }

    const result = await explainLines({ file, lineStart, lineEnd });
    if (!result) {
      printError(`Could not get blame info for ${file}:${lineSpec}`);
      console.error('  • Is the file tracked by git?');
      console.error('  • Does the line number exist?');
      console.error('  • Is it a binary file?');
      process.exit(1);
    }

    printWhyResult(result);
  });

program.parseAsync(process.argv).catch(err => {
  printError(String(err));
  process.exit(1);
});
