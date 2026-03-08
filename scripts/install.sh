#!/usr/bin/env bash
# install.sh — Globally installs prism for Claude Code
#
# Usage:
#   bash scripts/install.sh                  # install
#   bash scripts/install.sh --uninstall      # remove
#
# What it does:
#   1. Copies plugin/commands/review-pr.md → ~/.claude/commands/review-pr.md
#   2. Copies plugin/commands/ship.md       → ~/.claude/commands/ship.md
#   3. Adds the prism MCP server to ~/.claude/mcp.json
#   4. Registers the pre-PR hook in ~/.claude/settings.json
#
# After running, restart Claude Code and use /review-pr or /ship in any git repo.

set -euo pipefail

CLAUDE_DIR="${HOME}/.claude"
COMMANDS_DIR="${CLAUDE_DIR}/commands"
MCP_JSON="${CLAUDE_DIR}/mcp.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_CMD="${SCRIPT_DIR}/../plugin/commands/review-pr.md"
PLUGIN_SHIP="${SCRIPT_DIR}/../plugin/commands/ship.md"
HOOK_FILE="${SCRIPT_DIR}/../plugin/hooks/pre-pr-review.md"
HOOKS_DIR="${CLAUDE_DIR}/hooks"
SETTINGS_JSON="${CLAUDE_DIR}/settings.json"

UNINSTALL=false
if [[ "${1:-}" == "--uninstall" ]]; then
  UNINSTALL=true
fi

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
info() { echo -e "${CYAN}→${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*"; exit 1; }

# ── Uninstall ─────────────────────────────────────────────────────────────────
if $UNINSTALL; then
  info "Uninstalling prism..."

  rm -f "${COMMANDS_DIR}/review-pr.md"
  rm -f "${COMMANDS_DIR}/ship.md"
  rm -f "${HOOKS_DIR}/pre-pr-review.md"
  ok "Removed prism commands and hooks"

  if [[ -f "$MCP_JSON" ]] && command -v node &>/dev/null; then
    node -e "
      const fs = require('fs');
      const cfg = JSON.parse(fs.readFileSync('${MCP_JSON}', 'utf8'));
      delete (cfg.mcpServers || {}).prism;
      fs.writeFileSync('${MCP_JSON}', JSON.stringify(cfg, null, 2) + '\n');
    " && ok "Removed prism MCP entry from ~/.claude/mcp.json"
  fi

  echo ""
  warn "Restart Claude Code to apply changes."
  exit 0
fi

# ── Install ───────────────────────────────────────────────────────────────────
echo ""
echo "  🔮 prism — PR review for Claude Code"
echo "  ─────────────────────────────────────"
echo ""

# Check node
if ! command -v node &>/dev/null; then
  err "Node.js is required. Install it from https://nodejs.org and re-run."
fi

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [[ $NODE_MAJOR -lt 18 ]]; then
  err "Node.js 18+ is required (found $(node --version)). Please upgrade."
fi
ok "Node.js $(node --version) detected"

# 1. Install slash commands
mkdir -p "$COMMANDS_DIR"
cp "$PLUGIN_CMD"  "${COMMANDS_DIR}/review-pr.md"
cp "$PLUGIN_SHIP" "${COMMANDS_DIR}/ship.md"
ok "Installed /review-pr and /ship commands → ~/.claude/commands/"

# 2. Install the pre-PR hook
mkdir -p "$HOOKS_DIR"
cp "$HOOK_FILE" "${HOOKS_DIR}/pre-pr-review.md"
ok "Installed pre-PR hook → ~/.claude/hooks/pre-pr-review.md"

# 3. Wire up the MCP server in ~/.claude/mcp.json
MCP_ENTRY='{"command":"npx","args":["-y","prism-pr-review"]}'

if [[ -f "$MCP_JSON" ]]; then
  node -e "
    const fs = require('fs');
    const cfg = JSON.parse(fs.readFileSync('${MCP_JSON}', 'utf8'));
    cfg.mcpServers = cfg.mcpServers || {};
    cfg.mcpServers.prism = ${MCP_ENTRY};
    fs.writeFileSync('${MCP_JSON}', JSON.stringify(cfg, null, 2) + '\n');
  "
else
  printf '{"mcpServers":{"prism":%s}}\n' "$MCP_ENTRY" \
    | node -e "
        const d = require('fs').readFileSync('/dev/stdin','utf8');
        process.stdout.write(JSON.stringify(JSON.parse(d), null, 2) + '\n');
      " > "$MCP_JSON"
fi
ok "Registered prism MCP server in ~/.claude/mcp.json"

echo ""
ok "Installation complete!"
echo ""
echo "  Commands installed:"
echo "    /review-pr          — analyse branch + generate .pr/index.html"
echo "    /ship [--draft]     — review + commit + push + open GitHub PR"
echo ""
echo "  Hook installed:"
echo "    Anytime 'gh pr create' runs, Claude will prompt to generate the report first"
echo ""
echo "  Next steps:"
echo "    1. Restart Claude Code (or run /reload)"
echo "    2. Open any git repo, switch to a feature branch, then run /ship"
echo ""
echo "  To uninstall: bash scripts/install.sh --uninstall"
echo ""
