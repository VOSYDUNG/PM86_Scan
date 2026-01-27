import React from 'react';
import { TextInput, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export function WedgeScannerInput(props: {
  value: string;
  onChangeText: (s: string) => void;
  onSubmit: (s: string) => void;
  autoFocus?: boolean;
  style?: TextStyle;
  containerStyle?: ViewStyle;
}) {
  const ref = React.useRef<TextInput>(null);

  React.useEffect(() => {
    if (props.autoFocus) {
      // Small delay to ensure transition is done
      const t = setTimeout(() => ref.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [props.autoFocus]);

  // Keep focus if lost (aggressive wedge mode) - Optional
  // React.useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (!ref.current?.isFocused()) ref.current?.focus();
  //   }, 2000);
  //   return () => clearInterval(interval);
  // }, []);

  return (
    <View style={[styles.wrap, props.containerStyle]}>
      <TextInput
        ref={ref}
        value={props.value}
        onChangeText={props.onChangeText}
        onSubmitEditing={() => props.onSubmit(props.value)}
        blurOnSubmit={true}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Quét / gõ barcode hoặc mã hàng..."
        style={[styles.input, props.style]}
        returnKeyType="search"
      />
    </View>
  );
}

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
