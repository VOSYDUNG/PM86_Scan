import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Keyboard, Camera, Search, Layers, Sparkles, CheckCircle2, Globe2, Settings2, Home } from 'lucide-react-native';

import { Screen, Card, Badge } from '@/presentation/components/ui';
import { useAppStore } from '@/presentation/store/appStore';
import { COLORS, SHADOWS, SPACING } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const scanMode = useAppStore((s) => s.scanMode);
  const setScanMode = useAppStore((s) => s.setScanMode);
  const operationMode = useAppStore((s) => s.operationMode);
  const setOperationMode = useAppStore((s) => s.setOperationMode);
  const uiLanguage = useAppStore((s) => s.uiLanguage);
  const setUiLanguage = useAppStore((s) => s.setUiLanguage);

  const scanModeLabel =
    scanMode === 'WEDGE' ? t('common.mode.wedge') : scanMode === 'CAMERA' ? t('common.mode.camera') : t('common.mode.quick');
  const operationModeLabel = operationMode === 'ADVANCED' ? t('common.mode.advanced') : t('common.mode.basic');
  const languageLabel = uiLanguage === 'vi' ? t('settings.languageVi') : uiLanguage === 'lo' ? t('settings.languageLo') : t('settings.languageSystem');

  const OptionTile = (props: {
    title: string;
    desc: string;
    icon: React.ReactNode;
    selected: boolean;
    onPress: () => void;
    badgeType?: 'success' | 'info';
  }) => (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.optionTile,
        props.selected && styles.optionTileActive,
        pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] },
      ]}
    >
      <View style={[styles.optionIconWrap, props.selected && styles.optionIconWrapActive]}>{props.icon}</View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionTitle}>{props.title}</Text>
        <Text style={styles.optionDesc}>{props.desc}</Text>
      </View>
      <View style={styles.optionState}>
        {props.selected ? (
          <>
            <Badge label={t('common.status.selected')} type={props.badgeType || 'success'} size="small" />
            <CheckCircle2 size={18} color={COLORS.primaryDark} />
          </>
        ) : (
          <View style={styles.optionDot} />
        )}
      </View>
    </Pressable>
  );

  return (
    <Screen
      title={t('settings.title')}
      scrollable
      headerRight={
        <Pressable style={styles.homeBtn} onPress={() => router.replace('/')}>
          <Home size={18} color={COLORS.primary} />
        </Pressable>
      }
    >
      <Card style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <View style={styles.overviewIcon}>
            <Settings2 size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.overviewTitle}>{t('settings.overviewTitle')}</Text>
            <Text style={styles.overviewSub}>{t('settings.overviewSub')}</Text>
          </View>
        </View>
        <View style={styles.overviewRow}>
          <Text style={styles.overviewLabel}>{t('settings.scanModeTitle')}</Text>
          <Badge label={scanModeLabel} type="info" />
        </View>
        <View style={styles.overviewRow}>
          <Text style={styles.overviewLabel}>{t('settings.operationModeTitle')}</Text>
          <Badge label={operationModeLabel} type="success" />
        </View>
        <View style={styles.overviewRow}>
          <Text style={styles.overviewLabel}>{t('settings.languageTitle')}</Text>
          <Badge label={languageLabel} type="neutral" />
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t('settings.scanModeTitle')}</Text>
        {OptionTile({
          title: t('common.mode.wedge'),
          desc: t('settings.wedgeDesc'),
          icon: <Keyboard size={20} color={scanMode === 'WEDGE' ? COLORS.primaryDark : COLORS.textSecondary} />,
          selected: scanMode === 'WEDGE',
          onPress: () => setScanMode('WEDGE'),
        })}
        {OptionTile({
          title: t('common.mode.camera'),
          desc: t('settings.camDesc'),
          icon: <Camera size={20} color={scanMode === 'CAMERA' ? COLORS.primaryDark : COLORS.textSecondary} />,
          selected: scanMode === 'CAMERA',
          onPress: () => setScanMode('CAMERA'),
        })}
        {OptionTile({
          title: t('common.mode.quick'),
          desc: t('settings.quickDesc'),
          icon: <Search size={20} color={scanMode === 'QUICK' ? COLORS.primaryDark : COLORS.textSecondary} />,
          selected: scanMode === 'QUICK',
          onPress: () => setScanMode('QUICK'),
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t('settings.operationModeTitle')}</Text>
        {OptionTile({
          title: t('common.mode.basic'),
          desc: t('settings.basicDesc'),
          icon: <Layers size={20} color={operationMode === 'BASIC' ? COLORS.primaryDark : COLORS.textSecondary} />,
          selected: operationMode === 'BASIC',
          onPress: () => setOperationMode('BASIC'),
        })}
        {OptionTile({
          title: t('common.mode.advanced'),
          desc: t('settings.advancedDesc'),
          icon: <Sparkles size={20} color={operationMode === 'ADVANCED' ? COLORS.primaryDark : COLORS.textSecondary} />,
          selected: operationMode === 'ADVANCED',
          onPress: () => setOperationMode('ADVANCED'),
          badgeType: 'info',
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t('settings.languageTitle')}</Text>
        {OptionTile({
          title: t('settings.languageVi'),
          desc: t('settings.languageViDesc'),
          icon: <Globe2 size={20} color={uiLanguage === 'vi' ? COLORS.primaryDark : COLORS.textSecondary} />,
          selected: uiLanguage === 'vi',
          onPress: () => setUiLanguage('vi'),
        })}
        {OptionTile({
          title: t('settings.languageLo'),
          desc: t('settings.languageLoDesc'),
          icon: <Globe2 size={20} color={uiLanguage === 'lo' ? COLORS.primaryDark : COLORS.textSecondary} />,
          selected: uiLanguage === 'lo',
          onPress: () => setUiLanguage('lo'),
        })}
        {OptionTile({
          title: t('settings.languageSystem'),
          desc: t('settings.languageSystemDesc'),
          icon: <Globe2 size={20} color={uiLanguage === 'system' ? COLORS.primaryDark : COLORS.textSecondary} />,
          selected: uiLanguage === 'system',
          onPress: () => setUiLanguage('system'),
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t('settings.pm84Title')}</Text>
        <View style={styles.pm84Notice}>
          <Text style={styles.pm84NoticeText}>{t('settings.wedgeScreenScopeHint')}</Text>
        </View>
        <View style={styles.pm84Checklist}>
          <Text style={styles.pm84ChecklistItem}>• {t('settings.pm84Checklist1')}</Text>
          <Text style={styles.pm84ChecklistItem}>• {t('settings.pm84Checklist2')}</Text>
          <Text style={styles.pm84ChecklistItem}>• {t('settings.pm84Checklist3')}</Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginTop: SPACING.l }}>
        <Text style={{ color: COLORS.textLight, fontSize: 12 }}>{t('settings.buildVersion')}</Text>
        <Text style={{ color: COLORS.textLight, fontSize: 12 }}>{t('settings.copyright')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  overviewCard: {
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  overviewIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.infoBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  overviewSub: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 10,
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
    padding: SPACING.m,
    gap: SPACING.s,
    ...SHADOWS.card,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: 0.2,
  },
  optionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.background,
    padding: SPACING.s,
  },
  optionTileActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.infoBg,
  },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  optionIconWrapActive: {
    borderColor: COLORS.primary,
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  optionDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  optionState: {
    alignItems: 'center',
    gap: 6,
    minWidth: 56,
  },
  optionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  pm84Notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.infoBg,
    padding: SPACING.s,
  },
  pm84NoticeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  pm84Checklist: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  pm84ChecklistItem: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  homeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.background,
    ...SHADOWS.card,
  },
});
