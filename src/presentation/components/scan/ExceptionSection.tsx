import React from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { PrimaryButton, SecondaryButton } from '@/presentation/components/ui';
import { COLORS } from '@/presentation/theme';
import { QUALITY_LABEL_KEY, QualityCode } from '@/domain/entities/types';
import { useI18n } from '@/presentation/i18n/useI18n';
import { GuardedTextInput } from '@/presentation/components/scan/GuardedTextInput';

interface ExceptionSectionProps {
  exceptions: Array<{ reason: QualityCode; qty: number }>;
  onAddException: (code: QualityCode, qty: string) => void;
  onRemoveException: (code: QualityCode) => void;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  totalInputQty: number;
  scannerMode?: 'WEDGE' | 'CAMERA' | 'QUICK';
  scannerEnabled?: boolean;
  onScannerBurstRejected?: () => void;
}

export function ExceptionSection({
  exceptions,
  onAddException,
  onRemoveException,
  showModal,
  setShowModal,
  totalInputQty,
  scannerMode = 'QUICK',
  scannerEnabled = true,
  onScannerBurstRejected,
}: ExceptionSectionProps) {
  const { t } = useI18n();
  const totalBad = exceptions.reduce((sum, e) => sum + e.qty, 0);
  const currentUsableInput = totalInputQty - totalBad;

  return (
    <View style={styles.exceptionSection}>
        <ExceptionModal 
            visible={showModal} 
            onClose={() => setShowModal(false)}
            onAdd={onAddException}
            scannerMode={scannerMode}
            scannerEnabled={scannerEnabled}
            onScannerBurstRejected={onScannerBurstRejected}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.label}>{t('scan.classifyBad')}</Text>
            <Pressable onPress={() => setShowModal(true)}><Text style={{ color: COLORS.error, fontWeight: '700' }}>{t('scan.reportError')}</Text></Pressable>
        </View>
        {exceptions.length > 0 ? (
            <View style={styles.exceptionList}>
            {exceptions.map(ex => (
                <View key={ex.reason} style={styles.exceptionItem}>
                    <Text style={{ flex: 1, color: COLORS.error }}>{t(QUALITY_LABEL_KEY[ex.reason] as any)}</Text>
                    <Text style={{ fontWeight: '700', marginRight: 8 }}>{ex.qty}</Text>
                    <Pressable onPress={() => onRemoveException(ex.reason)}><X size={16} color={COLORS.textLight} /></Pressable>
                </View>
            ))}
            <View style={styles.divider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '700' }}>{t('scan.remainGood')}</Text>
                <Text style={{ fontWeight: '800', color: COLORS.success }}>{currentUsableInput}</Text>
            </View>
            </View>
        ) : <Text style={{ color: COLORS.textLight, fontStyle: 'italic', marginTop: 4 }}>{t('scan.allGood')}</Text>}
    </View>
  );
}

function ExceptionModal({
  visible,
  onClose,
  onAdd,
  scannerMode = 'QUICK',
  scannerEnabled = true,
  onScannerBurstRejected,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (c: QualityCode, q: string) => void;
  scannerMode?: 'WEDGE' | 'CAMERA' | 'QUICK';
  scannerEnabled?: boolean;
  onScannerBurstRejected?: () => void;
}) {
   const { t } = useI18n();
   const [selectedReason, setSelectedReason] = React.useState<QualityCode | null>(null);
   const [qty, setQty] = React.useState('');
   const handleAdd = () => {
      if (selectedReason && qty) {
         onAdd(selectedReason, qty);
         setSelectedReason(null);
         setQty('');
         onClose();
      }
   };
   return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>{t('scan.addException')}</Text>
               <ScrollView style={{ maxHeight: 300 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                     {Object.keys(QUALITY_LABEL_KEY).filter((k) => k !== 'GOOD').map((code) => {
                        const isSelected = selectedReason === code;
                        return (
                           <Pressable key={code} style={[styles.reasonChip, isSelected && styles.reasonChipActive]} onPress={() => setSelectedReason(code as QualityCode)}>
                              <Text style={[styles.reasonText, isSelected && { color: '#FFF' }]}>{t(QUALITY_LABEL_KEY[code as QualityCode] as any)}</Text>
                           </Pressable>
                        )
                     })}
                  </View>
               </ScrollView>
               {selectedReason && (
                  <View style={{ marginTop: 16 }}>
                     <Text style={styles.label}>{t('scan.badQtyLabel')}</Text>
                     <GuardedTextInput value={qty} onChangeText={setQty} keyboardType="numeric" autoFocus style={styles.qtyInputSmall} scannerMode={scannerMode} scannerEnabled={scannerEnabled} onScannerBurstRejected={onScannerBurstRejected} />
                  </View>
               )}
               <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
                  <SecondaryButton label={t('common.button.cancel')} onPress={onClose} style={{ flex: 1 }} />
                  <PrimaryButton label={t('scan.addException')} onPress={handleAdd} disabled={!selectedReason || !qty} style={{ flex: 1 }} />
               </View>
            </View>
         </View>
      </Modal>
   )
}

const styles = StyleSheet.create({
  exceptionSection: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginTop: 16 },
  exceptionList: { marginTop: 8 },
  exceptionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { fontWeight: '600', color: COLORS.textMain, fontSize: 13 },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#DDD' },
  reasonChipActive: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  reasonText: { fontSize: 14, fontWeight: '500' },
  qtyInputSmall: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 18, marginTop: 8 }
});
