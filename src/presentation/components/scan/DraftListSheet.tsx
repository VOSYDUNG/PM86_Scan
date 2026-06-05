import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Check, Trash2, X } from 'lucide-react-native';
import { PrimaryButton, SecondaryButton, Badge } from '@/presentation/components/ui';
import { ACTION_COLORS, COLORS, SHADOWS, SPACING, SIZES } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';

type DraftItem = {
  itemKey: string;
  itemCode: string;
  itemName: string;
  uom: string;
  qty: number;
  updatedAt: number;
  isCurrent?: boolean;
};

interface DraftListSheetProps {
  visible: boolean;
  drafts: DraftItem[];
  onClose: () => void;
  onSelect: (itemKey: string, isCurrent: boolean) => void;
  onSave: (itemKey: string, isCurrent: boolean) => void;
  onDelete: (itemKey: string, isCurrent: boolean) => void;
  onSaveAll: () => void;
}

export function DraftListSheet({
  visible,
  drafts,
  onClose,
  onSelect,
  onSave,
  onDelete,
  onSaveAll,
}: DraftListSheetProps) {
  const { t, formatDate, formatTime } = useI18n();
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('scan.draftSheetTitle')}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.subTitle}>{t('scan.draftSheetTotal', { count: drafts.length })}</Text>

          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingVertical: 6 }}>
            {drafts.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t('scan.draftSheetEmpty')}</Text>
              </View>
            ) : (
              drafts.map((d) => (
                <Pressable
                  key={d.itemKey}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: COLORS.divider }]}
                  onPress={() => onSelect(d.itemKey, !!d.isCurrent)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTitle}>
                      <Text style={styles.itemName} numberOfLines={1}>{d.itemName}</Text>
                      {d.isCurrent ? <Badge label={t('common.status.selected')} type="success" /> : null}
                    </View>
                    <Text style={styles.itemCode}>{d.itemCode} • {d.uom}</Text>
                    <Text style={styles.itemMeta}>
                      {t('scan.draftSheetUpdated', { time: formatTime(d.updatedAt), date: formatDate(d.updatedAt) })}
                    </Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyLabel}>{t('scan.draftSheetQty')}</Text>
                    <Text style={styles.qtyValue}>{d.qty}</Text>
                  </View>
                  <View style={styles.actions}>
                    <Pressable style={styles.saveBtn} onPress={() => onSave(d.itemKey, !!d.isCurrent)}>
                      <Check size={14} color={COLORS.primary} />
                    </Pressable>
                    <Pressable style={styles.deleteBtn} onPress={() => onDelete(d.itemKey, !!d.isCurrent)}>
                      <Trash2 size={14} color={ACTION_COLORS.dangerText} />
                    </Pressable>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <SecondaryButton label={t('scan.draftSheetClose')} onPress={onClose} />
            <PrimaryButton label={t('scan.draftSheetSaveAll')} onPress={onSaveAll} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: SPACING.l,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.float,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  closeBtn: { padding: 6, borderRadius: 12, backgroundColor: COLORS.divider },
  subTitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.s },
  emptyBox: { paddingVertical: SPACING.l, alignItems: 'center' },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.textMain, maxWidth: 170 },
  itemCode: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  itemMeta: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  qtyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.infoBg,
    minWidth: 56,
  },
  qtyLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700' },
  qtyValue: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  actions: { flexDirection: 'row', gap: 6 },
  saveBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: ACTION_COLORS.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ACTION_COLORS.dangerBorder,
  },
  footer: { flexDirection: 'row', gap: SPACING.s, marginTop: SPACING.m },
});
