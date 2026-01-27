import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CountSession, MisaImportRow, ImportConflict } from '@/domain/entities/types';

interface PendingImport {
  // rows: MisaImportRow[]; // REMOVED to avoid RAM bloat
  fileUri: string;
  fileName: string;
  conflicts: ImportConflict[];
}

interface ImportState {
  importJobId: string | null;
  importStatus: 'idle' | 'validating' | 'importing' | 'done' | 'failed';
  importProgress: number; // 0..100
  importTotalRows: number;
  importProcessedRows: number;
  importErrorCount: number;
}

interface AppState extends ImportState {
  currentSnapshotId: string | null;
  currentSourceFileName: string | null;
  currentSessionId: string | null;
  currentWarehouse: string | null;
  currentLocationId: string | null; // Multi-Location context
  scanMode: 'WEDGE' | 'CAMERA' | 'QUICK';
  
  // Pending import data (when conflicts exist)
  pendingImport: PendingImport | null;

  setSnapshot: (data: { snapshotId: string; sourceFileName: string } | null) => void;
  setSessionId: (id: string | null) => void;
  setWarehouse: (name: string | null) => void;
  setCurrentLocationId: (id: string | null) => void;
  setScanMode: (mode: 'WEDGE' | 'CAMERA' | 'QUICK') => void;
  
  setPendingImport: (data: PendingImport | null) => void;
  
  // Import Actions
  setImportStatus: (status: ImportState['importStatus']) => void;
  setImportProgress: (processed: number, total: number) => void;
  resetImportState: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentSnapshotId: null,
      currentSourceFileName: null,
      currentSessionId: null,
      currentWarehouse: null,
      currentLocationId: null,
      scanMode: 'WEDGE', // Default to Wedge (Hardware Scanner)
      pendingImport: null,
      
      // Import State Defaults
      importJobId: null,
      importStatus: 'idle',
      importProgress: 0,
      importTotalRows: 0,
      importProcessedRows: 0,
      importErrorCount: 0,

      setSnapshot: (data) => set({ 
        currentSnapshotId: data?.snapshotId ?? null,
        currentSourceFileName: data?.sourceFileName ?? null
      }),
      setSessionId: (id) => set({ currentSessionId: id }),
      setWarehouse: (name) => set({ currentWarehouse: name }),
      setCurrentLocationId: (id) => set({ currentLocationId: id }),
      setScanMode: (mode) => set({ scanMode: mode }),
      
      setPendingImport: (data) => set({ pendingImport: data }),
      
      setImportStatus: (status) => set({ importStatus: status }),
      setImportProgress: (processed, total) => set({ 
        importProcessedRows: processed, 
        importTotalRows: total,
        importProgress: total > 0 ? Math.round((processed / total) * 100) : 0
      }),
      resetImportState: () => set({
        importJobId: null,
        importStatus: 'idle',
        importProgress: 0,
        importTotalRows: 0,
        importProcessedRows: 0,
        importErrorCount: 0
      }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentSnapshotId: state.currentSnapshotId,
        currentSourceFileName: state.currentSourceFileName,
        currentSessionId: state.currentSessionId,
        currentWarehouse: state.currentWarehouse,
        currentLocationId: state.currentLocationId,
        scanMode: state.scanMode,
        // Do NOT persist pendingImport or import progress
      }),
    }
  )
);
