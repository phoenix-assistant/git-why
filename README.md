# git-why

> `git blame` tells you **WHO**. `git-why` tells you **WHY**.

Traces any line of code back through commits → PRs → issues to explain the *intent* behind a change. No LLM required — pure extraction + template summarization. Fast, free, deterministic.

[![CI](https://github.com/phoenix-assistant/git-why/actions/workflows/ci.yml/badge.svg)](https://github.com/phoenix-assistant/git-why/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@phoenixaihub/git-why)](https://www.npmjs.com/package/@phoenixaihub/git-why)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Install

```bash
npm install -g @phoenixaihub/git-why
```

**Prerequisites:**
- Node.js ≥ 18
- `git` CLI
- [`gh` CLI](https://cli.github.com/) (for GitHub PR/issue lookups — `gh auth login` required)

---

## Usage

### Explain a line

```bash
git-why src/auth/token.ts:42
```

```
📌 Line 42: src/auth/token.ts
   const TOKEN_EXPIRY = 3600 * 24;

🔗 Commit: a1b2c3d (2024-03-15) by Jane Smith
   Fix auth token expiry

📋 PR #42: "Fix auth token expiry"
   Extended token lifetime from 1h to 24h after user complaints
   about frequent logouts during long sessions.
   https://github.com/owner/repo/pull/42

🎯 Issue #38: "Users logged out after 1 hour"
   Reported by 12 users. Root cause: default token expiry too aggressive.
   https://github.com/owner/repo/issues/38

✅ Intent: Added in PR #42 ("Fix auth token expiry") to resolve issue #38 ("Users logged out after 1 hour"). Author: Jane Smith. Date: 2024-03-15.
```

### Explain a range of lines

```bash
git-why src/auth/token.ts:40-50
```

### Explain why a function exists

```bash
git-why src/auth/token.ts --function validateToken
```

### File evolution timeline

```bash
git-why src/auth/token.ts --history
```

### Repository intent coverage stats

```bash
git-why --stats
```

```
📊 Repository Intent Coverage

  Total commits analyzed:   142
  Commits linked to PRs:    78.2% (111)
  Commits linked to issues: 52.1% (74)

  Intent Coverage Score: 67.9% [█████████████░░░░░░░]

  💡 Tip: Good coverage — consider adding issue descriptions.
```

---

## How it works

1. **`git blame`** — finds the commit SHA for the target line(s)
2. **Ref extraction** — scans commit message for `#123`, `closes #N`, `GH-123`, PR URLs
3. **GitHub API** (via `gh` CLI) — fetches PR description + linked issues
4. **Graceful degradation** — if no PR found, tries GitHub's commit→PR lookup; if no issue, shows PR only; always useful
5. **Cache** — stores results in `.git-why/cache.json` (TTL: 24h) to avoid re-fetching

---

## Supported ref patterns

| Pattern | Example | Type |
|---------|---------|------|
| `#N` | `#42` | PR candidate |
| `closes/fixes/resolves #N` | `closes #38` | Issue (definitive) |
| `GH-N` | `GH-123` | PR candidate |
| PR URL | `github.com/owner/repo/pull/42` | PR |
| Issue URL | `github.com/owner/repo/issues/38` | Issue |

---

## VS Code Integration (coming soon)

A VS Code extension will show inline "why" tooltips on hover — powered by `git-why` under the hood.

---

## License

MIT © Phoenix AI Hub
