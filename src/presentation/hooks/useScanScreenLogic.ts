import React from 'react';
import { TextInput, Alert, ToastAndroid, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/presentation/store/appStore';
import { repos } from '@/config/di';
import { resolveInputToItem } from '@/domain/usecases/resolveInputToItem';
import { QualityCode } from '@/domain/entities/types';
import { normKey } from '@/domain/utils/normalize';
import { log, error as logError } from '@/infra/logger';

export function useScanScreenLogic() {
  const router = useRouter();
  const params = useLocalSearchParams<{ itemKey?: string }>();
  
  // -- Store --
  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const sessionId = useAppStore((s) => s.currentSessionId);
  const locationId = useAppStore((s) => s.currentLocationId);
  
  const scanMode = useAppStore((s) => s.scanMode); 
  const setScanMode = useAppStore((s) => s.setScanMode);

  // -- State --
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState<{
    itemKey: string;
    itemCode: string;
    itemName: string;
    uom: string;
    onHandQty: number;
  } | null>(null);
  
  const [suggest, setSuggest] = React.useState<any[]>([]);
  const [qty, setQty] = React.useState(''); // This is TOTAL PHYSICAL
  const [mode, setMode] = React.useState<'set' | 'accumulate'>('set');
  
  const [showExceptionModal, setShowExceptionModal] = React.useState(false);
  const [exceptions, setExceptions] = React.useState<Array<{ reason: QualityCode; qty: number; note?: string }>>([]);
  
  const [lastAction, setLastAction] = React.useState<{ itemName: string; qty: number; timestamp: number } | null>(null);

  const [saving, setSaving] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState('');
  const [newItemUom, setNewItemUom] = React.useState('');
  
  const [currentLine, setCurrentLine] = React.useState<{ total: number; usable: number } | null>(null);
  const [locationInfo, setLocationInfo] = React.useState<{ code: string, name: string } | null>(null);

  const qtyInputRef = React.useRef<TextInput>(null);
  const isMountedRef = React.useRef(true);
  const resolveSeqRef = React.useRef(0);
  const lastQueryRef = React.useRef<string>('');
  const lastResolveAtRef = React.useRef(0);

  // -- Helper Functions --
  const isBarcodeInput = (val: string) => {
    const trimmed = val.replace(/\s+/g, '');
    return /^[0-9]{8,}$/.test(trimmed);
  };

  const enrichSuggestionRows = async (rows: Array<{
    itemKey: string;
    itemCode: string;
    itemName: string;
    uom: string;
    onHandQty: number;
    score?: number;
  }>) => {
    if (sessionId && locationId) {
      const enriched = await Promise.all(rows.map(async (c) => {
        const line = await repos.count.getCountLine({ sessionId, locationId, itemKey: c.itemKey });
        return {
          ...c,
          actualQty: line ? line.countTotal : 0,
          isCounted: !!line
        };
      }));
      return enriched;
    }
    return rows;
  };

  const fetchActual = React.useCallback(async (itemKey: string) => {
    if (!sessionId || !locationId) return;
    try {
      const res = await repos.count.getCountLine({ sessionId, locationId, itemKey });
      if (res) {
        setCurrentLine({ total: res.countTotal, usable: res.countUsable });
        if (res.exceptions) setExceptions(res.exceptions);
      } else {
        setCurrentLine(null);
        setExceptions([]);
      }
    } catch (e) {
      console.warn('Error fetching actual:', e);
    }
  }, [sessionId, locationId]);

  const doResolve = React.useCallback(async (input: string) => {
    if (!snapshotId || !warehouseName) return;
    const started = Date.now();
    const q = input.trim();
    if (!q) return;
    const now = Date.now();
    if (q === lastQueryRef.current && now - lastResolveAtRef.current < 200) {
      return;
    }
    lastQueryRef.current = q;
    lastResolveAtRef.current = now;
    const seq = ++resolveSeqRef.current;
    try {
      const res = await resolveInputToItem({
        input: { snapshotId, warehouseName, query: q },
        snapshotRepo: repos.snapshot,
        aliasRepo: repos.barcodeAlias,
      });
      const durationMs = Date.now() - started;
      log('SCAN_RESOLVE', {
        input: q,
        result: res.type,
        candidates: (res as any).candidates?.length ?? 0,
        ms: durationMs,
      });

      if (!isMountedRef.current || seq !== resolveSeqRef.current) return;

      if (res.type === 'single') {
        const row = await repos.snapshot.getRowByItemKey({ snapshotId, warehouseName, itemKey: res.itemKey });
        if (!isMountedRef.current || seq !== resolveSeqRef.current) return;
        if (row) {
          const shouldAutoSelect = res.source === 'alias' || isBarcodeInput(q);
          if (shouldAutoSelect) {
            setSelected(row);
            fetchActual(row.itemKey);
            setSuggest([]);
            setQ('');
            setIsCreating(false);
          } else {
            const enriched = await enrichSuggestionRows([
              { ...row, score: 100 }
            ]);
            if (!isMountedRef.current || seq !== resolveSeqRef.current) return;
            setSelected(null);
            setCurrentLine(null);
            setSuggest(enriched);
          }
          return;
        }
      } else if (res.type === 'suggest') {
        setSelected(null);
        setCurrentLine(null);

        // Enrich candidates with actual count info for this location
        const enriched = await enrichSuggestionRows(res.candidates);
        if (!isMountedRef.current || seq !== resolveSeqRef.current) return;
        setSuggest(enriched);
        
        setIsCreating(false);
        return;
      }
      setSelected(null);
      setCurrentLine(null);
      setSuggest([]);
      setIsCreating(false);
    } catch (e) {
      logError('SCAN_RESOLVE_ERROR', e);
    }
  }, [snapshotId, warehouseName, fetchActual]);

  const onSubmitQ = async (input: string) => {
    const v = input ? input.trim() : '';
    if (!v) return;
    try {
      await doResolve(v);
    } catch (e) {
      logError('SCAN_SUBMIT_ERROR', e);
      Alert.alert('Lỗi tìm kiếm', String(e));
    }
  };

  const onSave = async () => {
    if (!selected) {
      Alert.alert('Chưa chọn sản phẩm', 'Hãy quét hoặc chọn 1 item.');
      return;
    }
    const n = Number(qty);
    if (!Number.isFinite(n)) {
      Alert.alert('Sai số lượng', 'Vui lòng nhập số.');
      return;
    }

    setSaving(true);
    try {
      const result = await repos.count.upsertCountLine({
        sessionId: sessionId!,
        locationId: locationId!,
        itemKey: selected.itemKey,
        mode,
        qty: n,
        exceptions: exceptions
      });
      log('SCAN_SAVE', {
        sessionId,
        locationId,
        itemKey: selected.itemKey,
        qty: n,
        mode,
        exceptions: exceptions.length,
      });
      
      // Update Last Action
      setLastAction({
        itemName: selected.itemName,
        qty: result.actualQty, // New total
        timestamp: Date.now()
      });
      
      if (mode === 'set') {
         setCurrentLine({ total: n, usable: result.actualQty }); 
         await fetchActual(selected.itemKey);
      } else {
         await fetchActual(selected.itemKey);
      }
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('Đã lưu!', ToastAndroid.SHORT);
      }

      setQ('');
      setSuggest([]);
      setQty('');
      setSelected(null);
      setExceptions([]);
      setMode('set');
      
    } catch (e) {
      logError('SCAN_SAVE_ERROR', e);
      Alert.alert('Lỗi lưu', String(e));
    } finally {
      setSaving(false);
    }
  };

  const onCreateNewItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên hàng.');
      return;
    }
    const code = q.trim();
    if (!code) return;

    setSaving(true);
    try {
      await repos.snapshot.insertSingleSnapshotRow({
        snapshotId: snapshotId!, warehouseName: warehouseName!,
        itemCode: code, itemName: newItemName.trim(), uom: newItemUom.trim() || 'Cái',
        onHandQty: 0, nameNorm: normKey(newItemName.trim()), codeNorm: normKey(code),
      });

      setSelected({
        itemKey: code, itemCode: code, itemName: newItemName.trim(), uom: newItemUom.trim() || 'Cái', onHandQty: 0,
      });
      fetchActual(code);
      setIsCreating(false);
      setNewItemName('');
      setNewItemUom('');
      setQ('');
    } catch (e) {
      Alert.alert('Lỗi tạo hàng mới', String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleCameraScan = React.useCallback((val: string) => {
    setQ(val);
    onSubmitQ(val);
  }, [doResolve]);

  const addException = (code: QualityCode, qtyStr: string) => {
     const qNum = Number(qtyStr);
     if (!qNum || qNum <= 0) return;
     setExceptions(prev => {
        const filtered = prev.filter(e => e.reason !== code);
        return [...filtered, { reason: code, qty: qNum }];
     });
  };

  const removeException = (code: QualityCode) => {
     setExceptions(prev => prev.filter(e => e.reason !== code));
  };

  // -- Effects --

  React.useEffect(() => {
    if (scanMode !== 'QUICK') return;
    const timer = setTimeout(() => {
      if (q.trim().length >= 2 && !selected) {
        doResolve(q.trim()).catch((e) => logError('SCAN_AUTO_RESOLVE_ERROR', e));
      } else if (q.trim().length === 0) {
        setSuggest([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [q, selected, doResolve, scanMode]);

  React.useEffect(() => {
    if (selected) {
      setTimeout(() => qtyInputRef.current?.focus(), 200);
    }
  }, [selected]);

  React.useEffect(() => {
    log('SCAN_MODE', scanMode);
  }, [scanMode]);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!sessionId || !locationId) return;
      const counts = await repos.session.listLocationCounts(sessionId);
      const loc = counts.find(c => c.locationId === locationId);
      if (loc) {
        setLocationInfo({ code: loc.locationCode, name: loc.locationName });
      }
    })();
  }, [sessionId, locationId]);

  React.useEffect(() => {
    (async () => {
      if (!snapshotId || !warehouseName || !params.itemKey) return;
      const row = await repos.snapshot.getRowByItemKey({ snapshotId, warehouseName, itemKey: params.itemKey });
      if (row) {
        setSelected(row);
        fetchActual(row.itemKey);
      }
    })();
  }, [params.itemKey, snapshotId, warehouseName, fetchActual]);

  return {
      // Context
      router, snapshotId, warehouseName, sessionId, locationId,
      scanMode, setScanMode,
      locationInfo,

      // Search & Select
      q, setQ, onSubmitQ, handleCameraScan,
      selected, setSelected,
      suggest, setSuggest,
      
      // Input Logic
      qty, setQty, mode, setMode,
      qtyInputRef,
      
      // Creating New
      isCreating, setIsCreating, newItemName, setNewItemName, newItemUom, setNewItemUom, onCreateNewItem,

      // Actions
      saving, onSave, fetchActual,

      // Exceptions
      showExceptionModal, setShowExceptionModal,
      exceptions, addException, removeException,
      
      // Computed
      currentLine, lastAction
  }
}
