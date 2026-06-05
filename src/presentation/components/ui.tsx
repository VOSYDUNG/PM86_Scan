import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, SIZES, SHADOWS } from '@/presentation/theme';
import { ChevronRight } from 'lucide-react-native';

// --- LAYOUT ---

export function Screen(props: { 
  title?: string; 
  subtitle?: string;
  headerRight?: React.ReactNode;
  headerRightPlacement?: 'inline' | 'stacked';
  children: React.ReactNode; 
  scrollable?: boolean;
  fab?: React.ReactNode;
  style?: ViewStyle;
}) {
  const Content = (
    <View style={[styles.screenContent, props.style]}>
      {props.title ? (
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.headerBrand}>
                <Image source={require('../../../assets/LOGO_HD_transparent.png')} style={styles.headerLogo} resizeMode="contain" />
              </View>
              <View style={styles.headerAccent} />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle} numberOfLines={1}>{props.title}</Text>
              </View>
            </View>
            {props.headerRight && props.headerRightPlacement !== 'stacked' && (
              <View style={styles.headerRight}>
                {props.headerRight}
              </View>
            )}
          </View>
          {props.subtitle ? <Text style={styles.headerSubtitle}>{props.subtitle}</Text> : null}
          {props.headerRight && props.headerRightPlacement === 'stacked' ? (
            <View style={styles.headerRightRow}>
              {props.headerRight}
            </View>
          ) : null}
        </View>
      ) : null}
      {props.children}
      {/* Spacer for FAB if needed */}
      {props.fab ? <View style={{ height: 80 }} /> : null} 
    </View>
  );

  return (
    <SafeAreaView style={styles.screenContainer} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        // On Android, 'adjustResize' (default) usually works better without explicit behavior, 
        // or using 'padding' if issues persist. Trying undefined (let OS handle) first with flex:1 wrapper.
      >
        {props.scrollable ? (
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            overScrollMode="never"
          >
            {Content}
          </ScrollView>
        ) : (
          Content
        )}
      </KeyboardAvoidingView>
      {props.fab ? <View style={styles.fabContainer}>{props.fab}</View> : null}
    </SafeAreaView>
  );
}

export function Card(props: { 
  children: React.ReactNode; 
  title?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined';
  onPress?: () => void;
}) {
  const Container = props.onPress ? Pressable : View;
  
  return (
    <Container 
      style={({ pressed }) => [
        styles.card, 
        props.variant === 'outlined' && styles.cardOutlined,
        props.style,
        (props.onPress && pressed) && { opacity: 0.9, transform: [{ scale: 0.99 }] }
      ]}
      onPress={props.onPress}
    >
      {(props.title || props.icon) && (
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            {props.icon}
            {props.title && <Text style={styles.cardTitle}>{props.title}</Text>}
          </View>
          {props.onPress && <ChevronRight size={20} color={COLORS.textLight} />}
        </View>
      )}
      {props.children}
    </Container>
  );
}

// --- ACTIONS ---

export function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn, 
        { backgroundColor: props.color || COLORS.primary },
        pressed && styles.btnPressed, 
        props.disabled && styles.btnDisabled,
        props.style
      ]}
      onPress={props.onPress}
      disabled={props.disabled || props.loading}
    >
      {props.loading ? (
        <ActivityIndicator color={COLORS.textOnPrimary} />
      ) : (
        <View style={styles.btnContent}>
          {props.icon}
          <Text style={styles.btnTxt} numberOfLines={1}>{props.label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btnSecondary, 
        pressed && styles.btnSecondaryPressed, 
        props.disabled && styles.btnDisabled,
        props.color ? { borderColor: props.color } : {},
        props.style
      ]}
      onPress={props.onPress}
      disabled={props.disabled}
    >
       <View style={styles.btnContent}>
          {props.icon}
          <Text style={[styles.btnTxtSecondary, props.color ? { color: props.color } : {}]} numberOfLines={1}>{props.label}</Text>
       </View>
    </Pressable>
  );
}

export function Badge(props: { label: string; color?: string; type?: 'success' | 'warning' | 'error' | 'neutral' | 'default' | 'info'; size?: 'small' | 'default' }) {
  let bg = COLORS.divider;
  let text = COLORS.textSecondary;
  const isSmall = props.size === 'small';

  switch (props.type) {
    case 'default': bg = '#ECEFF1'; text = COLORS.textSecondary; break;
    case 'success': bg = '#E8F5E9'; text = COLORS.success; break;
    case 'warning': bg = COLORS.warningBg; text = COLORS.warning; break;
    case 'error': bg = '#FFEBEE'; text = COLORS.error; break;
    case 'neutral': bg = '#ECEFF1'; text = COLORS.textSecondary; break;
    case 'info': bg = COLORS.infoBg; text = COLORS.primary; break;
  }
  
  if (props.color) {
    bg = props.color + '20'; // 20% opacity
    text = props.color;
  }

  return (
    <View style={[styles.badge, isSmall && styles.badgeSmall, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, isSmall && styles.badgeTextSmall, { color: text }]}>{props.label}</Text>
    </View>
  );
}

// --- DATA DISPLAY ---

export function KeyValue(props: { k: string; v: React.ReactNode; vertical?: boolean }) {
  if (props.vertical) {
    return (
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.kvK}>{props.k}</Text>
        <Text style={[styles.kvV, { textAlign: 'left', marginTop: 2 }]}>{props.v}</Text>
      </View>
    );
  }
  return (
    <View style={styles.kv}>
      <Text style={styles.kvK}>{props.k}</Text>
      <Text style={styles.kvV}>{props.v}</Text>
    </View>
  );
}

export function ProgressBar(props: { progress: number; label?: string; color?: string; style?: ViewStyle }) {
  const percent = Math.min(Math.max(props.progress, 0), 100);
  return (
    <View style={[{ width: '100%' }, props.style]}>
      {props.label && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' }}>{props.label}</Text>
          <Text style={{ fontSize: 12, color: COLORS.textMain, fontWeight: '700' }}>{Math.round(percent)}%</Text>
        </View>
      )}
      <View style={{ height: 6, backgroundColor: COLORS.divider, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${percent}%`, backgroundColor: props.color || COLORS.primary }} />
      </View>
    </View>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  // Screen
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { flex: 1, padding: SPACING.l, gap: SPACING.l },
  header: { 
    marginBottom: SPACING.s,
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.card,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.s },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s, flex: 1, minWidth: 0 },
  headerBrand: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: { width: 28, height: 28 },
  headerAccent: { width: 4, height: 28, borderRadius: 2, backgroundColor: COLORS.primary },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textMain, letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  headerRight: { marginLeft: SPACING.s },
  headerRightRow: {
    marginTop: SPACING.s,
    alignSelf: 'flex-end',
  },
  
  // Card
  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: SIZES.radius, 
    padding: SPACING.l, 
    gap: SPACING.m,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardOutlined: {
    backgroundColor: 'transparent',
    borderColor: COLORS.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textMain },

  // Buttons
  btn: { 
    backgroundColor: COLORS.primary, 
    borderRadius: SIZES.radius, 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5, backgroundColor: COLORS.textLight, elevation: 0 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnTxt: { fontSize: 16, fontWeight: '700', color: COLORS.textOnPrimary, letterSpacing: 0.5 },
  
  btnSecondary: { 
    backgroundColor: 'transparent', 
    borderWidth: 2, 
    borderColor: COLORS.primary, 
    borderRadius: SIZES.radius, 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  btnSecondaryPressed: { backgroundColor: COLORS.primary + '10' },
  btnTxtSecondary: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  // KeyValue
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 4 },
  kvK: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  kvV: { fontSize: 15, fontWeight: '600', color: COLORS.textMain, flexShrink: 1, textAlign: 'right' },

  // Badge
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeTextSmall: { fontSize: 10, fontWeight: '700' },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: SPACING.l,
    right: SPACING.l,
    ...SHADOWS.float,
  }
});
