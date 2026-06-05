import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Plus, CheckCircle } from 'lucide-react-native';
import { PrimaryButton } from '@/presentation/components/ui';
import { COLORS, SPACING, SIZES } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';

interface SuggestionListProps {
  suggest: any[];
  q: string;
  onSelect: (item: any) => void;
  onCreateNew: () => void;
  useVirtualized?: boolean;
}

export function SuggestionList({ suggest, q, onSelect, onCreateNew, useVirtualized = true }: SuggestionListProps) {
  const { t } = useI18n();
  const hasQuery = q.trim().length > 0;
  const hasSuggest = suggest.length > 0;
  return (
    <View style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.sectionTitle}>{hasQuery ? t('scan.suggestTitle') : t('scan.suggestDefaultTitle')}</Text>
            {!hasQuery ? <Text style={styles.sectionHint}>{t('scan.suggestDefaultHint')}</Text> : null}
          </View>
          <Pressable onPress={onCreateNew} style={styles.addBtn}>
            <Plus size={14} color="#FFF" />
            <Text style={styles.addBtnText}>{t('scan.addNew')}</Text>
          </Pressable>
        </View>
        {!hasSuggest && hasQuery ? (
            <View style={styles.emptySearch}>
                <Text style={{ fontSize: 16, color: COLORS.error, marginBottom: SPACING.m }}>{t('scan.suggestNoResult', { q })}</Text>
                <PrimaryButton label={t('scan.createNewProduct')} onPress={onCreateNew} icon={<Plus size={20} color="#FFF"/>} />
            </View>
        ) : null}
        {useVirtualized ? (
          <FlatList
              data={suggest}
              keyExtractor={(item) => item.itemKey}
              renderItem={({ item: s }) => (
              <Pressable onPress={() => onSelect(s)} style={({pressed}) => [styles.suggestItem, pressed && { backgroundColor: COLORS.divider }]}>
                  <View style={{ flex: 1 }}>
                      <Text style={styles.suggestName}>{s.itemName}</Text>
                      <Text style={styles.suggestCode}>{s.itemCode}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                     <Text style={{ color: COLORS.textSecondary }}>{t('scan.stockShort', { qty: s.onHandQty })}</Text>
                     {s.isCounted && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                           <CheckCircle size={12} color={COLORS.success} />
                           <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.success }}>{s.actualQty}</Text>
                        </View>
                     )}
                  </View>
              </Pressable>
              )}
          />
        ) : (
          <View>
            {suggest.map((s) => (
              <Pressable key={s.itemKey} onPress={() => onSelect(s)} style={({pressed}) => [styles.suggestItem, pressed && { backgroundColor: COLORS.divider }]}>
                  <View style={{ flex: 1 }}>
                      <Text style={styles.suggestName}>{s.itemName}</Text>
                      <Text style={styles.suggestCode}>{s.itemCode}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                     <Text style={{ color: COLORS.textSecondary }}>{t('scan.stockShort', { qty: s.onHandQty })}</Text>
                     {s.isCounted && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                           <CheckCircle size={12} color={COLORS.success} />
                           <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.success }}>{s.actualQty}</Text>
                        </View>
                     )}
                  </View>
              </Pressable>
            ))}
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textMain, fontFamily: 'sans-serif-medium' },
  sectionHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  suggestItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  suggestName: { fontWeight: '700', color: COLORS.textMain, fontSize: 15 },
  suggestCode: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  emptySearch: { padding: SPACING.xl, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: SIZES.radius },
});
