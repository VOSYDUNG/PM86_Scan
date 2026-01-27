import React, { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, RefreshControl, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Warehouse, Truck, ScanBarcode, ChevronRight, Download, Plus, FileBarChart, X, LayoutDashboard, Home, Settings } from 'lucide-react-native';

import { Screen, Card, PrimaryButton, SecondaryButton, Badge, ProgressBar } from '@/presentation/components/ui';
import { useAppStore } from '@/presentation/store/appStore';
import { repos } from '@/config/di';
import { exportMisaCsv } from '@/infra/files/exportMisaCsv';
import { exportMisaExcel } from '@/infra/files/exportMisaExcel';
import { CameraScanner } from '@/infra/scan/CameraScanner';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { log, error as logError } from '@/infra/logger';

type LocationRow = Awaited<ReturnType<typeof repos.session.listLocationCounts>>[number];

export default function InventorySessionScreen() {
  const router = useRouter();
  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const sessionId = useAppStore((s) => s.currentSessionId);
  const setCurrentLocationId = useAppStore((s) => s.setCurrentLocationId);
  
  const [locations, setLocations] = React.useState<LocationRow[]>([]);
  const [totalItems, setTotalItems] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  
  // Scanner State
  const [showScanner, setShowScanner] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!sessionId || !snapshotId || !warehouseName) return;
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        repos.session.listLocationCounts(sessionId),
        repos.snapshot.countSnapshotRows({ snapshotId, warehouseName })
      ]);
      setLocations(list);
      setTotalItems(count);
      log('LOCATIONS_LOAD', { sessionId, locations: list.length, totalItems: count });
    } catch (e) {
      logError('LOCATIONS_LOAD_ERROR', e);
    } finally {
      setLoading(false);
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

  // Calculate unique counted items across all locations (Session Progress)
  // For now, let's simplify: session progress = sum of countedLines (approximate)
  // Or fetch unique count from countRepo (more accurate)
  const [sessionCounted, setSessionCounted] = React.useState(0);
  React.useEffect(() => {
     (async () => {
        if (!sessionId || !snapshotId || !warehouseName) return;
        // Use aggregated stats instead of loading all rows
        const stats = await repos.export.getExportStats({ sessionId, snapshotId, warehouseName });
        setSessionCounted(stats.scanned);
     })();
  }, [locations, sessionId, snapshotId, warehouseName]); // Reload when locations reload

  const onEnterLocation = (loc: LocationRow) => {
    log('ENTER_LOCATION', { locationId: loc.locationId, code: loc.locationCode });
    setCurrentLocationId(loc.locationId);
    router.push('/scan');
  };

  const onGoHome = () => {
    // Optional: Ask for confirmation?
    router.replace('/');
  };

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
      'Thêm vị trí mới?',
      `Tìm thấy mã vị trí: "${code}". Bạn có muốn thêm vị trí này vào phiên kiểm kê?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Thêm & Vào kiểm', 
           onPress: async () => {
             try {
               const locId = await repos.session.ensureLocationInSession({
                 sessionId,
                 locationCode: code,
                 locationName: `Vị trí ${code}`,
                 locationType: 'OTHER' 
               });
               log('LOCATION_ADD', { sessionId, locationId: locId, code });
               setCurrentLocationId(locId);
               router.push('/scan');
               // loadData() will be called on focus when coming back, but we are navigating away.
             } catch(e) {
               logError('LOCATION_ADD_ERROR', e);
               Alert.alert('Lỗi', String(e));
             }
           } 
         }
      ]
    );
  };

  const onExport = async () => {
    Alert.alert(
      'Xuất báo cáo kiểm kê',
      'Dữ liệu xuất theo định dạng nội bộ (không theo MISA).',
      [
        {
          text: 'CSV (Nội bộ)',
          onPress: async () => {
            if (!snapshotId || !warehouseName || !sessionId) return;
            try {
              log('EXPORT_CSV', { sessionId, snapshotId, warehouseName });
              await exportMisaCsv({ repo: repos.export, sessionId, snapshotId, warehouseName });
            } catch (e) {
              logError('EXPORT_CSV_ERROR', e);
              Alert.alert('Lỗi', String(e));
            }
          }
        },
        {
          text: 'Excel (.xlsx) Nội bộ',
          onPress: async () => {
            if (!snapshotId || !warehouseName || !sessionId) return;
            try {
              log('EXPORT_XLSX', { sessionId, snapshotId, warehouseName });
              await exportMisaExcel({ repo: repos.export, sessionId, snapshotId, warehouseName });
            } catch (e) {
              logError('EXPORT_XLSX_ERROR', e);
              Alert.alert('Lỗi', String(e));
            }
          }
        },
        { text: 'Hủy', style: 'cancel' }
      ]
    );
  };

  const renderLocation = ({ item }: { item: LocationRow }) => {
    const isWarehouse = item.locationType === 'WAREHOUSE';
    const Icon = isWarehouse ? Warehouse : Truck;
    const progressPercent = totalItems > 0 ? (item.progress.countedLines / totalItems) * 100 : 0;

    return (
      <Pressable
        onPress={() => onEnterLocation(item)}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }
        ]}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconBox, { backgroundColor: isWarehouse ? '#E3F2FD' : '#FFF3E0' }]}>
             <Icon size={24} color={isWarehouse ? COLORS.primary : COLORS.warning} />
          </View>
        </View>

        <View style={styles.cardBody}>
           <Text style={styles.locName}>{item.locationName}</Text>
           <Text style={styles.locCode}>{item.locationCode}</Text>
           
           <View style={{ marginTop: 8 }}>
              <ProgressBar 
                progress={progressPercent} 
                color={isWarehouse ? COLORS.primary : COLORS.warning}
              />
              <View style={styles.progressRow}>
                 <Badge 
                   label={
                     item.status === 'PENDING'
                       ? 'Chưa kiểm'
                       : item.status === 'DONE'
                         ? 'Đã kiểm'
                         : item.status === 'IN_PROGRESS'
                           ? 'Đang kiểm'
                           : 'Khác'
                   } 
                   type={item.status === 'PENDING' ? 'default' : (item.status === 'IN_PROGRESS' ? 'info' : 'success')}
                   size="small"
                 />
                 <Text style={styles.progressText}>{item.progress.countedLines} / {totalItems} mã</Text>
              </View>
           </View>
        </View>

        <View style={styles.cardRight}>
           <ChevronRight size={20} color={COLORS.textLight} />
        </View>
      </Pressable>
    );
  };

  return (
    <Screen 
      title="Kiểm kê Vị trí" 
      subtitle={warehouseName || ''}
      style={{ padding: 0 }}
      headerRight={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => router.push('/settings')} style={{ padding: 8, backgroundColor: COLORS.surface, borderRadius: 20 }}>
            <Settings size={22} color={COLORS.primary} />
          </Pressable>
          <Pressable onPress={onGoHome} style={{ padding: 8, backgroundColor: COLORS.surface, borderRadius: 20 }}>
            <Home size={24} color={COLORS.primary} />
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
            <CameraScanner onScan={handleScanLocation} />
            <View style={{ position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' }}>
               <Text style={{ color: '#FFF', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8 }}>
                 Quét mã QR vị trí (VD: LOC:KHO_01)
               </Text>
            </View>
         </View>
      </Modal>

      {/* SESSION SUMMARY DASHBOARD */}
      <View style={styles.dashboard}>
         <View style={styles.dashHeader}>
            <LayoutDashboard size={18} color={COLORS.primary} />
            <Text style={styles.dashTitle}>Tiến độ toàn phiên</Text>
         </View>
         <ProgressBar 
            progress={totalItems > 0 ? (sessionCounted / totalItems) * 100 : 0} 
            label="Độ phủ SKU toàn phiên" 
            style={{ marginBottom: 12 }}
         />
         <View style={styles.dashStats}>
            <View style={styles.dashStatItem}>
               <Text style={styles.dashStatVal}>{totalItems}</Text>
               <Text style={styles.dashStatLab}>Tổng mã</Text>
            </View>
            <View style={[styles.dashStatItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.divider }]}>
               <Text style={[styles.dashStatVal, { color: COLORS.primary }]}>{sessionCounted}</Text>
               <Text style={styles.dashStatLab}>Đã kiểm</Text>
            </View>
            <View style={styles.dashStatItem}>
               <Text style={[styles.dashStatVal, { color: COLORS.warning }]}>{totalItems - sessionCounted}</Text>
               <Text style={styles.dashStatLab}>Còn lại</Text>
            </View>
         </View>
      </View>

      <View style={styles.headerActions}>
         <PrimaryButton 
           label="Quét vị trí" 
           onPress={() => setShowScanner(true)}
           icon={<ScanBarcode size={18} color="#FFF" />}
           style={{ flex: 1 }}
         />
         <SecondaryButton
           label="Xem Items"
           onPress={() => router.push('/report/items')}
           icon={<FileBarChart size={18} color={COLORS.primary} />}
           style={{ flex: 1, borderColor: COLORS.primary }}
         />
         <SecondaryButton
           label="Xuất File"
           onPress={onExport}
           icon={<Download size={18} color={COLORS.success} />}
           style={{ flex: 1, borderColor: COLORS.success }}
         />
      </View>

      <FlatList
        data={locations}
        keyExtractor={(item) => item.locationId}
        renderItem={renderLocation}
        contentContainerStyle={{ padding: SPACING.m }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={
          <View style={styles.empty}>
             <Text>Chưa có vị trí nào. Vui lòng tạo vị trí.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dashboard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    marginHorizontal: SPACING.m,
    marginTop: SPACING.m,
    borderRadius: SIZES.radius,
    ...SHADOWS.card,
  },
  dashHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dashTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMain, textTransform: 'uppercase' },
  dashStats: { flexDirection: 'row', justifyContent: 'space-between' },
  dashStatItem: { flex: 1, alignItems: 'center' },
  dashStatVal: { fontSize: 20, fontWeight: '800', color: COLORS.textMain },
  dashStatLab: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },

  headerActions: {
    flexDirection: 'row',
    padding: SPACING.m,
    gap: SPACING.m,
    backgroundColor: 'transparent',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: SIZES.radius,
    marginBottom: SPACING.m,
    ...SHADOWS.card,
  },
  cardLeft: { marginRight: SPACING.m },
  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardRight: { marginLeft: SPACING.s },
  
  locName: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  locCode: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace' },
  
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  progressText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  
  empty: { padding: 20, alignItems: 'center' }
});
