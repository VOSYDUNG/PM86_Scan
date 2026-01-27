import React from 'react';
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, AlertTriangle, ArrowRight, CheckCircle, Info, Home } from 'lucide-react-native';

import { Screen, Card, Badge, KeyValue, PrimaryButton } from '@/presentation/components/ui';
import { useAppStore } from '@/presentation/store/appStore';
import { repos } from '@/config/di';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { QUALITY_LABEL_VI } from '@/domain/entities/types';

type CountLineDetail = Awaited<ReturnType<typeof repos.count.findAllCountLinesForItem>>[number] & {
  locationCode?: string;
  locationName?: string;
  locationType?: string;
};

export default function ItemDetailScreen() {
  const { itemKey } = useLocalSearchParams<{ itemKey: string }>();
  const router = useRouter();

  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const sessionId = useAppStore((s) => s.currentSessionId);
  const setCurrentLocationId = useAppStore((s) => s.setCurrentLocationId);

  const [snapshotRow, setSnapshotRow] = React.useState<any>(null);
  const [lines, setLines] = React.useState<CountLineDetail[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!itemKey || !snapshotId || !warehouseName || !sessionId) return;
    
    (async () => {
      setLoading(true);
      try {
        // 1. Get Snapshot Info
        const row = await repos.snapshot.getRowByItemKey({ snapshotId, warehouseName, itemKey });
        setSnapshotRow(row);

        // 2. Get Count Lines (from all locations)
        const rawLines = await repos.count.findAllCountLinesForItem({ sessionId, itemKey });
        
        // 3. Enrich with Location Info
        // (We could do a JOIN in repo, but for P1 doing it here is acceptable for single item)
        const locs = await repos.session.listLocationCounts(sessionId);
        
        const enriched = rawLines.map(line => {
           const loc = locs.find(l => l.locationId === line.locationId);
           return {
             ...line,
             locationCode: loc?.locationCode || '?',
             locationName: loc?.locationName || 'Unknown',
             locationType: loc?.locationType
           };
        });
        
        setLines(enriched);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [itemKey, snapshotId, warehouseName, sessionId]);

  // --- STATS CALCULATION ---
  const totalActual = lines.reduce((sum, l) => sum + l.countTotal, 0);
  const totalUsable = lines.reduce((sum, l) => sum + l.countUsable, 0);
  const totalBad = totalActual - totalUsable;
  const systemQty = snapshotRow?.onHandQty || 0;
  const diff = totalUsable - systemQty; // Comparing Usable vs System (MISA logic)

  // --- HINT LOGIC ---
  const getHints = () => {
    const hints = [];
    if (diff === 0 && lines.length > 0) return ['Dữ liệu khớp hoàn hảo.'];
    if (lines.length === 0) return ['Chưa kiểm kê mã này ở bất kỳ vị trí nào.'];
    
    if (diff < 0) {
       hints.push(`Còn thiếu ${Math.abs(diff)} đơn vị so với sổ sách.`);
       if (lines.some(l => l.locationType === 'WAREHOUSE')) {
          hints.push('Đã kiểm trong kho nhưng vẫn thiếu -> Kiểm tra các xe hoặc khu vực chờ xuất?');
       }
    } else {
       hints.push(`Dư ${diff} đơn vị. Có thể do nhập liệu nhầm hoặc hàng khuyến mãi?`);
    }

    if (totalBad > 0) {
       hints.push(`Phát hiện ${totalBad} hàng lỗi/hỏng. Hãy kiểm tra lại phân loại.`);
    }

    // Multi-location hint
    if (lines.length > 1) {
       hints.push(`Hàng nằm rải rác ở ${lines.length} vị trí.`);
    }

    return hints;
  };

  const jumpToLocation = (locId: string) => {
    setCurrentLocationId(locId);
    router.push('/scan');
  };

  if (!snapshotRow && !loading) {
    return (
       <Screen title="Chi tiết Item">
          <Text style={{ textAlign: 'center', marginTop: 20 }}>Không tìm thấy thông tin sản phẩm.</Text>
       </Screen>
    );
  }

  return (
    <Screen 
      title="Chi tiết kiểm kê" 
      scrollable
      headerRight={
        <Pressable onPress={() => router.push('/')} style={{ padding: 8, backgroundColor: COLORS.surface, borderRadius: 20 }}>
          <Home size={24} color={COLORS.primary} />
        </Pressable>
      }
    >
      {/* 1. INFO CARD */}
      <Card>
         <Text style={styles.code}>{snapshotRow?.itemCode}</Text>
         <Text style={styles.name}>{snapshotRow?.itemName}</Text>
         <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            <Badge label={snapshotRow?.uom || 'ĐVT'} type="neutral" />
            <Text style={{ color: COLORS.textSecondary }}>Kho gốc: {warehouseName}</Text>
         </View>
      </Card>

      {/* 2. STATS OVERVIEW */}
      <View style={styles.statsRow}>
         <View style={styles.statBox}>
            <Text style={styles.statLabel}>Sổ sách (MISA)</Text>
            <Text style={styles.statNum}>{systemQty}</Text>
         </View>
         <View style={[styles.statBox, { backgroundColor: COLORS.surface, borderColor: diff === 0 ? COLORS.success : COLORS.warning, borderWidth: 2 }]}>
            <Text style={styles.statLabel}>Thực tế (OK)</Text>
            <Text style={[styles.statNum, { color: diff === 0 ? COLORS.success : COLORS.warning }]}>
               {totalUsable}
            </Text>
            <Text style={{ fontSize: 12, color: diff === 0 ? COLORS.success : COLORS.warning, fontWeight: '700' }}>
               {diff > 0 ? '+' : ''}{diff}
            </Text>
         </View>
         <View style={styles.statBox}>
            <Text style={styles.statLabel}>Tổng đếm</Text>
            <Text style={styles.statNum}>{totalActual}</Text>
            {totalBad > 0 && <Text style={{ fontSize: 10, color: COLORS.error }}>({totalBad} lỗi)</Text>}
         </View>
      </View>

      {/* 3. HINTS */}
      <View style={styles.hintSection}>
         <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
            <Info size={16} color={COLORS.primary} />
            <Text style={{ fontWeight: '700', color: COLORS.primary }}>Gợi ý đối soát (Hints)</Text>
         </View>
         {getHints().map((h, i) => (
            <Text key={i} style={styles.hintText}>• {h}</Text>
         ))}
      </View>

      {/* 4. LOCATION BREAKDOWN */}
      <Text style={styles.sectionTitle}>Phân bổ chi tiết (Breakdown)</Text>
      
      {lines.length === 0 ? (
         <View style={styles.emptyBox}>
            <Text style={{ color: COLORS.textSecondary }}>Chưa đếm tại vị trí nào.</Text>
         </View>
      ) : (
         <View style={{ gap: SPACING.m }}>
            {lines.map((line) => (
               <Pressable 
                  key={line.locationId} 
                  style={styles.locRow}
                  onPress={() => jumpToLocation(line.locationId)}
               >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                     <View style={[styles.iconBox, { backgroundColor: line.locationType === 'WAREHOUSE' ? '#E3F2FD' : '#FFF3E0' }]}>
                        <MapPin size={20} color={line.locationType === 'WAREHOUSE' ? COLORS.primary : COLORS.warning} />
                     </View>
                     <View>
                        <Text style={styles.locName}>{line.locationName}</Text>
                        <Text style={styles.locCode}>{line.locationCode}</Text>
                     </View>
                  </View>
                  
                  <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                     <Text style={styles.locQty}>{line.countTotal}</Text>
                     {line.countTotal !== line.countUsable && (
                        <Text style={{ fontSize: 11, color: COLORS.error }}>{line.countUsable} OK</Text>
                     )}
                  </View>
                  <ArrowRight size={16} color={COLORS.textLight} />
               </Pressable>
            ))}
         </View>
      )}

      {/* 5. EXCEPTIONS */}
      {totalBad > 0 && (
         <View>
            <Text style={[styles.sectionTitle, { color: COLORS.error, marginTop: SPACING.l }]}>Chi tiết lỗi (Exceptions)</Text>
            <Card style={{ backgroundColor: '#FFEBEE', borderColor: COLORS.error }}>
               {lines.flatMap(l => l.exceptions.map(e => ({ ...e, loc: l.locationName }))).map((ex, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                     <Text style={{ color: COLORS.textMain }}>{QUALITY_LABEL_VI[ex.reason] || ex.reason} ({ex.loc})</Text>
                     <Text style={{ fontWeight: '700', color: COLORS.error }}>{ex.qty}</Text>
                  </View>
               ))}
            </Card>
         </View>
      )}

    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 14, fontFamily: 'monospace', color: COLORS.textSecondary },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.textMain, marginVertical: 4 },
  
  statsRow: { flexDirection: 'row', gap: SPACING.m, marginBottom: SPACING.m },
  statBox: { 
    flex: 1, backgroundColor: COLORS.background, padding: 12, borderRadius: SIZES.radius, 
    alignItems: 'center', justifyContent: 'center' 
  },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  statNum: { fontSize: 20, fontWeight: '800', color: COLORS.textMain },
  
  hintSection: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: SIZES.radius, marginBottom: SPACING.m },
  hintText: { fontSize: 13, color: COLORS.textMain, marginBottom: 2, lineHeight: 18 },
  
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textMain, marginBottom: SPACING.s },
  
  locRow: { 
     flexDirection: 'row', alignItems: 'center', 
     backgroundColor: COLORS.surface, padding: 12, borderRadius: SIZES.radius,
     ...SHADOWS.card
  },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  locName: { fontWeight: '700', color: COLORS.textMain },
  locCode: { fontSize: 12, color: COLORS.textSecondary },
  locQty: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  
  emptyBox: { padding: 20, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: SIZES.radius },
});
