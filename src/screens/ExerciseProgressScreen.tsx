import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getExerciseHistory, type ExerciseHistoryPoint } from '../db/workouts';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ExerciseProgress'>;

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function ExerciseProgressScreen({ navigation, route }: Props) {
  const { exerciseKey, name } = route.params;
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<ExerciseHistoryPoint[] | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const rows = await getExerciseHistory(exerciseKey);
        if (active) {
          setHistory(rows);
        }
      })();
      return () => {
        active = false;
      };
    }, [exerciseKey]),
  );

  if (history === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No data yet</Text>
        <Text style={styles.emptyText}>
          Log this exercise with a weight and reps to start tracking progress.
        </Text>
      </View>
    );
  }

  const latest = history[history.length - 1];
  const bestE1rm = Math.max(...history.map((h) => h.e1rm));
  const chartWidth = Dimensions.get('window').width - spacing.lg * 2;

  const chartData = {
    labels: history.map((h) => formatDate(h.started_at)),
    datasets: [
      {
        data: history.map((h) => h.top_weight),
        color: (o = 1) => `rgba(222, 222, 222, ${o})`,
        strokeWidth: 2,
      },
      {
        data: history.map((h) => h.e1rm),
        color: (o = 1) => `rgba(255, 73, 73, ${o})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Top weight (kg)', 'Est. 1RM (kg)'],
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Latest top weight</Text>
          <Text style={styles.statValue}>{latest.top_weight} kg</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Best est. 1RM</Text>
          <Text style={styles.statValue}>{bestE1rm} kg</Text>
        </View>
      </View>

      <LineChart
        data={chartData}
        width={chartWidth}
        height={240}
        fromZero={false}
        yAxisSuffix=""
        chartConfig={{
          backgroundGradientFrom: colors.card,
          backgroundGradientTo: colors.card,
          decimalPlaces: 1,
          color: (o = 1) => `rgba(154, 156, 179, ${o})`,
          labelColor: (o = 1) => `rgba(154, 156, 179, ${o})`,
          propsForDots: { r: '3' },
          propsForBackgroundLines: { stroke: colors.border },
          propsForLabels: { fontFamily: fonts.regular },
        }}
        bezier
        style={styles.chart}
      />

      <Text style={styles.sectionTitle}>Sessions</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.colDate, styles.headerText]}>DATE</Text>
        <Text style={[styles.colVal, styles.headerText]}>TOP</Text>
        <Text style={[styles.colVal, styles.headerText]}>1RM</Text>
      </View>
      {[...history].reverse().map((h, i) => (
        <View key={`${h.started_at}-${i}`} style={styles.row}>
          <Text style={[styles.colDate, styles.rowText]}>{formatDate(h.started_at)}</Text>
          <Text style={[styles.colVal, styles.rowText]}>{h.top_weight}</Text>
          <Text style={[styles.colVal, styles.rowAccent]}>{h.e1rm}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.semibold,
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.extrabold,
    marginTop: 4,
  },
  chart: {
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: fonts.semibold,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colDate: {
    flex: 1,
  },
  colVal: {
    width: 70,
    textAlign: 'right',
  },
  rowText: {
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  rowAccent: {
    color: colors.success,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
});
