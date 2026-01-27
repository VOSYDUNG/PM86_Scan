import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, Keyboard, Camera, ChevronLeft, Trash2, FileText, Search } from 'lucide-react-native';

import { Screen, Card, SecondaryButton, Badge, PrimaryButton } from '@/presentation/components/ui';
import { useAppStore } from '@/presentation/store/appStore';
import { resetDb } from '@/data/sqlite/db';
import { COLORS, SPACING, SIZES } from '@/presentation/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const scanMode = useAppStore((s) => s.scanMode);
  const setScanMode = useAppStore((s) => s.setScanMode);
  
  const setSnapshot = useAppStore((s) => s.setSnapshot);
  const setWarehouse = useAppStore((s) => s.setWarehouse);
  const setSession = useAppStore((s) => s.setSessionId);

  const onReset = () => {
    Alert.alert(
      'Cảnh báo nguy hiểm',
      'Hành động này sẽ XÓA TOÀN BỘ dữ liệu (Snapshots, Phiên kiểm, Kết quả) và đưa ứng dụng về trạng thái ban đầu. Bạn có chắc chắn không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'XÓA TẤT CẢ', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDb();
              // Clear Store
              setSnapshot(null);
              setWarehouse(null);
              setSession(null);
              
              Alert.alert('Thành công', 'Dữ liệu đã được đặt lại.', [
                { text: 'OK', onPress: () => router.replace('/') }
              ]);
            } catch (e) {
              Alert.alert('Lỗi', String(e));
            }
          }
        }
      ]
    );
  };

  return (
    <Screen title="Cài đặt hệ thống">
      
      <Text style={styles.sectionHeader}>Chế độ quét (Scan Mode)</Text>
      
      <Card 
        title="WEDGE (Phím cứng)" 
        icon={<Keyboard size={24} color={scanMode === 'WEDGE' ? COLORS.primary : COLORS.textSecondary} />}
        style={scanMode === 'WEDGE' ? styles.activeCard : undefined}
        onPress={() => setScanMode('WEDGE')}
      >
        <Text style={styles.description}>
          Dành cho máy kiểm kho chuyên dụng (PM86, Zebra, Honeywell). Barcode được nhập như bàn phím.
        </Text>
        {scanMode === 'WEDGE' && <Badge label="Đang chọn" type="success" />}
      </Card>

      <Card 
        title="CAMERA (Máy ảnh)" 
        icon={<Camera size={24} color={scanMode === 'CAMERA' ? COLORS.primary : COLORS.textSecondary} />}
        style={scanMode === 'CAMERA' ? styles.activeCard : undefined}
        onPress={() => setScanMode('CAMERA')}
      >
        <Text style={styles.description}>
          Dành cho điện thoại Android thông thường. Sử dụng Camera sau để quét mã vạch.
        </Text>
        {scanMode === 'CAMERA' && <Badge label="Đang chọn" type="success" />}
      </Card>

      <Card 
        title="TÌM NHANH (Auto suggest)" 
        icon={<Search size={24} color={scanMode === 'QUICK' ? COLORS.primary : COLORS.textSecondary} />}
        style={scanMode === 'QUICK' ? styles.activeCard : undefined}
        onPress={() => setScanMode('QUICK')}
      >
        <Text style={styles.description}>
          Tự gợi ý khi đang nhập. Phù hợp khi cần tìm theo tên hàng.
        </Text>
        {scanMode === 'QUICK' && <Badge label="Đang chọn" type="success" />}
      </Card>

      <Text style={[styles.sectionHeader, { color: COLORS.error }]}>Vùng nguy hiểm</Text>
      <PrimaryButton 
        label="Xóa toàn bộ dữ liệu & Reset App" 
        onPress={onReset}
        color={COLORS.error}
        icon={<Trash2 size={20} color="#FFF" />}
      />

      <Text style={styles.sectionHeader}>Debug</Text>
      <SecondaryButton 
        label="Xem log crash"
        onPress={() => router.push('/logs')}
        icon={<FileText size={20} color={COLORS.primary} />}
      />

      <View style={{ flex: 1 }} />
      
      <SecondaryButton 
        label="Quay lại trang chủ" 
        onPress={() => router.back()} 
        icon={<ChevronLeft size={20} color={COLORS.primary} />}
      />
      
      <View style={{ alignItems: 'center', marginTop: SPACING.l }}>
        <Text style={{ color: COLORS.textLight, fontSize: 12 }}>Version 1.0.0 (Build 20260121)</Text>
        <Text style={{ color: COLORS.textLight, fontSize: 12 }}>© 2026 NNC Logistics</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
    marginTop: SPACING.m,
  },
  activeCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.surface,
  },
  description: {
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
