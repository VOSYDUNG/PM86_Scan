import React from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Card, PrimaryButton, SecondaryButton, KeyValue } from '@/presentation/components/ui';
import { COLORS, SPACING, SIZES } from '@/presentation/theme';

interface CreateItemFormProps {
  itemCode: string;
  newItemName: string;
  setNewItemName: (v: string) => void;
  newItemUom: string;
  setNewItemUom: (v: string) => void;
  onCancel: () => void;
  onCreate: () => void;
  loading: boolean;
}

export function CreateItemForm({ itemCode, newItemName, setNewItemName, newItemUom, setNewItemUom, onCancel, onCreate, loading }: CreateItemFormProps) {
  return (
    <ScrollView style={{ flex: 1 }}>
        <Card title="Thêm hàng mới (Lạ)" icon={<Plus size={24} color={COLORS.accent} />}>
            <KeyValue k="Mã hàng (Barcode)" v={itemCode} />
            <View style={{ gap: 8 }}>
            <Text style={styles.label}>Tên hàng *</Text>
            <TextInput value={newItemName} onChangeText={setNewItemName} style={styles.textInputStandard} placeholder="Nhập tên sản phẩm..." />
            </View>
            <View style={{ gap: 8 }}>
            <Text style={styles.label}>Đơn vị tính</Text>
            <TextInput value={newItemUom} onChangeText={setNewItemUom} style={styles.textInputStandard} placeholder="Cái, Chai, Hộp..." />
            </View>
            <View style={{ flexDirection: 'row', gap: SPACING.m, marginTop: SPACING.m }}>
                <SecondaryButton label="Hủy" onPress={onCancel} />
                <PrimaryButton label="Tạo & Nhập" onPress={onCreate} loading={loading} />
            </View>
        </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '600', color: COLORS.textMain, fontSize: 13 },
  textInputStandard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, padding: 12, fontSize: 14, backgroundColor: COLORS.background, minHeight: 60, textAlignVertical: 'top' },
});
