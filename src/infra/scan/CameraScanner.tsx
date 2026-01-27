import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export function CameraScanner(props: {
  onScan: (value: string) => void;
  style?: ViewStyle;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = React.useState(false);

  if (!permission) return <View style={[styles.cameraWrap, props.style]} />;

  if (!permission.granted) {
    return (
      <View style={[styles.center, props.style]}>
        <Text style={styles.txt}>Cần cấp quyền camera để quét.</Text>
        <Pressable style={styles.btn} onPress={() => requestPermission()}>
          <Text style={styles.btnTxt}>Cấp quyền</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.cameraWrap, props.style]}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={(res) => {
          if (locked) return;
          const value = String(res.data ?? '').trim();
          if (!value) return;
          setLocked(true);
          props.onScan(value);
          setTimeout(() => setLocked(false), 1500); // 1.5s cooldown
        }}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
        }}
      />
      <View style={styles.overlayContainer} pointerEvents="none">
        <View style={styles.viewfinder}>
          <View style={styles.laserLine} />
        </View>
        <Text style={styles.hintText}>Di chuyển mã vào khung</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' },
  txt: { fontSize: 14, marginBottom: 12, color: '#555' },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#003B73' },
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
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#FF6B00', // Safety Orange
    opacity: 0.8,
  },
  hintText: {
    marginTop: 16,
    color: '#FFF',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  }
});
