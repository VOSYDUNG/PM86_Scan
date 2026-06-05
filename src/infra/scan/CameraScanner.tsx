import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodePoint, BarcodeScanningResult, BarcodeSize } from 'expo-camera';
import { COLORS } from '@/presentation/theme';
import { useI18n } from '@/presentation/i18n/useI18n';

export function CameraScanner(props: {
  onScan: (value: string) => void;
  style?: ViewStyle;
  variant?: 'barcode' | 'location';
  strictMode?: 'off' | 'roi-stable';
  onScanRejected?: (reason: 'out_of_roi' | 'unstable' | 'cooldown') => void;
  active?: boolean;
}) {
  const { t } = useI18n();
  const variant = props.variant ?? 'barcode';
  const strictMode = props.strictMode ?? 'roi-stable';
  const active = props.active ?? true;
  const [permission, requestPermission] = useCameraPermissions();
  const lockedRef = React.useRef(false);
  const lockTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = React.useRef(true);
  const candidateRef = React.useRef<{ code: string; hits: number; firstAt: number; lastAt: number } | null>(null);
  const outOfRoiStreakRef = React.useRef(0);
  const lastHintAtRef = React.useRef(0);
  const hintTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [roiHintVisible, setRoiHintVisible] = React.useState(false);

  const isLocation = variant === 'location';
  const width = size.width || 320;
  const height = size.height || (isLocation ? 560 : 200);
  const REQUIRED_HITS = isLocation ? 2 : 3;
  const HIT_WINDOW_MS = isLocation ? 700 : 500;
  const COOLDOWN_MS = isLocation ? 1200 : 900;

  const finderWidth = isLocation
    ? Math.min(width * 0.78, 340)
    : Math.min(width * 0.86, 320);
  const finderHeight = isLocation
    ? Math.min(height * 0.28, 190)
    : Math.min(height * 0.54, 150);

  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, []);

  const getCenterFromCorners = (points: BarcodePoint[] | undefined) => {
    if (!points || points.length === 0) return null;
    const finite = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!finite.length) return null;
    const sum = finite.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / finite.length, y: sum.y / finite.length };
  };

  const getCenterFromBounds = (bounds: { origin: BarcodePoint; size: BarcodeSize } | undefined) => {
    if (!bounds) return null;
    const x = bounds.origin?.x;
    const y = bounds.origin?.y;
    const w = bounds.size?.width;
    const h = bounds.size?.height;
    if (![x, y, w, h].every((n) => Number.isFinite(Number(n)))) return null;
    return { x: Number(x) + Number(w) / 2, y: Number(y) + Number(h) / 2 };
  };

  const isInsideInnerRoi = (center: { x: number; y: number }) => {
    const finderX = (width - finderWidth) / 2;
    const finderY = (height - finderHeight) / 2;
    const innerWidth = finderWidth * 0.8;
    const innerHeight = finderHeight * 0.8;
    const innerX = finderX + (finderWidth - innerWidth) / 2;
    const innerY = finderY + (finderHeight - innerHeight) / 2;
    return (
      center.x >= innerX &&
      center.x <= innerX + innerWidth &&
      center.y >= innerY &&
      center.y <= innerY + innerHeight
    );
  };

  const showRoiHint = React.useCallback(() => {
    const now = Date.now();
    if (now - lastHintAtRef.current < 1200) return;
    lastHintAtRef.current = now;
    setRoiHintVisible(true);
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
    hintTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setRoiHintVisible(false);
    }, 1200);
  }, []);

  const handleReject = React.useCallback((reason: 'out_of_roi' | 'unstable' | 'cooldown') => {
    props.onScanRejected?.(reason);
    if (reason === 'out_of_roi') {
      outOfRoiStreakRef.current += 1;
      if (outOfRoiStreakRef.current >= 2) {
        showRoiHint();
      }
      return;
    }
    outOfRoiStreakRef.current = 0;
  }, [props, showRoiHint]);

  if (!permission) return <View style={[styles.cameraWrap, props.style]} />;

  if (!permission.granted) {
    return (
      <View style={[styles.center, props.style]}>
        <Text style={styles.txt}>{t('scan.cameraPermissionNeeded')}</Text>
        <Pressable style={styles.btn} onPress={() => requestPermission()}>
          <Text style={styles.btnTxt}>{t('scan.cameraPermissionGrant')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[styles.cameraWrap, props.style]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w !== size.width || h !== size.height) setSize({ width: w, height: h });
      }}
    >
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={!active ? undefined : (res: BarcodeScanningResult) => {
          if (lockedRef.current) {
            handleReject('cooldown');
            return;
          }
          const value = String(res.data ?? '').trim();
          if (!value) return;

          if (strictMode === 'roi-stable') {
            const centerFromCorners = getCenterFromCorners(res.cornerPoints);
            const centerFromBounds = getCenterFromBounds(res.bounds);
            const center = centerFromCorners ?? centerFromBounds;
            const hasUsableCenter =
              !!center &&
              center.x >= 0 &&
              center.x <= width &&
              center.y >= 0 &&
              center.y <= height;

            if (hasUsableCenter && center && !isInsideInnerRoi(center)) {
              candidateRef.current = null;
              handleReject('out_of_roi');
              return;
            }

            const now = Date.now();
            const prev = candidateRef.current;
            if (prev && prev.code === value && now - prev.lastAt <= HIT_WINDOW_MS) {
              candidateRef.current = {
                code: value,
                hits: prev.hits + 1,
                firstAt: prev.firstAt,
                lastAt: now,
              };
            } else {
              candidateRef.current = {
                code: value,
                hits: 1,
                firstAt: now,
                lastAt: now,
              };
            }

            if ((candidateRef.current?.hits ?? 0) < REQUIRED_HITS) {
              handleReject('unstable');
              return;
            }
          }

          candidateRef.current = null;
          outOfRoiStreakRef.current = 0;
          lockedRef.current = true;
          props.onScan(value);
          lockTimeoutRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            lockedRef.current = false;
          }, COOLDOWN_MS);
        }}
        barcodeScannerSettings={{
          barcodeTypes: isLocation ? ['qr'] : ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
        }}
      />
      <View style={styles.overlayContainer} pointerEvents="none">
        <View style={[styles.viewfinder, { width: finderWidth, height: finderHeight }, isLocation && styles.viewfinderLocation]}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          {!isLocation ? <View style={styles.laserLine} /> : null}
        </View>
        <Text style={[styles.hintText, isLocation ? styles.hintTextTop : styles.hintTextBottom]}>
          {isLocation ? t('scan.cameraHintLocation') : t('scan.cameraHintBarcode')}
        </Text>
        {roiHintVisible ? (
          <Text style={[styles.hintText, styles.roiHint]}>{t('scan.cameraRoiHint')}</Text>
        ) : null}
        <View style={[styles.brandMark, isLocation ? styles.brandMarkTopLeft : styles.brandMarkTopRight]}>
          <Image source={require('../../../assets/LOGO_HD_transparent.png')} style={styles.brandLogo} resizeMode="contain" />
          <Text style={styles.brandText}>{isLocation ? 'NNC Locator' : 'NNC StockCount'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  txt: { fontSize: 14, marginBottom: 12, color: COLORS.textSecondary },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: COLORS.primary },
  btnTxt: { fontSize: 14, color: '#FFF' },
  
  cameraWrap: { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#000', position: 'relative' },
  camera: { flex: 1 },
  
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  viewfinder: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  viewfinderLocation: {
    borderColor: 'rgba(255,255,255,0.8)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: COLORS.accent,
    opacity: 0.8,
  },
  hintText: {
    color: '#FFF',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  hintTextTop: {
    position: 'absolute',
    top: 14,
  },
  hintTextBottom: {
    position: 'absolute',
    bottom: 14,
  },
  roiHint: {
    position: 'absolute',
    bottom: 44,
    backgroundColor: 'rgba(255,140,0,0.75)',
  },
  brandMark: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  brandMarkTopRight: {
    top: 12,
    right: 12,
  },
  brandMarkTopLeft: {
    top: 12,
    left: 12,
  },
  brandLogo: { width: 20, height: 20 },
  brandText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
});
