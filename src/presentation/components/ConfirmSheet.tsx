import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { AlertTriangle, Trash2 } from 'lucide-react-native';
import { ACTION_COLORS, COLORS, SHADOWS, SPACING, SIZES } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';

type ConfirmSheetVariant = 'danger' | 'warning' | 'info';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: ConfirmSheetVariant;
}

const VARIANT_STYLES: Record<ConfirmSheetVariant, { color: string; bg: string; icon: React.ComponentType<any> }> = {
  danger: { color: ACTION_COLORS.dangerText, bg: ACTION_COLORS.dangerBg, icon: Trash2 },
  warning: { color: COLORS.warning, bg: COLORS.warningBg, icon: AlertTriangle },
  info: { color: COLORS.primary, bg: COLORS.infoBg, icon: AlertTriangle },
};

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmSheetProps) {
  const { t } = useI18n();
  if (!visible) return null;

  const styleSet = VARIANT_STYLES[variant];
  const Icon = styleSet.icon;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: styleSet.bg }]}>
              <Icon size={20} color={styleSet.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.btnCancel} onPress={onCancel}>
              <Text style={styles.btnCancelText}>{cancelText || t('confirmSheet.cancelDefault')}</Text>
            </Pressable>
            <Pressable style={[styles.btnConfirm, { backgroundColor: styleSet.color }]} onPress={onConfirm}>
              <Text style={styles.btnConfirmText}>{confirmText || t('confirmSheet.deleteDefault')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    padding: SPACING.l,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.float,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.m },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  message: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: SPACING.s },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.divider,
  },
  btnCancelText: { color: COLORS.textMain, fontWeight: '700' },
  btnConfirm: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: SIZES.radius,
  },
  btnConfirmText: { color: '#FFF', fontWeight: '800' },
});
