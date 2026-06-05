import React from 'react';
import { AppState, TextInput, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export type WedgeFinalizeReason = 'lf' | 'cr' | 'timeout' | 'unknown';
export type WedgeScannerInputHandle = {
  focus: () => void;
  blur: () => void;
};

type WedgeScannerInputProps = {
  inputRef?: React.RefObject<TextInput | null>;
  value?: string;
  onChangeText?: (s: string) => void;
  onSubmit?: (s: string) => void;
  onChunk?: (text: string) => void;
  onFinalized?: (text: string, source: 'keyboard', suffix: WedgeFinalizeReason) => void;
  autoFocus?: boolean;
  active?: boolean;
  keepFocus?: boolean;
  finalizeTimeoutMs?: number;
  blurOnSubmit?: boolean;
  showSoftInputOnFocus?: boolean;
  placeholder?: string;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  onReadyStateChange?: (ready: boolean) => void;
};

export const WedgeScannerInput = React.forwardRef<WedgeScannerInputHandle, WedgeScannerInputProps>(function WedgeScannerInput(props, forwardedRef) {
  const internalRef = React.useRef<TextInput>(null);
  const ref = props.inputRef ?? internalRef;
  const finalizeTimeoutMs = props.finalizeTimeoutMs ?? 80;
  const [internalValue, setInternalValue] = React.useState('');
  const currentValue = props.value ?? internalValue;
  const active = props.active ?? true;
  const keepFocus = props.keepFocus ?? false;

  const valueRef = React.useRef(currentValue);
  const bufferRef = React.useRef('');
  const finalizeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    valueRef.current = currentValue;
  }, [currentValue]);

  const emitChange = React.useCallback((next: string) => {
    if (props.value === undefined) {
      setInternalValue(next);
    }
    props.onChangeText?.(next);
  }, [props.onChangeText, props.value]);

  const clearFinalizeTimer = React.useCallback(() => {
    if (finalizeTimerRef.current) {
      clearTimeout(finalizeTimerRef.current);
      finalizeTimerRef.current = null;
    }
  }, []);

  const clearInputValue = React.useCallback(() => {
    valueRef.current = '';
    emitChange('');
    ref.current?.clear();
  }, [emitChange, ref]);

  const finalize = React.useCallback((suffix: WedgeFinalizeReason) => {
    if (!active) return;
    clearFinalizeTimer();
    const payload = bufferRef.current.trim();
    bufferRef.current = '';
    clearInputValue();
    if (payload) {
      props.onFinalized?.(payload, 'keyboard', suffix);
    }
  }, [clearFinalizeTimer, clearInputValue, props]);

  const armFinalizeTimer = React.useCallback(() => {
    clearFinalizeTimer();
    finalizeTimerRef.current = setTimeout(() => finalize('timeout'), finalizeTimeoutMs);
  }, [clearFinalizeTimer, finalize, finalizeTimeoutMs]);

  const forceFocus = React.useCallback(() => {
    if (!active) return;
    ref.current?.focus();
  }, [active, ref]);

  const forceBlur = React.useCallback(() => {
    ref.current?.blur();
  }, [ref]);

  React.useImperativeHandle(forwardedRef, () => ({
    focus: forceFocus,
    blur: forceBlur,
  }), [forceBlur, forceFocus]);

  React.useEffect(() => {
    if (!active) {
      clearFinalizeTimer();
      bufferRef.current = '';
      forceBlur();
      props.onReadyStateChange?.(false);
      return;
    }
    if (!props.autoFocus) return;
    const t = setTimeout(() => {
      forceFocus();
    }, 120);
    return () => clearTimeout(t);
  }, [active, clearFinalizeTimer, forceBlur, forceFocus, props.autoFocus, props.onReadyStateChange]);

  React.useEffect(() => {
    if (!active || !keepFocus) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setTimeout(() => forceFocus(), 80);
      }
    });
    return () => sub.remove();
  }, [active, forceFocus, keepFocus]);

  React.useEffect(() => () => clearFinalizeTimer(), [clearFinalizeTimer]);

  const getDelta = (prev: string, next: string) => {
    if (next.startsWith(prev)) {
      return next.slice(prev.length);
    }
    if (next.length < prev.length) {
      return '';
    }
    return next;
  };

  return (
    <View style={[styles.wrap, props.containerStyle]}>
      <TextInput
        ref={ref}
        value={currentValue}
        onChangeText={(next) => {
          if (!active) {
            return;
          }
          const prev = valueRef.current;
          valueRef.current = next;
          emitChange(next);

          if (!props.onFinalized && !props.onChunk) {
            return;
          }

          const delta = getDelta(prev, next);
          if (!delta) return;

          let chunk = '';
          for (const ch of delta) {
            if (ch === '\n') {
              finalize('lf');
              continue;
            }
            if (ch === '\r') {
              finalize('cr');
              continue;
            }
            chunk += ch;
            bufferRef.current += ch;
          }

          if (chunk) {
            props.onChunk?.(chunk);
            armFinalizeTimer();
          }
        }}
        onSubmitEditing={() => {
          if (!active) return;
          props.onSubmit?.(valueRef.current);
          if (!props.onFinalized) {
            return;
          }
          finalize('unknown');
        }}
        onFocus={() => props.onReadyStateChange?.(true)}
        onBlur={() => {
          props.onReadyStateChange?.(false);
          if (active && keepFocus) {
            setTimeout(() => forceFocus(), 80);
          }
        }}
        blurOnSubmit={props.blurOnSubmit ?? true}
        showSoftInputOnFocus={props.showSoftInputOnFocus ?? true}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={props.placeholder}
        editable={active}
        style={[styles.input, props.style]}
        returnKeyType="search"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  input: {
    // Default styles, can be overridden
    height: '100%',
    fontSize: 16,
    color: '#000',
    padding: 0, // Remove default padding to fit in wrappers
  },
});
