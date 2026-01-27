import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Keyboard, Camera, Search, ArrowLeftRight } from 'lucide-react-native';
import { COLORS, SPACING } from '@/presentation/theme';

interface ScanHeaderProps {
  locationName: string;
  locationCode: string;
  scanMode: 'WEDGE' | 'CAMERA' | 'QUICK';
  setScanMode: (mode: 'WEDGE' | 'CAMERA' | 'QUICK') => void;
}

export function ScanHeader({ locationName, locationCode, scanMode, setScanMode }: ScanHeaderProps) {
  const router = useRouter();

  return (
    <View>
      <View style={styles.topBar}>
         <View style={styles.locationBadge}>
            <MapPin size={14} color={COLORS.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationName ? `${locationName} (${locationCode})` : 'Đang tải vị trí...'}
            </Text>
         </View>
         <Pressable style={styles.switchBtn} onPress={() => router.replace('/inventory')}>
            <ArrowLeftRight size={14} color={COLORS.primary} />
            <Text style={styles.switchText}>Đổi vị trí</Text>
         </Pressable>
      </View>

      <View style={[styles.topBar, { marginTop: 0 }]}>
         <View style={styles.modeToggle}>
            <Pressable onPress={() => setScanMode('WEDGE')} style={[styles.modeBtn, scanMode === 'WEDGE' && styles.modeBtnActive]}>
               <Keyboard size={16} color={scanMode === 'WEDGE' ? '#FFF' : COLORS.textSecondary} />
               <Text style={[styles.modeText, scanMode === 'WEDGE' && { color: '#FFF' }]}>WEDGE</Text>
            </Pressable>
            <Pressable onPress={() => setScanMode('CAMERA')} style={[styles.modeBtn, scanMode === 'CAMERA' && styles.modeBtnActive]}>
               <Camera size={16} color={scanMode === 'CAMERA' ? '#FFF' : COLORS.textSecondary} />
               <Text style={[styles.modeText, scanMode === 'CAMERA' && { color: '#FFF' }]}>CAM</Text>
            </Pressable>
            <Pressable onPress={() => setScanMode('QUICK')} style={[styles.modeBtn, scanMode === 'QUICK' && styles.modeBtnActive]}>
               <Search size={16} color={scanMode === 'QUICK' ? '#FFF' : COLORS.textSecondary} />
               <Text style={[styles.modeText, scanMode === 'QUICK' && { color: '#FFF' }]}>TÌM NHANH</Text>
            </Pressable>
         </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flex: 1, marginRight: 8 },
  locationText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F7FF',
    borderWidth: 1,
    borderColor: '#D7E6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  switchText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  modeToggle: { flexDirection: 'row', backgroundColor: COLORS.divider, borderRadius: 20, padding: 2, flexWrap: 'wrap' },
  modeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 18, gap: 4 },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
});
