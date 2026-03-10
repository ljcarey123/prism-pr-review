#!/usr/bin/env node
// Points ~/.claude.json at the local dist/index.js build instead of npm.
// Run: node scripts/use-local.mjs

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const localEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/index.js');
const claudeJson = path.join(os.homedir(), '.claude.json');

const cfg = JSON.parse(fs.readFileSync(claudeJson, 'utf8'));
cfg.mcpServers ??= {};
cfg.mcpServers['prism'] = { command: 'node', args: [localEntry] };
fs.writeFileSync(claudeJson, JSON.stringify(cfg, null, 2) + '\n');

console.log(`✓ prism MCP → ${localEntry}`);
console.log('  Restart Claude Code to apply.');
