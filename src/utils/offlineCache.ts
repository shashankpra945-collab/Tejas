// Offline caching and local storage synchronization for remote rural health kiosks
export interface CachedRecord {
  id: string;
  timestamp: string;
  type: 'INTAKE_DATA' | 'VITALS_TELEMETRY' | 'ADAPTIVE_ANSWER' | 'PRESCRIPTION_SCAN';
  patientId: string;
  patientName: string;
  payload: any;
  status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
  retryCount: number;
}

export type ConnectivityMode = 'ONLINE' | 'RURAL_2G' | 'OFFLINE';

const CACHE_STORAGE_KEY = 'arogyamitra_rural_offline_cache_v1';
const SETTINGS_KEY = 'arogyamitra_connectivity_mode_v1';

// Get cached records from localStorage
export function getLocalCachedRecords(): CachedRecord[] {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to read from localStorage cache:', err);
    return [];
  }
}

// Save records to localStorage
export function saveLocalCachedRecords(records: CachedRecord[]): void {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Failed to write to localStorage cache:', err);
  }
}

// Add a new record to cache
export function cacheRecordLocally(
  type: CachedRecord['type'],
  patientId: string,
  patientName: string,
  payload: any
): CachedRecord {
  const existing = getLocalCachedRecords();
  const newRecord: CachedRecord = {
    id: 'cache_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    timestamp: new Date().toISOString(),
    type,
    patientId,
    patientName,
    payload,
    status: 'PENDING_SYNC',
    retryCount: 0,
  };

  const updated = [newRecord, ...existing.slice(0, 49)]; // keep up to 50 records in storage
  saveLocalCachedRecords(updated);
  return newRecord;
}

// Get count of pending sync records
export function getPendingSyncCount(): number {
  const records = getLocalCachedRecords();
  return records.filter((r) => r.status === 'PENDING_SYNC').length;
}

// Mark all as synced when connection is restored
export function flushSyncQueue(): { syncedCount: number; remainingCount: number } {
  const records = getLocalCachedRecords();
  let synced = 0;
  const updated = records.map((r) => {
    if (r.status === 'PENDING_SYNC') {
      synced++;
      return { ...r, status: 'SYNCED' as const };
    }
    return r;
  });
  saveLocalCachedRecords(updated);
  return { syncedCount: synced, remainingCount: 0 };
}

// Clear old synced records from storage
export function clearSyncedRecords(): void {
  const records = getLocalCachedRecords();
  const pendingOnly = records.filter((r) => r.status === 'PENDING_SYNC');
  saveLocalCachedRecords(pendingOnly);
}

// Seed default initial demo cache if empty
export function seedInitialRuralCacheIfEmpty(): void {
  const records = getLocalCachedRecords();
  if (records.length === 0) {
    const seedRecords: CachedRecord[] = [
      {
        id: 'cache_demo_01',
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        type: 'INTAKE_DATA',
        patientId: 'pat_surat_9102',
        patientName: 'Shanti Devi',
        payload: {
          symptoms: ['Chest Pain', 'Dyspnea'],
          dialect: 'Bhojpuri',
          district: 'Surat',
        },
        status: 'PENDING_SYNC',
        retryCount: 1,
      },
      {
        id: 'cache_demo_02',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        type: 'VITALS_TELEMETRY',
        patientId: 'pat_surat_9102',
        patientName: 'Shanti Devi',
        payload: {
          bp: '135/88 mmHg',
          spo2: '97%',
          pulse: '82 bpm',
        },
        status: 'PENDING_SYNC',
        retryCount: 0,
      },
    ];
    saveLocalCachedRecords(seedRecords);
  }
}
