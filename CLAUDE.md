# prism — CLAUDE.md

## What this repo is

prism is a Claude Code plugin that generates interactive PR review reports. It has two parts:
- **MCP server** (`src/`) — Node.js process exposing `get_pr_data` and `generate_report` tools
- **Claude Code plugin** (`plugin/`) — slash commands and hooks that orchestrate the review workflow

## Development workflow

After changing `src/`:
```bash
npm run build     # recompile TypeScript → dist/
```

After changing `plugin/commands/` or `plugin/hooks/`:
```bash
# Re-copy to global Claude config to pick up changes
cp plugin/commands/review-pr.md ~/.claude/commands/review-pr.md
cp plugin/commands/ship.md ~/.claude/commands/ship.md
```

## Key files

- `src/index.ts` — MCP server entry; add new tools here
- `src/template.ts` — the full HTML report template (self-contained string)
- `plugin/commands/review-pr.md` — the `/review-pr` slash command prompt
- `plugin/commands/ship.md` — the `/ship` slash command prompt
- `plugin/hooks/pre-pr-review.md` — hook that fires before `gh pr create`

## Testing locally

The MCP server is registered in `~/.claude/mcp.json` pointing at `dist/index.js`.
After `npm run build`, restart Claude Code (or run `/reload`) to pick up changes.

To test `/review-pr`:
1. Switch to a feature branch with some commits
2. Run `/review-pr` — report opens in browser at `.pr/index.html`

## Coding conventions

- TypeScript strict mode — no `any`, no implicit returns
- MCP tools should be pure functions of their inputs
- The HTML template must remain self-contained (no CDN, no external requests)
- Keep the template under 600 lines; prefer CSS over JS where possible
