import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const PACKAGE_ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLAUDE_DIR     = path.join(os.homedir(), '.claude');
const COMMANDS_DIR   = path.join(CLAUDE_DIR, 'commands');
const HOOKS_DIR      = path.join(CLAUDE_DIR, 'hooks');
const CLAUDE_JSON    = path.join(os.homedir(), '.claude.json');

const { version } = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as { version: string };
const MCP_ENTRY = process.platform === 'win32'
  ? { command: 'cmd', args: ['/c', 'npx', '-y', `prism-pr-review@${version}`] }
  : { command: 'npx', args: ['-y', `prism-pr-review@${version}`] };

const COMMANDS = [
  { src: 'plugin/commands/review-pr.md',   dest: 'review-pr.md'   },
  { src: 'plugin/commands/ship.md',         dest: 'ship.md'         },
  { src: 'plugin/commands/setup-repo.md',   dest: 'setup-repo.md'   },
];
const HOOK_SRC  = 'plugin/hooks/pre-pr-review.md';
const HOOK_DEST = 'pre-pr-review.md';

interface ClaudeConfig {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
}

function readClaudeJson(): ClaudeConfig {
  if (fs.existsSync(CLAUDE_JSON)) {
    return JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf8')) as ClaudeConfig;
  }
  return {};
}

function writeClaudeJson(cfg: ClaudeConfig): void {
  fs.writeFileSync(CLAUDE_JSON, JSON.stringify(cfg, null, 2) + '\n');
}

export function install(): void {
  fs.mkdirSync(COMMANDS_DIR, { recursive: true });
  for (const { src, dest } of COMMANDS) {
    fs.copyFileSync(path.join(PACKAGE_ROOT, src), path.join(COMMANDS_DIR, dest));
  }
  console.log('✓ Installed /review-pr, /ship, /setup-repo → ~/.claude/commands/');

  fs.mkdirSync(HOOKS_DIR, { recursive: true });
  fs.copyFileSync(
    path.join(PACKAGE_ROOT, HOOK_SRC),
    path.join(HOOKS_DIR, HOOK_DEST),
  );
  console.log('✓ Installed pre-PR hook → ~/.claude/hooks/');

  const cfg = readClaudeJson();
  cfg.mcpServers = cfg.mcpServers ?? {};
  cfg.mcpServers['prism'] = MCP_ENTRY;
  writeClaudeJson(cfg);
  console.log('✓ Registered prism MCP server in ~/.claude.json');

  console.log('\n  Restart Claude Code, then use /review-pr or /ship in any git repo.');
  console.log('  To uninstall: npx prism-pr-review uninstall\n');
}

export function uninstall(): void {
  for (const { dest } of COMMANDS) {
    const p = path.join(COMMANDS_DIR, dest);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  const hookPath = path.join(HOOKS_DIR, HOOK_DEST);
  if (fs.existsSync(hookPath)) fs.unlinkSync(hookPath);
  console.log('✓ Removed prism commands and hooks');

  const cfg = readClaudeJson();
  delete cfg.mcpServers?.['prism'];
  writeClaudeJson(cfg);
  console.log('✓ Removed prism from ~/.claude.json');

  console.log('\n  Restart Claude Code to apply changes.\n');
}
