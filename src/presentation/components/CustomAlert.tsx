import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react-native';
import { COLORS, SIZES, SHADOWS, SPACING } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';

export type AlertType = 'success' | 'warning' | 'error' | 'info';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const { width } = Dimensions.get('window');

export const CustomAlert = ({
  visible,
  title,
  message,
  type = 'info',
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
}: CustomAlertProps) => {
  const { t } = useI18n();
  if (!visible) return null;

  let Icon = Info;
  let color = COLORS.primary;

  switch (type) {
    case 'success':
      Icon = CheckCircle;
      color = COLORS.success;
      break;
    case 'warning':
      Icon = AlertCircle;
      color = COLORS.warning;
      break;
    case 'error':
      Icon = AlertCircle;
      color = COLORS.error;
      break;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={[styles.header, { backgroundColor: color }]}>
            <Icon size={28} color="#FFF" />
            <Text style={styles.title}>{title}</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>
          </View>

          <View style={styles.footer}>
            {onCancel && (
              <TouchableOpacity onPress={onCancel} style={styles.btnCancel}>
                <Text style={styles.btnCancelText}>{cancelText || t('customAlert.cancelDefault')}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              onPress={onConfirm || onCancel} 
              style={[
                styles.btnConfirm, 
                { backgroundColor: color, flex: onCancel ? 1 : 0.5, marginLeft: onCancel ? SPACING.m : 0 }
              ]}
            >
              <Text style={styles.btnConfirmText}>{confirmText || t('customAlert.confirmDefault')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.m,
  },
  container: {
    width: Math.min(width - 40, 340),
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  header: {
    padding: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  content: {
    padding: SPACING.l,
  },
  message: {
    fontSize: 16,
    color: COLORS.textMain,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: SPACING.m,
    paddingTop: 0,
    gap: SPACING.s,
  },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.background,
  },
  btnCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  btnConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnConfirmText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
