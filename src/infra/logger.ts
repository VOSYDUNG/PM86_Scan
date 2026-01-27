import { appendLog } from '@/infra/logStore';

const PREFIX = '[PM86]';

function safeStringify(val: unknown) {
  try {
    if (typeof val === 'string') return val;
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function buildMessage(args: unknown[]) {
  return args.map(safeStringify).join(' ');
}

export function log(...args: unknown[]) {
  // Only log in dev to keep release clean
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.log(PREFIX, ...args);
    void appendLog('log', buildMessage(args));
  }
}

export function warn(...args: unknown[]) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.warn(PREFIX, ...args);
    void appendLog('warn', buildMessage(args));
  }
}

export function error(...args: unknown[]) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.error(PREFIX, ...args);
    void appendLog('error', buildMessage(args));
  }
}
