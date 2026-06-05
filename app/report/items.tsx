import React, { useCallback, memo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, Filter, RefreshCcw, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Screen } from '@/presentation/components/ui';
import { useAppStore } from '@/presentation/store/appStore';
import { repos } from '@/config/di';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { deriveVarianceReasonKey } from '@/domain/utils/varianceReason';
import { useI18n } from '@/presentation/i18n/useI18n';
import { GuardedTextInput } from '@/presentation/components/scan/GuardedTextInput';

type Row = Awaited<ReturnType<typeof repos.export.searchExportRows>>[number];

const ReportItemRow = memo(({ item, onPress }: { item: Row; onPress: (code: string) => void }) => {
  const { t } = useI18n();
  const isScanned = item.actualQty !== null;
  const hasDiff = (item.diffQty ?? 0) !== 0;
  
  let statusColor = COLORS.border;
  let StatusIcon = null;
  let statusLabel = t('report.rowStatusPending');

  if (isScanned) {
    if (hasDiff) {
      statusColor = COLORS.warning;
      StatusIcon = AlertCircle;
      statusLabel = t('report.rowStatusDiff');
    } else {
      statusColor = COLORS.success;
      StatusIcon = CheckCircle;
      statusLabel = t('report.rowStatusDone');
    }
  }
  const varianceReason = isScanned ? (() => {
    const key = deriveVarianceReasonKey(item.diffQty ?? 0);
    const base = t(`varianceReason.${key}` as any);
    if ((item.outOfScopeCount ?? 0) > 0) {
      return `${base}${t('varianceReason.outOfScopeSuffix')}`;
    }
    return base;
  })() : t('report.noDataHint');

  return (
    <Pressable
      onPress={() => onPress(item.itemCode)}
      style={({ pressed }) => [
        styles.rowCard,
        { borderLeftColor: statusColor },
        pressed && { backgroundColor: COLORS.background }
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.itemName} numberOfLines={2}>{item.itemName}</Text>
        <Text style={styles.itemCode}>{item.itemCode}</Text>
        <View style={styles.rowMeta}>
          <View style={[styles.statusPill, { borderColor: statusColor, backgroundColor: `${statusColor}18` }]}>
            {StatusIcon && <StatusIcon size={12} color={statusColor} />}
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.uomText}>{item.uom}</Text>
        </View>
        <Text style={styles.reasonText} numberOfLines={2}>{t('report.rowReasonPrefix', { reason: varianceReason })}</Text>
      </View>

      <View style={styles.rowStats}>
        <View style={styles.rowStatBlock}>
          <Text style={styles.rowStatLabel}>{t('report.rowActual')}</Text>
          <Text style={[styles.rowStatValue, { color: isScanned ? COLORS.textMain : COLORS.textLight }]}>
            {item.actualQty ?? '-'}
          </Text>
        </View>
        <View style={styles.rowStatBlock}>
          <Text style={styles.rowStatLabel}>{t('report.rowSystem')}</Text>
          <Text style={styles.rowStatSecondary}>{item.onHandQty}</Text>
        </View>
        <View style={styles.rowStatBlock}>
          <Text style={styles.rowStatLabel}>{t('report.rowDiff')}</Text>
          <Text style={[styles.rowStatSecondary, { color: hasDiff ? COLORS.warning : COLORS.textSecondary }]}>
            {item.diffQty ? `${item.diffQty > 0 ? '+' : ''}${item.diffQty}` : '0'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

export default function ReportItemsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const sessionId = useAppStore((s) => s.currentSessionId);
  const operationMode = useAppStore((s) => s.operationMode);
  const isAdvanced = operationMode === 'ADVANCED';
  
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
    <Screen title={t('report.itemsTitle')} subtitle={warehouseName || ''} style={{ padding: 0 }}>
      <View style={styles.topSection}>
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Search size={18} color={COLORS.textSecondary} />
            <GuardedTextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('report.searchPlaceholder')}
              style={styles.searchInput}
              placeholderTextColor={COLORS.textLight}
            />
            {search.length > 0 && (
               <Pressable onPress={() => setSearch('')} style={styles.searchClear}>
                 <Text style={{ fontSize: 18, color: COLORS.textSecondary }}>×</Text>
               </Pressable>
            )}
          </View>

          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setShowDiffOnly(!showDiffOnly)}
              style={({ pressed }) => [
                styles.filterChip,
                showDiffOnly && styles.filterChipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Filter size={14} color={showDiffOnly ? COLORS.primaryDark : COLORS.textSecondary} />
              <Text style={[styles.filterText, showDiffOnly && styles.filterTextActive]}>
                {showDiffOnly ? t('report.filterAll') : t('report.filterDiffOnly')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { loadStats(); loadRows(0); }}
              style={({ pressed }) => [styles.filterChip, pressed && { opacity: 0.85 }]}
            >
              <RefreshCcw size={14} color={COLORS.textSecondary} />
              <Text style={styles.filterText}>{t('report.reload')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>{t('report.totalCode')}</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>{t('report.checked')}</Text>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.scanned}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>{t('report.diff')}</Text>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.diffCount}</Text>
          </View>
        </View>

        <View style={styles.pageRow}>
          <Pressable
            style={[styles.pageBtn, page === 0 && styles.pageBtnDisabled]}
            disabled={page === 0}
            onPress={() => loadRows(page - 1)}
          >
            <ChevronLeft size={16} color={page === 0 ? COLORS.textLight : COLORS.textMain} />
            <Text style={[styles.pageBtnText, page === 0 && styles.pageBtnTextDisabled]}>{t('report.pagePrev')}</Text>
          </Pressable>
          <Text style={styles.pageInfo}>
            {t('report.pageInfo', { current: Math.min(page + 1, totalPages), total: totalPages })}
          </Text>
          <Pressable
            style={[styles.pageBtn, page + 1 >= totalPages && styles.pageBtnDisabled]}
            disabled={page + 1 >= totalPages}
            onPress={() => loadRows(page + 1)}
          >
            <Text style={[styles.pageBtnText, page + 1 >= totalPages && styles.pageBtnTextDisabled]}>{t('report.pageNext')}</Text>
            <ChevronRight size={16} color={page + 1 >= totalPages ? COLORS.textLight : COLORS.textMain} />
          </Pressable>
        </View>

        <View style={styles.modeHintBox}>
          <Text style={styles.modeHintTitle}>{t('report.modeHintTitle')}</Text>
          <Text style={styles.modeHintText}>
            {isAdvanced
              ? t('report.modeHintAdvanced')
              : t('report.modeHintBasic')}
          </Text>
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
               <Text style={{ textAlign: 'center', color: COLORS.textSecondary }}>{t('report.emptyData')}</Text>
               <Text style={{ fontSize: 12, color: COLORS.textLight, textAlign: 'center' }}>
                 {t('report.debugSnapshotId', { value: `${snapshotId?.substring(0, 8)}...` })}{"\n"}
                 {t('report.debugWarehouse', { value: `"${warehouseName}"` })}{"\n"}
                 {t('report.debugSession', { value: `${sessionId?.substring(0, 8)}...` })}
               </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topSection: {
    padding: SPACING.m,
    paddingBottom: SPACING.s,
    gap: SPACING.m,
  },
  searchCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: SPACING.m,
    ...SHADOWS.card,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 14,
    paddingHorizontal: SPACING.m,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.s,
    fontSize: 16,
    color: COLORS.textMain,
  },
  searchClear: { paddingHorizontal: 4 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.s },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: { backgroundColor: COLORS.infoBg, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.primaryDark },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.s,
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingVertical: 10,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeHintBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: 10,
  },
  modeHintTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  modeHintText: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  pageBtnDisabled: { opacity: 0.75 },
  pageBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.textMain },
  pageBtnTextDisabled: { color: COLORS.textLight },
  pageInfo: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.m,
    borderLeftWidth: 4,
    ...SHADOWS.card,
  },
  rowMain: { flex: 1, gap: 4 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  itemName: { fontSize: 15, fontWeight: '800', color: COLORS.textMain, fontFamily: 'sans-serif-medium' },
  itemCode: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace' },
  uomText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  reasonText: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 15, marginTop: 2 },
  rowStats: { minWidth: 96, alignItems: 'flex-end', gap: 6 },
  rowStatBlock: { alignItems: 'flex-end' },
  rowStatLabel: { fontSize: 10, color: COLORS.textLight, fontWeight: '700' },
  rowStatValue: { fontSize: 20, fontWeight: '800' },
  rowStatSecondary: { fontSize: 12, fontWeight: '700', color: COLORS.textMain },
});
