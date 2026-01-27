import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Plus, CheckCircle } from 'lucide-react-native';
import { PrimaryButton, Badge } from '@/presentation/components/ui';
import { COLORS, SPACING, SIZES } from '@/presentation/theme';

interface SuggestionListProps {
  suggest: any[];
  q: string;
  onSelect: (item: any) => void;
  onCreateNew: () => void;
}

export function SuggestionList({ suggest, q, onSelect, onCreateNew }: SuggestionListProps) {
  return (
    <View style={{ flex: 1 }}>
        {suggest.length > 0 && <Text style={styles.sectionTitle}>Gợi ý sản phẩm</Text>}
        {suggest.length === 0 && q.length > 0 ? (
            <View style={styles.emptySearch}>
                <Text style={{ fontSize: 16, color: COLORS.error, marginBottom: SPACING.m }}>Không tìm thấy mã "{q}"</Text>
                <PrimaryButton label="Tạo sản phẩm mới" onPress={onCreateNew} icon={<Plus size={20} color="#FFF"/>} />
            </View>
        ) : null}
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
                   <Text style={{ color: COLORS.textSecondary }}>Tồn: {s.onHandQty}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, marginTop: 4 },
  suggestItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  suggestName: { fontWeight: '700', color: COLORS.textMain, fontSize: 15 },
  suggestCode: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  emptySearch: { padding: SPACING.xl, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: SIZES.radius },
});
