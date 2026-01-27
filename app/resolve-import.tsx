import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '@/presentation/store/appStore';
import { actualRepoSqlite, snapshotRepoSqlite } from '@/data/repos';
import { importSnapshotFromFile } from '@/domain/usecases/importSnapshotFromFile';
import { ImportConflict } from '@/domain/entities/types';
import { COLORS } from '@/presentation/theme';

export default function ResolveImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pendingImport = useAppStore((s) => s.pendingImport);
  const setPendingImport = useAppStore((s) => s.setPendingImport);
  const setSnapshot = useAppStore((s) => s.setSnapshot);

  // Map conflict Key -> 'use_rowA' | 'use_rowB'
  const [resolutions, setResolutions] = useState<Map<string, 'use_rowA' | 'use_rowB'>>(new Map());
  const [saving, setSaving] = useState(false);

  if (!pendingImport) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Không có dữ liệu cần xử lý.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 20 }}>
          <Text style={{ color: COLORS.primary, textAlign: 'center' }}>Quay lại</Text>
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

  const handleFinish = async () => {
    // Check if all resolved
    if (resolutions.size < pendingImport.conflicts.length) {
      Alert.alert('Chưa hoàn tất', 'Vui lòng chọn phương án xử lý cho tất cả các mã bị trùng.');
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
        onProgress: (p, t) => {
           useAppStore.getState().setImportProgress(p, t);
        }
      });

      useAppStore.getState().setImportStatus('done');

      if (result.success) {
        setSnapshot({ 
          snapshotId: result.snapshotId!, 
          sourceFileName: pendingImport.fileName 
        });
        setPendingImport(null);
        Alert.alert('Thành công', 'Đã nạp dữ liệu và xử lý xung đột.', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      } else {
        Alert.alert('Lỗi', 'Vẫn còn xung đột chưa được xử lý (Có thể do file đã thay đổi).');
      }
    } catch (e) {
      useAppStore.getState().setImportStatus('failed');
      Alert.alert('Lỗi', String(e));
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: ImportConflict }) => {
    const key = `${item.warehouseName}__${item.itemCode}`;
    const choice = resolutions.get(key);

    return (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
           <Text style={styles.conflictHeader}>
             Mã: <Text style={{ fontWeight: 'bold' }}>{item.itemCode}</Text>
           </Text>
           {/* Edit Code Removed for Performance V1 */}
        </View>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Kho: {item.warehouseName}</Text>

        <View style={styles.optionsContainer}>
          {/* Option A */}
          <TouchableOpacity
            style={[styles.option, choice === 'use_rowA' && styles.selectedOption]}
            onPress={() => handleResolve(item, 'use_rowA')}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionLabel}>Dữ liệu cũ (Dòng đầu)</Text>
              {choice === 'use_rowA' && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
            </View>
            <Text style={styles.itemName}>{item.rowA.itemName}</Text>
            <Text style={styles.detailText}>ĐVT: {item.rowA.uom} | SL: {item.rowA.onHandQty}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Option B */}
          <TouchableOpacity
            style={[styles.option, choice === 'use_rowB' && styles.selectedOption]}
            onPress={() => handleResolve(item, 'use_rowB')}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionLabel}>Dữ liệu mới (Dòng sau)</Text>
              {choice === 'use_rowB' && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
            </View>
            <Text style={styles.itemName}>{item.rowB.itemName}</Text>
            <Text style={styles.detailText}>ĐVT: {item.rowB.uom} | SL: {item.rowB.onHandQty}</Text>
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
        <Text style={styles.title}>Xử lý xung đột ({resolutions.size}/{pendingImport.conflicts.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.instruction}>
        Chọn dòng dữ liệu đúng để tiếp tục.
      </Text>

      <FlatList
        data={pendingImport.conflicts}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.warehouseName}__${item.itemCode}`}
        contentContainerStyle={{ padding: 16 }}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.btn, resolutions.size < pendingImport.conflicts.length && styles.btnDisabled]}
          disabled={resolutions.size < pendingImport.conflicts.length || saving}
          onPress={handleFinish}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Hoàn tất & Lưu</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '600' },
  instruction: {
    padding: 12,
    backgroundColor: '#fff3cd',
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conflictHeader: { fontSize: 16 },
  optionsContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
  },
  option: {
    padding: 12,
    backgroundColor: '#fff',
  },
  selectedOption: {
    backgroundColor: '#e6f7ff',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  btn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: '#ccc',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});