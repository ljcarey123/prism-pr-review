# prism — TODO

## High priority

### Publish to npm
The install scripts and `.mcp.json` both reference `npx prism-pr-review`, which fails until the package is on npm. This blocks anyone other than the original developer from using prism.
- [ ] `npm login` and `npm publish`
- [ ] Add a GitHub Actions workflow that auto-publishes on version tags (`v*` push → `npm publish`)
- [ ] Bump `package.json` version to `0.1.0` on first publish

### Write a public README
No user-facing documentation exists. Anyone finding the repo has no idea what it does.
- [ ] One-paragraph pitch + screenshot or GIF of the report UI
- [ ] Install instructions (run the script → reload Claude Code)
- [ ] Command reference: `/review-pr`, `/ship`, `/setup-repo`
- [ ] GitHub Actions setup note (Pages, Actions permissions, Pages bootstrap sequence)

---

## Medium priority

### Handle large PRs gracefully
For PRs with 30+ changed files the AI hits context limits and analysis gets shallow.
- [ ] Option A: add a `files` filter param to `get_pr_data` so the AI can call it per-file
- [ ] Option B: cap at N files in the MCP tool and auto-bucket the tail into a "N more files (not shown)" entry in `minor_changes`
- [ ] Note in `summary` when files were omitted

### Report versioning
When `/ship` is re-run on the same branch after review feedback, show what changed since the last report.
- [ ] Save previous report data as `.pr/index.prev.html` before overwriting
- [ ] Add a "Changes since last report" section by diffing old vs new `major_changes` arrays
- [ ] Only show the delta section if a previous report exists

---

## Low priority

### `/babysit-prs` loop command
For team leads who want reports generated automatically without each author needing Claude Code.
- [ ] Slash command that polls `gh pr list --json` on a schedule (using the `loop` skill)
- [ ] Auto-runs `/review-pr` when a new PR is opened or updated
- [ ] Configurable interval and repo target
