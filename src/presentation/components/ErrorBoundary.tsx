import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { error as logError } from '@/infra/logger';
import { COLORS, SPACING, SIZES } from '@/presentation/theme';
import { resolveLanguage, t } from '@/presentation/i18n';
import { useAppStore } from '@/presentation/store/appStore';

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(err: Error) {
    return { error: err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    logError('UI_CRASH', err?.message, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const lang = resolveLanguage(useAppStore.getState().uiLanguage);

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t(lang, 'errorBoundary.title')}</Text>
        <Text style={styles.desc}>
          {t(lang, 'errorBoundary.desc')}
        </Text>
        <Text selectable style={styles.errorText}>
          {String(this.state.error?.message || this.state.error)}
        </Text>
        <Pressable style={styles.btn} onPress={() => this.setState({ error: null })}>
          <Text style={styles.btnTxt}>{t(lang, 'errorBoundary.continueBtn')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.l,
    gap: SPACING.m,
    backgroundColor: COLORS.background,
  },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.error },
  desc: { textAlign: 'center', color: COLORS.textSecondary },
  errorText: {
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: SIZES.radius,
    color: COLORS.textMain,
  },
  btn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
  },
  btnTxt: { color: COLORS.textOnPrimary, fontWeight: '700' },
});
