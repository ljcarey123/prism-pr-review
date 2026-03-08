# 🔮 prism

**AI-powered interactive PR review reports for Claude Code.**

Prism refracts your git diff into a clear, structured HTML report — classifying changes by risk, mapping them to components, assessing test coverage, and surfacing everything in a single self-contained page committed alongside your branch.

---

## How it works

```
/review-pr
    │
    ├─ MCP: get_pr_data("main")          ← git diff, log, stat
    │
    ├─ Claude analyses the diff          ← AI: risk, components, coverage
    │
    ├─ MCP: generate_report(analysis)    ← writes .pr/index.html
    │
    └─ Opens in browser + optionally commits
```

The report includes:
- **Executive summary** — 2–3 sentence overview of what the PR does
- **Major changes** — expandable cards with risk badge, component tags, and diff viewer
- **Minor changes** — lower-signal changes still tracked
- **Impacted components** — maps files to logical areas of the codebase
- **Test coverage assessment** — flags untested critical paths
- **Commit list** — full commit history for the branch

---

## Installation

### Prerequisites
- Node.js 18+
- Claude Code

### Quick install (Unix / macOS)

```bash
git clone https://github.com/your-org/prism
cd prism
bash scripts/install.sh
```

### Quick install (Windows)

```powershell
git clone https://github.com/your-org/prism
cd prism
.\scripts\install.ps1
```

This installs:
1. /review-pr slash command → ~/.claude/commands/review-pr.md
2. prism MCP server → ~/.claude/mcp.json (runs via npx prism-pr-review)

Restart Claude Code after installing.

### Manual MCP setup

Add to ~/.claude/mcp.json:

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

## Usage

```
# 1. Work on your feature branch as normal
git checkout -b feature/my-thing
# ... make commits ...

# 2. When ready to review
/review-pr

# 3. Optionally specify a different target branch
/review-pr develop
```

The report is written to .pr/index.html on your current branch and opened in your browser automatically.

---

## Project structure

```
prism/
├── src/
│   ├── index.ts          # MCP server (get_pr_data + generate_report tools)
│   └── template.ts       # Self-contained HTML report template
├── plugin/
│   └── commands/
│       └── review-pr.md  # The /review-pr Claude Code slash command
├── scripts/
│   ├── install.sh        # Unix/macOS installer
│   └── install.ps1       # Windows installer
├── package.json
└── tsconfig.json
```

---

## Development

```bash
npm install
npm run build       # compile TypeScript → dist/
npm start           # run MCP server (for testing)
```

To test locally before publishing, point ~/.claude/mcp.json at the local build:

```json
{
  "mcpServers": {
    "prism": {
      "command": "node",
      "args": ["/absolute/path/to/prism/dist/index.js"]
    }
  }
}
```

---

## Publishing to npm

```bash
npm run build
npm publish
```

---

## License

MIT
