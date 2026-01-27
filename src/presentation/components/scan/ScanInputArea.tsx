import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ScanLine, X, Search } from 'lucide-react-native';
import { WedgeScannerInput } from '@/infra/scan/WedgeScannerInput';
import { CameraScanner } from '@/infra/scan/CameraScanner';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';

interface ScanInputAreaProps {
  scanMode: 'WEDGE' | 'CAMERA' | 'QUICK';
  q: string;
  setQ: (val: string) => void;
  onSubmitQ: (val: string) => void;
  onCameraScan: (val: string) => void;
  isItemSelected: boolean;
}

export function ScanInputArea({ scanMode, q, setQ, onSubmitQ, onCameraScan, isItemSelected }: ScanInputAreaProps) {
  const onSearch = () => {
    if (!q.trim()) return;
    onSubmitQ(q);
  };

  return (
    <View style={styles.scannerContainer}>
        {scanMode === 'CAMERA' && !isItemSelected ? (
          <View style={styles.cameraWrapper}>
             <CameraScanner onScan={onCameraScan} />
          </View>
        ) : null}
        
        <View style={styles.inputWrapper}>
           <ScanLine size={20} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
           <WedgeScannerInput 
              value={q} 
              onChangeText={setQ} 
              onSubmit={onSubmitQ} 
              autoFocus={!isItemSelected}
              style={{ flex: 1, fontSize: 16 }}
           />
           {q.length > 0 && (
             <Pressable onPress={() => setQ('')} style={styles.iconBtn}>
               <X size={20} color={COLORS.textSecondary}/>
             </Pressable>
           )}
           <Pressable onPress={onSearch} style={[styles.searchBtn, !q.trim() && styles.searchBtnDisabled]}>
             <Search size={18} color={q.trim() ? '#FFF' : COLORS.textLight} />
           </Pressable>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scannerContainer: { marginBottom: SPACING.m },
  cameraWrapper: { height: 200, borderRadius: SIZES.radius, overflow: 'hidden', marginBottom: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary, borderRadius: SIZES.radius, paddingHorizontal: SPACING.m, height: 50, ...SHADOWS.card },
  iconBtn: { padding: 4 },
  searchBtn: {
    marginLeft: 6,
    padding: 6,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
  },
  searchBtnDisabled: {
    backgroundColor: COLORS.divider,
  },
});
