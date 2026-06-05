import React from 'react';
import * as Linking from 'expo-linking';

type IntentScanPayload = {
  payload: string;
  rawUrl: string;
};

const QUERY_KEYS = ['barcode', 'scan', 'code', 'data', 'payload', 'result', 'value', 'text'];

function toStringValue(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? '');
  }
  return String(value ?? '');
}

function decodeSafe(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function extractIntentPayload(rawUrl: string): IntentScanPayload | null {
  const url = String(rawUrl || '').trim();
  if (!url) return null;

  try {
    const parsed = Linking.parse(url);
    if (parsed.queryParams) {
      for (const key of QUERY_KEYS) {
        if (!(key in parsed.queryParams)) continue;
        const value = decodeSafe(toStringValue((parsed.queryParams as Record<string, unknown>)[key]).trim());
        if (value) {
          return { payload: value, rawUrl: url };
        }
      }
    }

    const path = decodeSafe(String(parsed.path ?? '').trim());
    if (path) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { payload: parts[parts.length - 1], rawUrl: url };
      }
    }
  } catch {
    // fall through
  }

  const markerIndex = url.indexOf('://');
  if (markerIndex > -1) {
    const candidate = decodeSafe(url.slice(markerIndex + 3));
    const queryIndex = candidate.indexOf('?');
    const clean = (queryIndex >= 0 ? candidate.slice(0, queryIndex) : candidate).trim();
    const pathOnly = clean.split('/').filter(Boolean);
    if (pathOnly.length >= 2) {
      const maybePayload = pathOnly[pathOnly.length - 1];
      if (maybePayload) {
        return { payload: maybePayload, rawUrl: url };
      }
    }
  }

  return null;
}

export function IntentScannerBridge(props: {
  enabled: boolean;
  onScan: (payload: string) => void;
  onError?: (message: string) => void;
}) {
  const onScanRef = React.useRef(props.onScan);
  const onErrorRef = React.useRef(props.onError);

  React.useEffect(() => {
    onScanRef.current = props.onScan;
    onErrorRef.current = props.onError;
  }, [props.onError, props.onScan]);

  React.useEffect(() => {
    if (!props.enabled) return;
    let mounted = true;

    const handleUrl = (rawUrl: string) => {
      try {
        const parsed = extractIntentPayload(rawUrl);
        if (!parsed?.payload) return;
        onScanRef.current(parsed.payload);
      } catch (e) {
        onErrorRef.current?.(e instanceof Error ? e.message : String(e));
      }
    };

    Linking.getInitialURL()
      .then((rawUrl) => {
        if (!mounted || !rawUrl) return;
        handleUrl(rawUrl);
      })
      .catch((e) => {
        if (!mounted) return;
        onErrorRef.current?.(e instanceof Error ? e.message : String(e));
      });

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!mounted) return;
      handleUrl(url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [props.enabled]);

  return null;
}
