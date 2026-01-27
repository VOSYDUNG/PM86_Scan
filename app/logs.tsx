import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, SecondaryButton } from '@/presentation/components/ui';
import { getLogs, clearLogs, LogEntry } from '@/infra/logStore';
import { COLORS, SPACING, SIZES } from '@/presentation/theme';

export default function LogsScreen() {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);

  const load = React.useCallback(async () => {
    const data = await getLogs();
    setLogs(data.reverse());
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const onClear = async () => {
    await clearLogs();
    setLogs([]);
  };

  return (
    <Screen title="Debug Logs" subtitle="Xem log khi bị out/crash">
      <SecondaryButton label="Xóa log" onPress={onClear} />
      <ScrollView style={styles.logBox}>
        {logs.length === 0 ? (
          <Text style={styles.empty}>Chưa có log.</Text>
        ) : (
          logs.map((l, i) => (
            <View key={`${l.ts}-${i}`} style={styles.row}>
              <Text style={styles.time}>{new Date(l.ts).toLocaleString()}</Text>
              <Text style={[styles.level, l.level === 'error' && styles.levelErr, l.level === 'warn' && styles.levelWarn]}>
                {l.level.toUpperCase()}
              </Text>
              <Text style={styles.msg}>{l.message}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logBox: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SPACING.m,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  empty: { color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 24 },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: 4 },
  time: { fontSize: 11, color: COLORS.textSecondary },
  level: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  levelWarn: { color: COLORS.warning },
  levelErr: { color: COLORS.error },
  msg: { fontSize: 12, color: COLORS.textMain },
});
