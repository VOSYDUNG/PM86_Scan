import React from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SHADOWS, SIZES, SPACING } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertPayload = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

export function ThemedAlertHost() {
  const { t } = useI18n();
  const queueRef = React.useRef<AlertPayload[]>([]);
  const [current, setCurrent] = React.useState<AlertPayload | null>(null);

  const showNext = React.useCallback(() => {
    if (current) return;
    const next = queueRef.current.shift();
    if (next) setCurrent(next);
  }, [current]);

  const enqueue = React.useCallback((payload: AlertPayload) => {
    if (!payload.title && !payload.message) return;
    if (!current) {
      setCurrent(payload);
      return;
    }
    queueRef.current.push(payload);
  }, [current]);

  const dismissAndRun = React.useCallback((btn?: AlertButton) => {
    setCurrent(null);
    setTimeout(() => {
      btn?.onPress?.();
    }, 0);
  }, []);

  React.useEffect(() => {
    const alertObj = Alert as unknown as { alert: typeof Alert.alert };
    const originalAlert = alertObj.alert;
    alertObj.alert = ((title, message, buttons) => {
      const nextButtons = (buttons ?? []).map((b) => ({
        text: b.text,
        onPress: b.onPress,
        style: b.style,
      }));
      enqueue({
        title: String(title ?? ''),
        message: message ? String(message) : '',
        buttons: nextButtons,
      });
    }) as typeof Alert.alert;

    return () => {
      alertObj.alert = originalAlert;
    };
  }, [enqueue]);

  React.useEffect(() => {
    if (!current) showNext();
  }, [current, showNext]);

  const actions = React.useMemo(() => {
    if (!current) return [];
    if (current.buttons && current.buttons.length > 0) return current.buttons;
    return [{ text: t('customAlert.confirmDefault'), style: 'default' as const }];
  }, [current, t]);

  const hasDestructive = actions.some((a) => a.style === 'destructive');

  return (
    <Modal
      visible={!!current}
      transparent
      animationType="fade"
      onRequestClose={() => {
        const cancel = actions.find((a) => a.style === 'cancel');
        dismissAndRun(cancel ?? actions[0]);
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={[styles.header, hasDestructive ? styles.headerDanger : styles.headerPrimary]}>
            <Text style={styles.title}>{current?.title || t('errorBoundary.title')}</Text>
          </View>
          {!!current?.message ? (
            <View style={styles.content}>
              <Text style={styles.message}>{current.message}</Text>
            </View>
          ) : null}
          <View style={styles.footer}>
            {actions.map((btn, idx) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              return (
                <Pressable
                  key={`${btn.text ?? 'btn'}-${idx}`}
                  style={[
                    styles.actionBtn,
                    isCancel && styles.actionCancel,
                    isDestructive && styles.actionDanger,
                    !isCancel && !isDestructive && styles.actionPrimary,
                  ]}
                  onPress={() => dismissAndRun(btn)}
                >
                  <Text
                    style={[
                      styles.actionText,
                      isCancel && styles.actionCancelText,
                      (isDestructive || !isCancel) && styles.actionStrongText,
                    ]}
                    numberOfLines={1}
                  >
                    {btn.text || (isCancel ? t('customAlert.cancelDefault') : t('customAlert.confirmDefault'))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: SPACING.l,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  header: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
  },
  headerPrimary: {
    backgroundColor: COLORS.primary,
  },
  headerDanger: {
    backgroundColor: COLORS.error,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.l,
  },
  message: {
    color: COLORS.textMain,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.s,
    paddingHorizontal: SPACING.m,
    paddingBottom: SPACING.m,
  },
  actionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.m,
  },
  actionPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionDanger: {
    backgroundColor: COLORS.error,
  },
  actionCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionCancelText: {
    color: COLORS.textSecondary,
  },
  actionStrongText: {
    color: '#FFF',
  },
});

