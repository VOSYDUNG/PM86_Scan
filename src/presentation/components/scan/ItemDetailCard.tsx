import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/presentation/components/ui';
import { COLORS, SPACING } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';

interface ItemDetailCardProps {
  itemCode: string;
  itemName: string;
  uom: string;
  onHandQty: number;
  currentLine: { total: number; usable: number } | null;
}

export function ItemDetailCard({ itemCode, itemName, uom, onHandQty, currentLine }: ItemDetailCardProps) {
  const { t } = useI18n();
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.codePill}>
          <Text style={styles.itemCodeBig}>{itemCode}</Text>
        </View>
        <View style={styles.stockPill}>
          <Text style={styles.stockLabel}>{t('scan.itemCardSystemStock')}</Text>
          <Text style={styles.stockValue}>{onHandQty}</Text>
        </View>
      </View>
      <Text style={styles.itemNameBig}>{itemName}</Text>
      <Text style={styles.uomText}>{t('scan.itemCardUom', { uom })}</Text>

      <View style={styles.divider} />

      <View style={styles.countRow}>
        <View>
          <Text style={styles.countLabel}>{t('scan.itemCardCountedHere')}</Text>
          <Text style={styles.countHint}>{t('scan.itemCardTotalGood')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.currentActualBig}>{currentLine ? currentLine.total : '--'}</Text>
          <Text style={styles.usableText}>{t('scan.itemCardGoodSuffix', { qty: currentLine ? currentLine.usable : '--' })}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: COLORS.primary, borderWidth: 1, borderRadius: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codePill: { backgroundColor: COLORS.infoBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  itemCodeBig: { fontSize: 12, fontFamily: 'monospace', color: COLORS.primary },
  stockPill: { alignItems: 'flex-end' },
  stockLabel: { fontSize: 11, color: COLORS.textSecondary },
  stockValue: { fontSize: 18, fontWeight: '800', color: COLORS.textMain },
  itemNameBig: { fontSize: 20, fontWeight: '800', color: COLORS.textMain, marginVertical: 6, fontFamily: 'sans-serif-condensed' },
  uomText: { color: COLORS.textSecondary },
  currentActualBig: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  usableText: { fontSize: 14, color: COLORS.success, fontWeight: '700' },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countLabel: { fontSize: 14, color: COLORS.textMain, fontWeight: '700' },
  countHint: { fontSize: 12, color: COLORS.textLight },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.s },
});
