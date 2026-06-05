import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScanBarcode, ChevronRight, Download, FileBarChart, X, Home, Settings, MapPin } from 'lucide-react-native';

import { Screen, ProgressBar } from '@/presentation/components/ui';
import { useAppStore } from '@/presentation/store/appStore';
import { repos } from '@/config/di';
import { exportMisaCsv } from '@/infra/files/exportMisaCsv';
import { exportMisaExcel } from '@/infra/files/exportMisaExcel';
import { CameraScanner } from '@/infra/scan/CameraScanner';
import { ACTION_COLORS, COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { log, error as logError } from '@/infra/logger';
import { useI18n } from '@/presentation/i18n/useI18n';

type LocationRow = Awaited<ReturnType<typeof repos.session.listLocationCounts>>[number];

export default function InventorySessionScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const sessionId = useAppStore((s) => s.currentSessionId);
  const operationMode = useAppStore((s) => s.operationMode);
  const setCurrentLocationId = useAppStore((s) => s.setCurrentLocationId);
  const isAdvanced = operationMode === 'ADVANCED';
  
  const [locations, setLocations] = React.useState<LocationRow[]>([]);
  const [totalItems, setTotalItems] = React.useState(0);
  const [mappedItems, setMappedItems] = React.useState(0);
  const [sessionCounted, setSessionCounted] = React.useState(0);
  const [sessionInScopeCounted, setSessionInScopeCounted] = React.useState(0);
  const [sessionOutOfScope, setSessionOutOfScope] = React.useState(0);
  
  // Scanner State
  const [showScanner, setShowScanner] = React.useState(false);
  const [showExportSheet, setShowExportSheet] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!sessionId || !snapshotId || !warehouseName) return;
    try {
      const [list, count, exportStats, scopeStats] = await Promise.all([
        repos.session.listLocationCounts(sessionId),
        repos.snapshot.countSnapshotRows({ snapshotId, warehouseName }),
        repos.export.getExportStats({ sessionId, snapshotId, warehouseName }),
        repos.session.getLocationScopeStats(sessionId),
      ]);
      setLocations(list);
      setTotalItems(count);
      setSessionCounted(exportStats.scanned);
      setSessionInScopeCounted(exportStats.inScopeScanned);
      setSessionOutOfScope(exportStats.outOfScope);
      setMappedItems(scopeStats.mappedSessionSku);
      log('LOCATIONS_LOAD', {
        sessionId,
        locations: list.length,
        totalItems: count,
        mappedItems: scopeStats.mappedSessionSku,
        outOfScope: exportStats.outOfScope,
      });
    } catch (e) {
      logError('LOCATIONS_LOAD_ERROR', e);
    }
  }, [sessionId, snapshotId, warehouseName]);

  React.useEffect(() => {
    log('SCREEN_INVENTORY_ENTER');
    return () => log('SCREEN_INVENTORY_LEAVE');
  }, []);

  // Reload on focus to update stats
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  React.useEffect(() => {
    if (sessionId && snapshotId && warehouseName) {
      loadData();
    }
  }, [sessionId, snapshotId, warehouseName, loadData]);

  // Auto-navigate logic moved out of loadData to avoid loop/unwanted nav on focus
  React.useEffect(() => {
     (async () => {
        if (!sessionId || !snapshotId || !warehouseName) return;
        // Only run this check ONCE on mount or when session changes, NOT on every focus
        try {
           const list = await repos.session.listLocationCounts(sessionId);
           if (list.length === 1) {
              // Only auto-redirect if we are not coming 'back' effectively?
              // Actually, user might want to see dashboard. 
              // Let's DISABLE auto-redirect for now to allow viewing dashboard, 
              // OR check if we have "auto-entered" flag.
              // For safety and better UX (dashboard visibility), let's remove auto-redirect or make it optional.
              // setCurrentLocationId(list[0].locationId);
              // router.replace('/scan');
           }
        } catch (e) {}
     })();
  }, [sessionId]);

  const onEnterLocation = (loc: LocationRow) => {
    log('ENTER_LOCATION', { locationId: loc.locationId, code: loc.locationCode });
    setCurrentLocationId(loc.locationId);
    router.replace('/scan');
  };

  const onGoHome = () => {
    // Optional: Ask for confirmation?
    router.replace('/');
  };

  const applyBasicAllSkuScope = React.useCallback(async (locationId: string) => {
    if (!sessionId || !snapshotId || !warehouseName) return;
    const total = await repos.snapshot.countSnapshotRows({ snapshotId, warehouseName });
    if (total <= 0) return;
    const rows = await repos.snapshot.searchRows({
      snapshotId,
      warehouseName,
      queryNorm: '',
      limit: total + 50,
    });
    const itemKeys = Array.from(new Set(rows.map((r) => r.itemKey))).filter(Boolean);
    if (!itemKeys.length) return;
    await repos.session.replaceLocationScope({
      sessionId,
      locationId,
      itemKeys,
      source: 'manual',
    });
  }, [sessionId, snapshotId, warehouseName]);

  const handleScanLocation = async (rawCode: string) => {
    setShowScanner(false);
    if (!sessionId) return;

    let code = rawCode.trim();
    if (code.startsWith('LOC:')) {
      code = code.substring(4);
    }

    if (!code) return;

    const existing = locations.find(l => l.locationCode === code);
    if (existing) {
      onEnterLocation(existing);
      return;
    }

    Alert.alert(
      t('inventory.addLocationAskTitle'),
      t('inventory.addLocationAskMessage', { code }),
      [
        { text: t('common.button.cancel'), style: 'cancel' },
        { 
          text: t('inventory.addAndScan'), 
           onPress: async () => {
             try {
               const locId = await repos.session.ensureLocationInSession({
                 sessionId,
                 locationCode: code,
                 locationName: t('inventory.autoLocationName', { code }),
                 locationType: 'OTHER' 
               });
               if (!isAdvanced) {
                 await applyBasicAllSkuScope(locId);
               }
               log('LOCATION_ADD', { sessionId, locationId: locId, code });
               setCurrentLocationId(locId);
               router.replace('/scan');
               // loadData() will be called on focus when coming back, but we are navigating away.
             } catch(e) {
               logError('LOCATION_ADD_ERROR', e);
               Alert.alert(t('inventory.errorTitle'), String(e));
             }
           } 
         }
      ]
    );
  };

  const onExport = () => setShowExportSheet(true);

  const handleExportCsv = async () => {
    if (!snapshotId || !warehouseName || !sessionId) return;
    try {
      log('EXPORT_CSV', { sessionId, snapshotId, warehouseName });
      await exportMisaCsv({ repo: repos.export, sessionId, snapshotId, warehouseName });
      setShowExportSheet(false);
    } catch (e) {
      logError('EXPORT_CSV_ERROR', e);
      Alert.alert(t('inventory.errorTitle'), String(e));
    }
  };

  const handleExportXlsx = async () => {
    if (!snapshotId || !warehouseName || !sessionId) return;
    try {
      log('EXPORT_XLSX', { sessionId, snapshotId, warehouseName });
      await exportMisaExcel({ repo: repos.export, sessionId, snapshotId, warehouseName });
      setShowExportSheet(false);
    } catch (e) {
      logError('EXPORT_XLSX_ERROR', e);
      Alert.alert(t('inventory.errorTitle'), String(e));
    }
  };

  const actionTiles = [
    { key: 'scan', label: t('inventory.actionScanLabel'), sub: t('inventory.actionScanSub'), icon: ScanBarcode, color: COLORS.primary, onPress: () => setShowScanner(true) },
    { key: 'manage', label: t('inventory.actionManageLabel'), sub: isAdvanced ? t('inventory.actionManageSubAdvanced') : t('inventory.actionManageSubBasic'), icon: MapPin, color: COLORS.primaryDark, onPress: () => router.push('/locations' as any) },
    { key: 'items', label: t('inventory.actionItemsLabel'), sub: t('inventory.actionItemsSub'), icon: FileBarChart, color: COLORS.success, onPress: () => router.push('/report/items') },
    { key: 'export', label: t('inventory.actionExportLabel'), sub: t('inventory.actionExportSub'), icon: Download, color: ACTION_COLORS.exportText, onPress: onExport },
  ];
  const coverageBase = mappedItems > 0 ? mappedItems : totalItems;
  const coverageValue = coverageBase > 0 ? Math.min(100, Math.round((sessionInScopeCounted / coverageBase) * 100)) : 0;

  return (
    <Screen 
      title={t('inventory.title')} 
      subtitle={warehouseName || ''}
      style={{ padding: 0 }}
      scrollable
      headerRightPlacement="stacked"
      headerRight={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onGoHome} style={styles.headerActionBtn}>
            <Home size={18} color={COLORS.primary} />
            <Text style={styles.headerActionText}>{t('inventory.home')}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} style={styles.headerIconBtn}>
            <Settings size={18} color={COLORS.primary} />
          </Pressable>
        </View>
      }
    >
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
         <View style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}>
               <Pressable onPress={() => setShowScanner(false)} style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }}>
                  <X color="#FFF" size={24} />
               </Pressable>
            </View>
            <CameraScanner onScan={handleScanLocation} variant="location" />
            <View style={{ position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' }}>
               <Text style={{ color: '#FFF', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8 }}>
                 {t('inventory.scanQrHint')}
               </Text>
            </View>
         </View>
      </Modal>

      <Modal
        visible={showExportSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportSheet(false)}
      >
        <View style={styles.exportOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowExportSheet(false)} />
          <View style={styles.exportSheet}>
            <View style={styles.exportHeader}>
              <View style={styles.exportIcon}>
                <Download size={20} color={ACTION_COLORS.exportText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportTitle}>{t('inventory.exportTitle')}</Text>
                <Text style={styles.exportSubtitle}>{t('inventory.exportSubtitle')}</Text>
              </View>
            </View>

            <Pressable style={styles.exportOption} onPress={handleExportXlsx}>
              <View>
                <Text style={styles.exportOptionTitle}>{t('inventory.exportExcelTitle')}</Text>
                <Text style={styles.exportOptionSub}>{t('inventory.exportExcelSub')}</Text>
              </View>
              <Text style={styles.exportOptionBadge}>{t('inventory.internalBadge')}</Text>
            </Pressable>

            <Pressable style={styles.exportOption} onPress={handleExportCsv}>
              <View>
                <Text style={styles.exportOptionTitle}>{t('inventory.exportCsvTitle')}</Text>
                <Text style={styles.exportOptionSub}>{t('inventory.exportCsvSub')}</Text>
              </View>
              <Text style={styles.exportOptionBadge}>{t('inventory.internalBadge')}</Text>
            </Pressable>

            <Pressable style={styles.exportCancel} onPress={() => setShowExportSheet(false)}>
              <Text style={styles.exportCancelText}>{t('common.button.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* HERO DASHBOARD */}
      <View style={styles.hero}>
        <View style={styles.heroOrbOne} />
        <View style={styles.heroOrbTwo} />
        <Text style={styles.heroEyebrow}>{t('inventory.heroEyebrow')}</Text>
        <Text style={styles.heroTitle}>{t('inventory.heroTitle')}</Text>
        <Text style={styles.heroSubtitle}>{warehouseName}</Text>
        <View style={styles.heroProgress}>
          <View style={styles.heroProgressHeader}>
            <Text style={styles.heroProgressLabel}>{t('inventory.skuCoverage')}</Text>
            <Text style={styles.heroProgressValue}>{coverageValue}%</Text>
          </View>
          <ProgressBar 
            progress={coverageValue} 
            style={{ marginBottom: 10 }}
            color={`${COLORS.primary}66`}
          />
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{t('inventory.totalSku')}</Text>
            <Text style={styles.heroStatValue}>{totalItems}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{t('inventory.countedSku')}</Text>
            <Text style={[styles.heroStatValue, { color: '#DFF1E6' }]}>{sessionCounted}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{t('inventory.mappedSku')}</Text>
            <Text style={[styles.heroStatValue, { color: '#F2E6B8' }]}>{mappedItems}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{t('inventory.outOfScope')}</Text>
            <Text style={[styles.heroStatValue, { color: '#FFD6D6' }]}>{sessionOutOfScope}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionSection}>
        <Text style={styles.actionTitle}>{t('inventory.quickActionTitle')}</Text>
        <Text style={styles.actionSubtitle}>{t('inventory.quickActionSub')}</Text>
      </View>

      <View style={styles.actionGrid}>
        {actionTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Pressable
              key={tile.key}
              onPress={tile.onPress}
              style={({ pressed }) => [
                styles.actionTile,
                { borderColor: tile.color },
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${tile.color}15` }]}>
                <Icon size={20} color={tile.color} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel} numberOfLines={2}>{tile.label}</Text>
                <Text style={styles.actionSub} numberOfLines={2}>{tile.sub}</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textLight} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>{t('inventory.guideTitle')}</Text>
        <Text style={styles.infoText}>
          {isAdvanced
            ? t('inventory.guideAdvanced')
            : t('inventory.guideBasic')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    ...SHADOWS.card
  },
  headerActionText: { fontSize: 12, fontWeight: '700', color: COLORS.textMain },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },

  hero: {
    margin: SPACING.m,
    padding: SPACING.l,
    borderRadius: SIZES.radiusLarge,
    backgroundColor: COLORS.primaryDark,
    overflow: 'hidden',
    ...SHADOWS.float,
  },
  heroOrbOne: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFFFFF',
    opacity: 0.05,
    top: -40,
    right: -30,
  },
  heroOrbTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    opacity: 0.04,
    bottom: -30,
    left: -20,
  },
  heroEyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#E7F4EB',
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'left',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'sans-serif-condensed',
    marginTop: 6,
    textAlign: 'left',
  },
  heroSubtitle: { color: '#D7E9DD', marginBottom: 12, textAlign: 'left' },
  heroProgress: { marginTop: 6 },
  heroProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  heroProgressLabel: { fontSize: 11, color: '#D7E9DD', fontWeight: '600' },
  heroProgressValue: { fontSize: 11, color: '#F1F7F3', fontWeight: '700' },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s, marginTop: SPACING.m },
  heroStatCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    padding: 10,
    borderRadius: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  heroStatLabel: { fontSize: 10, color: '#C8DDCF', marginBottom: 2, textAlign: 'left' },
  heroStatValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', textAlign: 'left' },

  actionGrid: {
    gap: SPACING.m,
    paddingHorizontal: SPACING.m,
    marginBottom: SPACING.m,
  },
  actionSection: { paddingHorizontal: SPACING.m, marginBottom: SPACING.s },
  actionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMain },
  actionSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.m,
    borderWidth: 1,
    minHeight: 76,
    gap: SPACING.m,
    ...SHADOWS.card,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '800', color: COLORS.textMain, fontFamily: 'sans-serif-medium' },
  actionSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  infoCard: {
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.card,
  },
  infoTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMain, marginBottom: 4 },
  infoText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  exportSheet: {
    backgroundColor: COLORS.surface,
    padding: SPACING.l,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.float,
  },
  exportHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.m },
  exportIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${ACTION_COLORS.exportText}18`,
  },
  exportTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  exportSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  exportOption: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 14,
    padding: SPACING.m,
    marginBottom: SPACING.s,
    backgroundColor: COLORS.infoBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exportOptionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMain },
  exportOptionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  exportOptionBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: ACTION_COLORS.exportText,
    backgroundColor: `${ACTION_COLORS.exportText}1A`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  exportCancel: {
    marginTop: SPACING.s,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.divider,
  },
  exportCancelText: { color: COLORS.textMain, fontWeight: '700' },
});
