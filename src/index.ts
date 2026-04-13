// Public API
export { explainLines, explainFunction, fileHistory, repoStats } from './why.js';
export { extractRefs } from './refs.js';
export { parseBlameOutput, parseBlameRangeOutput } from './git.js';
export type {
  BlameResult,
  CommitInfo,
  PRInfo,
  IssueInfo,
  WhyResult,
  ExtractedRefs,
  StatsResult,
} from './types.js';
