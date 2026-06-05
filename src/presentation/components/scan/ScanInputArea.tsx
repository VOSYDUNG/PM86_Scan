import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { ScanLine, X, Search } from 'lucide-react-native';
import { WedgeScannerInput, WedgeScannerInputHandle } from '@/infra/scan/WedgeScannerInput';
import { CameraScanner } from '@/infra/scan/CameraScanner';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';
import type { ScanGateState, ScanLockReason } from '@/presentation/hooks/useScanScreenLogic';
import type { PhysicalScanScope } from '@/presentation/store/appStore';

interface ScanInputAreaProps {
  scanMode: 'WEDGE' | 'CAMERA' | 'QUICK';
  scannerState: 'idle' | 'ready' | 'receiving' | 'error';
  scannerEnabled: boolean;
  scanGateState: ScanGateState;
  pauseReason?: ScanLockReason | null;
  physicalScanScope: PhysicalScanScope;
  shouldAutoRefocus?: boolean;
  q: string;
  setQ: (val: string) => void;
  onSubmitQ: (val: string) => void;
  onCameraScan: (val: string) => void;
  onWedgeChunk: (text: string) => void;
  onWedgeFinalized: (payload: string, source?: 'keyboard' | 'intent', suffix?: 'lf' | 'cr' | 'timeout' | 'unknown') => void;
  onWedgeReadyStateChange: (ready: boolean) => void;
  isItemSelected: boolean;
  cameraActive?: boolean;
  allowCameraWhenSelected?: boolean;
}

export function ScanInputArea({
  scanMode,
  scannerState,
  scannerEnabled,
  scanGateState,
  pauseReason,
  physicalScanScope,
  shouldAutoRefocus = false,
  q,
  setQ,
  onSubmitQ,
  onCameraScan,
  onWedgeChunk,
  onWedgeFinalized,
  onWedgeReadyStateChange,
  isItemSelected,
  cameraActive = true,
  allowCameraWhenSelected = true,
}: ScanInputAreaProps) {
  const { t } = useI18n();
  const wedgeRef = React.useRef<WedgeScannerInputHandle | null>(null);
  const [wedgeInputValue, setWedgeInputValue] = React.useState('');
  const onSearch = () => {
    if (!q.trim()) return;
    onSubmitQ(q);
  };

  React.useEffect(() => {
    if (scanMode !== 'WEDGE' && wedgeInputValue) {
      setWedgeInputValue('');
    }
  }, [scanMode, wedgeInputValue]);

  React.useEffect(() => {
    if (physicalScanScope === 'INVENTORY_WEDGE_ACTIVE' && shouldAutoRefocus) {
      const timer = setTimeout(() => wedgeRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
    if (physicalScanScope !== 'INVENTORY_WEDGE_ACTIVE') {
      wedgeRef.current?.blur();
    }
  }, [physicalScanScope, shouldAutoRefocus]);

  const scannerStatusColor =
    scannerState === 'ready'
      ? COLORS.success
      : scannerState === 'receiving'
      ? COLORS.primary
      : scannerState === 'error'
      ? COLORS.error
      : COLORS.textLight;

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
    <View style={styles.scannerContainer}>
        {scanMode === 'CAMERA' && physicalScanScope === 'INVENTORY_CAMERA_ACTIVE' && cameraActive && scannerEnabled && (allowCameraWhenSelected || !isItemSelected) ? (
          <View style={styles.cameraWrapper}>
             <CameraScanner onScan={onCameraScan} variant="barcode" active={scannerEnabled} />
          </View>
        ) : null}

        {scanMode === 'CAMERA' && scanGateState === 'paused' ? (
          <View style={styles.pausedCard}>
            <Text style={styles.pausedTitle}>{t('scan.cameraPausedTitle')}</Text>
            <Text style={styles.pausedDesc}>
              {t('scan.cameraPausedDesc')}
              {pauseReasonLabel ? ` ${pauseReasonLabel}.` : ''}
            </Text>
          </View>
        ) : null}

        {scanMode === 'WEDGE' ? (
          <View style={styles.wedgeHintCard}>
            <View style={styles.wedgeHeader}>
              <Text style={styles.wedgeTitle}>{t('scan.wedgeTitle')}</Text>
              <View style={[styles.scannerBadge, { borderColor: scanGateState === 'paused' ? COLORS.warning : scannerStatusColor }]}>
                <View style={[styles.scannerDot, { backgroundColor: scanGateState === 'paused' ? COLORS.warning : scannerStatusColor }]} />
                <Text style={styles.scannerBadgeText}>
                  {scanGateState === 'paused' ? t('scan.gatePaused') : scannerStatusLabel}
                </Text>
              </View>
            </View>
            <Text style={styles.wedgeText}>
              {scanGateState === 'paused' ? t('scan.wedgePausedDesc') : t('scan.wedgeHint')}
            </Text>
            <Text style={styles.wedgeGuide}>
              {scanGateState === 'paused' && pauseReasonLabel ? pauseReasonLabel : t('scan.wedgeGuide')}
            </Text>
            <Pressable style={[styles.wedgeRefocusBtn, physicalScanScope !== 'INVENTORY_WEDGE_ACTIVE' && styles.disabledBtn]} disabled={physicalScanScope !== 'INVENTORY_WEDGE_ACTIVE'} onPress={() => wedgeRef.current?.focus()}>
              <Text style={styles.wedgeRefocusText}>{t('scan.wedgeRefocus')}</Text>
            </Pressable>
            <WedgeScannerInput
              ref={wedgeRef}
              value={wedgeInputValue}
              onChangeText={setWedgeInputValue}
              onChunk={onWedgeChunk}
              onFinalized={onWedgeFinalized}
              onReadyStateChange={onWedgeReadyStateChange}
              autoFocus={physicalScanScope === 'INVENTORY_WEDGE_ACTIVE'}
              active={physicalScanScope === 'INVENTORY_WEDGE_ACTIVE'}
              keepFocus={physicalScanScope === 'INVENTORY_WEDGE_ACTIVE'}
              blurOnSubmit={false}
              showSoftInputOnFocus={false}
              placeholder={t('scan.wedgeInputPlaceholder')}
              finalizeTimeoutMs={80}
              containerStyle={styles.hiddenInput}
              style={styles.hiddenInput}
            />
          </View>
        ) : scanMode === 'QUICK' ? (
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>{t('scan.inputLabel')}</Text>
            <View style={styles.inputWrapper}>
               <ScanLine size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
               <WedgeScannerInput 
                  value={q} 
                  onChangeText={setQ} 
                  onSubmit={onSubmitQ} 
                  autoFocus={false}
                  blurOnSubmit={true}
                  placeholder={t('scan.wedgeInputPlaceholder')}
                  style={{ flex: 1, fontSize: 16 }}
               />
               {q.length > 0 && (
                 <Pressable onPress={() => setQ('')} style={styles.iconBtn}>
                   <X size={18} color={COLORS.textSecondary}/>
                 </Pressable>
               )}
               <Pressable onPress={onSearch} style={[styles.searchBtn, !q.trim() && styles.searchBtnDisabled]}>
                 <Search size={16} color={q.trim() ? '#FFF' : COLORS.textLight} />
               </Pressable>
            </View>
            <Text style={styles.helperText}>
              {t('scan.inputTip')}
            </Text>
          </View>
        ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scannerContainer: { marginBottom: SPACING.m },
  cameraWrapper: { height: 200, borderRadius: SIZES.radiusLarge, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: COLORS.divider },
  inputCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge, padding: SPACING.m, ...SHADOWS.card },
  inputLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '700' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.divider, borderRadius: SIZES.radiusLarge, paddingHorizontal: SPACING.m, height: 52 },
  iconBtn: { padding: 4 },
  searchBtn: {
    marginLeft: 6,
    padding: 6,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
  },
  searchBtnDisabled: {
    backgroundColor: COLORS.divider,
  },
  helperText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 8 },
  wedgeHintCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge, padding: SPACING.m, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.divider, gap: 8 },
  wedgeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  wedgeTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textMain },
  wedgeText: { fontSize: 12, color: COLORS.textSecondary },
  wedgeGuide: { fontSize: 11, color: COLORS.textLight },
  wedgeRefocusBtn: { alignSelf: 'flex-start', backgroundColor: COLORS.infoBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.divider },
  wedgeRefocusText: { color: COLORS.primary, fontWeight: '700', fontSize: 11 },
  scannerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.background },
  scannerDot: { width: 8, height: 8, borderRadius: 4 },
  scannerBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textMain },
  hiddenInput: { height: 0, opacity: 0 },
  pausedCard: { backgroundColor: COLORS.warningBg, borderRadius: SIZES.radiusLarge, padding: SPACING.m, borderWidth: 1, borderColor: COLORS.warning, ...SHADOWS.card },
  pausedTitle: { fontSize: 13, fontWeight: '800', color: COLORS.warning },
  pausedDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  disabledBtn: { opacity: 0.45 },
});
