import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { REPORT_TEMPLATE } from './template.js';

// ── Browser opener ────────────────────────────────────────────────────────────

function openFile(filePath: string): void {
  const abs = path.resolve(filePath);
  try {
    if (process.platform === 'win32') {
      spawnSync('cmd.exe', ['/c', 'start', '', abs], { stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      spawnSync('open', [abs], { stdio: 'ignore' });
    } else {
      spawnSync('xdg-open', [abs], { stdio: 'ignore' });
    }
  } catch {
    // Best-effort; not critical
  }
}

// ── Tool implementation ───────────────────────────────────────────────────────

export function generateReport(
  analysisStr: string,
  outputPath: string,
  openBrowser: boolean,
): string {
  // Validate JSON before writing
  JSON.parse(analysisStr);

  const html = REPORT_TEMPLATE.replace('__PR_DATA__', analysisStr);

  const dir = path.dirname(outputPath);
  if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf8');

  if (openBrowser) openFile(outputPath);

  return `Report written to ${path.resolve(outputPath)}${openBrowser ? ' and opened in browser.' : '.'}`;
}
