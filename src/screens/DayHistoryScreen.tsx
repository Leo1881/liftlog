import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTodaySessionId, listSessionsForDay, type DaySessionSummary } from '../db/workouts';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DayHistory'>;

function formatSessionDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sessionStatus(session: DaySessionSummary, todaySessionId: string | null): string {
  if (session.id === todaySessionId) {
    return session.completed_at != null ? 'Today · completed' : 'Today · in progress';
  }
  return session.completed_at != null ? 'Completed' : 'In progress';
}

export function DayHistoryScreen({ navigation, route }: Props) {
  const { dayId, dayLabel } = route.params;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<DaySessionSummary[]>([]);
  const [todaySessionId, setTodaySessionId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        setLoading(true);
        const [rows, todayId] = await Promise.all([
          listSessionsForDay(dayId),
          getTodaySessionId(dayId),
        ]);
        if (!active) {
          return;
        }
        setSessions(rows);
        setTodaySessionId(todayId);
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [dayId]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      <Text style={styles.hint}>Tap a workout to view or edit it.</Text>
      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No workouts logged for {dayLabel} yet.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate('Day', { dayId, sessionId: item.id })}
            >
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{formatSessionDate(item.started_at)}</Text>
                <Text style={styles.cardSub}>{sessionStatus(item, todaySessionId)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: fonts.regular,
    marginBottom: spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  cardSub: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  chevron: {
    color: colors.muted,
    fontSize: 28,
    fontFamily: fonts.regular,
    marginLeft: spacing.sm,
  },
});
