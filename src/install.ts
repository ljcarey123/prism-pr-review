import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLAUDE_DIR   = path.join(os.homedir(), '.claude');
const COMMANDS_DIR = path.join(CLAUDE_DIR, 'commands');
const HOOKS_DIR    = path.join(CLAUDE_DIR, 'hooks');
const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');

const MCP_ENTRY = { command: 'npx', args: ['-y', 'prism-pr-review'] };

const COMMANDS = [
  { src: 'plugin/commands/review-pr.md',   dest: 'review-pr.md'   },
  { src: 'plugin/commands/ship.md',         dest: 'ship.md'         },
  { src: 'plugin/commands/setup-repo.md',   dest: 'setup-repo.md'   },
];
const HOOK_SRC  = 'plugin/hooks/pre-pr-review.md';
const HOOK_DEST = 'pre-pr-review.md';

interface Settings {
  mcpServers?: Record<string, unknown>;
}

function readSettings(): Settings {
  if (fs.existsSync(SETTINGS_PATH)) {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) as Settings;
  }
  return {};
}

function writeSettings(cfg: Settings): void {
  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(cfg, null, 2) + '\n');
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

  const cfg = readSettings();
  cfg.mcpServers = cfg.mcpServers ?? {};
  cfg.mcpServers['prism'] = MCP_ENTRY;
  writeSettings(cfg);
  console.log('✓ Registered prism MCP server in ~/.claude/settings.json');

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

  const cfg = readSettings();
  delete cfg.mcpServers?.['prism'];
  writeSettings(cfg);
  console.log('✓ Removed prism from ~/.claude/settings.json');

  console.log('\n  Restart Claude Code to apply changes.\n');
}
