---
description: "Generate an interactive PR review report for the current branch"
argument-hint: "[target-branch]"
allowed-tools: ["Bash", "Glob", "Grep", "Read", "mcp__prism__get_pr_data", "mcp__prism__generate_report"]
---

# PR Review Report

Generate a comprehensive interactive HTML review report for the current branch.

**Target branch:** "$ARGUMENTS" (default: main)

---

## Step 1 — Validate we're on a feature branch

Run `git branch --show-current` and confirm we are NOT on `main`, `master`, `trunk`, or `develop`.
If we are, stop and tell the user to switch to a feature branch first.

Determine the target branch:
- If `$ARGUMENTS` was provided, use that
- Otherwise default to `main` (or `master` if `main` doesn't exist)

---

## Step 2 — Collect raw git data

Call the MCP tool `get_pr_data` with the target branch:

```
get_pr_data({ target_branch: "<target>" })
```

This returns a JSON object with:
- `branch`, `target`
- `commits[]` — each commit's hash, message, author, date
- `files[]` — each changed file with status (A/M/D/R)
- `insertions`, `deletions`, `files_changed`
- `diff` — full unified diff
- `stat` — human-readable stat summary

**Large PRs (30+ files):** The initial call returns the full file list but the diff may be very large. For large PRs, make a second targeted call per file (or per batch of related files) using the `files` parameter to get a focused diff:

```
get_pr_data({ target_branch: "<target>", files: ["src/auth.ts", "src/auth.test.ts"] })
```

Use the initial `files[]` list to identify the most significant files, then fetch their diffs in batches of 5–10 for deep analysis. This keeps each call manageable and ensures accurate `diff_snippet` values in the PRAnalysis JSON.

---

## Step 3 — Explore the codebase structure

To understand component boundaries and ownership, do a quick exploration:
- Read any `CLAUDE.md`, `README.md`, or `package.json` / `pyproject.toml` / `Cargo.toml` in the repo root
- List top-level directories: `ls -la` or use Glob `**` to understand major areas
- Identify what each major area/package/module does

This context is used to accurately map changed files → logical components.

---

## Step 4 — Analyse the changes

Working through the git data, produce a structured analysis.

**Classify each changed file as either major or minor:**

- **Major** → significant logic change, public API change, security-sensitive code, data model change, core business logic, or > ~30 lines changed
- **Minor** → documentation only, formatting, small config tweak, version bump, < ~10 lines changed

**For each change, identify:**
- `description`: one-line plain English explanation of what changed and why
- `risk`: `high` | `medium` | `low`
  - High: security code, auth, payment, data migrations, no test coverage for critical paths
  - Medium: business logic with some coverage, API surface changes with backward compat
  - Low: well-tested utility changes, docs, formatting
- `risk_reason`: one sentence explaining the risk rating
- `components[]`: which logical areas of the codebase are affected (e.g. "Authentication", "Database Layer", "API Gateway", "Frontend — Dashboard")
- `diff_snippet`: the full unified diff for this file (all hunks) — the report UI will fold long diffs behind a "show more" toggle, so include everything

**Test coverage assessment:**
- Look at which test files changed (`test_files_changed`)
- Identify major-change files that have NO corresponding test changes or existing test files (`untested_files`)
- Assign overall `assessment`: `high` | `medium` | `low` | `none`

**Build the PRAnalysis JSON** matching this exact schema:

```json
{
  "meta": {
    "branch": "string",
    "target": "string",
    "generated_at": "ISO-8601 timestamp",
    "commit_count": 0,
    "files_changed": 0,
    "insertions": 0,
    "deletions": 0
  },
  "summary": "2-3 sentence executive summary of what this PR does and its overall risk",
  "overall_risk": "high | medium | low",
  "major_changes": [
    {
      "file": "relative/path/to/file.ts",
      "description": "Plain English description of the change",
      "type": "added | modified | deleted | renamed",
      "risk": "high | medium | low",
      "risk_reason": "One sentence explaining the risk",
      "components": ["Component A", "Component B"],
      "lines_added": 0,
      "lines_removed": 0,
      "diff_snippet": "first ~30 lines of unified diff for this file"
    }
  ],
  "minor_changes": [ /* same shape as major_changes — include diff_snippet where the diff is available */ ],
  "impacted_components": [
    {
      "name": "Component name",
      "files": ["file1.ts", "file2.ts"],
      "risk": "high | medium | low",
      "description": "What this component does and why these changes matter"
    }
  ],
  "test_coverage": {
    "assessment": "high | medium | low | none",
    "test_files_changed": ["tests/foo.test.ts"],
    "untested_files": ["src/foo.ts"],
    "notes": "Plain English assessment of test coverage quality"
  },
  "commits": [
    { "hash": "abc1234", "message": "feat: ...", "author": "Name", "date": "YYYY-MM-DD" }
  ]
}
```

---

## Step 5 — Generate the report

Call the MCP tool `generate_report` with the analysis JSON:

```
generate_report({
  analysis: "<JSON string of PRAnalysis>",
  output_path: ".pr/index.html",
  open_browser: true
})
```

This writes `.pr/index.html` (a self-contained interactive HTML report) and opens it in the browser.

---

## Step 6 — Offer to commit

Ask the user: "Report written to `.pr/index.html` — commit it to this branch? (y/n)"

If yes:
```bash
git add .pr/index.html
git commit -m "chore: add PR review report"
```

---

## Tips for good analysis

- Be honest about risk — it's better to flag something as high risk that turns out to be fine than to miss a real issue
- When in doubt about what a component does, read 1-2 key files to understand context before classifying
- `diff_snippet` should include the full per-file diff (all `@@` hunks) — the UI folds anything beyond 40 lines behind a "show more" button
- If the diff is huge (>500 files), focus the major/minor classification on the top 20 most significant files and note in the summary that there are more
