import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { COLORS, SHADOWS, SPACING } from '@/presentation/theme';

interface ScanLastActionProps {
  action: {
    itemName: string;
    qty: number;
    timestamp: number;
  } | null;
}

export function ScanLastAction({ action }: ScanLastActionProps) {
  const [visible, setVisible] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (action) {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 3000); // Show for 3 seconds

      return () => clearTimeout(timer);
    }
  }, [action]);

  if (!visible || !action) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
       <View style={styles.content}>
          <CheckCircle size={20} color={COLORS.success} />
          <View style={{ flex: 1 }}>
             <Text style={styles.title} numberOfLines={1}>Đã lưu: {action.itemName}</Text>
             <Text style={styles.desc}>Số lượng: {action.qty}</Text>
          </View>
       </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below header
    left: SPACING.m,
    right: SPACING.m,
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: SPACING.m,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
    gap: 12,
    ...SHADOWS.card
  },
  title: { fontWeight: '700', color: COLORS.textMain, fontSize: 14 },
  desc: { color: COLORS.textSecondary, fontSize: 12 }
});
