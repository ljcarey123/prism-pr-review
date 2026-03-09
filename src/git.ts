import { execSync } from 'child_process';
import type { CommitInfo, FileChange, PRRawData } from './types.js';

// ── Shell helpers ─────────────────────────────────────────────────────────────

export function run(cmd: string, cwd?: string): string {
  return execSync(cmd, {
    encoding: 'utf8',
    cwd,
    maxBuffer: 20 * 1024 * 1024,
  }).trim();
}

export function safeRun(cmd: string, cwd?: string): string {
  try {
    return run(cmd, cwd);
  } catch {
    return '';
  }
}

function parseStatLine(stat: string): { files: number; insertions: number; deletions: number } {
  const filesMatch = stat.match(/(\d+) files? changed/);
  const insMatch = stat.match(/(\d+) insertion/);
  const delMatch = stat.match(/(\d+) deletion/);
  return {
    files: filesMatch ? parseInt(filesMatch[1]) : 0,
    insertions: insMatch ? parseInt(insMatch[1]) : 0,
    deletions: delMatch ? parseInt(delMatch[1]) : 0,
  };
}

// ── Tool implementation ───────────────────────────────────────────────────────

export function getPrData(
  target: string,
  cwd: string,
  fileFilter: string[],
): PRRawData {
  const pathArgs = fileFilter.length > 0
    ? '-- ' + fileFilter.map(f => `"${f}"`).join(' ')
    : '-- . ":(exclude)*.lock" ":(exclude)*.sum"';

  const branch = run('git branch --show-current', cwd);

  // Commits: hash|subject|author|ISO-date (not filtered — always show full list)
  const logRaw = safeRun(
    `git log "${target}...HEAD" --format="%H|%s|%an|%as" --no-merges`,
    cwd,
  );
  const commits: CommitInfo[] = logRaw
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

  // File status list (filtered if files param provided)
  const nameStatusRaw = safeRun(
    `git diff "${target}...HEAD" --name-status ${pathArgs}`,
    cwd,
  );
  const files: FileChange[] = nameStatusRaw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t');
      return {
        status: parts[0]?.charAt(0) ?? 'M',
        file: parts.slice(1).join('\t').trim(),
      };
    });

  // Stat summary (filtered)
  const stat = safeRun(`git diff "${target}...HEAD" --stat ${pathArgs}`, cwd);
  const { files: filesChanged, insertions, deletions } = parseStatLine(stat);

  // Diff (filtered)
  const diff = safeRun(`git diff "${target}...HEAD" ${pathArgs}`, cwd);

  return { branch, target, commits, files, insertions, deletions, files_changed: filesChanged, diff, stat };
}
