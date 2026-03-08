#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { REPORT_TEMPLATE } from './template.js';
// ── Helpers ──────────────────────────────────────────────────────────────────
function run(cmd, cwd) {
    return execSync(cmd, {
        encoding: 'utf8',
        cwd,
        maxBuffer: 20 * 1024 * 1024,
    }).trim();
}
function safeRun(cmd, cwd) {
    try {
        return run(cmd, cwd);
    }
    catch {
        return '';
    }
}
function parseStatLine(stat) {
    const filesMatch = stat.match(/(\d+) files? changed/);
    const insMatch = stat.match(/(\d+) insertion/);
    const delMatch = stat.match(/(\d+) deletion/);
    return {
        files: filesMatch ? parseInt(filesMatch[1]) : 0,
        insertions: insMatch ? parseInt(insMatch[1]) : 0,
        deletions: delMatch ? parseInt(delMatch[1]) : 0,
    };
}
function openFile(filePath) {
    const abs = path.resolve(filePath);
    try {
        if (process.platform === 'win32') {
            spawnSync('cmd.exe', ['/c', 'start', '', abs], { stdio: 'ignore' });
        }
        else if (process.platform === 'darwin') {
            spawnSync('open', [abs], { stdio: 'ignore' });
        }
        else {
            spawnSync('xdg-open', [abs], { stdio: 'ignore' });
        }
    }
    catch {
        // Best-effort; not critical
    }
}
// ── MCP Server ───────────────────────────────────────────────────────────────
const server = new Server({ name: 'prism', version: '0.1.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'get_pr_data',
            description: 'Collect all raw git data for the current branch vs a target branch. ' +
                'Returns structured JSON with commits, file changes, diff, and stats. ' +
                'Always call this first when generating a PR review.',
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
                },
                required: ['target_branch'],
            },
        },
        {
            name: 'generate_report',
            description: 'Generate a self-contained interactive HTML PR review report and open it in the browser. ' +
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    // ── Tool: get_pr_data ──────────────────────────────────────────────────────
    if (name === 'get_pr_data') {
        const target = args?.target_branch || 'main';
        const cwd = args?.repo_path || process.cwd();
        try {
            const branch = run('git branch --show-current', cwd);
            // Commits: hash|subject|author|ISO-date
            const logRaw = safeRun(`git log "${target}...HEAD" --format="%H|%s|%an|%as" --no-merges`, cwd);
            const commits = logRaw
                .split('\n')
                .filter(Boolean)
                .map((line) => {
                const [hash, message, author, date] = line.split('|');
                return {
                    hash: hash?.trim() ?? '',
                    message: message?.trim() ?? '',
                    author: author?.trim() ?? '',
                    date: date?.trim() ?? '',
                };
            });
            // File status list
            const nameStatusRaw = safeRun(`git diff "${target}...HEAD" --name-status`, cwd);
            const files = nameStatusRaw
                .split('\n')
                .filter(Boolean)
                .map((line) => {
                const parts = line.split('\t');
                return {
                    status: parts[0]?.charAt(0) ?? 'M',
                    file: parts.slice(1).join('\t').trim(),
                };
            });
            // Stat summary
            const stat = safeRun(`git diff "${target}...HEAD" --stat`, cwd);
            const { files: filesChanged, insertions, deletions } = parseStatLine(stat);
            // Full diff (capped to avoid giant payloads)
            const diff = safeRun(`git diff "${target}...HEAD" -- . ":(exclude)*.lock" ":(exclude)*.sum"`, cwd);
            const data = {
                branch,
                target,
                commits,
                files,
                insertions,
                deletions,
                files_changed: filesChanged,
                diff,
                stat,
            };
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        catch (err) {
            return {
                content: [{ type: 'text', text: `Error collecting git data: ${err}` }],
                isError: true,
            };
        }
    }
    // ── Tool: generate_report ──────────────────────────────────────────────────
    if (name === 'generate_report') {
        const analysisStr = args?.analysis;
        const outputPath = args?.output_path || '.pr/index.html';
        const openBrowser = args?.open_browser ?? true;
        try {
            // Validate JSON
            JSON.parse(analysisStr);
            const html = REPORT_TEMPLATE.replace('__PR_DATA__', analysisStr);
            const dir = path.dirname(outputPath);
            if (dir && dir !== '.')
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(outputPath, html, 'utf8');
            if (openBrowser)
                openFile(outputPath);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Report written to ${path.resolve(outputPath)}${openBrowser ? ' and opened in browser.' : '.'}`,
                    },
                ],
            };
        }
        catch (err) {
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
// ── Boot ─────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map