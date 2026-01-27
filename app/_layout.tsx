import '@/infra/polyfills';

import React from 'react';
import { Stack } from 'expo-router';
import { Text, View, LogBox, AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { useInitDb } from '@/presentation/hooks/useInitDb';
import { COLORS } from '@/presentation/theme';
import { AnimatedSplash } from '@/presentation/components/AnimatedSplash';
import { ErrorBoundary } from '@/presentation/components/ErrorBoundary';
import { log } from '@/infra/logger';
import { setupGlobalErrorHandlers } from '@/infra/setupErrorHandlers';

// Keep the native splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Ignore unnecessary warnings if any
LogBox.ignoreLogs(['new NativeEventEmitter']);

// Setup global JS error handlers early
setupGlobalErrorHandlers();

export default function RootLayout() {
  const { ready, error } = useInitDb();
  const [animationFinished, setAnimationFinished] = React.useState(false);

  React.useEffect(() => {
    if (ready || error) {
      // 1. Hide the native static splash immediately once RN is loaded & DB ready
      SplashScreen.hideAsync();
      
      // 2. Keep our Custom Animated Splash visible for a moment to show the effect
      const timer = setTimeout(() => {
        setAnimationFinished(true);
      }, 2500); // Show "Buddha Glow" for 2.5 seconds

      return () => clearTimeout(timer);
    }
  }, [ready, error]);

  React.useEffect(() => {
    if (ready) log('APP_READY');
    if (error) log('APP_INIT_ERROR', error);
  }, [ready, error]);

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      log('APP_STATE', state);
    });
    return () => sub.remove();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: 'red', marginBottom: 8 }}>System Error</Text>
        <Text selectable style={{ textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  // Show Custom Splash until animation is done
  if (!ready || !animationFinished) {
    return <AnimatedSplash />;
  }

  return (
    <ErrorBoundary>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="inventory" />
        <Stack.Screen name="scan" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="logs" />
      </Stack>
    </ErrorBoundary>
  );
}
