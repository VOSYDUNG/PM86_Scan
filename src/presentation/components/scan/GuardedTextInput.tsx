import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { useAppStore } from '@/presentation/store/appStore';

type GuardedTextInputProps = Omit<TextInputProps, 'onChangeText'> & {
  value: string;
  onChangeText: (value: string) => void;
  scannerMode?: 'WEDGE' | 'CAMERA' | 'QUICK';
  scannerEnabled?: boolean;
  onScannerBurstRejected?: () => void;
  stableCommitMs?: number;
  rapidWindowMs?: number;
  multiCharThreshold?: number;
};

export const GuardedTextInput = React.forwardRef<TextInput, GuardedTextInputProps>(function GuardedTextInput(
  {
    value,
    onChangeText,
    scannerMode = 'QUICK',
    scannerEnabled = true,
    onScannerBurstRejected,
    stableCommitMs = 120,
    rapidWindowMs = 45,
    multiCharThreshold = 4,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const physicalScanScope = useAppStore((s) => s.physicalScanScope);
  const lastObservedRef = React.useRef(value);
  const lastStableRef = React.useRef(value);
  const latestAcceptedRef = React.useRef(value);
  const lastChangeAtRef = React.useRef(0);
  const stableTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStableTimer = React.useCallback(() => {
    if (stableTimerRef.current) {
      clearTimeout(stableTimerRef.current);
      stableTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    lastObservedRef.current = value;
    latestAcceptedRef.current = value;
    if (!stableTimerRef.current) {
      lastStableRef.current = value;
    }
  }, [value]);

  React.useEffect(() => () => clearStableTimer(), [clearStableTimer]);

  const armStableTimer = React.useCallback(() => {
    clearStableTimer();
    stableTimerRef.current = setTimeout(() => {
      lastStableRef.current = latestAcceptedRef.current;
      stableTimerRef.current = null;
    }, stableCommitMs);
  }, [clearStableTimer, stableCommitMs]);

  const handleRejectedBurst = React.useCallback(() => {
    clearStableTimer();
    lastObservedRef.current = lastStableRef.current;
    latestAcceptedRef.current = lastStableRef.current;
    onChangeText(lastStableRef.current);
    onScannerBurstRejected?.();
  }, [clearStableTimer, onChangeText, onScannerBurstRejected]);

  return (
    <TextInput
      ref={ref}
      value={value}
      onFocus={(event) => {
        clearStableTimer();
        lastObservedRef.current = value;
        lastStableRef.current = value;
        latestAcceptedRef.current = value;
        lastChangeAtRef.current = 0;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        clearStableTimer();
        lastStableRef.current = latestAcceptedRef.current;
        onBlur?.(event);
      }}
      onChangeText={(next) => {
        const prevObserved = lastObservedRef.current;
        const now = Date.now();
        const rapidMs = lastChangeAtRef.current ? now - lastChangeAtRef.current : Number.POSITIVE_INFINITY;
        const deltaLen = Math.abs(next.length - prevObserved.length);
        const wedgePaused =
          physicalScanScope !== 'INVENTORY_WEDGE_ACTIVE' ||
          (scannerMode === 'WEDGE' && !scannerEnabled);
        const suspiciousBurst =
          wedgePaused &&
          (/[\r\n]/.test(next) ||
            deltaLen >= multiCharThreshold ||
            (next.length > prevObserved.length && rapidMs < rapidWindowMs));

        if (suspiciousBurst) {
          handleRejectedBurst();
          return;
        }

        lastObservedRef.current = next;
        latestAcceptedRef.current = next;
        lastChangeAtRef.current = now;
        onChangeText(next);
        armStableTimer();
      }}
      {...rest}
    />
  );
});
