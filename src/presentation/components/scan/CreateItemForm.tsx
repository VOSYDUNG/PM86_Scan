import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Card, PrimaryButton, SecondaryButton, KeyValue } from '@/presentation/components/ui';
import { COLORS, SPACING, SIZES } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';
import { GuardedTextInput } from '@/presentation/components/scan/GuardedTextInput';

interface CreateItemFormProps {
  itemCode: string;
  newItemCode: string;
  setNewItemCode: (v: string) => void;
  suggestedCode?: string;
  onApplySuggestion?: () => void;
  newItemName: string;
  setNewItemName: (v: string) => void;
  newItemUom: string;
  setNewItemUom: (v: string) => void;
  onCancel: () => void;
  onCreate: () => void;
  loading: boolean;
  scannerMode?: 'WEDGE' | 'CAMERA' | 'QUICK';
  scannerEnabled?: boolean;
  onScannerBurstRejected?: () => void;
}

export function CreateItemForm({
  itemCode,
  newItemCode,
  setNewItemCode,
  suggestedCode,
  onApplySuggestion,
  newItemName,
  setNewItemName,
  newItemUom,
  setNewItemUom,
  onCancel,
  onCreate,
  loading,
  scannerMode = 'QUICK',
  scannerEnabled = true,
  onScannerBurstRejected,
}: CreateItemFormProps) {
  const { t } = useI18n();
  return (
    <ScrollView style={{ flex: 1 }}>
        <Card title={t('scan.createFormTitle')} icon={<Plus size={24} color={COLORS.accent} />}>
            {itemCode ? <KeyValue k={t('scan.scannedCodeLabel')} v={itemCode} /> : null}
            <View style={{ gap: 8 }}>
            <Text style={styles.label}>{t('scan.skuLabel')}</Text>
            <GuardedTextInput value={newItemCode} onChangeText={setNewItemCode} scannerMode={scannerMode} scannerEnabled={scannerEnabled} onScannerBurstRejected={onScannerBurstRejected} style={styles.textInputStandard} placeholder={t('scan.skuPlaceholder')} />
            {suggestedCode ? (
              <View style={styles.suggestionRow}>
                <Text style={styles.suggestionText}>{t('scan.suggestionLabel', { code: suggestedCode })}</Text>
                <Pressable onPress={onApplySuggestion} style={styles.suggestionBtn}>
                  <Text style={styles.suggestionBtnText}>{t('scan.useSuggestion')}</Text>
                </Pressable>
              </View>
            ) : null}
            </View>
            <View style={{ gap: 8 }}>
            <Text style={styles.label}>{t('scan.itemNameLabel')}</Text>
            <GuardedTextInput value={newItemName} onChangeText={setNewItemName} scannerMode={scannerMode} scannerEnabled={scannerEnabled} onScannerBurstRejected={onScannerBurstRejected} style={styles.textInputStandard} placeholder={t('scan.itemNamePlaceholder')} />
            </View>
            <View style={{ gap: 8 }}>
            <Text style={styles.label}>{t('scan.uomLabel')}</Text>
            <GuardedTextInput value={newItemUom} onChangeText={setNewItemUom} scannerMode={scannerMode} scannerEnabled={scannerEnabled} onScannerBurstRejected={onScannerBurstRejected} style={styles.textInputStandard} placeholder={t('scan.uomPlaceholder')} />
            </View>
            <View style={{ flexDirection: 'row', gap: SPACING.m, marginTop: SPACING.m }}>
                <SecondaryButton label={t('common.button.cancel')} onPress={onCancel} />
                <PrimaryButton label={t('scan.createAndInput')} onPress={onCreate} loading={loading} />
            </View>
        </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '600', color: COLORS.textMain, fontSize: 13 },
  textInputStandard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, padding: 12, fontSize: 14, backgroundColor: COLORS.background, minHeight: 48, textAlignVertical: 'top' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  suggestionText: { fontSize: 12, color: COLORS.textSecondary },
  suggestionBtn: { backgroundColor: COLORS.infoBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  suggestionBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
});
