import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '@/presentation/store/appStore';
import { snapshotRepoSqlite } from '@/data/repos';
import { importSnapshotFromFile } from '@/domain/usecases/importSnapshotFromFile';
import { ImportConflict } from '@/domain/entities/types';
import { COLORS } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';
import { GuardedTextInput } from '@/presentation/components/scan/GuardedTextInput';

export default function ResolveImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const pendingImport = useAppStore((s) => s.pendingImport);
  const setPendingImport = useAppStore((s) => s.setPendingImport);
  const setSnapshot = useAppStore((s) => s.setSnapshot);

  const [resolutions, setResolutions] = useState<Map<string, 'use_rowA' | 'use_rowB'>>(new Map());
  const [codeOverrides, setCodeOverrides] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);

  if (!pendingImport) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={{ textAlign: 'center', marginTop: 20 }}>{t('resolveImport.noPending')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20 }}>
          <Text style={{ color: COLORS.primary, textAlign: 'center' }}>{t('resolveImport.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleResolve = (conflict: ImportConflict, choice: 'use_rowA' | 'use_rowB') => {
    const key = `${conflict.warehouseName}__${conflict.itemCode}`;
    const next = new Map(resolutions);
    next.set(key, choice);
    setResolutions(next);
  };

  const normalizeCode = (value: string) =>
    value
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase();

  const handleOverrideCode = (conflict: ImportConflict, value: string) => {
    const key = `${conflict.warehouseName}__${conflict.itemCode}`;
    const next = new Map(codeOverrides);
    const normalized = normalizeCode(value);
    if (!normalized || normalized === conflict.itemCode) {
      next.delete(key);
    } else {
      next.set(key, normalized);
    }
    setCodeOverrides(next);
  };

  const isConflictResolved = (conflict: ImportConflict) => {
    const key = `${conflict.warehouseName}__${conflict.itemCode}`;
    return resolutions.has(key) || codeOverrides.has(key);
  };

  const handleFinish = async () => {
    if (pendingImport.conflicts.some((conflict) => !isConflictResolved(conflict))) {
      Alert.alert(t('resolveImport.incompleteTitle'), t('resolveImport.incompleteMessage'));
      return;
    }

    setSaving(true);
    useAppStore.getState().setImportStatus('importing');
    useAppStore.getState().setImportProgress(0, 0);

    try {
      const result = await importSnapshotFromFile({
        fileUri: pendingImport.fileUri,
        sourceFileName: pendingImport.fileName,
        repo: snapshotRepoSqlite(),
        resolutions,
        codeOverrides,
        onProgress: (p, tRows) => {
          useAppStore.getState().setImportProgress(p, tRows);
        },
      });

      useAppStore.getState().setImportStatus('done');

      if (result.success) {
        setSnapshot({
          snapshotId: result.snapshotId!,
          sourceFileName: pendingImport.fileName,
        });
        setPendingImport(null);
        Alert.alert(t('resolveImport.successTitle'), t('resolveImport.successMessage'), [
          { text: t('common.button.confirm'), onPress: () => router.replace('/') },
        ]);
      } else {
        setPendingImport({
          ...pendingImport,
          conflicts: result.conflicts,
        });
        setResolutions(new Map());
        setCodeOverrides(new Map());
        Alert.alert(t('resolveImport.needMoreTitle'), t('resolveImport.needMoreMessage'));
      }
    } catch (e) {
      useAppStore.getState().setImportStatus('failed');
      Alert.alert(t('resolveImport.errorTitle'), String(e));
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: ImportConflict }) => {
    const key = `${item.warehouseName}__${item.itemCode}`;
    const choice = resolutions.get(key);
    const overrideCode = codeOverrides.get(key) || '';
    const resolved = isConflictResolved(item);

    return (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.conflictHeader}>
            {t('resolveImport.codeLabel')}: <Text style={{ fontWeight: 'bold' }}>{item.itemCode}</Text>
          </Text>
          {resolved && (
            <View style={styles.resolvedPill}>
              <Ionicons name="checkmark" size={12} color="#fff" />
              <Text style={styles.resolvedPillText}>{t('resolveImport.resolved')}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>{t('resolveImport.warehouseLabel')}: {item.warehouseName}</Text>

        <View style={styles.editCodeRow}>
          <Text style={styles.editCodeLabel}>{t('resolveImport.editCodeLabel')}</Text>
          <GuardedTextInput
            value={overrideCode}
            onChangeText={(v) => handleOverrideCode(item, v)}
            placeholder={t('resolveImport.editCodePlaceholder', { code: item.itemCode })}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.editCodeInput}
            placeholderTextColor={COLORS.textLight}
          />
          {!!overrideCode && (
            <Text style={styles.editCodeHint}>{t('resolveImport.editCodeHint', { code: overrideCode })}</Text>
          )}
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.option, choice === 'use_rowA' && styles.selectedOption]}
            onPress={() => handleResolve(item, 'use_rowA')}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionLabel}>{t('resolveImport.oldData')}</Text>
              {choice === 'use_rowA' && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
            </View>
            <Text style={styles.itemName}>{item.rowA.itemName}</Text>
            <Text style={styles.detailText}>{t('resolveImport.detailLine', { uom: item.rowA.uom, qty: item.rowA.onHandQty })}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.option, choice === 'use_rowB' && styles.selectedOption]}
            onPress={() => handleResolve(item, 'use_rowB')}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionLabel}>{t('resolveImport.newData')}</Text>
              {choice === 'use_rowB' && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
            </View>
            <Text style={styles.itemName}>{item.rowB.itemName}</Text>
            <Text style={styles.detailText}>{t('resolveImport.detailLine', { uom: item.rowB.uom, qty: item.rowB.onHandQty })}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('resolveImport.title', { resolved: resolutions.size, total: pendingImport.conflicts.length })}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.instruction}>{t('resolveImport.instruction')}</Text>

      <FlatList
        data={pendingImport.conflicts}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.warehouseName}__${item.itemCode}`}
        contentContainerStyle={{ padding: 16 }}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.btn, pendingImport.conflicts.some((conflict) => !isConflictResolved(conflict)) && styles.btnDisabled]}
          disabled={pendingImport.conflicts.some((conflict) => !isConflictResolved(conflict)) || saving}
          onPress={handleFinish}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{t('resolveImport.finishAndSave')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  title: { fontSize: 18, fontWeight: '600' },
  instruction: {
    padding: 12,
    backgroundColor: COLORS.warningBg,
    color: COLORS.warning,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resolvedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resolvedPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  editCodeRow: {
    marginBottom: 10,
    gap: 6,
  },
  editCodeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  editCodeInput: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textMain,
    backgroundColor: COLORS.background,
  },
  editCodeHint: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  conflictHeader: { fontSize: 16 },
  optionsContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 6,
  },
  option: {
    padding: 12,
    backgroundColor: COLORS.surface,
  },
  selectedOption: {
    backgroundColor: COLORS.infoBg,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  footer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  btn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: COLORS.border,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
