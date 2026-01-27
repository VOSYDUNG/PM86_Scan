import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { X, Save } from 'lucide-react-native';
import { PrimaryButton, SecondaryButton } from '@/presentation/components/ui';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';

interface QuantityControlProps {
  qty: string;
  setQty: (val: string) => void;
  mode: 'set' | 'accumulate';
  setMode: (mode: 'set' | 'accumulate') => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  qtyInputRef: React.RefObject<TextInput | null>;
  children?: React.ReactNode;
}

export function QuantityControl({ qty, setQty, mode, setMode, onSave, onCancel, saving, qtyInputRef, children }: QuantityControlProps) {
  return (
    <View style={styles.controlPanel}>
       <View style={styles.segmentControl}>
          <Pressable style={[styles.segmentBtn, mode === 'set' && styles.segmentBtnActive]} onPress={() => setMode('set')}>
            <Text style={[styles.segmentText, mode === 'set' && styles.segmentTextActive]}>Ghi đè (SET)</Text>
          </Pressable>
          <Pressable style={[styles.segmentBtn, mode === 'accumulate' && styles.segmentBtnActive]} onPress={() => setMode('accumulate')}>
            <Text style={[styles.segmentText, mode === 'accumulate' && styles.segmentTextActive]}>Cộng dồn (+)</Text>
          </Pressable>
       </View>
       <View>
          <Text style={styles.label}>TỔNG THỰC TẾ (Bao gồm lỗi)</Text>
          <TextInput 
            ref={qtyInputRef} 
            value={qty} 
            onChangeText={setQty} 
            keyboardType="numeric" 
            placeholder="Nhập số..." 
            style={styles.qtyInput} 
            returnKeyType="done" 
            onSubmitEditing={onSave} 
          />
       </View>
       <View style={{ flexDirection: 'row', gap: SPACING.s }}>
          {[1, 5, 10].map(n => (
            <Pressable key={n} style={styles.presetBtn} onPress={() => setQty(String((Number(qty) || 0) + n))}>
              <Text style={styles.presetText}>+{n}</Text>
            </Pressable>
          ))}
       </View>
       
       {children}
       
       <View style={{ flexDirection: 'row', gap: SPACING.s, marginTop: SPACING.s }}>
          <View style={{ flex: 1 }}><SecondaryButton label="Hủy" onPress={onCancel} icon={<X size={20} color={COLORS.textMain}/>} /></View>
          <View style={{ flex: 2 }}><PrimaryButton label="LƯU (ENTER)" onPress={onSave} loading={saving} icon={<Save size={20} color="#FFF"/>} /></View>
       </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlPanel: { backgroundColor: COLORS.surface, padding: SPACING.m, borderRadius: SIZES.radius, gap: SPACING.m, ...SHADOWS.card },
  segmentControl: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: SIZES.radius, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: SIZES.radius - 2 },
  segmentBtnActive: { backgroundColor: COLORS.surface, ...SHADOWS.card },
  segmentText: { fontWeight: '600', color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.primary, fontWeight: '800' },
  qtyInput: { borderWidth: 2, borderColor: COLORS.divider, borderRadius: SIZES.radius, fontSize: 24, fontWeight: '700', textAlign: 'center', paddingVertical: 12, backgroundColor: COLORS.background, color: COLORS.textMain },
  presetBtn: { flex: 1, backgroundColor: '#E3F2FD', alignItems: 'center', paddingVertical: 12, borderRadius: SIZES.radius },
  presetText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  label: { fontWeight: '600', color: COLORS.textMain, fontSize: 13 },
});
