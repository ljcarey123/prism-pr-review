// ── Shared types ─────────────────────────────────────────────────────────────

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface FileChange {
  status: string;  // A=Added, M=Modified, D=Deleted, R=Renamed
  file: string;
}

export interface PRRawData {
  branch: string;
  target: string;
  commits: CommitInfo[];
  files: FileChange[];
  insertions: number;
  deletions: number;
  files_changed: number;
  diff: string;
  stat: string;
}
