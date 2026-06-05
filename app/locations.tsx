import React, { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MapPin, Plus, Trash2, Home, X, Pencil, Warehouse, Upload, Download, FileInput } from 'lucide-react-native';

import { Screen, PrimaryButton, SecondaryButton, Badge, ProgressBar } from '@/presentation/components/ui';
import { ConfirmSheet } from '@/presentation/components/ConfirmSheet';
import { useAppStore } from '@/presentation/store/appStore';
import { repos } from '@/config/di';
import { pickAndParseLocationScopeFile } from '@/infra/files/pickAndParseLocationScopeFile';
import { pickAndParseLocationSubmissionFile } from '@/infra/files/pickAndParseLocationSubmissionFile';
import { ACTION_COLORS, COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { log, error as logError } from '@/infra/logger';
import { stripDiacritics } from '@/domain/utils/normalize';
import { exportLocationPackage, exportLocationSubmission, importLocationSubmission } from '@/domain/usecases/locationExchange';
import { useI18n } from '@/presentation/i18n/useI18n';
import { GuardedTextInput } from '@/presentation/components/scan/GuardedTextInput';

type LocationRow = Awaited<ReturnType<typeof repos.session.listLocationCounts>>[number];

export default function LocationsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const sessionId = useAppStore((s) => s.currentSessionId);
  const snapshotId = useAppStore((s) => s.currentSnapshotId);
  const warehouseName = useAppStore((s) => s.currentWarehouse);
  const currentLocationId = useAppStore((s) => s.currentLocationId);
  const operationMode = useAppStore((s) => s.operationMode);
  const setCurrentLocationId = useAppStore((s) => s.setCurrentLocationId);
  const isAdvanced = operationMode === 'ADVANCED';

  const [locations, setLocations] = React.useState<LocationRow[]>([]);
  const [totalItems, setTotalItems] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [showAdd, setShowAdd] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newType, setNewType] = React.useState<'WAREHOUSE' | 'OTHER'>('OTHER');
  const [saving, setSaving] = React.useState(false);
  const [showEdit, setShowEdit] = React.useState(false);
  const [editLocationId, setEditLocationId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [confirmVisible, setConfirmVisible] = React.useState(false);
  const [confirmConfig, setConfirmConfig] = React.useState<{
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({ title: '', message: '', onConfirm: () => {} });
  const [showGuide, setShowGuide] = React.useState(true);
  const guideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateLocationCode = React.useCallback((name: string) => {
    const normalized = stripDiacritics(name || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 28);
    if (!normalized) return '';
    const body = normalized.startsWith('LOC_') ? normalized.slice(4) : normalized;
    return `LOC_${body}`;
  }, []);
  const generatedCode = React.useMemo(() => generateLocationCode(newName), [generateLocationCode, newName]);
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
    } catch (e) {
      logError('LOCATIONS_MANAGE_LOAD_ERROR', e);
    } finally {
      setLoading(false);
    }
  }, [sessionId, snapshotId, warehouseName]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useFocusEffect(
    useCallback(() => {
      if (guideTimerRef.current) {
        clearTimeout(guideTimerRef.current);
        guideTimerRef.current = null;
      }
      setShowGuide(true);
      guideTimerRef.current = setTimeout(() => {
        setShowGuide(false);
        guideTimerRef.current = null;
      }, 5000);

      return () => {
        if (guideTimerRef.current) {
          clearTimeout(guideTimerRef.current);
          guideTimerRef.current = null;
        }
      };
    }, [])
  );

  const onToggleGuide = React.useCallback(() => {
    if (guideTimerRef.current) {
      clearTimeout(guideTimerRef.current);
      guideTimerRef.current = null;
    }
    setShowGuide((prev) => !prev);
  }, []);

  const onEnterLocation = (loc: LocationRow) => {
    setCurrentLocationId(loc.locationId);
    router.replace('/scan');
  };

  const onAddLocation = async () => {
    if (!sessionId) return;
    const cleanCode = generatedCode;
    if (!cleanCode) {
      Alert.alert(t('locations.missingNameTitle'), t('locations.missingNameMessage'));
      return;
    }

    setSaving(true);
    try {
      const existing = locations.find((l) => l.locationCode === cleanCode);
      if (existing) {
        Alert.alert(
          t('locations.duplicateCodeTitle'),
          t('locations.duplicateCodeMessage', { code: cleanCode }),
        );
        return;
      }
      const locId = await repos.session.ensureLocationInSession({
        sessionId,
        locationCode: cleanCode,
        locationName: newName.trim() || cleanCode,
        locationType: newType
      });
      if (!isAdvanced) {
        await applyBasicAllSkuScope(locId);
      }
      log('LOCATION_ADD_MANUAL', { sessionId, locationId: locId, code: cleanCode });
      setShowAdd(false);
      setNewName('');
      setNewType('OTHER');
      setShowGuide(false);
      loadData();
    } catch (e) {
      logError('LOCATION_ADD_MANUAL_ERROR', e);
      Alert.alert(t('common.message.unknownError'), String(e));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteLocation = (loc: LocationRow) => {
    setConfirmConfig({
      title: t('home.snapshot.deleteSessionTitle'),
      message: t('home.snapshot.deleteSessionMessage'),
      confirmText: t('common.button.delete'),
      cancelText: t('common.button.cancel'),
      onConfirm: async () => {
        if (!sessionId) return;
        try {
          await repos.session.removeLocationFromSession({ sessionId, locationId: loc.locationId });
          if (currentLocationId === loc.locationId) {
            setCurrentLocationId(null);
          }
          loadData();
          setConfirmVisible(false);
        } catch (e) {
          setConfirmVisible(false);
          logError('LOCATION_DELETE_ERROR', e);
          Alert.alert(t('common.message.unknownError'), String(e));
        }
      },
    });
    setConfirmVisible(true);
  };

  const onOpenEdit = (loc: LocationRow) => {
    setEditLocationId(loc.locationId);
    setEditName(loc.locationName);
    setShowEdit(true);
  };

  const onSaveEdit = async () => {
    if (!editLocationId) return;
    const name = editName.trim();
    if (!name) {
      Alert.alert(t('locations.missingNameTitle'), t('locations.missingNameMessage'));
      return;
    }
    setSaving(true);
    try {
      await repos.session.updateLocationName({ locationId: editLocationId, locationName: name });
      setShowEdit(false);
      setEditLocationId(null);
      setEditName('');
      loadData();
    } catch (e) {
      logError('LOCATION_UPDATE_ERROR', e);
      Alert.alert(t('common.message.unknownError'), String(e));
    } finally {
      setSaving(false);
    }
  };

  const onImportLocationScope = async () => {
    if (!sessionId || !snapshotId || !warehouseName) return;
    try {
      const picked = await pickAndParseLocationScopeFile();
      if (!picked) return;
      if (!picked.rows.length) {
        Alert.alert(t('locations.fileEmptyTitle'), t('locations.fileEmptyMessage'));
        return;
      }

      const uniqueLocations = new Set(picked.rows.map((r) => r.locationCode.trim()).filter(Boolean)).size;
      const fileType = picked.fileName.toLowerCase().endsWith('.csv') ? 'CSV' : 'Excel';
      const result = await repos.session.importLocationScope({
        sessionId,
        snapshotId,
        warehouseName,
        rows: picked.rows,
      });
      await loadData();
      setShowGuide(false);

      const invalidPreview = result.invalidRows.slice(0, 3).map((r) => `Row ${r.row}: ${r.reason}`).join('\n');
      const invalidText = result.invalidRows.length > 0
        ? t('locations.rowImportInvalidPart', { count: result.invalidRows.length, preview: invalidPreview })
        : '';
      Alert.alert(
        t('locations.importScopeDoneTitle'),
        t('locations.rowImportSummary', {
          fileType,
          locations: uniqueLocations,
          inserted: result.inserted,
          dupes: result.ignoredDuplicates,
          created: result.createdLocations,
          invalidPart: invalidText,
        })
      );
    } catch (e) {
      logError('IMPORT_LOCATION_SCOPE_ERROR', e);
      Alert.alert(t('locations.importScopeErrorTitle'), String(e));
    }
  };

  const onImportLocationSubmission = async () => {
    if (!sessionId || !snapshotId || !warehouseName) return;
    try {
      const picked = await pickAndParseLocationSubmissionFile();
      if (!picked) return;
      const result = await importLocationSubmission({
        sessionRepo: repos.session,
        sessionId,
        snapshotId,
        warehouseName,
        meta: picked.meta,
        rows: picked.rows,
      });
      await loadData();
      setShowGuide(false);
      Alert.alert(
        t('locations.importSubmissionDoneTitle'),
        `${t('common.field.location')}: ${result.locationCode}\n${t('common.field.total')}: ${result.importedRows}`,
      );
    } catch (e) {
      logError('IMPORT_LOCATION_SUBMISSION_ERROR', e);
      Alert.alert(t('locations.importSubmissionErrorTitle'), String(e));
    }
  };

  const onExportLocationPackage = async (loc: LocationRow) => {
    if (!sessionId) return;
    try {
      await exportLocationPackage({
        sessionRepo: repos.session,
        sessionId,
        locationId: loc.locationId,
      });
      Alert.alert(t('locations.exportPackageDoneTitle'), t('locations.exportPackageDoneMessage', { code: loc.locationCode }));
    } catch (e) {
      logError('EXPORT_LOCATION_PACKAGE_ERROR', e);
      Alert.alert(t('locations.exportPackageErrorTitle'), String(e));
    }
  };

  const onExportLocationSubmission = async (loc: LocationRow) => {
    if (!sessionId || !snapshotId || !warehouseName) return;
    try {
      await exportLocationSubmission({
        exportRepo: repos.export,
        sessionRepo: repos.session,
        sessionId,
        snapshotId,
        warehouseName,
        locationId: loc.locationId,
      });
      Alert.alert(t('locations.exportSubmissionDoneTitle'), t('locations.exportSubmissionDoneMessage', { code: loc.locationCode }));
    } catch (e) {
      logError('EXPORT_LOCATION_SUBMISSION_ERROR', e);
      Alert.alert(t('locations.exportSubmissionErrorTitle'), String(e));
    }
  };

  const renderLocation = ({ item }: { item: LocationRow }) => {
    const expected = item.progress.expectedLines || 0;
    const outOfScope = item.progress.outOfScopeCount || 0;
    const countedTotal = item.progress.countedLines || 0;
    const inScopeCounted = Math.max(0, countedTotal - outOfScope);
    const coverageTarget = expected > 0 ? expected : (!isAdvanced ? totalItems : 0);
    const coverageCount = expected > 0 ? inScopeCounted : (!isAdvanced ? countedTotal : inScopeCounted);
    const progressPercent = coverageTarget > 0 ? Math.min(100, (coverageCount / coverageTarget) * 100) : 0;
    return (
      <Pressable style={styles.card} onPress={() => onEnterLocation(item)}>
        <View style={styles.cardLeft}>
        <View style={[styles.iconBox, { backgroundColor: item.locationType === 'WAREHOUSE' ? COLORS.infoBg : COLORS.warningBg }]}>
          <MapPin size={22} color={item.locationType === 'WAREHOUSE' ? COLORS.primary : COLORS.warning} />
        </View>
        </View>
        <View style={styles.cardBody}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.locName}>{item.locationName}</Text>
              <Text style={styles.locCode}>{item.locationCode}</Text>
            </View>
            <Badge
              label={item.status === 'PENDING' ? t('locations.statusPending') : item.status === 'IN_PROGRESS' ? t('locations.statusInProgress') : t('locations.statusDone')}
              type={item.status === 'PENDING' ? 'default' : item.status === 'IN_PROGRESS' ? 'info' : 'success'}
              size="small"
            />
          </View>
          <View style={{ marginTop: 8 }}>
            <Text style={styles.progressLabel}>{t('locations.locationCoverage')}</Text>
            <ProgressBar progress={progressPercent} color={COLORS.primary} />
            <Text style={styles.progressText}>
              {coverageTarget > 0
                ? t('locations.checkedCodeLine', { count: coverageCount, total: coverageTarget })
                : t('locations.checkedOnlyLine', { count: countedTotal })}
            </Text>
            {isAdvanced && outOfScope > 0 && <Text style={styles.outOfScopeText}>{t('locations.outOfScopeLine', { count: outOfScope })}</Text>}
          </View>
        </View>
        <View style={[styles.rowActions, !isAdvanced && styles.rowActionsBasic]}>
          {isAdvanced && (
            <Pressable onPress={() => onExportLocationPackage(item)} style={styles.actionPillBtn}>
              <Download size={16} color={COLORS.primaryDark} />
              <Text style={styles.actionPillText}>{t('locations.quickPackage')}</Text>
            </Pressable>
          )}
          {isAdvanced && (
            <Pressable onPress={() => onExportLocationSubmission(item)} style={styles.actionPillBtn}>
              <FileInput size={16} color={COLORS.success} />
              <Text style={[styles.actionPillText, { color: COLORS.success }]}>{t('locations.quickSubmit')}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => onOpenEdit(item)} style={styles.actionIconBtn}>
            <Pencil size={16} color={COLORS.primary} />
          </Pressable>
          <Pressable onPress={() => onDeleteLocation(item)} style={[styles.actionIconBtn, styles.actionIconDanger]}>
            <Trash2 size={18} color={ACTION_COLORS.dangerText} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen
      title={t('locations.title')}
      subtitle={warehouseName || ''}
      style={{ padding: 0 }}
      headerRight={
        <Pressable onPress={() => router.replace('/inventory')} style={styles.headerActionBtn}>
          <Home size={16} color={COLORS.primary} />
          <Text style={styles.headerActionText}>{t('locations.home')}</Text>
        </Pressable>
      }
    >
      <ConfirmSheet
        visible={confirmVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        variant="danger"
        onCancel={() => setConfirmVisible(false)}
        onConfirm={confirmConfig.onConfirm}
      />
      <View style={styles.hero}>
        <View style={styles.heroOrb} />
        <Text style={styles.heroEyebrow}>{t('locations.heroEyebrow')}</Text>
        <Text style={styles.heroTitle}>{t('locations.heroTitle')}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{t('locations.totalLocations')}</Text>
            <Text style={styles.heroStatValue}>{locations.length}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>{t('locations.totalItems')}</Text>
            <Text style={styles.heroStatValue}>{totalItems}</Text>
          </View>
        </View>
      </View>

      <View style={styles.guideShell}>
        <View style={styles.guideHeader}>
          <View style={styles.guideTitleRow}>
            <View style={styles.guideIcon}>
              <Warehouse size={16} color={COLORS.primary} />
            </View>
            <View style={styles.guideTextWrap}>
              <Text style={styles.guideTitle}>{t('locations.operationsTitle')}</Text>
              <Text style={styles.guideSubtitle}>
                {isAdvanced ? t('locations.operationsSubAdvanced') : t('locations.operationsSubBasic')}
              </Text>
            </View>
          </View>
          <Pressable onPress={onToggleGuide} style={styles.guideToggle}>
            <Text style={styles.guideToggleText}>{showGuide ? t('common.button.collapse') : t('common.button.expand')}</Text>
          </Pressable>
        </View>

        {showGuide && (
          <View style={styles.ceoList}>
            {isAdvanced && (
              <Pressable style={styles.ceoRow} onPress={onImportLocationScope}>
                <View style={[styles.ceoIcon, { backgroundColor: COLORS.infoBg }]}>
                  <Upload size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ceoRowTitle}>{t('locations.mapSkuTitle')}</Text>
                  <Text style={styles.ceoRowText}>
                    {t('locations.mapSkuHint')}
                  </Text>
                </View>
              </Pressable>
            )}

            {isAdvanced && (
              <Pressable style={styles.ceoRow} onPress={onImportLocationSubmission}>
                <View style={[styles.ceoIcon, { backgroundColor: `${COLORS.success}1A` }]}>
                  <FileInput size={16} color={COLORS.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ceoRowTitle}>{t('locations.importSubmissionTitle')}</Text>
                  <Text style={styles.ceoRowText}>
                    {t('locations.importSubmissionHint')}
                  </Text>
                </View>
              </Pressable>
            )}

            <Pressable style={styles.ceoRow} onPress={() => setShowAdd(true)}>
              <View style={[styles.ceoIcon, { backgroundColor: COLORS.warningBg }]}>
                <Plus size={16} color={COLORS.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ceoRowTitle}>{t('locations.addLocationTitle')}</Text>
                <Text style={styles.ceoRowText}>
                  {isAdvanced
                    ? t('locations.addLocationHintAdvanced')
                    : t('locations.addLocationHintBasic')}
                </Text>
              </View>
            </Pressable>

            <Pressable style={styles.ceoRow} onPress={() => router.replace('/inventory')}>
              <View style={[styles.ceoIcon, { backgroundColor: `${COLORS.success}1A` }]}>
                <Home size={16} color={COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ceoRowTitle}>{t('locations.homeSessionTitle')}</Text>
                <Text style={styles.ceoRowText}>
                  {t('locations.homeSessionHint')}
                </Text>
              </View>
            </Pressable>

            <View style={styles.guideInfoBox}>
              <Text style={styles.guideInfoTitle}>{t('locations.guideFlowTitle')}</Text>
              {isAdvanced ? (
                <>
                  <Text style={styles.guideInfoText}>{t('locations.guideAdv1')}</Text>
                  <Text style={styles.guideInfoText}>{t('locations.guideAdv2')}</Text>
                  <Text style={styles.guideInfoText}>{t('locations.guideAdv3')}</Text>
                  <Text style={styles.guideInfoText}>{t('locations.guideAdv4')}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.guideInfoText}>{t('locations.guideBasic1')}</Text>
                  <Text style={styles.guideInfoText}>{t('locations.guideBasic2')}</Text>
                  <Text style={styles.guideInfoText}>{t('locations.guideBasic3')}</Text>
                </>
              )}
              <Text style={styles.guideInfoText}>{t('locations.guideDbHint')}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('locations.sectionTitle')}</Text>
        <Text style={styles.sectionSub}>
          {isAdvanced ? t('locations.sectionSubAdvanced') : t('locations.sectionSubBasic')}
        </Text>
      </View>

      <FlatList
        data={locations}
        keyExtractor={(item) => item.locationId}
        renderItem={renderLocation}
        contentContainerStyle={{ padding: SPACING.m, paddingBottom: SPACING.xl }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <MapPin size={36} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>{t('locations.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('locations.emptyText')}</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={loadData}
      />

      <Modal visible={showAdd} animationType="fade" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('locations.addLocationTitle')}</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.label}>{t('locations.locationNameLabel')}</Text>
            <GuardedTextInput
              value={newName}
              onChangeText={setNewName}
              placeholder={t('locations.locationNamePlaceholder')}
              style={styles.textInput}
            />
            <Text style={styles.label}>{t('locations.locationCodeLabel')}</Text>
            <GuardedTextInput
              value={generatedCode}
              onChangeText={() => undefined}
              editable={false}
              placeholder={t('locations.locationCodePlaceholder')}
              style={[styles.textInput, styles.textInputDisabled]}
            />
            <Text style={styles.helpText}>
              {t('locations.locationCodeHelp')}
            </Text>
            <Text style={styles.label}>{t('locations.locationTypeLabel')}</Text>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setNewType('WAREHOUSE')}
                style={[styles.typeBtn, newType === 'WAREHOUSE' && styles.typeBtnActive]}
              >
                <Text style={[styles.typeText, newType === 'WAREHOUSE' && styles.typeTextActive]}>{t('locations.locationTypeWarehouse')}</Text>
              </Pressable>
              <Pressable
                onPress={() => setNewType('OTHER')}
                style={[styles.typeBtn, newType === 'OTHER' && styles.typeBtnActive]}
              >
                <Text style={[styles.typeText, newType === 'OTHER' && styles.typeTextActive]}>{t('locations.locationTypeOther')}</Text>
              </Pressable>
            </View>
            <View style={styles.modalActions}>
              <SecondaryButton
                label={t('common.button.cancel')}
                onPress={() => {
                  setShowAdd(false);
                  setNewName('');
                  setNewType('OTHER');
                }}
              />
              <PrimaryButton label={t('common.button.save')} onPress={onAddLocation} loading={saving} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEdit} animationType="fade" transparent onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('locations.editLocationTitle')}</Text>
              <Pressable onPress={() => setShowEdit(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.label}>{t('locations.locationNameLabel')}</Text>
            <GuardedTextInput
              value={editName}
              onChangeText={setEditName}
              placeholder={t('locations.locationNamePlaceholder')}
              style={styles.textInput}
            />
            <View style={styles.modalActions}>
              <SecondaryButton label={t('common.button.cancel')} onPress={() => setShowEdit(false)} />
              <PrimaryButton label={t('common.button.save')} onPress={onSaveEdit} loading={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    margin: SPACING.m,
    padding: SPACING.l,
    borderRadius: SIZES.radiusLarge,
    backgroundColor: COLORS.primaryDark,
    overflow: 'hidden',
    ...SHADOWS.float,
  },
  heroOrb: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFFFFF',
    opacity: 0.05,
    top: -50,
    right: -30,
  },
  heroEyebrow: { fontSize: 11, letterSpacing: 1.4, color: '#E7F4EB', fontWeight: '700', textAlign: 'left' },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
    fontFamily: 'sans-serif-condensed',
    textAlign: 'left',
  },
  heroStats: { flexDirection: 'row', gap: SPACING.s, marginTop: SPACING.m },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    padding: 10,
    borderRadius: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  heroStatLabel: { fontSize: 10, color: '#C8DDCF', marginBottom: 2, textAlign: 'left' },
  heroStatValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', textAlign: 'left' },

  sectionHeader: {
    paddingHorizontal: SPACING.m,
    marginTop: SPACING.s,
    marginBottom: SPACING.s,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMain },
  sectionSub: { marginTop: 2, fontSize: 11, color: COLORS.textSecondary },

  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  headerActionText: { fontSize: 12, fontWeight: '700', color: COLORS.textMain },

  guideShell: {
    marginHorizontal: SPACING.m,
    marginTop: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: SPACING.m,
    ...SHADOWS.card,
  },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s },
  guideTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s, flex: 1, minWidth: 0 },
  guideTextWrap: { flexShrink: 1, minWidth: 0 },
  guideIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.infoBg, alignItems: 'center', justifyContent: 'center' },
  guideTitle: { fontWeight: '800', color: COLORS.textMain },
  guideSubtitle: { fontSize: 11, color: COLORS.textSecondary },
  guideToggle: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.background,
    flexShrink: 0,
  },
  guideToggleText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  ceoList: { gap: SPACING.s, marginTop: SPACING.m },
  ceoRow: {
    flexDirection: 'row',
    gap: SPACING.s,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 12,
    padding: 10,
    backgroundColor: COLORS.background,
  },
  ceoIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ceoRowTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textMain },
  ceoRowText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
  guideInfoBox: {
    marginTop: SPACING.s,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  guideInfoTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textMain },
  guideInfoText: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 16,
    marginBottom: SPACING.m,
    ...SHADOWS.card,
  },
  cardLeft: { marginRight: SPACING.m },
  iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1 },
  locName: { fontSize: 15, fontWeight: '800', color: COLORS.textMain },
  locCode: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace' },
  progressLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700', marginBottom: 4 },
  progressText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  outOfScopeText: { fontSize: 11, color: COLORS.error, marginTop: 4, fontWeight: '700' },
  rowActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 156 },
  rowActionsBasic: { maxWidth: 80 },
  actionPillBtn: {
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  actionPillText: { fontSize: 11, fontWeight: '700', color: COLORS.primaryDark },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDanger: { backgroundColor: ACTION_COLORS.dangerBg, borderWidth: 1, borderColor: ACTION_COLORS.dangerBorder },

  emptyCard: {
    marginTop: SPACING.l,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.l,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMain },
  emptyText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: SPACING.m },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: SPACING.m, gap: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  textInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, backgroundColor: COLORS.background },
  textInputDisabled: { color: COLORS.textSecondary },
  helpText: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  modalActions: { flexDirection: 'row', gap: SPACING.m, marginTop: 6 },
  typeRow: { flexDirection: 'row', gap: SPACING.s },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.divider, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  typeBtnActive: { backgroundColor: COLORS.primary },
  typeText: { fontWeight: '700', color: COLORS.textSecondary },
  typeTextActive: { color: '#FFF' },
});
