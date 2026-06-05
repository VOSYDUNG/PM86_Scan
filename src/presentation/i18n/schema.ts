import { vi } from './locales/vi';

type DeepString<T> = T extends string ? string : { [K in keyof T]: DeepString<T[K]> };

export type Messages = DeepString<typeof vi>;

type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

export type DotNestedKeys<T> = (
  T extends object
    ? {
        [K in Extract<keyof T, string>]: `${K}${DotPrefix<DotNestedKeys<T[K]>>}`;
      }[Extract<keyof T, string>]
    : ''
) extends infer D
  ? Extract<D, string>
  : never;

export type MessageKey = DotNestedKeys<Messages>;

export type LanguageCode = 'vi' | 'lo';
export type LanguagePreference = LanguageCode | 'system';

export type TranslateParams = Record<string, string | number>;
