---
hooks:
  - event: PreToolUse
    tool: Bash
    match: "gh pr create"
---

Before running `gh pr create`, remind Claude to generate the PR review report first if it hasn't already been done in this session.

Check: has `.pr/index.html` been written or committed in the current branch?

```bash
git show HEAD:.pr/index.html 2>/dev/null | head -1
```

- If the file exists and is recent (committed in the last commit on this branch), the report is already done — proceed with the PR creation.
- If the file does NOT exist, stop and tell the user:

  > "⚠ No PR review report found for this branch. Run `/review-pr` first to generate one, or use `/ship` to do both in one step."

  Ask: "Generate the report now before creating the PR? (y/n)"

  - If yes: run the full `/review-pr` workflow, commit the report, then proceed with the original `gh pr create` command.
  - If no: proceed with `gh pr create` as requested (skip the report).
