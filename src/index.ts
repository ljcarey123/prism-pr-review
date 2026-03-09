#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getPrData } from './git.js';
import { install, uninstall } from './install.js';
import { generateReport } from './report.js';

// ── CLI commands (install / uninstall) ────────────────────────────────────────

const cmd = process.argv[2];
if (cmd === 'install')   { install();   process.exit(0); }
if (cmd === 'uninstall') { uninstall(); process.exit(0); }

// ── MCP Server ────────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'prism', version: '0.1.0' },
);

// ── Tools ─────────────────────────────────────────────────────────────────────

server.registerTool(
  'get_pr_data',
  {
    description:
      'Collect all raw git data for the current branch vs a target branch. ' +
      'Returns structured JSON with commits, file changes, diff, and stats. ' +
      'Always call this first when generating a PR review. ' +
      'For large PRs (30+ files), call once without `files` to get the full file list, ' +
      'then call again with a `files` array to get the focused diff for specific files.',
    inputSchema: {
      target_branch: z.string().describe('Branch to diff against, e.g. "main" or "develop"'),
      repo_path:     z.string().optional().describe('Absolute path to the git repo (defaults to cwd)'),
      files:         z.array(z.string()).optional().describe('Optional list of file paths to restrict the diff to. Use for large PRs to fetch diffs per file or per batch.'),
    },
  },
  async ({ target_branch, repo_path, files }) => {
    try {
      const data = getPrData(target_branch, repo_path ?? process.cwd(), files ?? []);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error collecting git data: ${err}` }], isError: true };
    }
  },
);

server.registerTool(
  'generate_report',
  {
    description:
      'Generate a self-contained interactive HTML PR review report and open it in the browser. ' +
      'Call this after analysing the data from get_pr_data and building the PRAnalysis JSON.',
    inputSchema: {
      analysis:     z.string().describe('JSON string conforming to the PRAnalysis schema'),
      output_path:  z.string().optional().describe('Where to write the HTML file (default: .pr/index.html)'),
      open_browser: z.boolean().optional().describe('Open the file in the default browser after writing (default: true)'),
    },
  },
  async ({ analysis, output_path, open_browser }) => {
    try {
      const message = generateReport(analysis, output_path ?? '.pr/index.html', open_browser ?? true);
      return { content: [{ type: 'text', text: message }] };
    } catch (err) {
      return { content: [{ type: 'text', text: `Error generating report: ${err}` }], isError: true };
    }
  },
);

// ── Boot ──────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
