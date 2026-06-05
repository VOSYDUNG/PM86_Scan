import React from 'react';
import { TextInput, Alert, ToastAndroid, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Sound } from 'expo-av/build/Audio/Sound';
import { useAppStore } from '@/presentation/store/appStore';
import { repos } from '@/config/di';
import { resolveInputToItem } from '@/domain/usecases/resolveInputToItem';
import { QualityCode } from '@/domain/entities/types';
import { normKey } from '@/domain/utils/normalize';
import { suggestSkuFromName } from '@/domain/utils/sku';
import { log, error as logError } from '@/infra/logger';
import { useI18n } from '@/presentation/i18n/useI18n';
import { WedgeFinalizeReason } from '@/infra/scan/WedgeScannerInput';
import { ScannerDebugSource } from '@/presentation/store/appStore';

export type ScanLockReason =
  | 'editing_draft'
  | 'editing_exception'
  | 'creating_item'
  | 'confirming'
  | 'saving'
  | 'background';

export type ScanGateState = 'active' | 'paused';

type BlockedScanChannel = 'wedge' | 'camera' | 'wedge-visible-input';

export function useScanScreenLogic() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ itemKey?: string }>();
  const QUICK_DEFAULT_LIMIT = 50;
  const WEDGE_DEDUPE_WINDOW_MS = 250;
  
  // -- Store --
  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const sessionId = useAppStore((s) => s.currentSessionId);
  const locationId = useAppStore((s) => s.currentLocationId);
  
  const scanMode = useAppStore((s) => s.scanMode); 
  const setScanMode = useAppStore((s) => s.setScanMode);
  const activeRouteScope = useAppStore((s) => s.activeRouteScope);
  const physicalScanScope = useAppStore((s) => s.physicalScanScope);
  const setScannerDebug = useAppStore((s) => s.setScannerDebug);
  const clearScannerDebug = useAppStore((s) => s.clearScannerDebug);

  type DraftEntry = {
    qty: number;
    itemCode: string;
    itemName: string;
    uom: string;
    updatedAt: number;
  };

  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
  const incrementStep = 1;

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
  const [qtyInput, setQtyInput] = React.useState(''); // This is TOTAL PHYSICAL input
  const [draftQty, setDraftQty] = React.useState(0);
  const [drafts, setDrafts] = React.useState<Record<string, DraftEntry>>({});
  const [mode, setMode] = React.useState<'set' | 'accumulate'>('accumulate');
  const qty = qtyInput;
  
  const [showExceptionModal, setShowExceptionModal] = React.useState(false);
  const [exceptions, setExceptions] = React.useState<Array<{ reason: QualityCode; qty: number; note?: string }>>([]);
  
  const [lastAction, setLastAction] = React.useState<{ itemName: string; qty: number; timestamp: number } | null>(null);
  const [scannerState, setScannerState] = React.useState<'idle' | 'ready' | 'receiving' | 'error'>(
    scanMode === 'WEDGE' ? 'ready' : 'idle'
  );
  const [scanLocks, setScanLocks] = React.useState<ScanLockReason[]>([]);
  const [blockedHintVisible, setBlockedHintVisible] = React.useState(false);

  const [saving, setSaving] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState('');
  const [newItemUom, setNewItemUom] = React.useState('');
  const [newItemCode, setNewItemCode] = React.useState('');
  
  const [currentLine, setCurrentLine] = React.useState<{ total: number; usable: number } | null>(null);
  const [locationInfo, setLocationInfo] = React.useState<{ code: string, name: string } | null>(null);

  const qtyInputRef = React.useRef<TextInput>(null);
  const isMountedRef = React.useRef(true);
  const resolveSeqRef = React.useRef(0);
  const lastQueryRef = React.useRef<string>('');
  const lastResolveAtRef = React.useRef(0);
  const lastResolvedItemKeyRef = React.useRef<string | null>(null);
  const lastNotFoundPromptAtRef = React.useRef(0);
  const selectedRef = React.useRef<typeof selected>(null);
  const draftQtyRef = React.useRef(0);
  const draftsRef = React.useRef<Record<string, DraftEntry>>({});
  const scanLocksRef = React.useRef<ScanLockReason[]>([]);
  const scanSoundRef = React.useRef<Sound | null>(null);
  const scannerStateResetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFinalizedRef = React.useRef<{ hash: string; at: number } | null>(null);
  const lastDebugAtRef = React.useRef<number | null>(null);
  const blockedHintTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBlockedHintAtRef = React.useRef(0);

  React.useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  React.useEffect(() => {
    draftQtyRef.current = draftQty;
  }, [draftQty]);

  React.useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  const resolvePauseReason = React.useCallback((locks: ScanLockReason[]): ScanLockReason | null => {
    const priority: ScanLockReason[] = [
      'saving',
      'confirming',
      'editing_exception',
      'editing_draft',
      'creating_item',
      'background',
    ];
    return priority.find((reason) => locks.includes(reason)) ?? null;
  }, []);

  const addScanLock = React.useCallback((reason: ScanLockReason) => {
    if (scanLocksRef.current.includes(reason)) return;
    scanLocksRef.current = [...scanLocksRef.current, reason];
    setScanLocks((prev) => (prev.includes(reason) ? prev : [...prev, reason]));
  }, []);

  const removeScanLock = React.useCallback((reason: ScanLockReason) => {
    scanLocksRef.current = scanLocksRef.current.filter((item) => item !== reason);
    setScanLocks((prev) => prev.filter((item) => item !== reason));
  }, []);

  const hasScanLock = React.useCallback((reason: ScanLockReason) => scanLocks.includes(reason), [scanLocks]);

  const pauseReason = React.useMemo<ScanLockReason | null>(() => resolvePauseReason(scanLocks), [resolvePauseReason, scanLocks]);

  const scanGateState: ScanGateState = pauseReason ? 'paused' : 'active';
  const scannerEnabled = scanMode !== 'QUICK' && scanGateState === 'active';
  const canAcceptPhysicalWedge = activeRouteScope === 'SCAN' && physicalScanScope === 'INVENTORY_WEDGE_ACTIVE';
  const canAcceptCameraScan = activeRouteScope === 'SCAN' && physicalScanScope === 'INVENTORY_CAMERA_ACTIVE';
  const isScannerCurrentlyEnabled = React.useCallback(() => {
    return scanMode !== 'QUICK' && !resolvePauseReason(scanLocksRef.current);
  }, [resolvePauseReason, scanMode]);

  React.useEffect(() => {
    if (pauseReason) return;
    setBlockedHintVisible(false);
    if (blockedHintTimerRef.current) {
      clearTimeout(blockedHintTimerRef.current);
      blockedHintTimerRef.current = null;
    }
  }, [pauseReason]);

  const handleBlockedScan = React.useCallback((_channel: BlockedScanChannel) => {
    if (!resolvePauseReason(scanLocksRef.current)) return;
    const now = Date.now();
    if (now - lastBlockedHintAtRef.current < 1200) return;
    lastBlockedHintAtRef.current = now;
    setBlockedHintVisible(true);
    if (blockedHintTimerRef.current) {
      clearTimeout(blockedHintTimerRef.current);
    }
    blockedHintTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setBlockedHintVisible(false);
    }, 1400);
  }, [resolvePauseReason]);

  const withScanLock = React.useCallback(async <T,>(reason: ScanLockReason, fn: () => Promise<T> | T) => {
    addScanLock(reason);
    try {
      return await fn();
    } finally {
      removeScanLock(reason);
    }
  }, [addScanLock, removeScanLock]);

  const withBlockingAlert = React.useCallback((
    title: string,
    message?: string,
    buttons?: Array<{ text?: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
  ) => {
    addScanLock('confirming');
    const release = () => removeScanLock('confirming');
    const wrappedButtons = (buttons && buttons.length > 0 ? buttons : [{ text: t('customAlert.confirmDefault') }]).map((button) => ({
      ...button,
      onPress: () => {
        release();
        button.onPress?.();
      },
    }));
    Alert.alert(title, message, wrappedButtons, {
      cancelable: true,
      onDismiss: release,
    });
  }, [addScanLock, removeScanLock, t]);

  const normalizeScanPayload = React.useCallback((raw: string) => {
    return raw.replace(/[\r\n]+/g, '').trim();
  }, []);

  const scheduleScannerReady = React.useCallback((delay = 180) => {
    if (scannerStateResetTimerRef.current) {
      clearTimeout(scannerStateResetTimerRef.current);
    }
    scannerStateResetTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setScannerState((prev) => (prev === 'error' ? prev : scanMode === 'WEDGE' ? 'ready' : 'idle'));
    }, delay);
  }, [scanMode]);

  const markScannerReceiving = React.useCallback(() => {
    if (scanMode !== 'WEDGE') return;
    setScannerState('receiving');
    scheduleScannerReady();
  }, [scanMode, scheduleScannerReady]);

  const pushScannerDebug = React.useCallback((payload: {
    source: ScannerDebugSource;
    value: string;
    suffix?: WedgeFinalizeReason | null;
    error?: string | null;
  }) => {
    const now = Date.now();
    const interval = lastDebugAtRef.current ? now - lastDebugAtRef.current : null;
    lastDebugAtRef.current = now;
    setScannerDebug({
      lastSource: payload.source,
      lastPayload: payload.value,
      lastPayloadAt: now,
      lastSuffix: payload.suffix ?? null,
      lastIntervalMs: interval,
      lastError: payload.error ?? null,
    });
  }, [setScannerDebug]);

  // -- Helper Functions --
  const isBarcodeInput = (val: string) => {
    const trimmed = val.replace(/\s+/g, '');
    return /^[0-9]{8,}$/.test(trimmed);
  };

  const formatQtyInput = React.useCallback((n: number) => (n > 0 ? String(n) : ''), []);

  const applyDraftQty = React.useCallback((next: number) => {
    setDraftQty(next);
    setQtyInput(formatQtyInput(next));
  }, [formatQtyInput]);

  const setQty = React.useCallback((val: string) => {
    setQtyInput(val);
    if (scanMode !== 'QUICK') {
      const n = Number(val);
      setDraftQty(Number.isFinite(n) ? n : 0);
    }
  }, [scanMode, mode]);

  const purgeDraftMap = React.useCallback((map: Record<string, DraftEntry>) => {
    const now = Date.now();
    const entries = Object.entries(map).filter(([, d]) => now - d.updatedAt <= DRAFT_TTL_MS);
    return Object.fromEntries(entries);
  }, []);

  const purgeExpiredDrafts = React.useCallback(() => {
    setDrafts((prev) => {
      const next = purgeDraftMap(prev);
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [purgeDraftMap]);

  const getPurgedDrafts = React.useCallback(() => {
    const next = purgeDraftMap(draftsRef.current);
    if (Object.keys(next).length !== Object.keys(draftsRef.current).length) {
      setDrafts(next);
    }
    return next;
  }, [purgeDraftMap]);

  const playScanTick = React.useCallback(async () => {
    const sound = scanSoundRef.current;
    if (!sound) return;
    try {
      await sound.replayAsync();
    } catch {}
  }, []);

  const skuSuggestion = React.useMemo(() => {
    return suggestSkuFromName(newItemName);
  }, [newItemName]);

  const startCreateFromCode = React.useCallback((code: string) => {
    setNewItemCode(code.trim());
    setSuggest([]);
    setIsCreating(true);
    setQ('');
  }, []);

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

  const loadQuickDefaultSuggestions = React.useCallback(async () => {
    if (!snapshotId || !warehouseName) return;
    const seq = ++resolveSeqRef.current;
    try {
      const rows = await repos.snapshot.searchRows({
        snapshotId,
        warehouseName,
        queryNorm: '',
        limit: QUICK_DEFAULT_LIMIT,
      });
      const enriched = await enrichSuggestionRows(rows);
      if (!isMountedRef.current || seq !== resolveSeqRef.current) return;
      if (scanMode === 'QUICK' && !selectedRef.current) {
        setSuggest(enriched);
      }
    } catch (e) {
      logError('SCAN_DEFAULT_SUGGEST_ERROR', e);
    }
  }, [scanMode, snapshotId, warehouseName]);

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

  const selectItemForQuick = React.useCallback((row: {
    itemKey: string;
    itemCode: string;
    itemName: string;
    uom: string;
    onHandQty: number;
  }) => {
    setSelected(row);
    fetchActual(row.itemKey);
    setSuggest([]);
    setQ('');
    setIsCreating(false);
  }, [fetchActual]);

  const selectItemForScan = React.useCallback((row: {
    itemKey: string;
    itemCode: string;
    itemName: string;
    uom: string;
    onHandQty: number;
  }, increment = incrementStep, opts?: { emitSound?: boolean }) => {
    const prev = selectedRef.current;
    if (prev && prev.itemKey === row.itemKey) {
      applyDraftQty(draftQtyRef.current + increment);
      if (opts?.emitSound) playScanTick();
      return;
    }

    // purge expired drafts before any operations
    getPurgedDrafts();

    if (prev && draftQtyRef.current > 0) {
      setDrafts((prevDrafts) => {
        const next = purgeDraftMap(prevDrafts);
        next[prev.itemKey] = {
          qty: draftQtyRef.current,
          itemCode: prev.itemCode,
          itemName: prev.itemName,
          uom: prev.uom,
          updatedAt: Date.now(),
        };
        return next;
      });
    }

    setSelected(row);
    fetchActual(row.itemKey);
    setSuggest([]);
    setQ('');
    setIsCreating(false);

    const existingDraft = draftsRef.current[row.itemKey];
    const nextQty = (existingDraft?.qty ?? 0) + increment;
    applyDraftQty(nextQty);
    if (opts?.emitSound) playScanTick();
  }, [applyDraftQty, fetchActual, getPurgedDrafts, purgeDraftMap, playScanTick]);

  const doResolve = React.useCallback(async (input: string, opts?: { forScan?: boolean }) => {
    if (!snapshotId || !warehouseName) return 'skipped' as const;
    const started = Date.now();
    const q = input.trim();
    if (!q) return 'skipped' as const;
    const forScan = opts?.forScan ?? (scanMode !== 'QUICK');
    const now = Date.now();
    if (q === lastQueryRef.current && now - lastResolveAtRef.current < 200) {
      return 'skipped' as const;
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

      if (!isMountedRef.current || seq !== resolveSeqRef.current) return 'skipped' as const;

      if (res.type === 'single') {
        const row = await repos.snapshot.getRowByItemKey({ snapshotId, warehouseName, itemKey: res.itemKey });
        if (!isMountedRef.current || seq !== resolveSeqRef.current) return 'skipped' as const;
        if (row) {
          lastResolvedItemKeyRef.current = row.itemKey;
          const shouldAutoSelect = forScan ? true : (res.source === 'alias' || isBarcodeInput(q));
          if (shouldAutoSelect) {
            if (forScan) {
              selectItemForScan(row, incrementStep, { emitSound: true });
            } else {
              selectItemForQuick(row);
            }
            return 'resolved' as const;
          }

          const enriched = await enrichSuggestionRows([
            { ...row, score: 100 }
          ]);
          if (!isMountedRef.current || seq !== resolveSeqRef.current) return 'skipped' as const;
          setSelected(null);
          setCurrentLine(null);
          setSuggest(enriched);
          return 'suggest' as const;
        }
      } else if (res.type === 'suggest') {
        setSelected(null);
        setCurrentLine(null);

        // Enrich candidates with actual count info for this location
        const enriched = await enrichSuggestionRows(res.candidates);
        if (!isMountedRef.current || seq !== resolveSeqRef.current) return 'skipped' as const;
        setSuggest(enriched);
        
        setIsCreating(false);
        return 'suggest' as const;
      }
      setSelected(null);
      setCurrentLine(null);
      setSuggest([]);
      setIsCreating(false);
      if (forScan && Platform.OS === 'android') {
        ToastAndroid.show(t('scan.toastNotFound'), ToastAndroid.SHORT);
      }
      if (forScan) {
        const nowPrompt = Date.now();
        if (nowPrompt - lastNotFoundPromptAtRef.current > 1200) {
          lastNotFoundPromptAtRef.current = nowPrompt;
          withBlockingAlert(
            t('scan.alertNotFoundTitle'),
            t('scan.alertNotFoundMessage', { q }),
            [
              { text: t('common.button.cancel'), style: 'cancel' },
              { text: t('scan.alertNotFoundCreate'), onPress: () => startCreateFromCode(q) },
            ]
          );
        }
      }
      return 'not_found' as const;
    } catch (e) {
      logError('SCAN_RESOLVE_ERROR', e);
      return 'error' as const;
    }
  }, [scanMode, selectItemForQuick, selectItemForScan, snapshotId, startCreateFromCode, t, warehouseName]);

  const handleScanInput = React.useCallback(async (input: string) => {
    const v = input.trim();
    if (!v) return 'skipped' as const;
    if (!isScannerCurrentlyEnabled()) {
      handleBlockedScan('wedge');
      return 'skipped' as const;
    }
    purgeExpiredDrafts();

    if (selectedRef.current && lastQueryRef.current === v && lastResolvedItemKeyRef.current === selectedRef.current.itemKey) {
      applyDraftQty(draftQtyRef.current + incrementStep);
      playScanTick();
      return 'resolved' as const;
    }

    return doResolve(v, { forScan: true });
  }, [applyDraftQty, purgeExpiredDrafts, doResolve, handleBlockedScan, isScannerCurrentlyEnabled, playScanTick]);

  const onSubmitQ = async (input: string) => {
    const v = input ? input.trim() : '';
    if (!v) return;
    try {
      if (scanMode !== 'QUICK') {
        await handleScanInput(v);
        return;
      }
      await doResolve(v);
    } catch (e) {
      logError('SCAN_SUBMIT_ERROR', e);
      withBlockingAlert(t('scan.alertSearchErrorTitle'), String(e));
    }
  };

  const persistSave = React.useCallback(async (n: number, isScanMode: boolean) => {
    if (!selectedRef.current) return;
    const currentSelected = selectedRef.current;
    setSaving(true);
    addScanLock('saving');
    try {
      const scopeState = await repos.count.isItemInLocationScope({
        sessionId: sessionId!,
        locationId: locationId!,
        itemKey: currentSelected.itemKey,
      });
      const isOutOfScope = scopeState.hasMapping && !scopeState.inScope;
      const result = await repos.count.upsertCountLine({
        sessionId: sessionId!,
        locationId: locationId!,
        itemKey: currentSelected.itemKey,
        mode: isScanMode ? 'accumulate' : mode,
        qty: n,
        exceptions: exceptions
      }, { isOutOfScope });
      log('SCAN_SAVE', {
        sessionId,
        locationId,
        itemKey: currentSelected.itemKey,
        qty: n,
        mode,
        exceptions: exceptions.length,
        isOutOfScope,
      });

      setLastAction({
        itemName: currentSelected.itemName,
        qty: result.actualQty,
        timestamp: Date.now()
      });

      if (mode === 'set') {
        setCurrentLine({ total: n, usable: result.actualQty });
        await fetchActual(currentSelected.itemKey);
      } else {
        await fetchActual(currentSelected.itemKey);
      }

      if (Platform.OS === 'android') {
        ToastAndroid.show(t('scan.toastSaved'), ToastAndroid.SHORT);
        if (isOutOfScope) {
          ToastAndroid.show(t('scan.toastOutOfScope'), ToastAndroid.SHORT);
        }
      }

      setQ('');
      setSuggest([]);
      setQtyInput('');
      if (isScanMode) {
        setDraftQty(0);
        setDrafts((prev) => {
          if (!currentSelected.itemKey || !prev[currentSelected.itemKey]) return prev;
          const next = { ...prev };
          delete next[currentSelected.itemKey];
          return next;
        });
      } else {
        setSelected(null);
      }
      setExceptions([]);
      setMode('accumulate');
    } catch (e) {
      logError('SCAN_SAVE_ERROR', e);
      withBlockingAlert(t('scan.alertSaveErrorTitle'), String(e));
    } finally {
      setSaving(false);
      removeScanLock('saving');
    }
  }, [addScanLock, exceptions, fetchActual, locationId, mode, removeScanLock, sessionId, t, withBlockingAlert]);

  const onSave = async () => {
    if (!selectedRef.current) {
      withBlockingAlert(t('scan.alertNoProductTitle'), t('scan.alertNoProductMessage'));
      return;
    }
    const isScanMode = scanMode !== 'QUICK';
    const n = isScanMode ? draftQty : Number(qtyInput);
    if (!Number.isFinite(n)) {
      withBlockingAlert(t('scan.alertInvalidQtyTitle'), t('scan.alertInvalidQtyMessage'));
      return;
    }
    if (isScanMode && n <= 0) {
      withBlockingAlert(t('scan.alertNoQtyTitle'), t('scan.alertNoQtyMessage'));
      return;
    }

    if (n > 0 && exceptions.length === 0) {
      withBlockingAlert(
        t('scan.alertConfirmNoErrorTitle'),
        t('scan.alertConfirmNoErrorMessage'),
        [
          { text: t('scan.alertReviewException'), style: 'cancel' },
          {
            text: t('scan.alertConfirmAllGood'),
            onPress: () => {
              persistSave(n, isScanMode).catch((e) => {
                logError('SCAN_SAVE_CONFIRM_ERROR', e);
              });
            },
          },
        ]
      );
      return;
    }

    await persistSave(n, isScanMode);
  };

  const onCreateNewItem = async () => {
    if (!newItemName.trim()) {
      withBlockingAlert(t('scan.alertMissingInfoTitle'), t('scan.alertMissingNameMessage'));
      return;
    }
    const code = newItemCode.trim() || q.trim();
    if (!code) {
      withBlockingAlert(t('scan.alertMissingInfoTitle'), t('scan.alertMissingCodeMessage'));
      return;
    }

    setSaving(true);
    try {
      const existing = await repos.snapshot.getRowByItemCode({
        snapshotId: snapshotId!,
        warehouseName: warehouseName!,
        itemCode: code,
        codeNorm: normKey(code)
      });

      if (existing) {
        withBlockingAlert(
          t('scan.alertCodeExistsTitle'),
          t('scan.alertCodeExistsMessage', { code }),
          [
            { text: t('scan.alertChangeCode'), style: 'cancel' },
            {
              text: t('scan.alertOpenOld'),
              onPress: () => {
                setSelected(existing);
                fetchActual(existing.itemKey);
                setIsCreating(false);
              }
            }
          ]
        );
        return;
      }

      await repos.snapshot.insertSingleSnapshotRow({
        snapshotId: snapshotId!, warehouseName: warehouseName!,
        itemCode: code, itemName: newItemName.trim(), uom: newItemUom.trim() || t('common.field.uom'),
        onHandQty: 0, nameNorm: normKey(newItemName.trim()), codeNorm: normKey(code),
      });
      if (sessionId && locationId) {
        await repos.session.upsertLocationScopeItem({
          sessionId,
          locationId,
          itemKey: code,
          source: 'manual',
        });
      }

      const createdRow = {
        itemKey: code, itemCode: code, itemName: newItemName.trim(), uom: newItemUom.trim() || t('common.field.uom'), onHandQty: 0,
      };
      if (scanMode !== 'QUICK') {
        selectItemForScan(createdRow, incrementStep, { emitSound: false });
      } else {
        setSelected(createdRow);
        fetchActual(code);
      }
      setIsCreating(false);
      setNewItemName('');
      setNewItemUom('');
      setNewItemCode('');
      setQ('');
    } catch (e) {
      withBlockingAlert(t('scan.alertCreateErrorTitle'), String(e));
    } finally {
      setSaving(false);
    }
  };

  const startCreateItem = () => {
    setNewItemCode(q.trim());
    setSuggest([]);
    setQ('');
    setIsCreating(true);
  };

  const onRequestSetMode = () => {
    if (scanMode !== 'QUICK') return;
    if (mode === 'set') return;
    withBlockingAlert(
      t('scan.alertSetModeTitle'),
      t('scan.alertSetModeMessage'),
      [
        { text: t('common.button.cancel'), style: 'cancel' },
        { text: t('scan.alertOverwrite'), style: 'destructive', onPress: () => setMode('set') }
      ]
    );
  };

  const saveDraft = React.useCallback(async (itemKey: string) => {
    if (!sessionId || !locationId) return;
    const draft = draftsRef.current[itemKey];
    if (!draft) return;
    setSaving(true);
    addScanLock('saving');
    try {
      const scopeState = await repos.count.isItemInLocationScope({
        sessionId,
        locationId,
        itemKey,
      });
      const isOutOfScope = scopeState.hasMapping && !scopeState.inScope;
      await repos.count.upsertCountLine({
        sessionId,
        locationId,
        itemKey,
        mode: 'accumulate',
        qty: draft.qty,
        exceptions: undefined
      }, { isOutOfScope });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[itemKey];
        return next;
      });
      if (selectedRef.current?.itemKey === itemKey) {
        applyDraftQty(0);
      }
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('scan.toastDraftSaved'), ToastAndroid.SHORT);
      }
    } finally {
      setSaving(false);
      removeScanLock('saving');
    }
  }, [addScanLock, applyDraftQty, locationId, removeScanLock, sessionId, t]);

  const saveAllDrafts = React.useCallback(async () => {
    if (!sessionId || !locationId) return;
    setSaving(true);
    addScanLock('saving');
    try {
      const entries = Object.entries(draftsRef.current);
      const savedKeys = new Set<string>();
      for (const [itemKey, draft] of entries) {
        const scopeState = await repos.count.isItemInLocationScope({
          sessionId,
          locationId,
          itemKey,
        });
        const isOutOfScope = scopeState.hasMapping && !scopeState.inScope;
        await repos.count.upsertCountLine({
          sessionId,
          locationId,
          itemKey,
          mode: 'accumulate',
          qty: draft.qty,
          exceptions: undefined
        }, { isOutOfScope });
        savedKeys.add(itemKey);
      }

      const current = selectedRef.current;
      if (current && draftQtyRef.current > 0 && !savedKeys.has(current.itemKey)) {
        const scopeState = await repos.count.isItemInLocationScope({
          sessionId,
          locationId,
          itemKey: current.itemKey,
        });
        const isOutOfScope = scopeState.hasMapping && !scopeState.inScope;
        await repos.count.upsertCountLine({
          sessionId,
          locationId,
          itemKey: current.itemKey,
          mode: 'accumulate',
          qty: draftQtyRef.current,
          exceptions: exceptions
        }, { isOutOfScope });
      }

      setDrafts({});
      applyDraftQty(0);
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('scan.toastAllDraftSaved'), ToastAndroid.SHORT);
      }
    } finally {
      setSaving(false);
      removeScanLock('saving');
    }
  }, [addScanLock, applyDraftQty, exceptions, locationId, removeScanLock, sessionId, t]);

  const deleteDraft = React.useCallback((itemKey: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
  }, []);

  const clearSelection = React.useCallback(() => {
    const current = selectedRef.current;
    if (scanMode !== 'QUICK' && current && draftQtyRef.current > 0) {
      setDrafts((prevDrafts) => {
        const next = purgeDraftMap(prevDrafts);
        next[current.itemKey] = {
          qty: draftQtyRef.current,
          itemCode: current.itemCode,
          itemName: current.itemName,
          uom: current.uom,
          updatedAt: Date.now(),
        };
        return next;
      });
    }
    setSelected(null);
    setDraftQty(0);
    setQtyInput('');
    if (scanMode === 'QUICK') {
      loadQuickDefaultSuggestions();
    } else {
      setSuggest([]);
    }
    setQ('');
  }, [loadQuickDefaultSuggestions, purgeDraftMap, scanMode, setSuggest, setQ]);

  const selectDraft = React.useCallback(async (itemKey: string) => {
    if (!snapshotId || !warehouseName) return;
    const row = await repos.snapshot.getRowByItemKey({ snapshotId, warehouseName, itemKey });
    const draft = draftsRef.current[itemKey];
    if (!draft) return;
    const fallbackRow = row ?? {
      itemKey,
      itemCode: draft.itemCode,
      itemName: draft.itemName,
      uom: draft.uom,
      onHandQty: 0,
    };
    if (scanMode !== 'QUICK') {
      selectItemForScan(fallbackRow, 0, { emitSound: false });
      applyDraftQty(draft.qty);
    } else {
      selectItemForQuick(fallbackRow);
      setQtyInput(formatQtyInput(draft.qty));
    }
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
  }, [applyDraftQty, formatQtyInput, scanMode, selectItemForQuick, selectItemForScan, snapshotId, warehouseName]);

  const handleCameraScan = React.useCallback((val: string) => {
    if (!isScannerCurrentlyEnabled() || !canAcceptCameraScan) {
      handleBlockedScan('camera');
      return;
    }
    setQ(val);
    onSubmitQ(val);
  }, [canAcceptCameraScan, handleBlockedScan, isScannerCurrentlyEnabled, onSubmitQ]);

  const onWedgeChunk = React.useCallback((text: string) => {
    if (scanMode !== 'WEDGE') return;
    if (!text.trim()) return;
    if (!isScannerCurrentlyEnabled() || !canAcceptPhysicalWedge) {
      handleBlockedScan('wedge');
      return;
    }
    markScannerReceiving();
  }, [canAcceptPhysicalWedge, handleBlockedScan, isScannerCurrentlyEnabled, markScannerReceiving, scanMode]);

  const onWedgeReadyStateChange = React.useCallback((ready: boolean) => {
    if (scanMode !== 'WEDGE') return;
    if (ready) {
      setScannerState((prev) => (prev === 'receiving' ? prev : 'ready'));
      setScannerDebug({ lastError: null });
      return;
    }
    setScannerState('idle');
  }, [scanMode, setScannerDebug]);

  const onScannerIntentError = React.useCallback((message: string) => {
    if (scanMode !== 'WEDGE') return;
    setScannerState('error');
    setScannerDebug({ lastError: message || t('scan.scannerErrorIntent') });
  }, [scanMode, setScannerDebug, t]);

  const onWedgeFinalized = React.useCallback(async (
    payload: string,
    source: ScannerDebugSource = 'keyboard',
    suffix: WedgeFinalizeReason = 'unknown'
  ) => {
    if (scanMode !== 'WEDGE') return;
    if (!isScannerCurrentlyEnabled() || !canAcceptPhysicalWedge) {
      handleBlockedScan('wedge');
      return;
    }
    const normalized = normalizeScanPayload(payload);
    if (!normalized) return;

    const now = Date.now();
    const currentHash = `${source}:${normalized.toUpperCase()}`;
    const last = lastFinalizedRef.current;
    if (last && last.hash === currentHash && now - last.at <= WEDGE_DEDUPE_WINDOW_MS) {
      return;
    }
    lastFinalizedRef.current = { hash: currentHash, at: now };

    markScannerReceiving();
    pushScannerDebug({ source, value: normalized, suffix, error: null });

    const result = await handleScanInput(normalized);
    if (result === 'resolved') {
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('scan.toastAccepted', { code: normalized }), ToastAndroid.SHORT);
      }
      scheduleScannerReady(140);
      return;
    }

    if (result === 'error') {
      setScannerState('error');
      setScannerDebug({ lastError: t('scan.scannerErrorRuntime') });
    }

    if ((result === 'not_found' || result === 'error') && Platform.OS === 'android') {
      ToastAndroid.show(t('scan.toastRejected'), ToastAndroid.SHORT);
    }
    scheduleScannerReady(200);
  }, [
    handleBlockedScan,
    handleScanInput,
    markScannerReceiving,
    normalizeScanPayload,
    pushScannerDebug,
    scanMode,
    canAcceptPhysicalWedge,
    isScannerCurrentlyEnabled,
    scheduleScannerReady,
    setScannerDebug,
    t,
  ]);

  const selectSuggestion = React.useCallback((row: {
    itemKey: string;
    itemCode: string;
    itemName: string;
    uom: string;
    onHandQty: number;
  }) => {
    if (scanMode !== 'QUICK') {
      selectItemForScan(row, incrementStep, { emitSound: false });
    } else {
      selectItemForQuick(row);
    }
  }, [scanMode, selectItemForQuick, selectItemForScan]);

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
    const query = q.trim();
    if (!selected && query.length === 0) {
      loadQuickDefaultSuggestions();
      return;
    }
    const timer = setTimeout(() => {
      if (query.length >= 2 && !selected) {
        doResolve(query).catch((e) => logError('SCAN_AUTO_RESOLVE_ERROR', e));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [q, selected, doResolve, loadQuickDefaultSuggestions, scanMode]);

  React.useEffect(() => {
    if (selected) {
      setMode('accumulate');
    }
  }, [selected?.itemKey]);

  React.useEffect(() => {
    if (scanMode !== 'QUICK' && mode !== 'accumulate') {
      setMode('accumulate');
    }
  }, [scanMode]);

  React.useEffect(() => {
    if (scanMode === 'WEDGE') {
      if (!scannerEnabled) {
        setScannerState('idle');
        return;
      }
      setScannerState('ready');
      setScannerDebug({ lastError: null });
      return;
    }
    setScannerState('idle');
    if (scannerStateResetTimerRef.current) {
      clearTimeout(scannerStateResetTimerRef.current);
      scannerStateResetTimerRef.current = null;
    }
  }, [scanMode, scannerEnabled, setScannerDebug]);

  React.useEffect(() => {
    log('SCAN_MODE', scanMode);
  }, [scanMode]);

  React.useEffect(() => {
    clearScannerDebug();
    lastDebugAtRef.current = null;
    lastFinalizedRef.current = null;
    return () => {
      clearScannerDebug();
      lastDebugAtRef.current = null;
      lastFinalizedRef.current = null;
    };
  }, [clearScannerDebug]);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (scannerStateResetTimerRef.current) {
        clearTimeout(scannerStateResetTimerRef.current);
        scannerStateResetTimerRef.current = null;
      }
      if (blockedHintTimerRef.current) {
        clearTimeout(blockedHintTimerRef.current);
        blockedHintTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { sound } = await Sound.createAsync(
          require('../../../assets/sounds/tick.wav'),
          { shouldPlay: false, volume: 1.0 }
        );
        if (!mounted) {
          await sound.unloadAsync();
          return;
        }
        scanSoundRef.current = sound;
      } catch {}
    })();
    return () => {
      mounted = false;
      if (scanSoundRef.current) {
        scanSoundRef.current.unloadAsync();
        scanSoundRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    purgeExpiredDrafts();
  }, [scanMode, sessionId, locationId, purgeExpiredDrafts]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!sessionId || !locationId) return;
      const counts = await repos.session.listLocationCounts(sessionId);
      const loc = counts.find(c => c.locationId === locationId);
      if (loc && alive) {
        setLocationInfo({ code: loc.locationCode, name: loc.locationName });
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionId, locationId]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!snapshotId || !warehouseName || !params.itemKey) return;
      const row = await repos.snapshot.getRowByItemKey({ snapshotId, warehouseName, itemKey: params.itemKey });
      if (!alive) return;
      if (row) {
        if (scanMode !== 'QUICK') {
          selectItemForScan(row, 0);
        } else {
          selectItemForQuick(row);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.itemKey, snapshotId, warehouseName, fetchActual, scanMode, selectItemForQuick, selectItemForScan]);

  return {
      // Context
      router, snapshotId, warehouseName, sessionId, locationId,
      scanMode, setScanMode,
      locationInfo,

      // Search & Select
      q, setQ, onSubmitQ, handleCameraScan,
      scannerState, onWedgeChunk, onWedgeFinalized, onWedgeReadyStateChange, onScannerIntentError,
      physicalScanScope,
      canAcceptPhysicalWedge, canAcceptCameraScan,
      scannerEnabled, scanGateState, pauseReason, blockedHintVisible, addScanLock, removeScanLock, hasScanLock, withScanLock, withBlockingAlert, handleBlockedScan,
      selected, setSelected,
      suggest, setSuggest,
      
      // Input Logic
      qty, setQty, mode, setMode,
      qtyInputRef,
      
      // Creating New
      isCreating, setIsCreating, newItemName, setNewItemName, newItemUom, setNewItemUom,
      newItemCode, setNewItemCode, skuSuggestion, onCreateNewItem, startCreateItem,

      // Actions
      saving, onSave, fetchActual, onRequestSetMode, selectSuggestion,

      // Exceptions
      showExceptionModal, setShowExceptionModal,
      exceptions, addException, removeException,
      
      // Drafts
      draftQty, drafts, saveDraft, saveAllDrafts, deleteDraft, selectDraft, purgeExpiredDrafts, clearSelection,

      // Computed
      currentLine, lastAction
  }
}
