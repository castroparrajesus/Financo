/**
 * Financo Offline Storage Manager
 * Handles local caching of reconciliation cédulas for offline audits.
 * 
 * Data Security & Colombian Law 1581 (Habeas Data) compliance:
 * - Only stores operational reconciliation data necessary for audit inspection.
 * - Never persists passwords, bank credentials, or third-party API tokens.
 * - Cached data is scoped locally to the user's browser storage.
 * - Allows instantaneous manual purging via user action.
 */

import { Reconciliation, MatchRow } from '../types';

export interface CachedReconciliationSummary {
  id: string;
  companyName: string;
  period: string;
  date: string;
  totalBankRows: number;
  totalLedgerRows: number;
  autoPercentage: number;
  amountReconciled: number;
  cachedAt: string;
}

export interface CachedReconciliationFull {
  id: string;
  reconciliation: Reconciliation & { companies?: { name: string } };
  matches: MatchRow[];
  cachedAt: string;
  version: number;
}

const DB_NAME = 'financo_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'reconciliations_v1';
const LS_FALLBACK_KEY = 'financo_cached_reconciliations_fallback';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Sanitize reconciliation data before local storage to ensure privacy & security
 */
function sanitizeReconciliation(recon: Reconciliation & { companies?: { name: string } }): Reconciliation & { companies?: { name: string } } {
  // Deep copy and strip any sensitive transient or token fields
  const clean = JSON.parse(JSON.stringify(recon));
  delete clean.user_token;
  delete clean.api_secret;
  return clean;
}

/**
 * Cache a reconciliation and its matches for offline consultation
 */
export async function saveReconciliationOffline(
  recon: Reconciliation & { companies?: { name: string } },
  matches: MatchRow[]
): Promise<void> {
  if (typeof window === 'undefined') return;

  const payload: CachedReconciliationFull = {
    id: recon.id,
    reconciliation: sanitizeReconciliation(recon),
    matches: matches.map((m) => ({ ...m })),
    cachedAt: new Date().toISOString(),
    version: 1,
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(payload);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback to localStorage if IndexedDB is blocked (e.g., in strict private browsing)
    try {
      const existingStr = localStorage.getItem(LS_FALLBACK_KEY);
      const map: Record<string, CachedReconciliationFull> = existingStr ? JSON.parse(existingStr) : {};
      map[recon.id] = payload;
      localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(map));
    } catch {
      console.warn('Could not persist reconciliation to local storage cache');
    }
  }
}

/**
 * Retrieve a cached reconciliation by ID
 */
export async function getReconciliationOffline(id: string): Promise<CachedReconciliationFull | null> {
  if (typeof window === 'undefined') return null;

  try {
    const db = await openDB();
    const result = await new Promise<CachedReconciliationFull | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (result) return result;
  } catch {
    // try fallback
  }

  try {
    const existingStr = localStorage.getItem(LS_FALLBACK_KEY);
    if (existingStr) {
      const map: Record<string, CachedReconciliationFull> = JSON.parse(existingStr);
      if (map[id]) return map[id];
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * List all reconciliations available in offline cache
 */
export async function listCachedReconciliations(): Promise<CachedReconciliationSummary[]> {
  if (typeof window === 'undefined') return [];

  const summaries: CachedReconciliationSummary[] = [];

  try {
    const db = await openDB();
    const allRecords = await new Promise<CachedReconciliationFull[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    for (const record of allRecords) {
      const r = record.reconciliation;
      summaries.push({
        id: record.id,
        companyName: r.companies?.name || r.metadata?.companyName || 'Empresa sin nombre',
        period: r.metadata?.period || 'Período no especificado',
        date: r.created_at,
        totalBankRows: r.total_bank_rows || 0,
        totalLedgerRows: r.total_ledger_rows || 0,
        autoPercentage: r.auto_percentage ?? (r.total_bank_rows ? Math.round(((r.total_reconciled || 0) / r.total_bank_rows) * 100) : 0),
        amountReconciled: r.total_amount_reconciled || 0,
        cachedAt: record.cachedAt,
      });
    }

    if (summaries.length > 0) return summaries;
  } catch {
    // try fallback
  }

  try {
    const existingStr = localStorage.getItem(LS_FALLBACK_KEY);
    if (existingStr) {
      const map: Record<string, CachedReconciliationFull> = JSON.parse(existingStr);
      for (const record of Object.values(map)) {
        const r = record.reconciliation;
        summaries.push({
          id: record.id,
          companyName: r.companies?.name || r.metadata?.companyName || 'Empresa sin nombre',
          period: r.metadata?.period || 'Período no especificado',
          date: r.created_at,
          totalBankRows: r.total_bank_rows || 0,
          totalLedgerRows: r.total_ledger_rows || 0,
          autoPercentage: r.auto_percentage ?? (r.total_bank_rows ? Math.round(((r.total_reconciled || 0) / r.total_bank_rows) * 100) : 0),
          amountReconciled: r.total_amount_reconciled || 0,
          cachedAt: record.cachedAt,
        });
      }
    }
  } catch {
    // ignore
  }

  return summaries;
}

/**
 * Remove a single reconciliation from offline cache
 */
export async function deleteReconciliationOffline(id: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // fallback
  }

  try {
    const existingStr = localStorage.getItem(LS_FALLBACK_KEY);
    if (existingStr) {
      const map = JSON.parse(existingStr);
      delete map[id];
      localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(map));
    }
  } catch {
    // ignore
  }
}

/**
 * Clear all cached reconciliations (e.g., when auditor logs out or clears data)
 */
export async function clearAllOfflineCache(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // fallback
  }

  try {
    localStorage.removeItem(LS_FALLBACK_KEY);
  } catch {
    // ignore
  }
}

/**
 * Get offline storage metrics (count and approximate KB size)
 */
export async function getOfflineStorageMetrics(): Promise<{ count: number; estimatedKb: number }> {
  const items = await listCachedReconciliations();
  let totalBytes = 0;

  try {
    const str = localStorage.getItem(LS_FALLBACK_KEY);
    if (str) totalBytes += str.length;
  } catch {
    // ignore
  }

  // rough estimate: ~15KB per cached reconciliation with 100 movements
  const estimatedKb = Math.max(1, Math.round((items.length * 18000 + totalBytes) / 1024));

  return {
    count: items.length,
    estimatedKb: items.length > 0 ? estimatedKb : 0,
  };
}
