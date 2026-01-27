import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { FileSpreadsheet, Warehouse, Play, Trash2, Settings, Plus, RefreshCw, History, X, Check, CheckCircle2, Circle, ListChecks, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Screen, Card, PrimaryButton, SecondaryButton, KeyValue, Badge } from '@/presentation/components/ui';
import { CustomAlert, AlertType } from '@/presentation/components/CustomAlert';
import { useAppStore } from '@/presentation/store/appStore';
import { pickAndParseMisaFile } from '@/infra/files/pickAndParseMisaFile';
import { importSnapshotFromFile } from '@/domain/usecases/importSnapshotFromFile';
import { repos } from '@/config/di';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { log, error as logError } from '@/infra/logger';

export default function HomeScreen() {
  const router = useRouter();
  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const sourceFileName = useAppStore((s) => s.currentSourceFileName);
  
  const setSnapshot = useAppStore((s) => s.setSnapshot);
  const setWarehouse = useAppStore((s) => s.setWarehouse);
  const setSession = useAppStore((s) => s.setSessionId);
  const setPendingImport = useAppStore((s) => s.setPendingImport);

  const [warehouses, setWarehouses] = React.useState<string[]>([]);
  const [sessions, setSessions] = React.useState<{ id: string; createdAt: number }[]>([]);
  const [sessionTotal, setSessionTotal] = React.useState(0);
  const [sessionPage, setSessionPage] = React.useState(0);
  const SESSION_PAGE_SIZE = 8;
  const [loading, setLoading] = React.useState(false);

  // History State
  const [historyVisible, setHistoryVisible] = useState(false);
  const [snapshotsList, setSnapshotsList] = useState<{ id: string; snapshotAt: number; sourceFileName: string }[]>([]);
  
  // Multi-select State
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedSnapshots, setSelectedSnapshots] = useState<Set<string>>(new Set());

  // Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: AlertType;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({ title: '', message: '', type: 'info' });

  const showAlert = (config: typeof alertConfig) => {
    setAlertConfig(config);
    setAlertVisible(true);
  };

  const closeAlert = () => setAlertVisible(false);

  // --- LOGIC ---

  const formatRelative = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60 * 1000) return 'vừa xong';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return `${Math.floor(diff / 86400000)} ngày trước`;
  };

  const refreshSessions = React.useCallback(async (page = sessionPage) => {
    if (!snapshotId || !warehouseName) {
      setSessions([]);
      setSessionTotal(0);
      setSessionPage(0);
      return;
    }
    const total = await repos.session.countSessions({ snapshotId, warehouseName });
    const maxPage = Math.max(0, Math.ceil(total / SESSION_PAGE_SIZE) - 1);
    const finalPage = Math.min(page, maxPage);
    const list = await repos.session.listSessions({
      snapshotId,
      warehouseName,
      limit: SESSION_PAGE_SIZE,
      offset: finalPage * SESSION_PAGE_SIZE,
    });
    setSessions(list);
    setSessionTotal(total);
    setSessionPage(finalPage);
    log('SESSIONS_LOAD', { total, page: finalPage, pageSize: SESSION_PAGE_SIZE, list: list.length });
  }, [snapshotId, warehouseName, sessionPage]);

  React.useEffect(() => {
    refreshSessions(0);
  }, [refreshSessions]);

  React.useEffect(() => {
    (async () => {
      if (snapshotId) {
        try {
          const list = await repos.snapshot.listWarehouses({ snapshotId });
          setWarehouses(list);
          // Auto select first warehouse if current is invalid
          if (list.length > 0) {
             if (!warehouseName || !list.includes(warehouseName)) {
               setWarehouse(list[0]);
             }
          } else {
             setWarehouse(null);
          }
        } catch (e) {
          console.warn('Failed to load warehouses:', e);
        }
      } else {
        setWarehouses([]);
        setWarehouse(null);
      }
    })();
  }, [snapshotId]);

  const onImport = async () => {
    try {
      log('IMPORT_START');
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
          // 'text/csv', // CSV support pending update in importSnapshotFromFile
        ],
      });

      if (result.canceled) return;
      const asset = result.assets[0];
      const fileName = asset.name || 'misa_import';
      const uri = asset.uri;

      setLoading(true);
      useAppStore.getState().setImportStatus('importing');
      useAppStore.getState().setImportProgress(0, 0);

      const importResult = await importSnapshotFromFile({
        fileUri: uri,
        sourceFileName: fileName,
        repo: repos.snapshot,
        onProgress: (processed, total) => {
           useAppStore.getState().setImportProgress(processed, total);
        }
      });

      useAppStore.getState().setImportStatus('done');

      if (!importResult.success) {
        log('IMPORT_CONFLICTS', { count: importResult.conflicts.length, fileName });
        setPendingImport({
          fileUri: uri,
          fileName: fileName,
          conflicts: importResult.conflicts,
        });
        router.push('/resolve-import');
        return;
      }

      const { snapshotId: newSnapshotId, warehouses } = importResult;
      log('IMPORT_SUCCESS', { snapshotId: newSnapshotId, warehouses: warehouses.length });
      setSnapshot({ snapshotId: newSnapshotId, sourceFileName: fileName });
      setWarehouses(warehouses);
      if (warehouses[0]) setWarehouse(warehouses[0]);
      
      showAlert({
        title: 'Thành công',
        message: `Đã nhập dữ liệu thành công. Hệ thống đã sẵn sàng.`,
        type: 'success',
        onConfirm: closeAlert
      });

    } catch (e) {
      useAppStore.getState().setImportStatus('failed');
      logError('IMPORT_ERROR', e);
      showAlert({
        title: 'Lỗi Import',
        message: String(e),
        type: 'error',
        onConfirm: closeAlert
      });
    } finally {
      setLoading(false);
    }
  };

  const onPickWarehouse = async (w: string) => {
    setWarehouse(w);
    setTimeout(() => refreshSessions(0), 0);
  };

  const onCreateSession = async () => {
    if (!snapshotId || !warehouseName) return;
    const sessId = await repos.session.createSession({ snapshotId, warehouseName });
    log('SESSION_CREATE', { sessionId: sessId, snapshotId, warehouseName });
    setSession(sessId);
    router.push('/inventory');
  };

  const onOpenSession = async (sessId: string) => {
    log('SESSION_OPEN', { sessionId: sessId });
    setSession(sessId);
    router.push('/inventory');
  };

  const onDeleteSession = (sessId: string) => {
    showAlert({
      title: 'Xóa phiên kiểm kê',
      message: 'Bạn có chắc chắn muốn xóa phiên này không? Dữ liệu đã kiểm trong phiên sẽ bị mất vĩnh viễn.',
      type: 'warning',
      confirmText: 'Xóa phiên',
      cancelText: 'Hủy',
      onCancel: closeAlert,
      onConfirm: async () => {
        try {
          await repos.session.deleteSession(sessId);
          await refreshSessions(sessionPage);
          closeAlert();
        } catch (e) {
          closeAlert();
          setTimeout(() => {
             showAlert({ title: 'Lỗi', message: String(e), type: 'error', onConfirm: closeAlert });
          }, 300);
        }
      }
    });
  };

  const onOpenHistory = async () => {
    const list = await repos.snapshot.getAllSnapshots();
    setSnapshotsList(list);
    setHistoryVisible(true);
    setIsMultiSelect(false);
    setSelectedSnapshots(new Set());
  };

  const onSwitchSnapshot = (s: { id: string; sourceFileName: string }) => {
    if (s.id === snapshotId) {
      setHistoryVisible(false);
      return;
    }
    setSnapshot({ snapshotId: s.id, sourceFileName: s.sourceFileName });
    setHistoryVisible(false);
    setWarehouse(null);
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedSnapshots);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedSnapshots(next);
  };

  const toggleSelectAll = () => {
    if (selectedSnapshots.size === snapshotsList.length) {
      setSelectedSnapshots(new Set());
    } else {
      const all = new Set(snapshotsList.map(s => s.id));
      setSelectedSnapshots(all);
    }
  };

  const onDeleteMultipleSnapshots = () => {
    if (selectedSnapshots.size === 0) return;

    showAlert({
      title: 'Xóa dữ liệu nguồn',
      message: `Bạn có chắc chắn muốn xóa ${selectedSnapshots.size} file đã chọn? Tất cả dữ liệu kiểm kê liên quan sẽ bị mất vĩnh viễn.`,
      type: 'warning',
      confirmText: 'Xóa Vĩnh Viễn',
      cancelText: 'Hủy',
      onCancel: closeAlert,
      onConfirm: async () => {
        try {
          let currentDeleted = false;
          for (const sId of selectedSnapshots) {
             await repos.snapshot.deleteSnapshot(sId);
             if (sId === snapshotId) currentDeleted = true;
          }

          if (currentDeleted) {
             setSnapshot(null);
             setWarehouse(null);
             setSession(null);
             setWarehouses([]);
          }
          
          const list = await repos.snapshot.getAllSnapshots();
          setSnapshotsList(list);
          
          setIsMultiSelect(false);
          setSelectedSnapshots(new Set());
          
          closeAlert();
        } catch (e) {
          closeAlert();
          setTimeout(() => {
             showAlert({ title: 'Lỗi', message: String(e), type: 'error', onConfirm: closeAlert });
          }, 300);
        }
      }
    });
  };

  const onDeleteSnapshotSingle = (sId: string) => {
     const set = new Set([sId]);
     setSelectedSnapshots(set);
     showAlert({
      title: 'Xóa dữ liệu nguồn',
      message: 'Bạn có chắc chắn muốn xóa file này? Dữ liệu kiểm kê sẽ bị mất.',
      type: 'warning',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onCancel: closeAlert,
      onConfirm: async () => {
        try {
          await repos.snapshot.deleteSnapshot(sId);
          if (sId === snapshotId) {
             setSnapshot(null);
             setWarehouse(null);
             setSession(null);
             setWarehouses([]);
          }
          const list = await repos.snapshot.getAllSnapshots();
          setSnapshotsList(list);
          closeAlert();
        } catch (e) {
           closeAlert();
        }
      }
     });
  };

  return (
    <Screen
      title="Tổng quan"
      subtitle="Hệ thống kiểm kho NNC"
      scrollable={false}
      headerRight={
        <Pressable onPress={() => router.push('/settings')} style={styles.headerIconBtn}>
          <Settings size={22} color={COLORS.primary} />
        </Pressable>
      }
    >
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
      />

      {/* HISTORY MODAL */}
      <Modal visible={historyVisible} animationType="slide" transparent onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                 {isMultiSelect ? (
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity onPress={() => setIsMultiSelect(false)}><X size={24} color={COLORS.textMain}/></TouchableOpacity>
                      <Text style={styles.modalTitle}>Đã chọn {selectedSnapshots.size}</Text>
                   </View>
                 ) : (
                   <Text style={styles.modalTitle}>Quản lý File Nguồn</Text>
                 )}
                 
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {!isMultiSelect ? (
                      <>
                        <TouchableOpacity onPress={() => setIsMultiSelect(true)} style={styles.headerActionBtn}>
                          <ListChecks size={22} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                          <X size={24} color={COLORS.textMain} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity onPress={toggleSelectAll}>
                        <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                          {selectedSnapshots.size === snapshotsList.length ? 'Bỏ chọn' : 'Tất cả'}
                        </Text>
                      </TouchableOpacity>
                    )}
                 </View>
              </View>

              <ScrollView style={{ height: 400 }}>
                 {snapshotsList.length === 0 ? (
                    <Text style={{ padding: 20, textAlign: 'center', color: COLORS.textSecondary }}>Trống</Text>
                 ) : (
                    snapshotsList.map(item => {
                       const isSelected = selectedSnapshots.has(item.id);
                       return (
                         <TouchableOpacity 
                            key={item.id} 
                            style={[
                              styles.historyItem, 
                              item.id === snapshotId && !isMultiSelect && styles.historyItemActive,
                              isSelected && styles.historyItemSelected
                            ]}
                            onPress={() => {
                              if (isMultiSelect) toggleSelection(item.id);
                            }}
                            disabled={!isMultiSelect}
                         >
                            {isMultiSelect ? (
                               <View style={{ marginRight: 12 }}>
                                  {isSelected ? (
                                    <CheckCircle2 size={22} color={COLORS.primary} fill="#E3F2FD" />
                                  ) : (
                                    <Circle size={22} color={COLORS.textLight} />
                                  )}
                               </View>
                            ) : null}

                            <View style={{ flex: 1 }}>
                               <Text style={styles.historyName} numberOfLines={1}>{item.sourceFileName}</Text>
                               <Text style={styles.historyDate}>{new Date(item.snapshotAt).toLocaleString()}</Text>
                               {item.id === snapshotId && !isMultiSelect && (
                                 <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold' }}>Đang chọn</Text>
                               )}
                            </View>
                            
                            {!isMultiSelect && (
                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                 {item.id !== snapshotId && (
                                   <TouchableOpacity style={styles.btnAction} onPress={() => onSwitchSnapshot(item)}>
                                      <Check size={20} color={COLORS.success} />
                                   </TouchableOpacity>
                                 )}
                                 <TouchableOpacity style={styles.btnAction} onPress={() => onDeleteSnapshotSingle(item.id)}>
                                    <Trash2 size={20} color={COLORS.error} />
                                 </TouchableOpacity>
                              </View>
                            )}
                         </TouchableOpacity>
                       );
                    })
                 )}
              </ScrollView>

              {isMultiSelect && (
                 <View style={styles.modalFooter}>
                    <TouchableOpacity 
                      style={[styles.btnDeleteMulti, selectedSnapshots.size === 0 && { opacity: 0.5 }]}
                      disabled={selectedSnapshots.size === 0}
                      onPress={onDeleteMultipleSnapshots}
                    >
                       <Trash2 size={18} color="#FFF" style={{ marginRight: 8 }} />
                       <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
                         Xóa ({selectedSnapshots.size})
                       </Text>
                    </TouchableOpacity>
                 </View>
              )}
           </View>
        </View>
      </Modal>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isLatest = sessionPage === 0 && index === 0;
          return (
            <View style={[styles.sessionCardWrapper, { borderLeftColor: isLatest ? COLORS.primary : COLORS.divider }]}>
              <TouchableOpacity style={styles.sessionMain} onPress={() => onOpenSession(item.id)}>
                <View style={styles.sessionTitleRow}>
                  <Text style={styles.sessionTitle}>Phiên kiểm kê</Text>
                  {isLatest && <Badge label="Mới nhất" type="info" size="small" />}
                </View>
                <View style={styles.sessionDateRow}>
                  <Text style={styles.sessionDate}>
                    {new Date(item.createdAt).toLocaleTimeString()} · {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.sessionAgo}>{formatRelative(item.createdAt)}</Text>
                </View>
                <Text style={styles.sessionId} numberOfLines={1} ellipsizeMode="middle">
                  ID: {item.id}
                </Text>
              </TouchableOpacity>
              <View style={styles.sessionActions}>
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => onOpenSession(item.id)}>
                  <Play size={16} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnDanger} onPress={() => onDeleteSession(item.id)}>
                  <Trash2 size={16} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListHeaderComponent={
          <View style={{ gap: SPACING.l, paddingBottom: SPACING.m }}>
            <Card title="Dữ liệu nguồn" icon={<FileSpreadsheet size={24} color={COLORS.primary} />}>
              {snapshotId ? (
                <View style={{ gap: SPACING.s }}>
                   <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{sourceFileName}</Text>
                      <Badge label="Đang hoạt động" type="success" />
                   </View>
                   
                   <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                         <SecondaryButton 
                            label="Đổi file" 
                            onPress={onOpenHistory}
                            icon={<History size={18} color={COLORS.textMain} />}
                         />
                      </View>
                      <View style={{ flex: 1 }}>
                         <PrimaryButton 
                            label="Nạp mới" 
                            onPress={onImport}
                            loading={loading}
                            icon={<Plus size={18} color={COLORS.textOnPrimary} />}
                         />
                      </View>
                   </View>
                </View>
              ) : (
                <View style={{ gap: SPACING.m }}>
                   <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.textSecondary, flex: 1 }}>Chưa có dữ liệu nguồn.</Text>
                      <TouchableOpacity onPress={onOpenHistory} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                         <History size={16} color={COLORS.primary} />
                         <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Lịch sử</Text>
                      </TouchableOpacity>
                   </View>
                  <PrimaryButton 
                    label="Nhập file Excel/CSV" 
                    onPress={onImport} 
                    loading={loading} 
                    icon={<FileSpreadsheet size={20} color={COLORS.textOnPrimary} />}
                  />
                </View>
              )}
            </Card>

            {snapshotId && (
              <Card title="Kho hàng" icon={<Warehouse size={24} color={COLORS.primary} />}>
                <Text style={styles.label}>Chọn kho làm việc</Text>
                <View style={styles.pickerContainer}>
                  <Picker 
                    selectedValue={warehouseName} 
                    onValueChange={(v) => onPickWarehouse(String(v))}
                    style={{ height: 50 }}
                  >
                    {warehouses.map((w) => (
                      <Picker.Item key={w} label={w} value={w} style={{ fontSize: 16 }} />
                    ))}
                  </Picker>
                </View>

                <View style={{ height: SPACING.m }} />
                
                <PrimaryButton 
                  label="Bắt đầu phiên kiểm kê mới" 
                  onPress={onCreateSession} 
                  disabled={!warehouseName}
                  icon={<Plus size={20} color={COLORS.textOnPrimary} />}
                />
              </Card>
            )}

            {snapshotId && (
              <View style={styles.sessionHeaderRow}>
                <Text style={styles.sectionHeader}>Lịch sử phiên kiểm kê</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.sessionCount}>{sessionTotal > 0 ? `${sessionTotal} phiên` : '0 phiên'}</Text>
                  {sessionTotal > 0 && (
                    <Text style={styles.sessionSubCount}>
                      Hiển thị {sessions.length}/{sessionTotal}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          snapshotId && sessionTotal > SESSION_PAGE_SIZE ? (
            <View style={styles.paginationBar}>
              <TouchableOpacity
                style={[styles.pageBtn, sessionPage === 0 && styles.pageBtnDisabled]}
                disabled={sessionPage === 0}
                onPress={() => refreshSessions(sessionPage - 1)}
              >
                <ChevronLeft size={18} color={sessionPage === 0 ? COLORS.textLight : COLORS.textMain} />
                <Text style={[styles.pageBtnText, sessionPage === 0 && styles.pageBtnTextDisabled]}>Trang trước</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                Trang {Math.min(sessionPage + 1, Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE)))} / {Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE))}
              </Text>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  sessionPage + 1 >= Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE)) && styles.pageBtnDisabled,
                ]}
                disabled={sessionPage + 1 >= Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE))}
                onPress={() => refreshSessions(sessionPage + 1)}
              >
                <Text style={[styles.pageBtnText, sessionPage + 1 >= Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE)) && styles.pageBtnTextDisabled]}>
                  Trang sau
                </Text>
                <ChevronRight size={18} color={sessionPage + 1 >= Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE)) ? COLORS.textLight : COLORS.textMain} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingBottom: 40 }} />
          )
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.s }} />}
        ListEmptyComponent={
          snapshotId ? (
            <View style={styles.emptyState}>
              <Text style={{ color: COLORS.textSecondary }}>Chưa có phiên nào trong kho này</Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.surface,
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    padding: SPACING.s,
    borderRadius: SIZES.radius,
  },
  fileName: {
    fontWeight: '600',
    color: COLORS.textMain,
    maxWidth: '60%',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: SPACING.s,
    marginLeft: 4,
  },
  emptyState: {
    padding: SPACING.l,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Session Card
  sessionCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    ...SHADOWS.card,
    overflow: 'hidden',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.divider,
    paddingRight: SPACING.s,
  },
  sessionMain: {
    flex: 1,
    padding: SPACING.m,
  },
  sessionTitle: { fontWeight: '800', fontSize: 15, color: COLORS.textMain },
  sessionDate: { fontWeight: '600', fontSize: 12, color: COLORS.textSecondary },
  sessionId: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  sessionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionDateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sessionAgo: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  sessionActions: { alignItems: 'center', gap: 10, paddingVertical: SPACING.s },
  actionBtnPrimary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDanger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },

  sessionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  sessionSubCount: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },

  paginationBar: {
    marginTop: SPACING.s,
    marginBottom: SPACING.l,
    paddingHorizontal: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.s,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textMain },
  pageBtnTextDisabled: { color: COLORS.textLight },
  pageInfo: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  headerIconBtn: {
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  
  // History Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.m
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    ...SHADOWS.card,
    overflow: 'hidden',
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.background
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain },
  headerActionBtn: { padding: 4 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  historyItemActive: {
    backgroundColor: '#E3F2FD',
  },
  historyItemSelected: {
    backgroundColor: '#FFF3E0', // Light orange for selection
  },
  historyName: { fontWeight: '600', fontSize: 16, color: COLORS.textMain },
  historyDate: { fontSize: 12, color: COLORS.textSecondary },
  btnAction: {
    padding: 8,
  },
  modalFooter: {
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.background
  },
  btnDeleteMulti: {
    flexDirection: 'row',
    backgroundColor: COLORS.error,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
