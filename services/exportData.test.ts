import { describe, it, expect } from 'vitest';
import { csvField, buildTransactionsCSV, buildBackupEnvelope, parseBackup } from './exportData';
import { Transaction, TransactionType } from '../types';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't1',
  amount: 10,
  description: 'Coffee',
  category: 'Food',
  type: TransactionType.EXPENSE,
  date: '2026-01-01',
  ...over,
});

describe('csvField', () => {
  it('leaves plain values untouched', () => {
    expect(csvField('Food')).toBe('Food');
    expect(csvField(42)).toBe('42');
  });

  it('quotes and escapes commas, quotes and newlines', () => {
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('buildTransactionsCSV', () => {
  it('emits a header and one row per transaction, sorted by date', () => {
    const csv = buildTransactionsCSV([
      tx({ id: 'b', date: '2026-03-02', description: 'Later' }),
      tx({ id: 'a', date: '2026-01-05', description: 'Earlier' }),
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Date,Type,Category,Description,Amount');
    expect(lines[1]).toContain('2026-01-05');
    expect(lines[1]).toContain('Earlier');
    expect(lines[2]).toContain('2026-03-02');
    expect(lines).toHaveLength(3);
  });

  it('escapes a description that contains a comma', () => {
    const csv = buildTransactionsCSV([tx({ description: 'Lunch, tip included' })]);
    expect(csv).toContain('"Lunch, tip included"');
  });

  it('is header-only for an empty ledger', () => {
    expect(buildTransactionsCSV([])).toBe('Date,Type,Category,Description,Amount');
  });
});

describe('buildBackupEnvelope', () => {
  it('wraps data in a versioned MoneyVerse envelope', () => {
    const env = buildBackupEnvelope({ mv_user: { name: 'A' } });
    expect(env.app).toBe('MoneyVerse');
    expect(env.version).toBe(1);
    expect(typeof env.exportedAt).toBe('string');
    expect(env.data).toEqual({ mv_user: { name: 'A' } });
  });
});

describe('parseBackup', () => {
  it('returns the data map for a valid backup', () => {
    const text = JSON.stringify(buildBackupEnvelope({ mv_transactions: [] }));
    expect(parseBackup(text)).toEqual({ mv_transactions: [] });
  });

  it('rejects invalid JSON', () => {
    expect(() => parseBackup('{not json')).toThrow(/valid JSON/);
  });

  it('rejects a file from another app', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'Other', data: { mv_user: 1 } }))).toThrow(/MoneyVerse backup/);
  });

  it('rejects a backup with no MoneyVerse keys', () => {
    const text = JSON.stringify(buildBackupEnvelope({ unrelated: 1 }));
    expect(() => parseBackup(text)).toThrow(/no MoneyVerse data/);
  });
});
