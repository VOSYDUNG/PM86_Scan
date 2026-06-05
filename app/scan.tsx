import React from 'react';
import { useIsFocused } from '@react-navigation/native';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Plus, Save, X } from 'lucide-react-native';
import { Screen, PrimaryButton } from '@/presentation/components/ui';
import { COLORS, SPACING, SHADOWS } from '@/presentation/theme';
import { useScanScreenLogic } from '@/presentation/hooks/useScanScreenLogic';
import { log } from '@/infra/logger';
import { useI18n } from '@/presentation/i18n/useI18n';
import { IntentScannerBridge } from '@/infra/scan/IntentScannerBridge';
import { useAppStore } from '@/presentation/store/appStore';

// Components
import { ScanHeader } from '@/presentation/components/scan/ScanHeader';
import { ScanInputArea } from '@/presentation/components/scan/ScanInputArea';
import { ItemDetailCard } from '@/presentation/components/scan/ItemDetailCard';
import { QuantityControl } from '@/presentation/components/scan/QuantityControl';
import { ExceptionSection } from '@/presentation/components/scan/ExceptionSection';
import { CreateItemForm } from '@/presentation/components/scan/CreateItemForm';
import { SuggestionList } from '@/presentation/components/scan/SuggestionList';
import { ScanLastAction } from '@/presentation/components/scan/ScanLastAction';

export default function ScanScreen() {
  const { t } = useI18n();
  const {
    // Context
    router, snapshotId, warehouseName, sessionId, locationId,
    scanMode, setScanMode, locationInfo,

    // Search
    q, setQ, onSubmitQ, handleCameraScan,
    scannerState, onWedgeChunk, onWedgeFinalized, onWedgeReadyStateChange, onScannerIntentError,
    physicalScanScope, canAcceptPhysicalWedge,
    scannerEnabled, scanGateState, pauseReason, blockedHintVisible, addScanLock, removeScanLock, withBlockingAlert, handleBlockedScan,
    selected, suggest,

    // Input
    qty, setQty, mode, setMode, qtyInputRef,

    // Create
    isCreating, setIsCreating, newItemName, setNewItemName, newItemUom, setNewItemUom,
    newItemCode, setNewItemCode, skuSuggestion, onCreateNewItem, startCreateItem,

    // Actions
    saving, onSave, onRequestSetMode, selectSuggestion,

    // Exceptions
    showExceptionModal, setShowExceptionModal,
    exceptions, addException, removeException,

    // Drafts
    draftQty, drafts, saveAllDrafts, selectDraft, purgeExpiredDrafts,

    // Computed
    currentLine, lastAction
  } = useScanScreenLogic();
  const isFocused = useIsFocused();
  const activeRouteScope = useAppStore((s) => s.activeRouteScope);
  const appIsForeground = useAppStore((s) => s.appIsForeground);
  const setPhysicalScanScope = useAppStore((s) => s.setPhysicalScanScope);
  const [showEditorModal, setShowEditorModal] = React.useState(false);
  const hasScanContext = !!snapshotId && !!warehouseName && !!sessionId && !!locationId;

  React.useEffect(() => {
    log('SCREEN_SCAN_ENTER');
    return () => log('SCREEN_SCAN_LEAVE');
  }, []);

  const hasPendingDraft = draftQty > 0 || Object.keys(drafts).length > 0 || q.trim().length > 0 || qty.trim().length > 0;

  const leaveAfterConfirm = React.useCallback((intent: 'switch' | 'finish') => {
    log(intent === 'switch' ? 'SCAN_SWITCH_LOCATION' : 'SCAN_FINISH');
    if (intent === 'switch') {
      router.replace('/locations' as any);
      return;
    }
    router.replace('/inventory');
  }, [router]);

  const saveAllThenLeave = React.useCallback(async (intent: 'switch' | 'finish') => {
    try {
      await saveAllDrafts();
      leaveAfterConfirm(intent);
    } catch (e) {
      withBlockingAlert(t('scan.alertSaveErrorTitle'), String(e));
    }
  }, [leaveAfterConfirm, saveAllDrafts, t, withBlockingAlert]);

  const confirmLeave = React.useCallback((intent: 'switch' | 'finish') => {
    const title = intent === 'switch' ? t('scan.switchConfirmTitle') : t('scan.finishConfirmTitle');
    const message = hasPendingDraft
      ? intent === 'switch'
        ? t('scan.switchConfirmWithDraft')
        : t('scan.finishConfirmWithDraft')
      : intent === 'switch'
      ? t('scan.switchConfirmNoDraft')
      : t('scan.finishConfirmNoDraft');

    const actions = [
      { text: t('scan.stay'), style: 'cancel' as const },
      ...(hasPendingDraft
        ? [
            {
              text: t('scan.leaveSaveAll'),
              onPress: () => {
                saveAllThenLeave(intent).catch((e) => withBlockingAlert(t('scan.alertSaveErrorTitle'), String(e)));
              },
            },
          ]
        : []),
      {
        text: t('scan.leaveWithoutSave'),
        style: 'destructive' as const,
        onPress: () => leaveAfterConfirm(intent),
      },
    ];

    withBlockingAlert(title, message, actions);
  }, [hasPendingDraft, leaveAfterConfirm, saveAllThenLeave, t, withBlockingAlert]);

  const onFinish = React.useCallback(() => {
    confirmLeave('finish');
  }, [confirmLeave]);

  React.useEffect(() => {
    if (showEditorModal) {
      addScanLock('editing_draft');
      return;
    }
    removeScanLock('editing_draft');
  }, [addScanLock, removeScanLock, showEditorModal]);

  React.useEffect(() => {
    if (showExceptionModal) {
      addScanLock('editing_exception');
      return;
    }
    removeScanLock('editing_exception');
  }, [addScanLock, removeScanLock, showExceptionModal]);

  React.useEffect(() => {
    if (isCreating) {
      addScanLock('creating_item');
      return;
    }
    removeScanLock('creating_item');
  }, [addScanLock, isCreating, removeScanLock]);

  React.useEffect(() => {
    if (!isFocused || !appIsForeground) {
      addScanLock('background');
      return;
    }
    removeScanLock('background');
  }, [addScanLock, appIsForeground, isFocused, removeScanLock]);

  React.useEffect(() => {
    if (activeRouteScope !== 'SCAN' || !hasScanContext || !isFocused || !appIsForeground) {
      setPhysicalScanScope('DISABLED');
      return;
    }

    if (scanMode === 'WEDGE') {
      setPhysicalScanScope(scanGateState === 'active' ? 'INVENTORY_WEDGE_ACTIVE' : 'INVENTORY_WEDGE_PAUSED');
      return;
    }

    if (scanMode === 'CAMERA') {
      setPhysicalScanScope(scanGateState === 'active' ? 'INVENTORY_CAMERA_ACTIVE' : 'INVENTORY_CAMERA_PAUSED');
      return;
    }

    setPhysicalScanScope('DISABLED');
  }, [activeRouteScope, appIsForeground, hasScanContext, isFocused, scanGateState, scanMode, setPhysicalScanScope]);

  React.useEffect(() => {
    return () => setPhysicalScanScope('DISABLED');
  }, [setPhysicalScanScope]);

  if (!hasScanContext) {
    return (
      <Screen title={t('scan.noLocationTitle')}>
        <View style={{ padding: SPACING.m, alignItems: 'center', gap: SPACING.m }}>
           <Text style={{ textAlign: 'center', color: COLORS.textSecondary }}>
             {t('scan.noLocationDesc')}
           </Text>
           <PrimaryButton label={t('scan.chooseLocationNow')} onPress={() => router.replace('/locations' as any)} />
        </View>
      </Screen>
    );
  }

  const draftEntries = React.useMemo(() => {
    const list = Object.entries(drafts).map(([itemKey, d]) => ({
      itemKey,
      itemCode: d.itemCode,
      itemName: d.itemName,
      uom: d.uom,
      qty: d.qty,
      updatedAt: d.updatedAt,
      isCurrent: false,
    }));
    if (selected && draftQty > 0) {
      list.unshift({
        itemKey: selected.itemKey,
        itemCode: selected.itemCode,
        itemName: selected.itemName,
        uom: selected.uom,
        qty: draftQty,
        updatedAt: Date.now(),
        isCurrent: true,
      });
    }
    return list;
  }, [drafts, selected, draftQty]);

  const openDraftEditor = React.useCallback(
    async (itemKey: string, isCurrent: boolean) => {
      addScanLock('editing_draft');
      purgeExpiredDrafts();
      try {
        if (!isCurrent) {
          await selectDraft(itemKey);
        }
        setShowEditorModal(true);
      } catch (e) {
        removeScanLock('editing_draft');
        throw e;
      }
    },
    [addScanLock, purgeExpiredDrafts, removeScanLock, selectDraft]
  );

  const selectedQty = React.useMemo(() => {
    if (scanMode !== 'QUICK') return draftQty;
    const parsed = Number(qty);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [draftQty, qty, scanMode]);

  const isWedgeReady =
    scanMode !== 'WEDGE' ||
    ((scannerState === 'ready' || scannerState === 'receiving') && canAcceptPhysicalWedge);
  const saveAllDisabled = !hasPendingDraft || saving;

  const executeSaveAllDrafts = React.useCallback(async () => {
    try {
      await saveAllDrafts();
    } catch (e) {
      withBlockingAlert(t('scan.alertSaveErrorTitle'), String(e));
    }
  }, [saveAllDrafts, t, withBlockingAlert]);

  const onSaveAllFromQueue = React.useCallback(() => {
    if (saveAllDisabled) return;
    if (selectedQty > 0 && exceptions.length === 0) {
      withBlockingAlert(
        t('scan.alertConfirmNoErrorTitle'),
        t('scan.alertConfirmNoErrorAllMessage'),
        [
          { text: t('scan.alertReviewException'), style: 'cancel' },
          { text: t('scan.alertConfirmAllGood'), onPress: () => executeSaveAllDrafts().catch(() => undefined) },
        ]
      );
      return;
    }
    executeSaveAllDrafts().catch(() => undefined);
  }, [exceptions.length, executeSaveAllDrafts, saveAllDisabled, selectedQty, t, withBlockingAlert]);
  const scannerStatusLabel =
    scannerState === 'ready'
      ? t('scan.scannerReady')
      : scannerState === 'receiving'
      ? t('scan.scannerReceiving')
      : scannerState === 'error'
      ? t('scan.scannerErrorConfig')
      : t('scan.scannerIdle');

  const pauseReasonLabel =
    pauseReason === 'editing_draft'
      ? t('scan.pauseReasonEditingDraft')
      : pauseReason === 'editing_exception'
      ? t('scan.pauseReasonEditingException')
      : pauseReason === 'creating_item'
      ? t('scan.pauseReasonCreatingItem')
      : pauseReason === 'confirming'
      ? t('scan.pauseReasonConfirming')
      : pauseReason === 'saving'
      ? t('scan.pauseReasonSaving')
      : pauseReason === 'background'
      ? t('scan.pauseReasonBackground')
      : '';

  return (
    <Screen
      title={t('scan.title')}
      subtitle={t('scan.subtitle')}
      scrollable
      headerRight={
        <Pressable onPress={onFinish} style={styles.finishBtn}>
          <Text style={styles.finishText}>{t('scan.finishBtn')}</Text>
        </Pressable>
      }
    >
      <ScanLastAction action={lastAction} />
      
      {/* HEADER */}
      <ScanHeader 
        locationName={locationInfo?.name || ''} 
        locationCode={locationInfo?.code || ''}
        scanMode={scanMode}
        setScanMode={setScanMode}
        onSwitchLocation={() => confirmLeave('switch')}
      />

      <View style={styles.contextBar}>
        <View style={styles.contextChip}>
          <Text style={styles.contextLabel}>{t('scan.contextLocation')}</Text>
          <Text style={styles.contextValue} numberOfLines={1}>
            {locationInfo?.code || t('common.status.noData')}
          </Text>
        </View>
        <View style={styles.contextChip}>
          <Text style={styles.contextLabel}>{t('scan.contextMode')}</Text>
          <Text style={styles.contextValue}>
            {scanMode === 'WEDGE' ? t('scan.modeWedge') : scanMode === 'CAMERA' ? t('scan.modeCamera') : t('scan.modeQuick')}
          </Text>
        </View>
        {scanMode === 'WEDGE' ? (
          <View style={styles.contextChip}>
            <Text style={styles.contextLabel}>{t('scan.scannerChannel')}</Text>
            <Text style={styles.contextValue}>{scannerStatusLabel}</Text>
          </View>
        ) : null}
      </View>

      {scanMode !== 'QUICK' ? (
        <View style={[styles.gateBanner, scanGateState === 'paused' ? styles.gateBannerPaused : styles.gateBannerActive]}>
          <Text style={[styles.gateTitle, scanGateState === 'paused' ? styles.gateTitlePaused : styles.gateTitleActive]}>
            {scanGateState === 'paused' ? t('scan.gatePaused') : t('scan.gateActive')}
          </Text>
          <Text style={styles.gateDesc}>
            {scanGateState === 'paused'
              ? pauseReasonLabel
              : scanMode === 'WEDGE'
              ? scannerStatusLabel
              : t('scan.modeCamera')}
          </Text>
          {blockedHintVisible ? <Text style={styles.gateHint}>{t('scan.blockedHint')}</Text> : null}
        </View>
      ) : null}

      {scanMode === 'WEDGE' ? (
        <IntentScannerBridge
          enabled={physicalScanScope === 'INVENTORY_WEDGE_ACTIVE'}
          onScan={(payload) => onWedgeFinalized(payload, 'intent', 'unknown')}
          onError={onScannerIntentError}
        />
      ) : null}

      {scanMode === 'WEDGE' && scannerState === 'error' ? (
        <Text style={styles.scannerWarning}>{t('scan.scannerSetupHint')}</Text>
      ) : null}

      {/* INPUT AREA */}
        <ScanInputArea 
          scanMode={scanMode}
          scannerState={scannerState}
          scannerEnabled={scannerEnabled}
          scanGateState={scanGateState}
          pauseReason={pauseReason}
          physicalScanScope={physicalScanScope}
          shouldAutoRefocus={physicalScanScope === 'INVENTORY_WEDGE_ACTIVE'}
          q={q}
          setQ={setQ}
          onSubmitQ={onSubmitQ}
        onCameraScan={handleCameraScan}
        onWedgeChunk={onWedgeChunk}
        onWedgeFinalized={onWedgeFinalized}
          onWedgeReadyStateChange={onWedgeReadyStateChange}
          isItemSelected={!!selected}
          cameraActive={isFocused}
          allowCameraWhenSelected={scannerEnabled}
        />

      {/* MAIN INTERFACE */}
      {isCreating ? (
         <CreateItemForm 
            itemCode={q}
            newItemCode={newItemCode}
            setNewItemCode={setNewItemCode}
            suggestedCode={skuSuggestion}
            onApplySuggestion={() => {
              if (skuSuggestion) setNewItemCode(skuSuggestion);
            }}
            newItemName={newItemName}
            setNewItemName={setNewItemName}
            newItemUom={newItemUom}
            setNewItemUom={setNewItemUom}
            onCancel={() => {
              setIsCreating(false);
              setNewItemName('');
              setNewItemUom('');
              setNewItemCode('');
            }}
            onCreate={onCreateNewItem}
            loading={saving}
            scannerMode={scanMode}
            scannerEnabled={scannerEnabled}
            onScannerBurstRejected={() => handleBlockedScan('wedge-visible-input')}
         />
      ) : scanMode === 'QUICK' ? (
         <SuggestionList 
            suggest={suggest}
            q={q}
            onSelect={selectSuggestion}
            onCreateNew={startCreateItem}
            useVirtualized={false}
         />
      ) : (
        <View style={styles.scanQueueCard}>
          <View style={styles.scanQueueHeader}>
            <View style={styles.scanQueueHeaderInfo}>
              <Text style={styles.scanQueueTitle}>{t('scan.scanQueueTitle')}</Text>
              <Text style={styles.scanQueueHint}>{t('scan.scanQueueHint')}</Text>
            </View>
            <View style={styles.queueActions}>
              <Pressable
                style={[styles.saveAllChip, saveAllDisabled && styles.addNewChipDisabled]}
                disabled={saveAllDisabled}
                onPress={onSaveAllFromQueue}
              >
                <Save size={14} color={saveAllDisabled ? COLORS.textLight : '#FFF'} />
                <Text style={[styles.saveAllChipText, saveAllDisabled && { color: COLORS.textLight }]}>{t('scan.saveAllQueue')}</Text>
              </Pressable>
              <Pressable style={[styles.addNewChip, (!isWedgeReady || scanGateState === 'paused' || saving) && styles.addNewChipDisabled]} disabled={!isWedgeReady || scanGateState === 'paused' || saving} onPress={startCreateItem}>
                <Plus size={14} color="#FFF" />
                <Text style={styles.addNewChipText}>{t('scan.addNew')}</Text>
              </Pressable>
            </View>
          </View>

          {draftEntries.length === 0 ? (
            <Text style={styles.scanQueueEmpty}>{t('scan.scanQueueEmpty')}</Text>
          ) : (
            <View style={styles.scanQueueList}>
              {draftEntries.map((item) => (
                <Pressable
                  key={item.itemKey}
                  style={({ pressed }) => [styles.scanQueueRow, pressed && styles.scanQueueRowPressed]}
                  onPress={() => openDraftEditor(item.itemKey, !!item.isCurrent)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scanQueueItemName} numberOfLines={1}>
                      {item.itemName}
                    </Text>
                    <Text style={styles.scanQueueItemMeta} numberOfLines={1}>
                      {item.itemCode} • {item.uom}
                    </Text>
                  </View>
                  <View style={styles.scanQueueQtyBox}>
                    <Text style={styles.scanQueueQtyLabel}>{t('common.field.quantity')}</Text>
                    <Text style={styles.scanQueueQtyValue}>{item.qty}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <Modal visible={showEditorModal && !!selected} transparent animationType="fade" onRequestClose={() => setShowEditorModal(false)}>
        <View style={styles.editorOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowEditorModal(false)} />
          <View style={styles.editorModal}>
            <View style={styles.editorHeader}>
              <Text style={styles.editorTitle}>{t('scan.editorTitle')}</Text>
              <Pressable style={styles.editorCloseBtn} onPress={() => setShowEditorModal(false)}>
                <X size={16} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            {selected ? (
              <View style={styles.mainStack}>
                <ItemDetailCard
                  itemCode={selected.itemCode}
                  itemName={selected.itemName}
                  uom={selected.uom}
                  onHandQty={selected.onHandQty}
                  currentLine={currentLine}
                />
                <QuantityControl
                  qty={qty}
                  setQty={setQty}
                  mode={mode}
                  setMode={setMode}
                  onRequestSet={onRequestSetMode}
                  onSave={onSave}
                  onCancel={() => setShowEditorModal(false)}
                  saving={saving}
                  qtyInputRef={qtyInputRef}
                  showModeToggle={scanMode === 'QUICK'}
                  scannerMode={scanMode}
                  scannerEnabled={scannerEnabled}
                  onScannerBurstRejected={() => handleBlockedScan('wedge-visible-input')}
                >
                  <ExceptionSection
                    exceptions={exceptions}
                    onAddException={addException}
                    onRemoveException={removeException}
                    showModal={showExceptionModal}
                    setShowModal={setShowExceptionModal}
                    totalInputQty={selectedQty}
                    scannerMode={scanMode}
                    scannerEnabled={scannerEnabled}
                    onScannerBurstRejected={() => handleBlockedScan('wedge-visible-input')}
                  />
                </QuantityControl>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  finishBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    ...SHADOWS.card,
  },
  finishText: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 12, letterSpacing: 0.4 },
  contextBar: {
    flexDirection: 'row',
    gap: SPACING.s,
    marginBottom: SPACING.m,
    flexWrap: 'wrap',
  },
  contextChip: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: SPACING.m,
    paddingVertical: 8,
    ...SHADOWS.card,
  },
  contextLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700' },
  contextValue: { fontSize: 13, color: COLORS.textMain, fontWeight: '800', marginTop: 2 },
  gateBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: SPACING.m,
    paddingVertical: 10,
    marginBottom: SPACING.m,
    ...SHADOWS.card,
  },
  gateBannerActive: {
    backgroundColor: COLORS.infoBg,
    borderColor: COLORS.primary,
  },
  gateBannerPaused: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warning,
  },
  gateTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  gateTitleActive: {
    color: COLORS.primary,
  },
  gateTitlePaused: {
    color: COLORS.warning,
  },
  gateDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  gateHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  scannerWarning: {
    marginTop: -6,
    marginBottom: SPACING.s,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningBg,
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '700',
  },
  mainStack: { gap: SPACING.m, paddingBottom: 20 },
  scanQueueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: SPACING.m,
    marginBottom: SPACING.l,
    ...SHADOWS.card,
  },
  scanQueueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.s,
    marginBottom: SPACING.s,
    flexWrap: 'wrap',
  },
  scanQueueHeaderInfo: {
    flex: 1,
    minWidth: 180,
    paddingRight: 8,
  },
  queueActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanQueueTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMain },
  scanQueueHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  scanQueueEmpty: { fontSize: 13, color: COLORS.textSecondary, paddingVertical: 8 },
  scanQueueList: { gap: 8 },
  scanQueueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
  },
  scanQueueRowPressed: { opacity: 0.85 },
  scanQueueItemName: { fontSize: 14, fontWeight: '700', color: COLORS.textMain },
  scanQueueItemMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  scanQueueQtyBox: {
    minWidth: 58,
    borderRadius: 10,
    backgroundColor: COLORS.infoBg,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scanQueueQtyLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700' },
  scanQueueQtyValue: { fontSize: 16, color: COLORS.primary, fontWeight: '800' },
  addNewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
    alignSelf: 'flex-start',
  },
  addNewChipText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  saveAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.primaryDark,
    ...SHADOWS.card,
  },
  saveAllChipText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  addNewChipDisabled: {
    opacity: 0.45,
  },
  editorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: SPACING.m,
  },
  editorModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: SPACING.m,
    ...SHADOWS.float,
    maxHeight: '88%',
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.s,
  },
  editorTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  editorCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
