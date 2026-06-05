import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { FileSpreadsheet, Warehouse, Play, Trash2, Settings, Plus, X, Check, CheckCircle2, Circle, ListChecks, ChevronLeft, ChevronRight, FolderOpen, Pencil } from 'lucide-react-native';

import { Screen, Card, Badge } from '@/presentation/components/ui';
import { CustomAlert, AlertType } from '@/presentation/components/CustomAlert';
import { ConfirmSheet } from '@/presentation/components/ConfirmSheet';
import { useAppStore } from '@/presentation/store/appStore';
import { importSnapshotFromFile } from '@/domain/usecases/importSnapshotFromFile';
import { repos } from '@/config/di';
import { ACTION_COLORS, COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { log, error as logError } from '@/infra/logger';
import { downloadTemplateWorkbook } from '@/infra/files/downloadTemplateWorkbook';
import { pickAndParseLocationPackageFile } from '@/infra/files/pickAndParseLocationPackageFile';
import { importLocationPackage } from '@/domain/usecases/locationExchange';
import { buildDataCycleCode } from '@/domain/usecases/locationExchange';
import { useI18n } from '@/presentation/i18n/useI18n';
import { GuardedTextInput } from '@/presentation/components/scan/GuardedTextInput';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const sourceFileName = useAppStore((s) => s.currentSourceFileName);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const operationMode = useAppStore((s) => s.operationMode);
  
  const setSnapshot = useAppStore((s) => s.setSnapshot);
  const setWarehouse = useAppStore((s) => s.setWarehouse);
  const setSession = useAppStore((s) => s.setSessionId);
  const setCurrentLocationId = useAppStore((s) => s.setCurrentLocationId);
  const setPendingImport = useAppStore((s) => s.setPendingImport);

  const [warehouses, setWarehouses] = React.useState<string[]>([]);
  const [sessions, setSessions] = React.useState<{ id: string; createdAt: number }[]>([]);
  const [sessionTotal, setSessionTotal] = React.useState(0);
  const [sessionPage, setSessionPage] = React.useState(0);
  const SESSION_PAGE_SIZE = 8;
  const [loading, setLoading] = React.useState(false);
  const [sessionHistoryVisible, setSessionHistoryVisible] = React.useState(false);

  // History State
  const [historyVisible, setHistoryVisible] = useState(false);
  const [snapshotsList, setSnapshotsList] = useState<{ id: string; snapshotAt: number; sourceFileName: string }[]>([]);
  const [snapshotPage, setSnapshotPage] = React.useState(0);
  const SNAPSHOT_PAGE_SIZE = 12;
  
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

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ title: '', message: '', onConfirm: () => {} });
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameSnapshotId, setRenameSnapshotId] = useState<string | null>(null);
  const [renameBaseName, setRenameBaseName] = useState('');
  const [renameExtension, setRenameExtension] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [initVisible, setInitVisible] = useState(false);
  const [initStep, setInitStep] = useState<1 | 2 | 3 | 4>(1);
  const [initImporting, setInitImporting] = useState(false);
  const [initSourceFileName, setInitSourceFileName] = useState('');
  const [initSnapshotId, setInitSnapshotId] = useState<string | null>(null);
  const [initWarehouses, setInitWarehouses] = useState<string[]>([]);
  const [initWarehouse, setInitWarehouse] = useState('');
  const [initCycleCode, setInitCycleCode] = useState('');
  const isAdvanced = operationMode === 'ADVANCED';
  const importFileTypes = React.useMemo(
    () => [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/comma-separated-values',
      'application/csv',
    ],
    [],
  );

  const showAlert = (config: typeof alertConfig) => {
    setAlertConfig(config);
    setAlertVisible(true);
  };

  const closeAlert = () => setAlertVisible(false);

  const showConfirm = (config: typeof confirmConfig) => {
    setConfirmConfig(config);
    setConfirmVisible(true);
  };

  const closeConfirm = () => setConfirmVisible(false);

  const splitFileName = React.useCallback((fileName: string) => {
    const normalized = (fileName || '').trim();
    const match = normalized.match(/^(.*?)(\.[^./\\]+)$/);
    if (!match) return { base: normalized, ext: '' };
    const base = match[1] || '';
    const ext = match[2] || '';
    return { base, ext };
  }, []);

  // --- LOGIC ---

  const formatRelative = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60 * 1000) return t('home.justNow');
    if (diff < 60 * 60 * 1000) return t('home.minutesAgo', { value: Math.floor(diff / 60000) });
    if (diff < 24 * 60 * 60 * 1000) return t('home.hoursAgo', { value: Math.floor(diff / 3600000) });
    return t('home.daysAgo', { value: Math.floor(diff / 86400000) });
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

  const resetInitWizard = React.useCallback(() => {
    setInitStep(1);
    setInitImporting(false);
    setInitSourceFileName('');
    setInitSnapshotId(null);
    setInitWarehouses([]);
    setInitWarehouse('');
    setInitCycleCode('');
  }, []);

  const onOpenInitWizard = () => {
    resetInitWizard();
    setInitVisible(true);
  };

  const onPickMisaForInit = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: importFileTypes,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const fileName = asset.name || 'misa_import';
      const uri = asset.uri;

      setInitImporting(true);
      useAppStore.getState().setImportStatus('importing');
      useAppStore.getState().setImportProgress(0, 0);
      const importResult = await importSnapshotFromFile({
        fileUri: uri,
        sourceFileName: fileName,
        repo: repos.snapshot,
        onProgress: (processed, total) => useAppStore.getState().setImportProgress(processed, total),
      });
      useAppStore.getState().setImportStatus('done');

      if (!importResult.success) {
        setPendingImport({
          fileUri: uri,
          fileName,
          conflicts: importResult.conflicts,
        });
        setInitVisible(false);
        router.push('/resolve-import');
        return;
      }

      const warehousesFromFile = importResult.warehouses || [];
      const firstWarehouse = warehousesFromFile[0] || '';
      setInitSourceFileName(fileName);
      setInitSnapshotId(importResult.snapshotId);
      setInitWarehouses(warehousesFromFile);
      setInitWarehouse(firstWarehouse);
      setInitCycleCode(buildDataCycleCode({ warehouseName: firstWarehouse || 'KHO', basedAt: Date.now() }));
      setInitStep(2);
    } catch (e) {
      useAppStore.getState().setImportStatus('failed');
      showAlert({
        title: t('home.initProject.errorTitle'),
        message: String(e),
        type: 'error',
        onConfirm: closeAlert,
      });
    } finally {
      setInitImporting(false);
    }
  };

  const onImportMisaBasic = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: importFileTypes,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const fileName = asset.name || 'misa_import';
      const uri = asset.uri;

      setLoading(true);
      useAppStore.getState().setImportStatus('importing');
      useAppStore.getState().setImportProgress(0, 0);
      const importResult = await importSnapshotFromFile({
        fileUri: uri,
        sourceFileName: fileName,
        repo: repos.snapshot,
        onProgress: (processed, total) => useAppStore.getState().setImportProgress(processed, total),
      });
      useAppStore.getState().setImportStatus('done');

      if (!importResult.success) {
        setPendingImport({
          fileUri: uri,
          fileName,
          conflicts: importResult.conflicts,
        });
        router.push('/resolve-import');
        return;
      }

      const importedWarehouses = importResult.warehouses || [];
      const firstWarehouse = importedWarehouses[0] || null;
      setSnapshot({ snapshotId: importResult.snapshotId, sourceFileName: fileName });
      setWarehouses(importedWarehouses);
      setWarehouse(firstWarehouse);
      setSession(null);
      setCurrentLocationId(null);
      await refreshSessions(0);
      showAlert({
        title: t('home.import.successTitle'),
        message: t('home.import.successMessage', { file: fileName }),
        type: 'success',
        onConfirm: closeAlert,
      });
    } catch (e) {
      useAppStore.getState().setImportStatus('failed');
      showAlert({
        title: t('home.import.errorTitle'),
        message: String(e),
        type: 'error',
        onConfirm: closeAlert,
      });
    } finally {
      setLoading(false);
    }
  };

  const onContinueInitAfterParse = () => {
    if (initWarehouses.length > 1) {
      setInitStep(3);
      return;
    }
    setInitStep(4);
  };

  const onConfirmWarehouseStep = () => {
    if (!initWarehouse) {
      showAlert({
        title: t('home.initProject.missingWarehouseTitle'),
        message: t('home.initProject.missingWarehouseMessage'),
        type: 'warning',
        onConfirm: closeAlert,
      });
      return;
    }
    setInitCycleCode(buildDataCycleCode({ warehouseName: initWarehouse, basedAt: Date.now() }));
    setInitStep(4);
  };

  const onCreateProjectFromWizard = async () => {
    if (!initSnapshotId || !initWarehouse) {
      showAlert({
        title: t('home.initProject.missingDataTitle'),
        message: t('home.initProject.missingDataMessage'),
        type: 'warning',
        onConfirm: closeAlert,
      });
      return;
    }
    try {
      setLoading(true);
      const sessionId = await repos.session.createSession({
        snapshotId: initSnapshotId,
        warehouseName: initWarehouse,
      });
      const cycleCode = initCycleCode || buildDataCycleCode({ warehouseName: initWarehouse, basedAt: Date.now() });
      await repos.session.setSessionExchangeMeta({
        sessionId,
        dataCycleCode: cycleCode,
        sourceSnapshotId: initSnapshotId,
        sourceFileName: initSourceFileName || 'MISA_SOURCE.xlsx',
        snapshotDate: new Date().toISOString().slice(0, 10),
        warehouseName: initWarehouse,
      });

      setSnapshot({ snapshotId: initSnapshotId, sourceFileName: initSourceFileName || 'MISA_SOURCE.xlsx' });
      setWarehouses(initWarehouses);
      setWarehouse(initWarehouse);
      setSession(sessionId);
      await refreshSessions(0);
      setInitVisible(false);
      showAlert({
        title: t('home.initProject.successTitle'),
        message: t('home.initProject.successMessage', { code: cycleCode }),
        type: 'success',
        onConfirm: closeAlert,
      });
      router.push('/inventory');
    } catch (e) {
      showAlert({
        title: t('home.initProject.createErrorTitle'),
        message: String(e),
        type: 'error',
        onConfirm: closeAlert,
      });
    } finally {
      setLoading(false);
    }
  };

  const onPickWarehouse = async (w: string) => {
    setWarehouse(w);
    setTimeout(() => refreshSessions(0), 0);
  };

  const onImportLocationPackage = async () => {
    try {
      const picked = await pickAndParseLocationPackageFile();
      if (!picked) return;
      setLoading(true);
      const imported = await importLocationPackage({
        snapshotRepo: repos.snapshot,
        sessionRepo: repos.session,
        fileName: picked.fileName,
        meta: picked.meta,
        items: picked.items,
      });
      setSnapshot({ snapshotId: imported.snapshotId, sourceFileName: picked.fileName });
      setWarehouse(imported.warehouseName);
      setSession(imported.sessionId);
      setCurrentLocationId(imported.locationId);
      await refreshSessions(0);
      showAlert({
        title: t('home.import.packageSuccessTitle'),
        message: t('home.import.packageSuccessMessage', { locationCode: imported.locationCode }),
        type: 'success',
        onConfirm: closeAlert,
      });
      router.push('/scan');
    } catch (e) {
      showAlert({
        title: t('home.import.packageErrorTitle'),
        message: String(e),
        type: 'error',
        onConfirm: closeAlert,
      });
    } finally {
      setLoading(false);
    }
  };

  const onDownloadTemplate = async () => {
    try {
      await downloadTemplateWorkbook();
      showAlert({
        title: t('home.import.templateSuccessTitle'),
        message: t('home.import.templateSuccessMessage'),
        type: 'success',
        onConfirm: closeAlert,
      });
    } catch (e) {
      showAlert({
        title: t('home.import.templateErrorTitle'),
        message: String(e),
        type: 'error',
        onConfirm: closeAlert,
      });
    }
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
    showConfirm({
      title: t('home.snapshot.deleteSessionTitle'),
      message: t('home.snapshot.deleteSessionMessage'),
      confirmText: t('home.snapshot.deleteSessionConfirm'),
      cancelText: t('common.button.cancel'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await repos.session.deleteSession(sessId);
          await refreshSessions(sessionPage);
          closeConfirm();
        } catch (e) {
          closeConfirm();
          setTimeout(() => {
             showAlert({ title: t('home.fileManager.errorTitle'), message: String(e), type: 'error', onConfirm: closeAlert });
          }, 300);
        }
      }
    });
  };

  const onOpenHistory = async () => {
    const list = await repos.snapshot.getAllSnapshots();
    setSnapshotsList(list);
    setSnapshotPage(0);
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

  const onOpenRenameSnapshot = (s: { id: string; sourceFileName: string }) => {
    const parts = splitFileName(s.sourceFileName || '');
    setRenameSnapshotId(s.id);
    setRenameBaseName(parts.base || '');
    setRenameExtension(parts.ext || '');
    setRenameVisible(true);
  };

  const onCloseRenameSnapshot = () => {
    setRenameVisible(false);
    setRenameSnapshotId(null);
    setRenameBaseName('');
    setRenameExtension('');
    setRenameSaving(false);
  };

  const onSubmitRenameSnapshot = async () => {
    const id = renameSnapshotId;
    const nextBase = renameBaseName.trim();
    if (!id) return;
    if (!nextBase) {
      showAlert({
        title: t('home.snapshot.renameMissingTitle'),
        message: t('home.snapshot.renameMissingMessage'),
        type: 'warning',
        onConfirm: closeAlert,
      });
      return;
    }
    try {
      setRenameSaving(true);
      const nextName = `${nextBase}${renameExtension}`;
      await repos.snapshot.renameSnapshot(id, nextName);
      setSnapshotsList((prev) => prev.map((s) => (s.id === id ? { ...s, sourceFileName: nextName } : s)));
      if (snapshotId === id) {
        setSnapshot({ snapshotId: id, sourceFileName: nextName });
      }
      onCloseRenameSnapshot();
      showAlert({
        title: t('home.snapshot.renameSuccessTitle'),
        message: t('home.snapshot.renameSuccessMessage'),
        type: 'success',
        onConfirm: closeAlert,
      });
    } catch (e) {
      setRenameSaving(false);
      showAlert({
        title: t('home.snapshot.renameErrorTitle'),
        message: String(e),
        type: 'error',
        onConfirm: closeAlert,
      });
    }
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

    showConfirm({
      title: t('home.fileManager.deleteSourceTitle'),
      message: t('home.fileManager.deleteSourcesMessage', { count: selectedSnapshots.size }),
      confirmText: t('home.fileManager.deleteForever'),
      cancelText: t('common.button.cancel'),
      variant: 'danger',
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
          
          closeConfirm();
        } catch (e) {
          closeConfirm();
          setTimeout(() => {
             showAlert({ title: t('home.fileManager.errorTitle'), message: String(e), type: 'error', onConfirm: closeAlert });
          }, 300);
        }
      }
    });
  };

  const onDeleteSnapshotSingle = (sId: string) => {
     const set = new Set([sId]);
     setSelectedSnapshots(set);
     showConfirm({
      title: t('home.fileManager.deleteSourceTitle'),
      message: t('home.fileManager.deleteOneMessage'),
      confirmText: t('home.fileManager.deleteOne'),
      cancelText: t('common.button.cancel'),
      variant: 'danger',
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
          closeConfirm();
        } catch (e) {
           closeConfirm();
        }
      }
     });
  };

  const resumeSessionId = currentSessionId || sessions[0]?.id;
  const snapshotTotalPages = Math.max(1, Math.ceil(snapshotsList.length / SNAPSHOT_PAGE_SIZE));
  const snapshotPageList = snapshotsList.slice(snapshotPage * SNAPSHOT_PAGE_SIZE, (snapshotPage + 1) * SNAPSHOT_PAGE_SIZE);
  const quickActions = isAdvanced
    ? [
        {
          key: 'resume',
          label: t('home.quick.resumeLabel'),
          sub: t('home.quick.resumeSub'),
          icon: Play,
          enabled: !!resumeSessionId,
          onPress: () => resumeSessionId && onOpenSession(resumeSessionId),
        },
        {
          key: 'new',
          label: t('home.quick.startLabel'),
          sub: t('home.quick.startSub'),
          icon: Plus,
          enabled: !!snapshotId && !!warehouseName,
          onPress: onCreateSession,
        },
        {
          key: 'import',
          label: t('home.quick.initLabel'),
          sub: t('home.quick.initSub'),
          icon: FileSpreadsheet,
          enabled: true,
          onPress: onOpenInitWizard,
        },
        {
          key: 'import_package',
          label: t('home.quick.importPackageLabel'),
          sub: t('home.quick.importPackageSub'),
          icon: FileSpreadsheet,
          enabled: true,
          onPress: onImportLocationPackage,
        },
        {
          key: 'change',
          label: t('home.quick.changeSourceLabel'),
          sub: t('home.quick.changeSourceSub'),
          icon: FolderOpen,
          enabled: true,
          onPress: onOpenHistory,
        },
      ]
    : [
        {
          key: 'resume',
          label: t('home.quick.resumeLabel'),
          sub: t('home.quick.resumeSub'),
          icon: Play,
          enabled: !!resumeSessionId,
          onPress: () => resumeSessionId && onOpenSession(resumeSessionId),
        },
        {
          key: 'new',
          label: t('home.quick.startLabel'),
          sub: t('home.quick.startSub'),
          icon: Plus,
          enabled: !!snapshotId && !!warehouseName,
          onPress: onCreateSession,
        },
        {
          key: 'import_basic',
          label: t('home.quick.importBasicLabel'),
          sub: t('home.quick.importBasicSub'),
          icon: FileSpreadsheet,
          enabled: true,
          onPress: onImportMisaBasic,
        },
        {
          key: 'change',
          label: t('home.quick.changeSourceLabel'),
          sub: t('home.quick.changeSourceSub'),
          icon: FolderOpen,
          enabled: true,
          onPress: onOpenHistory,
        },
      ];

  return (
    <Screen
      title={t('home.title')}
      subtitle={t('home.subtitle')}
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
      <ConfirmSheet
        visible={confirmVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        variant={confirmConfig.variant}
        onCancel={closeConfirm}
        onConfirm={confirmConfig.onConfirm}
      />

      {/* HISTORY MODAL */}
      <Modal visible={historyVisible} animationType="slide" transparent onRequestClose={() => setHistoryVisible(false)}>
        <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                 {isMultiSelect ? (
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity onPress={() => setIsMultiSelect(false)}><X size={24} color={COLORS.textMain}/></TouchableOpacity>
                      <Text style={styles.modalTitle}>{t('home.fileManager.selectedTitle', { count: selectedSnapshots.size })}</Text>
                   </View>
                 ) : (
                   <Text style={styles.modalTitle}>{t('home.fileManager.title')}</Text>
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
                          {selectedSnapshots.size === snapshotsList.length ? t('home.fileManager.deselectAll') : t('home.fileManager.selectAll')}
                        </Text>
                      </TouchableOpacity>
                    )}
                 </View>
              </View>

              <ScrollView style={{ height: 400 }}>
                 {snapshotPageList.length === 0 ? (
                    <Text style={{ padding: 20, textAlign: 'center', color: COLORS.textSecondary }}>{t('home.fileManager.empty')}</Text>
                 ) : (
                    snapshotPageList.map(item => {
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
                                    <CheckCircle2 size={22} color={COLORS.primary} fill={COLORS.infoBg} />
                                  ) : (
                                    <Circle size={22} color={COLORS.textLight} />
                                  )}
                               </View>
                            ) : null}

                            <View style={{ flex: 1 }}>
                               <Text style={styles.historyName} numberOfLines={1}>{item.sourceFileName}</Text>
                               <Text style={styles.historyDate}>{new Date(item.snapshotAt).toLocaleString()}</Text>
                               {item.id === snapshotId && !isMultiSelect && (
                                 <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold' }}>{t('home.fileManager.currentSelected')}</Text>
                               )}
                            </View>
                            
                            {!isMultiSelect && (
                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                 <TouchableOpacity style={styles.btnAction} onPress={() => onOpenRenameSnapshot(item)}>
                                    <Pencil size={18} color={COLORS.primary} />
                                 </TouchableOpacity>
                                 {item.id !== snapshotId && (
                                   <TouchableOpacity style={styles.btnAction} onPress={() => onSwitchSnapshot(item)}>
                                      <Check size={20} color={COLORS.success} />
                                   </TouchableOpacity>
                                 )}
                                 <TouchableOpacity style={[styles.btnAction, styles.btnActionDanger]} onPress={() => onDeleteSnapshotSingle(item.id)}>
                                    <Trash2 size={20} color={ACTION_COLORS.dangerText} />
                                 </TouchableOpacity>
                              </View>
                            )}
                         </TouchableOpacity>
                       );
                    })
                 )}
              </ScrollView>

              {snapshotsList.length > SNAPSHOT_PAGE_SIZE && !isMultiSelect && (
                <View style={styles.paginationBar}>
                  <TouchableOpacity
                    style={[styles.pageBtn, snapshotPage === 0 && styles.pageBtnDisabled]}
                    disabled={snapshotPage === 0}
                    onPress={() => setSnapshotPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft size={18} color={snapshotPage === 0 ? COLORS.textLight : COLORS.textMain} />
                    <Text style={[styles.pageBtnText, snapshotPage === 0 && styles.pageBtnTextDisabled]}>{t('home.pagePrev')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageInfo}>
                    {t('home.pageInfo', { current: Math.min(snapshotPage + 1, snapshotTotalPages), total: snapshotTotalPages })}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.pageBtn,
                      snapshotPage + 1 >= snapshotTotalPages && styles.pageBtnDisabled,
                    ]}
                    disabled={snapshotPage + 1 >= snapshotTotalPages}
                    onPress={() => setSnapshotPage((p) => Math.min(snapshotTotalPages - 1, p + 1))}
                  >
                    <Text style={[styles.pageBtnText, snapshotPage + 1 >= snapshotTotalPages && styles.pageBtnTextDisabled]}>
                      {t('home.pageNext')}
                    </Text>
                    <ChevronRight size={18} color={snapshotPage + 1 >= snapshotTotalPages ? COLORS.textLight : COLORS.textMain} />
                  </TouchableOpacity>
                </View>
              )}

              {isMultiSelect && (
                 <View style={styles.modalFooter}>
                    <TouchableOpacity 
                      style={[styles.btnDeleteMulti, selectedSnapshots.size === 0 && { opacity: 0.5 }]}
                      disabled={selectedSnapshots.size === 0}
                      onPress={onDeleteMultipleSnapshots}
                    >
                       <Trash2 size={18} color="#FFF" style={{ marginRight: 8 }} />
                       <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
                         {t('home.fileManager.deleteSelected', { count: selectedSnapshots.size })}
                       </Text>
                    </TouchableOpacity>
                 </View>
              )}
           </View>
        </View>
      </Modal>

      <Modal visible={renameVisible} animationType="fade" transparent onRequestClose={onCloseRenameSnapshot}>
        <View style={styles.modalOverlay}>
          <View style={styles.renameModal}>
            <Text style={styles.renameTitle}>{t('home.fileManager.renameTitle')}</Text>
            <Text style={styles.renameHint}>{t('home.fileManager.renameHint')}</Text>
            <View style={styles.renameInputWrap}>
              <GuardedTextInput
                value={renameBaseName}
                onChangeText={setRenameBaseName}
                placeholder={t('home.fileManager.renamePlaceholder')}
                autoFocus
                style={[styles.renameInput, { flex: 1 }]}
                placeholderTextColor={COLORS.textLight}
              />
              {!!renameExtension && <Text style={styles.renameExtText}>{renameExtension}</Text>}
            </View>
            {!!renameExtension && (
              <Text style={styles.renameExtHint}>{t('home.fileManager.renameExtHint')}</Text>
            )}
            <View style={styles.renameActions}>
              <TouchableOpacity onPress={onCloseRenameSnapshot} style={[styles.renameBtn, styles.renameBtnSecondary]}>
                <Text style={styles.renameBtnSecondaryText}>{t('home.fileManager.renameCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSubmitRenameSnapshot}
                style={[styles.renameBtn, styles.renameBtnPrimary, renameSaving && { opacity: 0.6 }]}
                disabled={renameSaving}
              >
                <Text style={styles.renameBtnPrimaryText}>{renameSaving ? t('home.fileManager.renameSaving') : t('home.fileManager.renameSave')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={initVisible} animationType="slide" transparent onRequestClose={() => setInitVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.initModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('home.wizard.title')}</Text>
              <TouchableOpacity onPress={() => setInitVisible(false)}>
                <X size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <View style={styles.initStepRow}>
              {[1, 2, 3, 4].map((step) => (
                <View key={step} style={styles.initStepItem}>
                  <View style={[styles.initStepCircle, initStep >= step && styles.initStepCircleActive]}>
                    <Text style={[styles.initStepNum, initStep >= step && styles.initStepNumActive]}>{step}</Text>
                  </View>
                </View>
              ))}
            </View>

            {initStep === 1 && (
              <View style={styles.initBody}>
                <Text style={styles.initTitle}>{t('home.wizard.step1Title')}</Text>
                <Text style={styles.initText}>{t('home.wizard.step1Text')}</Text>
                <TouchableOpacity
                  onPress={onPickMisaForInit}
                  style={[styles.initPrimaryBtn, initImporting && { opacity: 0.6 }]}
                  disabled={initImporting}
                >
                  <Text style={styles.initPrimaryText}>{initImporting ? t('home.wizard.step1Loading') : t('home.wizard.step1Pick')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {initStep === 2 && (
              <View style={styles.initBody}>
                <Text style={styles.initTitle}>{t('home.wizard.step2Title')}</Text>
                <Text style={styles.initText}>{t('home.wizard.sourceFile', { name: initSourceFileName || '-' })}</Text>
                <Text style={styles.initText}>{t('home.wizard.step2WarehouseCount', { count: initWarehouses.length })}</Text>
                <Text style={styles.initText}>{t('home.wizard.snapshotId', { id: initSnapshotId || '-' })}</Text>
                <TouchableOpacity onPress={onContinueInitAfterParse} style={styles.initPrimaryBtn}>
                  <Text style={styles.initPrimaryText}>{t('home.wizard.step2Continue')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {initStep === 3 && (
              <View style={styles.initBody}>
                <Text style={styles.initTitle}>{t('home.wizard.step3Title')}</Text>
                <Text style={styles.initText}>{t('home.wizard.step3Text')}</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={initWarehouse} onValueChange={(v) => setInitWarehouse(String(v))} style={{ height: 50 }}>
                    {initWarehouses.map((w) => (
                      <Picker.Item key={w} label={w} value={w} />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity onPress={onConfirmWarehouseStep} style={styles.initPrimaryBtn}>
                  <Text style={styles.initPrimaryText}>{t('home.wizard.step3Confirm')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {initStep === 4 && (
              <View style={styles.initBody}>
                <Text style={styles.initTitle}>{t('home.wizard.step4Title')}</Text>
                <Text style={styles.initText}>{t('home.wizard.step4Warehouse', { warehouse: initWarehouse || '-' })}</Text>
                <Text style={styles.initText}>{t('home.wizard.step4Cycle', { code: initCycleCode || '-' })}</Text>
                <Text style={styles.initText}>{t('home.wizard.step4Text')}</Text>
                <TouchableOpacity
                  onPress={onCreateProjectFromWizard}
                  style={[styles.initPrimaryBtn, loading && { opacity: 0.6 }]}
                  disabled={loading}
                >
                  <Text style={styles.initPrimaryText}>{loading ? t('home.wizard.step4Creating') : t('home.wizard.step4Create')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: SPACING.l, paddingBottom: SPACING.m }}>
            <View style={styles.quickSection}>
              <Text style={styles.quickTitle}>{t('home.quickTitle')}</Text>
              <Text style={styles.quickModeHint}>
                {t('home.quickModeHint', { mode: isAdvanced ? t('home.modeAdvanced') : t('home.modeBasic') })}
              </Text>
              <View style={styles.quickGrid}>
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Pressable
                      key={action.key}
                      onPress={action.onPress}
                      disabled={!action.enabled}
                      style={({ pressed }) => [
                        styles.quickCard,
                        !action.enabled && { opacity: 0.45 },
                        pressed && action.enabled && { transform: [{ scale: 0.98 }], opacity: 0.95 },
                      ]}
                    >
                      <View style={styles.quickIcon}>
                        <Icon size={20} color={COLORS.primary} />
                      </View>
                      <Text style={styles.quickLabel} numberOfLines={1}>{action.label}</Text>
                      <Text style={styles.quickSub} numberOfLines={1}>{action.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={() => setSessionHistoryVisible(true)}
                disabled={!snapshotId}
                style={({ pressed }) => [
                  styles.quickBar,
                  !snapshotId && { opacity: 0.45 },
                  pressed && snapshotId && styles.quickBarPressed,
                ]}
              >
                <View style={styles.quickBarLeft}>
                  <ListChecks size={18} color={COLORS.primary} />
                  <Text style={styles.quickBarText}>{t('home.chooseSession')}</Text>
                </View>
                <ChevronRight size={18} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <Card title={t('home.sourceData')} icon={<FileSpreadsheet size={24} color={COLORS.primary} />}>
              {snapshotId ? (
                <View style={{ gap: SPACING.s }}>
                   <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{sourceFileName}</Text>
                      <Badge label={t('home.activeBadge')} type="success" />
                   </View>
                   
                   <Text style={styles.fileHint}>{t('home.sourceHint')}</Text>
                   <View style={styles.sourceActionRow}>
                    <TouchableOpacity style={styles.sourceActionBtn} onPress={onDownloadTemplate}>
                      <Text style={styles.sourceActionBtnText}>{t('home.downloadTemplate')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.sourceActionHint}>
                      {isAdvanced
                        ? t('home.sourceHintAdvanced')
                        : t('home.sourceHintBasic')}
                    </Text>
                   </View>
                </View>
              ) : (
                <View style={{ gap: SPACING.m }}>
                   <Text style={{ color: COLORS.textSecondary }}>{t('home.noSource')}</Text>
                   <TouchableOpacity style={styles.sourceActionBtn} onPress={onDownloadTemplate}>
                     <Text style={styles.sourceActionBtnText}>{t('home.downloadTemplate')}</Text>
                   </TouchableOpacity>
                   <Text style={styles.sourceActionHint}>
                     {isAdvanced
                       ? t('home.noSourceAdvanced')
                       : t('home.noSourceBasic')}
                   </Text>
                </View>
              )}
            </Card>

            {snapshotId && (
              <Card title={t('home.warehouseTitle')} icon={<Warehouse size={24} color={COLORS.primary} />}>
                <Text style={styles.label}>{t('home.chooseWarehouse')}</Text>
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
              </Card>
            )}

          </View>
      </ScrollView>

      {/* SESSION HISTORY MODAL */}
      <Modal visible={sessionHistoryVisible} animationType="slide" transparent onRequestClose={() => setSessionHistoryVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('home.sessionHistoryTitle')}</Text>
              <TouchableOpacity onPress={() => setSessionHistoryVisible(false)}>
                <X size={24} color={COLORS.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ height: 420 }}>
              {!warehouseName ? (
                <Text style={{ padding: 20, textAlign: 'center', color: COLORS.textSecondary }}>{t('home.chooseWarehouseToView')}</Text>
              ) : sessions.length === 0 ? (
                <Text style={{ padding: 20, textAlign: 'center', color: COLORS.textSecondary }}>{t('home.noSessionInWarehouse')}</Text>
              ) : (
                sessions.map((item, index) => {
                  const isLatest = sessionPage === 0 && index === 0;
                  return (
                    <View key={item.id} style={[styles.sessionCardWrapper, { borderLeftColor: isLatest ? COLORS.primary : COLORS.divider }]}>
                      <TouchableOpacity style={styles.sessionMain} onPress={() => onOpenSession(item.id)}>
                        <View style={styles.sessionTitleRow}>
                          <Text style={styles.sessionTitle}>{t('home.sessionCardTitle')}</Text>
                          {isLatest && <Badge label={t('common.status.latest')} type="info" size="small" />}
                        </View>
                        <View style={styles.sessionDateRow}>
                          <Text style={styles.sessionDate}>
                            {new Date(item.createdAt).toLocaleTimeString()} · {new Date(item.createdAt).toLocaleDateString()}
                          </Text>
                          <Text style={styles.sessionAgo}>{formatRelative(item.createdAt)}</Text>
                        </View>
                        <Text style={styles.sessionId} numberOfLines={1} ellipsizeMode="middle">
                          {t('home.sessionId', { id: item.id })}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.sessionActions}>
                        <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => onOpenSession(item.id)}>
                          <Play size={16} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtnDanger} onPress={() => onDeleteSession(item.id)}>
                          <Trash2 size={16} color={ACTION_COLORS.dangerText} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {sessionTotal > SESSION_PAGE_SIZE && (
              <View style={styles.paginationBar}>
                <TouchableOpacity
                  style={[styles.pageBtn, sessionPage === 0 && styles.pageBtnDisabled]}
                  disabled={sessionPage === 0}
                  onPress={() => refreshSessions(sessionPage - 1)}
                >
                  <ChevronLeft size={18} color={sessionPage === 0 ? COLORS.textLight : COLORS.textMain} />
                  <Text style={[styles.pageBtnText, sessionPage === 0 && styles.pageBtnTextDisabled]}>{t('home.pagePrev')}</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  {t('home.pageInfo', {
                    current: Math.min(sessionPage + 1, Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE))),
                    total: Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE)),
                  })}
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
                    {t('home.pageNext')}
                  </Text>
                  <ChevronRight size={18} color={sessionPage + 1 >= Math.max(1, Math.ceil(sessionTotal / SESSION_PAGE_SIZE)) ? COLORS.textLight : COLORS.textMain} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  quickSection: { marginTop: -2 },
  quickTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMain, marginBottom: SPACING.s },
  quickModeHint: { fontSize: 11, color: COLORS.textSecondary, marginBottom: SPACING.s },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
  quickCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.card,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.infoBg,
    marginBottom: 6,
  },
  quickLabel: { fontSize: 13, fontWeight: '800', color: COLORS.textMain },
  quickSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  fileHint: { fontSize: 12, color: COLORS.textSecondary },
  sourceActionRow: { marginTop: 4, alignItems: 'flex-start' },
  sourceActionBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.infoBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sourceActionBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primaryDark },
  sourceActionHint: { marginTop: 6, fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  quickBar: {
    marginTop: SPACING.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: SPACING.m,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  quickBarPressed: { backgroundColor: COLORS.infoBg },
  quickBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickBarText: { fontSize: 12, fontWeight: '800', color: COLORS.textMain },

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
    backgroundColor: ACTION_COLORS.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ACTION_COLORS.dangerBorder,
  },

  sessionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.s },
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
    backgroundColor: COLORS.infoBg,
  },
  historyItemSelected: {
    backgroundColor: ACTION_COLORS.dangerBg,
  },
  historyName: { fontWeight: '600', fontSize: 16, color: COLORS.textMain },
  historyDate: { fontSize: 12, color: COLORS.textSecondary },
  btnAction: {
    padding: 8,
  },
  btnActionDanger: {
    borderRadius: 10,
    backgroundColor: ACTION_COLORS.dangerBg,
    borderWidth: 1,
    borderColor: ACTION_COLORS.dangerBorder,
  },
  renameModal: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    ...SHADOWS.card,
    padding: SPACING.m,
    gap: SPACING.s,
  },
  renameTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textMain },
  renameHint: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  renameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingRight: 10,
  },
  renameInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textMain,
  },
  renameExtText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  renameExtHint: { fontSize: 11, color: COLORS.textSecondary },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.s,
    marginTop: 4,
  },
  renameBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  renameBtnSecondary: {
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  renameBtnSecondaryText: {
    color: COLORS.textMain,
    fontWeight: '700',
    fontSize: 13,
  },
  renameBtnPrimary: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  renameBtnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  initModal: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    ...SHADOWS.card,
    overflow: 'hidden',
    maxHeight: '86%',
  },
  initStepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
    paddingBottom: SPACING.s,
    backgroundColor: COLORS.background,
  },
  initStepItem: { flex: 1, alignItems: 'center' },
  initStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  initStepCircleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.infoBg,
  },
  initStepNum: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  initStepNumActive: { color: COLORS.primaryDark },
  initBody: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    gap: 10,
  },
  initTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  initText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  initPrimaryBtn: {
    marginTop: SPACING.s,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  initPrimaryText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
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
