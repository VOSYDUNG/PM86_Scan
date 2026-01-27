/*
  Minimal polyfills needed by some JS libs in React Native.
  - Buffer
  - process
*/

import { Buffer } from 'buffer';
import process from 'process';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any;

if (!g.Buffer) g.Buffer = Buffer;

// Polyfill process but preserve existing keys if any (like env)
if (!g.process) {
  g.process = process;
} else {
  // Merge the polyfill into the existing process object
  // checking specifically for nextTick which is missing in RN's process
  if (!g.process.nextTick) {
    g.process.nextTick = process.nextTick;
  }
  if (!g.process.cwd) {
    g.process.cwd = process.cwd;
  }
  // Add other properties if needed
}
