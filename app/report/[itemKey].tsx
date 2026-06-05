import React from 'react';
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, AlertTriangle, ArrowRight, CheckCircle, Info, Home } from 'lucide-react-native';

import { Screen, Card, Badge, KeyValue, PrimaryButton } from '@/presentation/components/ui';
import { useAppStore } from '@/presentation/store/appStore';
import { repos } from '@/config/di';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { QUALITY_LABEL_KEY } from '@/domain/entities/types';
import { useI18n } from '@/presentation/i18n/useI18n';

type CountLineDetail = Awaited<ReturnType<typeof repos.count.findAllCountLinesForItem>>[number] & {
  locationCode?: string;
  locationName?: string;
  locationType?: string;
};

export default function ItemDetailScreen() {
  const { t } = useI18n();
  const { itemKey } = useLocalSearchParams<{ itemKey: string }>();
  const router = useRouter();

  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const sessionId = useAppStore((s) => s.currentSessionId);
  const operationMode = useAppStore((s) => s.operationMode);
  const setCurrentLocationId = useAppStore((s) => s.setCurrentLocationId);
  const isAdvanced = operationMode === 'ADVANCED';

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
    if (diff === 0 && lines.length > 0) return [t('report.hintPerfect')];
    if (lines.length === 0) return [t('report.hintNotCounted')];
    
    if (diff < 0) {
       hints.push(t('report.hintMissing', { qty: Math.abs(diff) }));
       if (lines.some(l => l.locationType === 'WAREHOUSE')) {
          hints.push(t('report.hintMissingWarehouse'));
       }
    } else {
       hints.push(t('report.hintExtra', { qty: diff }));
    }

    if (totalBad > 0) {
       hints.push(t('report.hintBad', { qty: totalBad }));
    }

    // Multi-location hint
    if (lines.length > 1) {
       hints.push(t('report.hintScattered', { count: lines.length }));
    }

    return hints;
  };

  const jumpToLocation = (locId: string) => {
    setCurrentLocationId(locId);
    router.replace('/scan');
  };

  if (!snapshotRow && !loading) {
    return (
       <Screen title={t('report.detailTitle')}>
          <Text style={{ textAlign: 'center', marginTop: 20 }}>{t('report.detailNotFound')}</Text>
       </Screen>
    );
  }

  return (
    <Screen 
      title={t('report.detailTitle')} 
      scrollable
      headerRight={
        <Pressable onPress={() => router.push('/')} style={styles.headerHomeBtn}>
          <Home size={16} color={COLORS.primary} />
          <Text style={styles.headerHomeText}>{t('common.button.backHome')}</Text>
        </Pressable>
      }
    >
      {/* HERO INFO */}
      <View style={styles.hero}>
        <View style={styles.heroOrb} />
        <Text style={styles.heroCode}>{snapshotRow?.itemCode}</Text>
        <Text style={styles.heroName}>{snapshotRow?.itemName}</Text>
        <View style={styles.heroMeta}>
          <Badge label={snapshotRow?.uom || t('common.field.uom')} type="neutral" />
          <Text style={styles.heroMetaText}>{t('report.detailWarehouseOrigin', { warehouse: warehouseName || '' })}</Text>
        </View>
      </View>

      {/* 2. STATS OVERVIEW */}
      <View style={styles.statsRow}>
         <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('report.detailBook')}</Text>
            <Text style={styles.statNum}>{systemQty}</Text>
         </View>
         <View style={[styles.statBox, styles.statBoxHighlight, { borderColor: diff === 0 ? COLORS.success : COLORS.warning }]}>
            <Text style={styles.statLabel}>{t('report.detailActualOk')}</Text>
            <Text style={[styles.statNum, { color: diff === 0 ? COLORS.success : COLORS.warning }]}>
               {totalUsable}
            </Text>
            <Text style={[styles.statDiff, { color: diff === 0 ? COLORS.success : COLORS.warning }]}>
               {diff > 0 ? '+' : ''}{diff}
            </Text>
         </View>
         <View style={styles.statBox}>
            <Text style={styles.statLabel}>{t('report.detailTotalCount')}</Text>
            <Text style={styles.statNum}>{totalActual}</Text>
            {totalBad > 0 && <Text style={styles.statBad}>{t('report.detailErrorSuffix', { qty: totalBad })}</Text>}
         </View>
      </View>

      {/* 3. HINTS */}
      <View style={styles.hintSection}>
         <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
            <Info size={16} color={COLORS.primary} />
            <Text style={{ fontWeight: '700', color: COLORS.primary }}>{t('report.detailReconcileHints')}</Text>
         </View>
         <Text style={styles.modeHintText}>
            {isAdvanced
              ? t('report.detailModeHintAdvanced')
              : t('report.detailModeHintBasic')}
         </Text>
         {getHints().map((h, i) => (
            <Text key={i} style={styles.hintText}>• {h}</Text>
         ))}
      </View>

      {/* 4. LOCATION BREAKDOWN */}
      <Text style={styles.sectionTitle}>{t('report.detailByLocation')}</Text>
      
      {lines.length === 0 ? (
         <View style={styles.emptyBox}>
            <Text style={{ color: COLORS.textSecondary }}>{t('report.detailNoLocationCount')}</Text>
         </View>
      ) : (
         <View style={{ gap: SPACING.m }}>
            {lines.map((line) => (
               <Pressable 
                  key={line.locationId} 
                  style={[styles.locRow, { borderLeftColor: line.locationType === 'WAREHOUSE' ? COLORS.primary : COLORS.warning }]}
                  onPress={() => jumpToLocation(line.locationId)}
               >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={[styles.iconBox, { backgroundColor: line.locationType === 'WAREHOUSE' ? COLORS.infoBg : COLORS.warningBg }]}>
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
            <Text style={[styles.sectionTitle, { color: COLORS.error, marginTop: SPACING.l }]}>{t('report.detailExceptionTitle')}</Text>
            <Card style={{ backgroundColor: COLORS.warningBg, borderColor: COLORS.error }}>
               {lines.flatMap(l => l.exceptions.map(e => ({ ...e, loc: l.locationName }))).map((ex, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                     <Text style={{ color: COLORS.textMain }}>{t(QUALITY_LABEL_KEY[ex.reason] as any)} ({ex.loc})</Text>
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
  headerHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    ...SHADOWS.card,
  },
  headerHomeText: { fontSize: 12, fontWeight: '700', color: COLORS.textMain },

  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    overflow: 'hidden',
    ...SHADOWS.float,
  },
  heroOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFFFFF',
    opacity: 0.08,
    top: -70,
    right: -30,
  },
  heroCode: { fontSize: 12, fontFamily: 'monospace', color: '#D7E9DD' },
  heroName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginVertical: 6, fontFamily: 'sans-serif-condensed' },
  heroMeta: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  heroMetaText: { color: '#D7E9DD', fontSize: 12 },
  
  statsRow: { flexDirection: 'row', gap: SPACING.m, marginBottom: SPACING.m },
  statBox: { 
    flex: 1, backgroundColor: COLORS.surface, padding: 12, borderRadius: 14, 
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  statBoxHighlight: { borderWidth: 2 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  statNum: { fontSize: 20, fontWeight: '800', color: COLORS.textMain },
  statDiff: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  statBad: { fontSize: 10, color: COLORS.error },
  
  hintSection: { backgroundColor: COLORS.infoBg, padding: 12, borderRadius: SIZES.radius, marginBottom: SPACING.m },
  modeHintText: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6, lineHeight: 16 },
  hintText: { fontSize: 13, color: COLORS.textMain, marginBottom: 2, lineHeight: 18 },
  
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textMain, marginBottom: SPACING.s },
  
  locRow: { 
     flexDirection: 'row', alignItems: 'center', 
     backgroundColor: COLORS.surface, padding: 12, borderRadius: 16,
     borderLeftWidth: 3,
     ...SHADOWS.card
  },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  locName: { fontWeight: '700', color: COLORS.textMain },
  locCode: { fontSize: 12, color: COLORS.textSecondary },
  locQty: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  
  emptyBox: { padding: 20, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: SIZES.radius },
});
