import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS } from '@/presentation/theme';

const { width } = Dimensions.get('window');

export function AnimatedSplash({ onFinish }: { onFinish?: () => void }) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Halo Glow Animation (Breathing)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle Rotation for "Radiance" feel
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const haloScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5], // Pulse outwards
  });

  const haloOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0], // Fade out as it expands
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Halo Effect Layer */}
      <Animated.View
        style={[
          styles.halo,
          {
            transform: [{ scale: haloScale }, { rotate: spin }],
            opacity: haloOpacity,
          },
        ]}
      />
      
      {/* Second Halo for complexity */}
      <Animated.View
        style={[
          styles.halo,
          {
            width: 250,
            height: 250,
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
            opacity: 0.2,
          },
        ]}
      />

      {/* Ice Plate (frosted border) */}
      <View style={styles.icePlate}>
        <View style={styles.iceInner} />
      </View>

      {/* Main Logo */}
      <Image
        source={require('../../../assets/LOGO_2.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Match native splash
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    zIndex: 10,
  },
  icePlate: {
    position: 'absolute',
    width: width * 0.62,
    height: width * 0.62,
    borderRadius: (width * 0.62) / 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#BFE9FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  iceInner: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(240,249,255,0.35)',
  },
  halo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFD700', // Gold/Yellow "Buddha" light
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
});
