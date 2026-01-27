import AsyncStorage from '@react-native-async-storage/async-storage';

export type LogLevel = 'log' | 'warn' | 'error';
export type LogEntry = {
  ts: number;
  level: LogLevel;
  message: string;
};

const LOG_KEY = 'pm86.logs';
const MAX_LOGS = 300;

let buffer: LogEntry[] = [];
let loaded = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function loadIfNeeded() {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    buffer = raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch {
    buffer = [];
  } finally {
    loaded = true;
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    try {
      await AsyncStorage.setItem(LOG_KEY, JSON.stringify(buffer));
    } catch {
      // ignore storage errors
    }
  }, 500);
}

export async function appendLog(level: LogLevel, message: string) {
  await loadIfNeeded();
  buffer.push({ ts: Date.now(), level, message });
  if (buffer.length > MAX_LOGS) {
    buffer = buffer.slice(buffer.length - MAX_LOGS);
  }
  scheduleFlush();
}

export async function getLogs(): Promise<LogEntry[]> {
  await loadIfNeeded();
  return [...buffer];
}

export async function clearLogs() {
  buffer = [];
  loaded = true;
  try {
    await AsyncStorage.removeItem(LOG_KEY);
  } catch {
    // ignore
  }
}
