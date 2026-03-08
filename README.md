# 🔮 prism

**AI-powered interactive PR review reports for Claude Code.**

Prism refracts your git diff into a clear, structured HTML report — classifying changes by risk, mapping them to components, assessing test coverage, and surfacing everything in a single self-contained page committed alongside your branch.

When you run `/ship`, the report is committed to `.pr/index.html`, pushed, and a GitHub PR is opened with an AI-generated summary. A GitHub Actions workflow then deploys it to GitHub Pages and posts the link as a PR comment so reviewers get it automatically.

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
    └─ GitHub Actions deploys to Pages   ← report link posted on PR
```

The report includes:
- **Executive summary** — 2–3 sentence overview of what the PR does and its overall risk
- **Major changes** — expandable cards with risk badge, component tags, and diff viewer
- **Minor changes** — lower-signal changes still tracked, with diffs
- **Impacted components** — maps files to logical areas of the codebase
- **Test coverage assessment** — flags untested critical paths
- **Commit list** — full commit history for the branch

---

## Installation

### Prerequisites
- [Node.js](https://nodejs.org) 18+
- [Claude Code](https://claude.ai/code)
- [GitHub CLI](https://cli.github.com) (`gh`) — required for `/ship`

### Install (macOS / Linux)

```bash
git clone https://github.com/ljcarey123/prism-pr-review
cd prism-pr-review
bash scripts/install.sh
```

### Install (Windows)

```powershell
git clone https://github.com/ljcarey123/prism-pr-review
cd prism-pr-review
.\scripts\install.ps1
```

This copies the slash commands to `~/.claude/commands/` and registers the prism MCP server in `~/.claude/settings.json`. **Restart Claude Code after installing.**

### Manual MCP setup

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "prism": {
      "command": "npx",
      "args": ["-y", "prism-pr-review"]
    }
  }
}
```

---

## Commands

### `/review-pr [target-branch]`

Analyses the current branch against `target-branch` (default: `main`), generates `.pr/index.html`, and opens it in your browser. Offers to commit the report at the end.

```
/review-pr
/review-pr develop
```

### `/ship [target-branch] [--draft]`

Full pipeline: generate report → commit → push → open GitHub PR with AI-generated title and body.

```
/ship
/ship master
/ship master --draft
```

### `/setup-repo`

One-time setup for a repo. Copies the GitHub Actions workflow into `.github/workflows/pr-report.yml`, verifies Actions permissions, and guides you through enabling GitHub Pages so PR report links are posted automatically on every PR.

```
/setup-repo
```

---

## GitHub integration

After running `/setup-repo` in a repo, every PR that includes a freshly generated `.pr/index.html` (from `/ship`) will automatically:

1. Deploy the report to GitHub Pages at `https://<owner>.github.io/<repo>/prs/<number>/`
2. Post a PR comment with a link to the report

PRs opened without running `/ship` first get a comment prompting the author to generate one.

### One-time Pages bootstrap

The `gh-pages` branch is created automatically on the first workflow run. After that first run:

1. Go to **Settings → Pages**
2. Set **Source** to `Deploy from branch → gh-pages → / (root)`
3. Save — all future PRs will get report links automatically

> **Note:** GitHub Actions must be enabled on the repo. Check **Settings → Actions → General → Allow all actions** if the workflow doesn't run.

---

## Project structure

```
prism-pr-review/
├── src/
│   ├── index.ts                    # MCP server (get_pr_data + generate_report tools)
│   └── template.ts                 # Self-contained HTML report template
├── plugin/
│   ├── commands/
│   │   ├── review-pr.md            # /review-pr slash command
│   │   ├── ship.md                 # /ship slash command
│   │   └── setup-repo.md          # /setup-repo slash command
│   └── hooks/
│       └── pre-pr-review.md        # Hook: prompts to generate report before gh pr create
├── .github/
│   └── workflows/
│       └── pr-report.yml           # Actions workflow: deploy report to Pages + post PR comment
├── scripts/
│   ├── install.sh                  # macOS/Linux installer
│   └── install.ps1                 # Windows installer
├── package.json
└── tsconfig.json
```

---

## Development

```bash
npm install
npm run build       # compile TypeScript → dist/
```

To test locally, point `~/.claude/settings.json` at the local build instead of npx:

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

After changing `src/`, run `npm run build` and restart Claude Code (or `/reload`) to pick up changes.

After changing `plugin/commands/` or `plugin/hooks/`, re-run the install script to copy the updated files to `~/.claude/`.

---

## License

MIT
