# 🔮 prism

**AI-powered interactive PR review reports for Claude Code.**

Prism refracts your git diff into a clear, structured HTML report — classifying changes by risk, mapping them to components, and assessing test coverage — then commits it alongside your branch and deploys it to GitHub Pages so reviewers get a link automatically.

---

## Installation

### Prerequisites
- [Node.js](https://nodejs.org) 18+
- [Claude Code](https://claude.ai/code)
- [GitHub CLI](https://cli.github.com) (`gh`) — required for `/ship`

### Install

```bash
npx prism-pr-review install
```

Works on macOS, Linux, and Windows. This single command:
1. Copies slash commands to `~/.claude/commands/`
2. Copies the pre-PR hook to `~/.claude/hooks/`
3. Adds the prism MCP server entry to `~/.claude/settings.json`

**Restart Claude Code after installing.**

### Uninstall

```bash
npx prism-pr-review uninstall
```

---

## How it works

Prism has three parts that work together:

### 1. MCP server (`src/`)

A Node.js process that runs alongside Claude Code, exposing two tools:

- **`get_pr_data`** — shells out to git to collect the diff, commit log, and stat summary for the current branch vs a target branch
- **`generate_report`** — takes a structured JSON analysis, injects it into the self-contained HTML template, writes `.pr/index.html`, and opens it in the browser

Claude Code connects to the MCP server via stdio. The server is registered in `~/.claude/settings.json` and starts automatically when Claude Code launches.

### 2. Slash commands + hook (`plugin/`)

Markdown files copied to `~/.claude/commands/` and `~/.claude/hooks/`. Claude Code loads these as first-class commands:

- **`/review-pr`** — instructs Claude to call `get_pr_data`, analyse the diff, and call `generate_report`. Claude is the AI brain; the MCP tools are the hands.
- **`/ship`** — same as `/review-pr`, then commits `.pr/index.html`, pushes the branch, and opens a GitHub PR with the AI-generated summary as the PR body.
- **`/setup-repo`** — one-time setup for a repo: copies the GitHub Actions workflow, checks Actions permissions, and guides through enabling GitHub Pages.
- **Pre-PR hook** — fires whenever `gh pr create` runs and prompts Claude to generate the report first if one isn't already committed.

### 3. GitHub Actions workflow (`.github/workflows/pr-report.yml`)

After running `/setup-repo` in a repo, every PR that includes a freshly generated `.pr/index.html` triggers this workflow:

1. Checks whether `.pr/index.html` was actually committed in this PR (not stale from a previous one)
2. If fresh: deploys the report to GitHub Pages at `https://<owner>.github.io/<repo>/prs/<number>/` and posts a PR comment with the link
3. If missing/stale: posts a comment prompting the author to run `/ship`

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

The report itself includes:
- **Executive summary** — 2–3 sentence overview of what the PR does and its overall risk
- **Major changes** — expandable cards with risk badge, component tags, and diff viewer
- **Minor changes** — lower-signal changes still tracked, with diffs
- **Impacted components** — maps files to logical areas of the codebase
- **Test coverage assessment** — flags untested critical paths
- **Commit list** — full commit history for the branch

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

One-time setup for a repo. Copies `.github/workflows/pr-report.yml` into the current repo, verifies Actions permissions, and guides you through enabling GitHub Pages.

```
/setup-repo
```

---

## GitHub integration (Pages + PR comments)

After running `/setup-repo` in a repo, every PR that ships a fresh `.pr/index.html` via `/ship` will automatically get a report link posted as a PR comment.

### One-time Pages bootstrap

The `gh-pages` branch is created on the first workflow run. After that first run:

1. Go to **Settings → Pages**
2. Set **Source** to `Deploy from branch → gh-pages → / (root)`
3. Save — all future PRs will get report links automatically

> **Note:** GitHub Actions must be enabled. Check **Settings → Actions → General → Allow all actions** if the workflow doesn't run.

### How the freshness check works

The workflow runs `git diff` between the base branch SHA and the PR head SHA to check whether `.pr/index.html` was actually modified in this PR. This prevents stale reports from a previous branch being deployed under the wrong PR number.

---

## Project structure

```
prism-pr-review/
├── src/
│   ├── index.ts          # Entry point — CLI (install/uninstall) + MCP server
│   ├── install.ts        # install / uninstall logic (cross-platform)
│   ├── git.ts            # get_pr_data implementation (git shell calls)
│   ├── report.ts         # generate_report implementation (write HTML, open browser)
│   ├── template.ts       # Self-contained HTML report template (~600 lines)
│   └── types.ts          # Shared TypeScript interfaces
├── plugin/
│   ├── commands/
│   │   ├── review-pr.md  # /review-pr slash command prompt
│   │   ├── ship.md       # /ship slash command prompt
│   │   └── setup-repo.md # /setup-repo slash command prompt
│   └── hooks/
│       └── pre-pr-review.md  # Hook: prompt to generate report before gh pr create
├── .github/
│   └── workflows/
│       ├── pr-report.yml # Deploy report to Pages + post PR comment
│       └── publish.yml   # Auto-publish to npm on version tag push
├── package.json          # `npx prism-pr-review install` entry point
└── tsconfig.json
```

---

## Development

```bash
npm install
npm run build       # compile TypeScript → dist/
```

To test locally, point `~/.claude/settings.json` at the local build:

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
