import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/presentation/components/ui';
import { COLORS, SPACING } from '@/presentation/theme';

interface ItemDetailCardProps {
  itemCode: string;
  itemName: string;
  uom: string;
  onHandQty: number;
  currentLine: { total: number; usable: number } | null;
}

export function ItemDetailCard({ itemCode, itemName, uom, onHandQty, currentLine }: ItemDetailCardProps) {
  return (
    <Card style={{ borderColor: COLORS.primary, borderWidth: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
         <View style={{ flex: 1 }}>
            <Text style={styles.itemCodeBig}>{itemCode}</Text>
            <Text style={styles.itemNameBig}>{itemName}</Text>
            <Text style={{ color: COLORS.textSecondary }}>ĐVT: {uom}</Text>
         </View>
         <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Hiện có</Text>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{onHandQty}</Text>
         </View>
      </View>
      <View style={styles.divider} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
         <View>
           <Text style={{ fontSize: 14, color: COLORS.textMain }}>Đã kiểm (Vị trí này):</Text>
           <Text style={{ fontSize: 12, color: COLORS.textLight }}>Tổng / Tốt</Text>
         </View>
         <View style={{ alignItems: 'flex-end' }}>
           <Text style={styles.currentActualBig}>{currentLine ? currentLine.total : '--'}</Text>
           <Text style={{ fontSize: 14, color: COLORS.success, fontWeight: '700' }}>{currentLine ? currentLine.usable : '--'} OK</Text>
         </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  itemCodeBig: { fontSize: 14, fontFamily: 'monospace', color: COLORS.textSecondary },
  itemNameBig: { fontSize: 20, fontWeight: '800', color: COLORS.textMain, marginVertical: 4 },
  currentActualBig: { fontSize: 32, fontWeight: '800', color: COLORS.primary },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.s },
});
