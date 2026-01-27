import React, { useCallback, memo } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, Filter, RefreshCcw, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Screen, SecondaryButton } from '@/presentation/components/ui';
import { useAppStore } from '@/presentation/store/appStore';
import { repos } from '@/config/di';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';

type Row = Awaited<ReturnType<typeof repos.export.searchExportRows>>[number];

const ReportItemRow = memo(({ item, onPress }: { item: Row; onPress: (code: string) => void }) => {
  const isScanned = item.actualQty !== null;
  const hasDiff = (item.diffQty ?? 0) !== 0;
  
  let statusColor = COLORS.border;
  let StatusIcon = null;

  if (isScanned) {
    if (hasDiff) {
      statusColor = COLORS.warning;
      StatusIcon = AlertCircle;
    } else {
      statusColor = COLORS.success;
      StatusIcon = CheckCircle;
    }
  }

  return (
    <Pressable
      onPress={() => onPress(item.itemCode)}
      style={({ pressed }) => [
        styles.rowCard,
        { borderLeftColor: statusColor },
        pressed && { backgroundColor: COLORS.background }
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.itemName} numberOfLines={2}>{item.itemName}</Text>
        <Text style={styles.itemCode}>{item.itemCode}</Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
           {StatusIcon && <StatusIcon size={16} color={statusColor} />}
           <Text style={[styles.qtyActual, { color: isScanned ? COLORS.textMain : COLORS.textLight }]}>
             {item.actualQty ?? '-'}
           </Text>
        </View>
        <Text style={styles.qtyHand}>/{item.onHandQty} {item.uom}</Text>
        {hasDiff && (
           <Text style={{ color: COLORS.warning, fontWeight: '700', fontSize: 12 }}>
             {item.diffQty && item.diffQty > 0 ? '+' : ''}{item.diffQty}
           </Text>
        )}
      </View>
    </Pressable>
  );
});

export default function ReportItemsScreen() {
  const router = useRouter();
  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const sessionId = useAppStore((s) => s.currentSessionId);
  
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showDiffOnly, setShowDiffOnly] = React.useState(false);
  const [search, setSearch] = React.useState('');
  
  // Pagination
  const LIMIT = 50;
  const [page, setPage] = React.useState(0);
  const [totalRows, setTotalRows] = React.useState(0);

  // Stats
  const [stats, setStats] = React.useState({ total: 0, scanned: 0, diffCount: 0 });

  const loadStats = useCallback(async () => {
    if (!snapshotId || !warehouseName || !sessionId) return;
    try {
      const s = await repos.export.getExportStats({ sessionId, snapshotId, warehouseName });
      setStats(s);
    } catch (e) {
      console.warn('Stats error', e);
    }
  }, [snapshotId, warehouseName, sessionId]);

  const loadRows = useCallback(async (pageIndex = 0) => {
    if (!snapshotId || !warehouseName || !sessionId) return;
    if (loading) return; // Prevent double load
    
    setLoading(true);
    try {
      const searchTerm = search.trim() || undefined;
      const [newRows, total] = await Promise.all([
        repos.export.searchExportRows({
          sessionId,
          snapshotId,
          warehouseName,
          limit: LIMIT,
          offset: pageIndex * LIMIT,
          search: searchTerm,
          diffOnly: showDiffOnly,
        }),
        repos.export.getExportTotal({
          sessionId,
          snapshotId,
          warehouseName,
          search: searchTerm,
          diffOnly: showDiffOnly,
        }),
      ]);
      
      setRows(newRows);
      setTotalRows(total);
      setPage(pageIndex);
      
    } catch (e) {
      console.warn('Rows error', e);
    } finally {
      setLoading(false);
    }
  }, [snapshotId, warehouseName, sessionId, loading, search, showDiffOnly]);

  // Initial Load & Focus
  useFocusEffect(
    useCallback(() => {
      loadStats();
      // Only reload rows if empty or explicit refresh needed? 
      // Actually focus effect should probably refresh to get latest counts.
      // But we don't want to reset scroll position if just back from detail?
      // For now, let's reset to ensure data freshness.
      loadRows(0);
    }, [loadStats]) // Focus only
  );
  
  // On Filter Change
  React.useEffect(() => {
    // This effect is redundant if useFocusEffect dependencies cover it, 
    // but useFocusEffect only runs on Focus.
    // If we toggle filter while focused, we need this.
    // We should Debounce search if we want type-to-search.
    const timer = setTimeout(() => {
        loadRows(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [showDiffOnly, search]);

  const totalPages = Math.max(1, Math.ceil(totalRows / LIMIT));

  const handlePressItem = useCallback((code: string) => {
    router.push({ pathname: '/report/[itemKey]', params: { itemKey: code } });
  }, [router]);

  const renderItem = useCallback(({ item }: { item: Row }) => (
    <ReportItemRow item={item} onPress={handlePressItem} />
  ), [handlePressItem]);

  return (
    <Screen title="Tổng hợp (Cross-Location)" style={{ padding: 0 }}>
      <View style={styles.headerContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm tên hoặc mã hàng..."
            style={styles.searchInput}
            placeholderTextColor={COLORS.textLight}
          />
          {search.length > 0 && (
             <Pressable onPress={() => setSearch('')}>
               <Text style={{ fontSize: 20, color: COLORS.textSecondary }}>×</Text>
             </Pressable>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Tổng mã</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={[styles.statItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.divider }]}>
            <Text style={styles.statLabel}>Đã kiểm</Text>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.scanned}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lệch</Text>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.diffCount}</Text>
          </View>
        </View>

        {/* Actions */}
      <View style={styles.actionRow}>
         <SecondaryButton 
           label={showDiffOnly ? 'Hiện tất cả' : 'Chỉ lệch'}
           onPress={() => setShowDiffOnly(!showDiffOnly)}
           icon={<Filter size={16} color={showDiffOnly ? COLORS.warning : COLORS.primary} />}
           color={showDiffOnly ? COLORS.warning : COLORS.primary}
           style={{ flex: 1, paddingHorizontal: 4 }}
         />
         <SecondaryButton 
           label="Tải lại" 
           onPress={() => { loadStats(); loadRows(0); }} 
           icon={<RefreshCcw size={16} color={COLORS.textMain} />}
           color={COLORS.textMain}
           style={{ flex: 1, paddingHorizontal: 4 }}
         />
      </View>

      <View style={styles.pageRow}>
        <Pressable
          style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
          disabled={page === 0}
          onPress={() => loadRows(page - 1)}
        >
          <ChevronLeft size={16} color={page === 0 ? COLORS.textLight : COLORS.textMain} />
          <Text style={[styles.pageBtnText, page === 0 && styles.pageBtnTextDisabled]}>Trang trước</Text>
        </Pressable>
        <Text style={styles.pageInfo}>
          Trang {Math.min(page + 1, totalPages)} / {totalPages}
        </Text>
        <Pressable
          style={[styles.pageBtn, page + 1 >= totalPages && styles.pageBtnDisabled]}
          disabled={page + 1 >= totalPages}
          onPress={() => loadRows(page + 1)}
        >
          <Text style={[styles.pageBtnText, page + 1 >= totalPages && styles.pageBtnTextDisabled]}>Trang sau</Text>
          <ChevronRight size={16} color={page + 1 >= totalPages ? COLORS.textLight : COLORS.textMain} />
        </Pressable>
      </View>
    </View>

    <FlatList
      data={rows}
        keyExtractor={(item) => item.itemCode}
        renderItem={renderItem}
        contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.s }} />}
      initialNumToRender={10}
      windowSize={5}
      maxToRenderPerBatch={10}
      removeClippedSubviews={true}
      ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 20 }} /> : null}
      ListEmptyComponent={
        loading ? null : (
            <View style={{ padding: 20, alignItems: 'center', gap: 10 }}>
               <AlertCircle size={48} color={COLORS.textLight} />
               <Text style={{ textAlign: 'center', color: COLORS.textSecondary }}>Không tìm thấy dữ liệu báo cáo.</Text>
               <Text style={{ fontSize: 12, color: COLORS.textLight, textAlign: 'center' }}>
                 Snapshot ID: {snapshotId?.substring(0, 8)}...{"\n"}
                 Warehouse: "{warehouseName}"{"\n"}
                 Session: {sessionId?.substring(0, 8)}...
               </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    paddingBottom: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    ...SHADOWS.card,
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.m,
    height: 44,
    marginBottom: SPACING.m,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.s,
    fontSize: 16,
    color: COLORS.textMain,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.m,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: SPACING.s,
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: SPACING.s,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textMain },
  pageBtnTextDisabled: { color: COLORS.textLight },
  pageInfo: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SPACING.m,
    borderLeftWidth: 4,
    ...SHADOWS.card,
  },
  itemName: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  itemCode: { fontSize: 14, color: COLORS.textSecondary, fontFamily: 'monospace' },
  qtyActual: { fontSize: 20, fontWeight: '800' },
  qtyHand: { fontSize: 12, color: COLORS.textSecondary },
});
