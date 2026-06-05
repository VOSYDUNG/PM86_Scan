import { lo } from './locales/lo';
import { vi } from './locales/vi';
import { LanguageCode, LanguagePreference, MessageKey, Messages, TranslateParams } from './schema';

const dictionaries: Record<LanguageCode, Messages> = {
  vi,
  lo,
};

function getSystemLanguage(): LanguageCode {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (locale.startsWith('lo')) return 'lo';
    return 'vi';
  } catch {
    return 'vi';
  }
}

export function resolveLanguage(preference: LanguagePreference): LanguageCode {
  if (preference === 'system') return getSystemLanguage();
  return preference;
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function applyParams(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? `{${key}}` : String(value);
  });
}

export function t(lang: LanguageCode, key: MessageKey, params?: TranslateParams): string {
  const primary = getByPath(dictionaries[lang], key);
  if (typeof primary === 'string') {
    return applyParams(primary, params);
  }
  const fallback = getByPath(dictionaries.vi, key);
  if (typeof fallback === 'string') {
    return applyParams(fallback, params);
  }
  return key;
}

export function formatDate(lang: LanguageCode, value: number | string | Date, options?: Intl.DateTimeFormatOptions): string {
  const locale = lang === 'lo' ? 'lo-LA' : 'vi-VN';
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatTime(lang: LanguageCode, value: number | string | Date, options?: Intl.DateTimeFormatOptions): string {
  const locale = lang === 'lo' ? 'lo-LA' : 'vi-VN';
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', ...options }).format(date);
}

export function formatNumber(lang: LanguageCode, value: number, options?: Intl.NumberFormatOptions): string {
  const locale = lang === 'lo' ? 'lo-LA' : 'vi-VN';
  return new Intl.NumberFormat(locale, options).format(value);
}

export { vi, lo };
