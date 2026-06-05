import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MapPin, Keyboard, Camera, Search, ArrowLeftRight } from 'lucide-react-native';
import { COLORS, SPACING } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';

interface ScanHeaderProps {
  locationName: string;
  locationCode: string;
  scanMode: 'WEDGE' | 'CAMERA' | 'QUICK';
  setScanMode: (mode: 'WEDGE' | 'CAMERA' | 'QUICK') => void;
  onSwitchLocation: () => void;
}

export function ScanHeader({ locationName, locationCode, scanMode, setScanMode, onSwitchLocation }: ScanHeaderProps) {
  const { t } = useI18n();

  return (
    <View style={styles.headerCard}>
      <View style={styles.headerGlow} />
      <View style={styles.topBar}>
         <View style={styles.locationBadge}>
            <MapPin size={14} color="#FFF" />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationName ? `${locationName} (${locationCode})` : t('scan.locationLoading')}
            </Text>
         </View>
         <Pressable style={styles.switchBtn} onPress={onSwitchLocation}>
            <ArrowLeftRight size={14} color={COLORS.primary} />
            <Text style={styles.switchText}>{t('scan.switchLocation')}</Text>
         </Pressable>
      </View>

      <View style={[styles.topBar, { marginTop: 0 }]}>
         <View style={styles.modeToggle}>
            <Pressable onPress={() => setScanMode('WEDGE')} style={[styles.modeBtn, scanMode === 'WEDGE' && styles.modeBtnActive]}>
               <Keyboard size={16} color={scanMode === 'WEDGE' ? COLORS.primaryDark : '#D7E9DD'} />
               <Text style={[styles.modeText, scanMode === 'WEDGE' && { color: COLORS.primaryDark }]}>{t('common.mode.wedge')}</Text>
            </Pressable>
            <Pressable onPress={() => setScanMode('CAMERA')} style={[styles.modeBtn, scanMode === 'CAMERA' && styles.modeBtnActive]}>
               <Camera size={16} color={scanMode === 'CAMERA' ? COLORS.primaryDark : '#D7E9DD'} />
               <Text style={[styles.modeText, scanMode === 'CAMERA' && { color: COLORS.primaryDark }]}>{t('common.mode.camera')}</Text>
            </Pressable>
            <Pressable onPress={() => setScanMode('QUICK')} style={[styles.modeBtn, scanMode === 'QUICK' && styles.modeBtnActive]}>
               <Search size={16} color={scanMode === 'QUICK' ? COLORS.primaryDark : '#D7E9DD'} />
               <Text style={[styles.modeText, scanMode === 'QUICK' && { color: COLORS.primaryDark }]}>{t('scan.modeQuick')}</Text>
            </Pressable>
         </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFFFFF',
    opacity: 0.08,
    top: -60,
    right: -20,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flex: 1, marginRight: 8 },
  locationText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  switchText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 4, flexWrap: 'wrap' },
  modeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 18, gap: 4 },
  modeBtnActive: { backgroundColor: COLORS.accent },
  modeText: { fontSize: 12, fontWeight: '700', color: '#D7E9DD' },
});
