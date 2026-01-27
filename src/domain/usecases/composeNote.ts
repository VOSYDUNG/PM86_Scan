import { REASON_LABEL_VI, ReasonCode } from '@/domain/entities/types';

export function composeNote(params: {
  reasonCode?: ReasonCode;
  reasonText?: string;
  extraText?: string;
}): string | undefined {
  const { reasonCode, reasonText, extraText } = params;

  let base: string | undefined;
  if (reasonCode && reasonCode !== 'OTHER') {
    base = REASON_LABEL_VI[reasonCode];
  } else if (reasonCode === 'OTHER') {
    const t = (reasonText ?? '').trim();
    base = t ? `Khác: ${t}` : 'Khác';
  }

  const e = (extraText ?? '').trim();
  if (!base && !e) return undefined;
  if (!base) return e;
  if (!e) return base;
  return `${base}; ${e}`;
}
