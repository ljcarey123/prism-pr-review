# 🔮 prism

**AI-powered interactive PR review reports for Claude Code.**

Prism refracts your git diff into a structured HTML report — classifying changes by risk, mapping them to components, and assessing test coverage — then commits it alongside your branch and deploys it to GitHub Pages so reviewers get a link automatically.

---

## Installation

**Prerequisites:** [Node.js](https://nodejs.org) 18+, [Claude Code](https://claude.ai/code), [GitHub CLI](https://cli.github.com) (required for `/ship`)

```bash
npx prism-pr-review install
```

This copies slash commands to `~/.claude/commands/`, the pre-PR hook to `~/.claude/hooks/`, and registers the MCP server in `~/.claude.json`:

```json
{
  "mcpServers": {
    "prism": {
      "command": "npx",
      "args": ["-y", "prism-pr-review@0.1.6"]
    }
  }
}
```

**Restart Claude Code after installing.**

```bash
npx prism-pr-review uninstall   # to remove
```

> **Security note:** The install script pins the MCP entry to the installed version (e.g. `prism-pr-review@0.1.6`) rather than `latest`, so Claude Code won't silently pick up a future compromised release. To upgrade, re-run `npx prism-pr-review install` with the new version.

---

## Commands

### `/review-pr [target-branch]`

Analyses the current branch against `target-branch` (default: `main`), generates `.pr/index.html`, and opens it in your browser. Offers to commit the report at the end.

### `/ship [target-branch] [--draft]`

Full pipeline: generate report → commit → push → open GitHub PR with AI-generated title and body.

```
/ship master --draft
```

### `/setup-repo`

One-time setup for a repo. Copies `.github/workflows/pr-report.yml`, verifies Actions permissions, and guides you through enabling GitHub Pages.

---

## How it works

```
/ship
    │
    ├─ MCP: get_pr_data("master")        ← git diff, log, stat
    │
    ├─ Claude analyses the diff          ← risk, components, coverage
    │
    ├─ MCP: generate_report(analysis)    ← writes .pr/index.html
    │
    ├─ git commit + push + gh pr create  ← PR opened with AI summary
    │
    └─ GitHub Actions                    ← deploys report to Pages
           ├─ posts link as PR comment   ← reviewers get it automatically
           └─ or prompts to run /ship    ← if report is missing
```

The report includes an executive summary, expandable change cards with risk badges and diffs, impacted component mapping, test coverage assessment, and the full commit list.

**MCP server** (`src/`) exposes two tools over stdio: `get_pr_data` (git diff/log/stat) and `generate_report` (writes HTML, opens browser). Registered in `~/.claude.json`, it starts automatically with Claude Code.

**Slash commands + hook** (`plugin/`) are markdown files in `~/.claude/commands/` and `~/.claude/hooks/`. Claude is the AI brain; the MCP tools are the hands.

---

## GitHub Pages integration

After `/setup-repo`, every PR that ships a fresh `.pr/index.html` via `/ship` gets a report link posted as a PR comment.

The `gh-pages` branch is created on the first workflow run. After that:

1. Go to **Settings → Pages**
2. Set **Source** to `Deploy from branch → gh-pages → / (root)`
3. Save — all future PRs get report links automatically

> **Note:** GitHub Actions must be enabled. Check **Settings → Actions → General → Allow all actions** if the workflow doesn't run.

The workflow uses `git diff` between the base and head SHA to confirm `.pr/index.html` was actually modified in this PR, preventing stale reports from a previous branch deploying under the wrong PR number.

---

## Development

```bash
npm install
npm run build       # compile TypeScript → dist/
```

To test locally, add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "prism": {
      "command": "node",
      "args": ["/absolute/path/to/prism-pr-review/dist/index.js"]
    }
  }
}
```

After changing `src/`, run `npm run build` and restart Claude Code (or `/reload`). After changing `plugin/`, re-run `npx prism-pr-review install` to copy updated files to `~/.claude/`.

**Key files:**
- `src/index.ts` — CLI entry + MCP server registration
- `src/install.ts` — install/uninstall logic
- `src/template.ts` — self-contained HTML report template
- `plugin/commands/` — slash command prompts
- `plugin/hooks/` — pre-PR hook

---

## License

MIT
