import { Transaction } from '../types';

// All localStorage keys MoneyVerse persists (mirrors STORAGE_KEYS in database.ts).
const STORAGE_KEYS = [
  'mv_user',
  'mv_transactions',
  'mv_portfolio',
  'mv_quests',
  'mv_goals',
  'mv_orders',
] as const;

/** Trigger a browser download of `content` as a file named `filename`. */
function download(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ISO date (YYYY-MM-DD) for filenames. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Download a full JSON backup of every MoneyVerse localStorage key. Missing keys
 * are skipped; malformed values are preserved as raw strings so a backup never
 * throws.
 */
export function downloadBackup(): void {
  const data: Record<string, unknown> = {};
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  const payload = {
    app: 'MoneyVerse',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  download(JSON.stringify(payload, null, 2), `moneyverse-backup-${today()}.json`, 'application/json');
}

/**
 * Restore a backup produced by {@link downloadBackup}. Validates the envelope,
 * then overwrites the known MoneyVerse keys. Returns the keys restored so the
 * caller can confirm. Throws on a file that isn't a MoneyVerse backup.
 */
export async function importBackupFile(file: File): Promise<string[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const envelope = parsed as { app?: unknown; data?: Record<string, unknown> };
  if (!envelope || envelope.app !== 'MoneyVerse' || typeof envelope.data !== 'object' || envelope.data === null) {
    throw new Error('That file is not a MoneyVerse backup.');
  }

  const restored: string[] = [];
  for (const key of STORAGE_KEYS) {
    if (key in envelope.data) {
      localStorage.setItem(key, JSON.stringify(envelope.data[key]));
      restored.push(key);
    }
  }
  if (restored.length === 0) {
    throw new Error('This backup contained no MoneyVerse data.');
  }
  return restored;
}

/** Quote a CSV field, escaping embedded quotes, per RFC 4180. */
function csvField(value: string | number): string {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Download the transaction ledger as a CSV. Returns the number of rows written
 * so the caller can tell the user when there was nothing to export.
 */
export function downloadTransactionsCSV(transactions: Transaction[]): number {
  const header = ['Date', 'Type', 'Category', 'Description', 'Amount'];
  const rows = transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [t.date, t.type, t.category, t.description, t.amount].map(csvField).join(','));

  if (rows.length === 0) return 0;

  const csv = [header.join(','), ...rows].join('\r\n');
  download(csv, `moneyverse-transactions-${today()}.csv`, 'text/csv');
  return rows.length;
}
