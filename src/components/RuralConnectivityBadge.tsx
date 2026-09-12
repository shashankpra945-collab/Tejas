import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  SignalLow,
  Radio,
  RefreshCw,
  HardDrive,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
  CloudUpload,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  CachedRecord,
  ConnectivityMode,
  getLocalCachedRecords,
  saveLocalCachedRecords,
  getPendingSyncCount,
  flushSyncQueue,
  seedInitialRuralCacheIfEmpty,
  cacheRecordLocally,
} from '../utils/offlineCache';

export const RuralConnectivityBadge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ConnectivityMode>('ONLINE');
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [records, setRecords] = useState<CachedRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize and seed demo cache
  useEffect(() => {
    seedInitialRuralCacheIfEmpty();
    setRecords(getLocalCachedRecords());

    const handleOnline = () => {
      setIsBrowserOnline(true);
      if (mode === 'ONLINE') {
        handleAutoSync();
      }
    };

    const handleOffline = () => {
      setIsBrowserOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mode]);

  // Determine effective connectivity
  const effectiveStatus: ConnectivityMode =
    !isBrowserOnline || mode === 'OFFLINE'
      ? 'OFFLINE'
      : mode === 'RURAL_2G'
      ? 'RURAL_2G'
      : 'ONLINE';

  const pendingCount = records.filter((r) => r.status === 'PENDING_SYNC').length;

  const handleAutoSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const result = flushSyncQueue();
      setRecords(getLocalCachedRecords());
      setIsSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
  };

  const handleManualSync = () => {
    if (effectiveStatus === 'OFFLINE') {
      // In offline mode, simulate reconnecting to sync
      setMode('ONLINE');
    }
    handleAutoSync();
  };

  const handleAddSampleOfflineRecord = () => {
    const newRec = cacheRecordLocally(
      'INTAKE_DATA',
      'pat_rural_' + Math.floor(1000 + Math.random() * 9000),
      'Ramesh Kumar (Vill. Pipariya)',
      {
        complaint: 'Acute fever with chills for 3 days',
        bp: '120/80',
        spo2: '98%',
      }
    );
    setRecords(getLocalCachedRecords());
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Badge Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border select-none ${
          effectiveStatus === 'ONLINE'
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900'
            : effectiveStatus === 'RURAL_2G'
            ? 'bg-amber-950/80 text-amber-300 border-amber-700/80 hover:bg-amber-900'
            : 'bg-rose-950/80 text-rose-300 border-rose-700/80 hover:bg-rose-900 animate-pulse'
        }`}
        title="Rural Connectivity & Local Storage Cache Status"
      >
        {/* Status Indicator Icon */}
        {effectiveStatus === 'ONLINE' && (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="font-medium">Online</span>
            {pendingCount > 0 && (
              <span className="bg-emerald-500/30 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </>
        )}

        {effectiveStatus === 'RURAL_2G' && (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <SignalLow className="w-3 h-3 text-amber-400" />
            <span className="font-medium">Rural 2G</span>
            {pendingCount > 0 && (
              <span className="bg-amber-500/40 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount} cached
              </span>
            )}
          </>
        )}

        {effectiveStatus === 'OFFLINE' && (
          <>
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <WifiOff className="w-3 h-3 text-rose-400" />
            <span className="font-medium">Offline Cache</span>
            <span className="bg-rose-500/40 text-rose-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {pendingCount} in LocalStorage
            </span>
          </>
        )}

        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fadeIn text-xs">
          {/* Popover Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <div>
                <h4 className="font-bold text-xs text-white">Rural Connectivity & Offline Cache</h4>
                <p className="text-[10px] text-slate-400">Local Storage Sync Engine (IndexedDB/Storage API)</p>
              </div>
            </div>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                effectiveStatus === 'ONLINE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : effectiveStatus === 'RURAL_2G'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {effectiveStatus}
            </span>
          </div>

          <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
            {/* Mode Switcher */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-3 h-3 text-slate-500" />
                <span>Simulate Connectivity for Judge Demo:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setMode('ONLINE')}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold text-[11px] transition-all cursor-pointer ${
                    mode === 'ONLINE'
                      ? 'bg-white text-emerald-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  4G/WiFi
                </button>
                <button
                  onClick={() => setMode('RURAL_2G')}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold text-[11px] transition-all cursor-pointer ${
                    mode === 'RURAL_2G'
                      ? 'bg-white text-amber-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rural 2G
                </button>
                <button
                  onClick={() => setMode('OFFLINE')}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold text-[11px] transition-all cursor-pointer ${
                    mode === 'OFFLINE'
                      ? 'bg-white text-rose-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Offline Kiosk
                </button>
              </div>
            </div>

            {/* Status explanation card */}
            <div
              className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                effectiveStatus === 'ONLINE'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : effectiveStatus === 'RURAL_2G'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {effectiveStatus === 'ONLINE' && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Cloud Connected & Sync Active:</span> Clinical intake, vitals, and
                    prescriptions stream directly to the hospital server and ABDM sandbox in real time.
                  </div>
                </div>
              )}
              {effectiveStatus === 'RURAL_2G' && (
                <div className="flex items-start gap-2">
                  <SignalLow className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Low Bandwidth Optimization:</span> High-resolution scans are compressed
                    locally, voice models run client-side, and records batch-sync periodically.
                  </div>
                </div>
              )}
              {effectiveStatus === 'OFFLINE' && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Offline-First Rural Mode:</span> Internet is unavailable. All patient
                    histories, vitals, and questionnaires are safely encrypted in browser LocalStorage.
                  </div>
                </div>
              )}
            </div>

            {/* Local Storage Records Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Database className="w-3 h-3 text-slate-500" />
                  <span>Cached In LocalStorage ({records.length})</span>
                </span>
                <button
                  onClick={handleAddSampleOfflineRecord}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  + Add Mock Rural Intake
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {records.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-[11px] bg-slate-50 rounded-xl border border-slate-200">
                    No records stored in local cache.
                  </div>
                ) : (
                  records.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded-sm text-slate-700 font-mono">
                            {rec.type.replace('_', ' ')}
                          </span>
                          <span>{rec.patientName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{new Date(rec.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div>
                        {rec.status === 'PENDING_SYNC' ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            Pending Sync
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Synced</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sync Action Button */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>{isSyncing ? 'Reconciling & Syncing to ABDM...' : 'Sync LocalStorage Queue Now'}</span>
              </button>

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Last Cloud Sync: {lastSyncTime}</span>
                <span>Storage Key: localStorage[arogyamitra_cache]</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
