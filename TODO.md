# prism — TODO

## High priority

### Publish to npm
The install scripts and `.mcp.json` both reference `npx prism-pr-review`, which fails until the package is on npm. This blocks anyone other than the original developer from using prism.
- [ ] `npm login` and `npm publish`
- [ ] Add a GitHub Actions workflow that auto-publishes on version tags (`v*` push → `npm publish`)
- [ ] Bump `package.json` version to `0.1.0` on first publish

### Write a public README ✓
- [x] One-paragraph pitch and how-it-works diagram
- [x] Install instructions for macOS/Linux and Windows
- [x] Command reference: `/review-pr`, `/ship`, `/setup-repo`
- [x] GitHub Actions setup + Pages bootstrap sequence
- [ ] Add a screenshot or GIF of the report UI

---

## Medium priority

### Handle large PRs gracefully ✓
- [x] Added `files` filter param to `get_pr_data` — AI can call per-file or per-batch
- [x] Updated `/review-pr` prompt with large-PR workflow (initial call → batch calls)
- [ ] Note in `summary` when the PR was too large to fully analyse

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
