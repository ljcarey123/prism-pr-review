#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getPrData } from './git.js';
import { generateReport } from './report.js';

// ── MCP Server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'prism', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

// ── Tool definitions ──────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_pr_data',
      description:
        'Collect all raw git data for the current branch vs a target branch. ' +
        'Returns structured JSON with commits, file changes, diff, and stats. ' +
        'Always call this first when generating a PR review. ' +
        'For large PRs (30+ files), call once without `files` to get the full file list, ' +
        'then call again with a `files` array to get the focused diff for specific files.',
      inputSchema: {
        type: 'object',
        properties: {
          target_branch: {
            type: 'string',
            description: 'Branch to diff against, e.g. "main" or "develop"',
          },
          repo_path: {
            type: 'string',
            description: 'Absolute path to the git repo (defaults to cwd)',
          },
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional list of file paths to restrict the diff to. Use for large PRs to fetch diffs per file or per batch.',
          },
        },
        required: ['target_branch'],
      },
    },
    {
      name: 'generate_report',
      description:
        'Generate a self-contained interactive HTML PR review report and open it in the browser. ' +
        'Call this after analysing the data from get_pr_data and building the PRAnalysis JSON.',
      inputSchema: {
        type: 'object',
        properties: {
          analysis: {
            type: 'string',
            description: 'JSON string conforming to the PRAnalysis schema',
          },
          output_path: {
            type: 'string',
            description: 'Where to write the HTML file (default: .pr/index.html)',
          },
          open_browser: {
            type: 'boolean',
            description: 'Open the file in the default browser after writing (default: true)',
          },
        },
        required: ['analysis'],
      },
    },
  ],
}));

// ── Request routing ───────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_pr_data') {
    try {
      const data = getPrData(
        (args?.target_branch as string) || 'main',
        (args?.repo_path as string) || process.cwd(),
        (args?.files as string[] | undefined) ?? [],
      );
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error collecting git data: ${err}` }],
        isError: true,
      };
    }
  }

  if (name === 'generate_report') {
    try {
      const message = generateReport(
        args?.analysis as string,
        (args?.output_path as string) || '.pr/index.html',
        (args?.open_browser as boolean) ?? true,
      );
      return { content: [{ type: 'text', text: message }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error generating report: ${err}` }],
        isError: true,
      };
    }
  }

  return {
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// ── Boot ──────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
