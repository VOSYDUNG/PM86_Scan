import { error as logError } from '@/infra/logger';

export function setupGlobalErrorHandlers() {
  const g: any = globalThis as any;
  const ErrorUtils = g?.ErrorUtils;

  if (ErrorUtils?.getGlobalHandler && ErrorUtils?.setGlobalHandler) {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((err: unknown, isFatal?: boolean) => {
      const e = err as any;
      logError('GLOBAL_ERROR', {
        isFatal: !!isFatal,
        message: e?.message || String(err),
        stack: e?.stack,
      });
      if (defaultHandler) {
        defaultHandler(err, isFatal);
      }
    });
  }

  // Best-effort unhandled rejection logging (Hermes may support this)
  if (typeof g.onunhandledrejection === 'undefined') {
    g.onunhandledrejection = (event: any) => {
      logError('UNHANDLED_REJECTION', event?.reason || event);
    };
  }
}
