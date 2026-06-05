import { useMemo } from 'react';
import { useAppStore } from '@/presentation/store/appStore';
import { formatDate, formatNumber, formatTime, resolveLanguage, t } from './index';
import { LanguageCode, MessageKey, TranslateParams } from './schema';

export function useI18n() {
  const preference = useAppStore((s) => s.uiLanguage);
  const setUiLanguage = useAppStore((s) => s.setUiLanguage);

  const lang = useMemo<LanguageCode>(() => resolveLanguage(preference), [preference]);

  const translate = useMemo(
    () => (key: MessageKey, params?: TranslateParams) => t(lang, key, params),
    [lang],
  );

  return {
    lang,
    preference,
    setUiLanguage,
    t: translate,
    formatDate: (value: number | string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDate(lang, value, options),
    formatTime: (value: number | string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatTime(lang, value, options),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(lang, value, options),
  };
}
