import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { X, Save } from 'lucide-react-native';
import { PrimaryButton, SecondaryButton } from '@/presentation/components/ui';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';
import { GuardedTextInput } from '@/presentation/components/scan/GuardedTextInput';

interface QuantityControlProps {
  qty: string;
  setQty: (val: string) => void;
  mode: 'set' | 'accumulate';
  setMode: (mode: 'set' | 'accumulate') => void;
  onRequestSet: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  qtyInputRef: React.RefObject<TextInput | null>;
  children?: React.ReactNode;
  showModeToggle?: boolean;
  scannerMode?: 'WEDGE' | 'CAMERA' | 'QUICK';
  scannerEnabled?: boolean;
  onScannerBurstRejected?: () => void;
}

export function QuantityControl({
  qty,
  setQty,
  mode,
  setMode,
  onRequestSet,
  onSave,
  onCancel,
  saving,
  qtyInputRef,
  children,
  showModeToggle = true,
  scannerMode = 'QUICK',
  scannerEnabled = true,
  onScannerBurstRejected,
}: QuantityControlProps) {
  const { t } = useI18n();
  return (
    <View style={styles.controlPanel}>
       {showModeToggle ? (
         <>
           <View style={styles.segmentControl}>
              <Pressable style={[styles.segmentBtn, mode === 'accumulate' && styles.segmentBtnActive]} onPress={() => setMode('accumulate')}>
                <Text style={[styles.segmentText, mode === 'accumulate' && styles.segmentTextActive]}>{t('scan.modeAccumulate')}</Text>
              </Pressable>
              <Pressable style={[styles.segmentBtn, mode === 'set' && styles.segmentBtnActiveDanger]} onPress={onRequestSet}>
                <Text style={[styles.segmentText, mode === 'set' && styles.segmentTextActiveDanger]}>{t('scan.modeSet')}</Text>
              </Pressable>
           </View>
           <Text style={styles.modeHint}>
             {mode === 'set' ? t('scan.modeSetDesc') : t('scan.modeAccDesc')}
           </Text>
           {mode === 'set' && (
             <View style={styles.modeWarning}>
               <Text style={styles.modeWarningText}>{t('scan.modeSetWarn')}</Text>
               <Pressable onPress={() => setMode('accumulate')} style={styles.modeWarningBtn}>
                 <Text style={styles.modeWarningBtnText}>{t('scan.backToAcc')}</Text>
               </Pressable>
             </View>
           )}
         </>
       ) : (
         <Text style={styles.modeHint}>{t('scan.scanModeHint')}</Text>
       )}
       <View>
          <Text style={styles.label}>{t('scan.totalActualLabel')}</Text>
          <GuardedTextInput
            ref={qtyInputRef} 
            value={qty} 
            onChangeText={setQty} 
            scannerMode={scannerMode}
            scannerEnabled={scannerEnabled}
            onScannerBurstRejected={onScannerBurstRejected}
            keyboardType="numeric" 
            placeholder={t('scan.qtyPlaceholder')} 
            style={styles.qtyInput}
          />
       </View>
       <View style={{ flexDirection: 'row', gap: SPACING.s }}>
          {[1, 5, 10].map(n => (
            <Pressable key={n} style={styles.presetBtn} onPress={() => setQty(String((Number(qty) || 0) + n))}>
              <Text style={styles.presetText}>+{n}</Text>
            </Pressable>
          ))}
       </View>
       
       {children}
       
       <View style={{ flexDirection: 'row', gap: SPACING.s, marginTop: SPACING.s }}>
          <View style={{ flex: 1 }}><SecondaryButton label={t('common.button.cancel')} onPress={onCancel} icon={<X size={20} color={COLORS.textMain}/>} /></View>
          <View style={{ flex: 2 }}><PrimaryButton label={t('scan.saveBtn')} onPress={onSave} loading={saving} icon={<Save size={20} color="#FFF"/>} /></View>
       </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlPanel: { backgroundColor: COLORS.surface, padding: SPACING.m, borderRadius: 16, gap: SPACING.m, ...SHADOWS.card },
  segmentControl: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 14, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  segmentBtnActive: { backgroundColor: COLORS.primary },
  segmentBtnActiveDanger: { backgroundColor: COLORS.accent },
  segmentText: { fontWeight: '700', color: COLORS.textSecondary, fontSize: 12 },
  segmentTextActive: { color: '#FFF', fontWeight: '800' },
  segmentTextActiveDanger: { color: COLORS.primaryDark, fontWeight: '800' },
  modeHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: -4 },
  modeWarning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.warningBg, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  modeWarningText: { fontSize: 12, color: COLORS.warning, fontWeight: '700' },
  modeWarningBtn: { backgroundColor: `${COLORS.warning}22`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  modeWarningBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.warning },
  qtyInput: { borderWidth: 2, borderColor: COLORS.divider, borderRadius: SIZES.radius, fontSize: 24, fontWeight: '700', textAlign: 'center', paddingVertical: 12, backgroundColor: COLORS.background, color: COLORS.textMain },
  presetBtn: { flex: 1, backgroundColor: COLORS.infoBg, alignItems: 'center', paddingVertical: 12, borderRadius: SIZES.radius },
  presetText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  label: { fontWeight: '600', color: COLORS.textMain, fontSize: 13 },
});
