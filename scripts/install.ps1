# install.ps1 — Globally installs the prism review-pr command for Claude Code (Windows)
#
# Usage:
#   .\scripts\install.ps1              # install
#   .\scripts\install.ps1 -Uninstall   # remove
#
# After running, restart Claude Code and use /review-pr in any git repo.

param(
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$ClaudeDir   = "$env:USERPROFILE\.claude"
$CommandsDir = "$ClaudeDir\commands"
$HooksDir    = "$ClaudeDir\hooks"
$McpJson     = "$ClaudeDir\mcp.json"
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginCmd   = Join-Path $ScriptDir "..\plugin\commands\review-pr.md"
$PluginShip  = Join-Path $ScriptDir "..\plugin\commands\ship.md"
$HookFile    = Join-Path $ScriptDir "..\plugin\hooks\pre-pr-review.md"

function ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function info($msg) { Write-Host "  --> $msg"  -ForegroundColor Cyan  }
function warn($msg) { Write-Host "  [!] $msg"  -ForegroundColor Yellow }
function err($msg)  { Write-Host "  [ERR] $msg" -ForegroundColor Red; exit 1 }

# ── Uninstall ─────────────────────────────────────────────────────────────────
if ($Uninstall) {
  info "Uninstalling prism..."

  @("review-pr.md", "ship.md") | ForEach-Object {
    $target = "$CommandsDir\$_"
    if (Test-Path $target) { Remove-Item $target -Force }
  }
  if (Test-Path "$HooksDir\pre-pr-review.md") {
    Remove-Item "$HooksDir\pre-pr-review.md" -Force
  }
  ok "Removed prism commands and hooks"

  if (Test-Path $McpJson) {
    $cfg = Get-Content $McpJson -Raw | ConvertFrom-Json
    if ($cfg.mcpServers.PSObject.Properties['prism']) {
      $cfg.mcpServers.PSObject.Properties.Remove('prism')
      $cfg | ConvertTo-Json -Depth 10 | Set-Content $McpJson -Encoding UTF8
      ok "Removed prism MCP entry from ~/.claude/mcp.json"
    }
  }

  warn "Restart Claude Code to apply changes."
  exit 0
}

# ── Install ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  prism -- PR review for Claude Code" -ForegroundColor Magenta
Write-Host "  ------------------------------------"
Write-Host ""

# Check Node.js
try {
  $nodeVersion = (node --version 2>&1).TrimStart('v')
  $nodeMajor   = [int]($nodeVersion.Split('.')[0])
  if ($nodeMajor -lt 18) {
    err "Node.js 18+ required (found v$nodeVersion). Download from https://nodejs.org"
  }
  ok "Node.js v$nodeVersion detected"
} catch {
  err "Node.js not found. Install from https://nodejs.org and re-run."
}

# 1. Install slash commands
if (-not (Test-Path $CommandsDir)) { New-Item -ItemType Directory -Path $CommandsDir -Force | Out-Null }
Copy-Item -Path $PluginCmd  -Destination "$CommandsDir\review-pr.md" -Force
Copy-Item -Path $PluginShip -Destination "$CommandsDir\ship.md" -Force
ok "Installed /review-pr and /ship commands -> $CommandsDir"

# 2. Install the pre-PR hook
if (-not (Test-Path $HooksDir)) { New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null }
Copy-Item -Path $HookFile -Destination "$HooksDir\pre-pr-review.md" -Force
ok "Installed pre-PR hook -> $HooksDir\pre-pr-review.md"

# 3. Wire up MCP server
$mcpEntry = @{
  command = "npx"
  args    = @("-y", "prism-pr-review")
}

if (Test-Path $McpJson) {
  $cfg = Get-Content $McpJson -Raw | ConvertFrom-Json
} else {
  $cfg = [PSCustomObject]@{ mcpServers = [PSCustomObject]@{} }
}

if (-not $cfg.PSObject.Properties['mcpServers']) {
  $cfg | Add-Member -MemberType NoteProperty -Name 'mcpServers' -Value ([PSCustomObject]@{})
}
$cfg.mcpServers | Add-Member -MemberType NoteProperty -Name 'prism' -Value $mcpEntry -Force

$cfg | ConvertTo-Json -Depth 10 | Set-Content $McpJson -Encoding UTF8
ok "Registered prism MCP server in ~/.claude/mcp.json"

Write-Host ""
ok "Installation complete!"
Write-Host ""
Write-Host "  Commands installed:"
Write-Host "    /review-pr          -- analyse branch + generate .pr/index.html"
Write-Host "    /ship [--draft]     -- review + commit + push + open GitHub PR"
Write-Host ""
Write-Host "  Hook installed:"
Write-Host "    Anytime 'gh pr create' runs, Claude will prompt to generate the report first"
Write-Host ""
Write-Host "  Next steps:"
Write-Host "    1. Restart Claude Code (or run /reload)"
Write-Host "    2. Open any git repo, switch to a feature branch, then run /ship"
Write-Host ""
Write-Host "  To uninstall: .\scripts\install.ps1 -Uninstall"
Write-Host ""
