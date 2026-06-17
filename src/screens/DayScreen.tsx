import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  completeSession,
  exerciseKey,
  getIncreaseFlags,
  getOrCreateTodaySession,
  getSessionCompletedAt,
  loadLastSetRefs,
  loadSessionLogs,
  saveSetLog,
  type SetValues,
} from '../db/workouts';
import type { RootStackParamList } from '../navigation/types';
import { exerciseSetSummary, getRoutineDay, targetRepsForSet } from '../routine';
import { colors, fonts, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Day'>;

type SetLog = {
  weight: string;
  reps: string;
  rpe: string;
};

const EMPTY_LOG: SetLog = { weight: '', reps: '', rpe: '' };

function logKey(key: string, setIndex: number): string {
  return `${key}:${setIndex}`;
}

function parseOptionalInt(s: string): number | null {
  const t = s.trim();
  if (t === '') {
    return null;
  }
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalFloat(s: string): number | null {
  const t = s.trim();
  if (t === '') {
    return null;
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function formatCompleted(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLastRpe(rpe: number | null | undefined): string {
  if (rpe == null) {
    return '–';
  }
  return Number.isInteger(rpe) ? String(rpe) : String(Math.round(rpe * 10) / 10);
}

function toValues(log: SetLog): SetValues {
  return {
    weight: parseOptionalFloat(log.weight),
    reps: parseOptionalInt(log.reps),
    rpe: parseOptionalFloat(log.rpe),
  };
}

export function DayScreen({ navigation, route }: Props) {
  const { dayId } = route.params;
  const day = getRoutineDay(dayId);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Record<string, SetLog>>({});
  const [lastRefs, setLastRefs] = useState<Map<string, { weight: number | null; rpe: number | null }>>(
    new Map(),
  );
  const [increaseFlags, setIncreaseFlags] = useState<Set<string>>(new Set());
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [highlightMissing, setHighlightMissing] = useState<Set<string>>(() => new Set());
  const sessionIdRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: day?.label ?? 'Day' });
  }, [navigation, day]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const sessionId = await getOrCreateTodaySession(dayId);
      sessionIdRef.current = sessionId;
      const [stored, last, flags, completed] = await Promise.all([
        loadSessionLogs(sessionId),
        loadLastSetRefs(sessionId, dayId),
        getIncreaseFlags(dayId),
        getSessionCompletedAt(sessionId),
      ]);
      if (!active) {
        return;
      }
      // Prefill every set's REPS with the exercise's target reps, then overlay any
      // stored values. Weight/RPE stay empty until logged.
      const initial: Record<string, SetLog> = {};
      for (const exercise of day?.exercises ?? []) {
        const exKey = exerciseKey(exercise.name);
        for (let i = 0; i < exercise.sets; i++) {
          const key = logKey(exKey, i);
          const row = stored.get(key);
          const targetReps = targetRepsForSet(exercise, i);
          initial[key] = {
            weight: row?.weight != null ? String(row.weight) : '',
            reps: row?.reps != null ? String(row.reps) : targetReps,
            rpe: row?.rpe != null ? String(row.rpe) : '',
          };
        }
      }
      setLogs(initial);
      setLastRefs(last);
      setIncreaseFlags(flags);
      setCompletedAt(completed);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [dayId]);

  const updateLog = useCallback((key: string, patch: Partial<SetLog>) => {
    setLogs((prev) => ({
      ...prev,
      [key]: { ...EMPTY_LOG, ...prev[key], ...patch },
    }));
    if (patch.weight !== undefined && parseOptionalFloat(patch.weight) !== null) {
      setHighlightMissing((highlights) => {
        if (!highlights.has(key)) {
          return highlights;
        }
        const next = new Set(highlights);
        next.delete(key);
        return next;
      });
    }
  }, []);

  const persist = useCallback(
    (key: string, exKey: string, setIndex: number, targetReps: string) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) {
        return;
      }
      const log = logs[key] ?? EMPTY_LOG;
      void saveSetLog(sessionId, exKey, setIndex, targetReps, toValues(log));
    },
    [logs],
  );

  const finishSession = useCallback(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      return;
    }
    setHighlightMissing(new Set());
    void (async () => {
      const ts = await completeSession(sessionId);
      setCompletedAt(ts);
    })();
  }, []);

  const onComplete = useCallback(() => {
    if (!day) {
      return;
    }
    const missing: string[] = [];
    for (const exercise of day.exercises) {
      if (exercise.bodyweight) {
        continue;
      }
      const exKey = exerciseKey(exercise.name);
      for (let i = 0; i < exercise.sets; i++) {
        const key = logKey(exKey, i);
        const log = logs[key] ?? EMPTY_LOG;
        if (parseOptionalFloat(log.weight) === null) {
          missing.push(key);
        }
      }
    }
    if (missing.length === 0) {
      finishSession();
      return;
    }
    setHighlightMissing(new Set(missing));
    const count = missing.length;
    Alert.alert(
      'Missing workout data',
      `${count} set${count === 1 ? '' : 's'} ${count === 1 ? 'is' : 'are'} missing a weight. Add it now or finish anyway — you can update later.`,
      [
        { text: 'Go back', style: 'cancel' },
        { text: 'Finish anyway', onPress: finishSession },
      ],
    );
  }, [day, logs, finishSession]);

  if (!day) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>This day no longer exists.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {day.exercises.map((exercise, exerciseIndex) => {
          const exKey = exerciseKey(exercise.name);
          const shouldIncrease = increaseFlags.has(exKey);
          return (
            <View
              key={`${exercise.name}-${exerciseIndex}`}
              style={[styles.block, shouldIncrease && styles.blockIncrease]}
            >
              <View style={styles.blockHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.target}>{exerciseSetSummary(exercise)}</Text>
              </View>
              {shouldIncrease ? (
                <View style={styles.increasePill}>
                  <Text style={styles.increasePillText}>Increase weight</Text>
                </View>
              ) : null}

              <View style={styles.tableHeader}>
                <Text style={[styles.colSet, styles.headerText]}>SET</Text>
                <Text style={[styles.colTarget, styles.headerText]}>TGT</Text>
                <Text style={[styles.colLast, styles.headerText]}>LAST</Text>
                <Text style={[styles.colLastRpe, styles.headerText]}>L RPE</Text>
                <Text style={[styles.colInput, styles.headerText]}>KG</Text>
                <Text style={[styles.colInput, styles.headerText]}>REPS</Text>
                <Text style={[styles.colInput, styles.headerText]}>RPE</Text>
              </View>

              {Array.from({ length: exercise.sets }).map((_, setIndex) => {
                const key = logKey(exKey, setIndex);
                const log = logs[key];
                const lastRef = lastRefs.get(key);
                const targetReps = targetRepsForSet(exercise, setIndex);
                return (
                  <View key={setIndex}>
                    <View style={styles.setRow}>
                      <Text style={[styles.colSet, styles.setLabel]}>{setIndex + 1}</Text>
                      <Text style={[styles.colTarget, styles.targetReps]}>{targetReps}</Text>
                      <Text style={[styles.colLast, styles.lastWeight]}>
                        {exercise.bodyweight ? 'BW' : lastRef?.weight != null ? String(lastRef.weight) : '–'}
                      </Text>
                      <Text style={[styles.colLastRpe, styles.lastRpe]}>
                        {formatLastRpe(lastRef?.rpe)}
                      </Text>
                      <TextInput
                        style={[
                          styles.colInput,
                          styles.input,
                          highlightMissing.has(key) && styles.inputMissing,
                        ]}
                        placeholder="–"
                        placeholderTextColor={colors.muted}
                        keyboardType="decimal-pad"
                        value={log?.weight ?? ''}
                        onChangeText={(t) => updateLog(key, { weight: t })}
                        onBlur={() => persist(key, exKey, setIndex, targetReps)}
                      />
                      <TextInput
                        style={[styles.colInput, styles.input]}
                        placeholder="–"
                        placeholderTextColor={colors.muted}
                        keyboardType="number-pad"
                        value={log?.reps ?? ''}
                        onChangeText={(t) => updateLog(key, { reps: t })}
                        onBlur={() => persist(key, exKey, setIndex, targetReps)}
                      />
                      <TextInput
                        style={[styles.colInput, styles.input]}
                        placeholder="/10"
                        placeholderTextColor={colors.muted}
                        keyboardType="decimal-pad"
                        value={log?.rpe ?? ''}
                        onChangeText={(t) => updateLog(key, { rpe: t })}
                        onBlur={() => persist(key, exKey, setIndex, targetReps)}
                      />
                    </View>
                    {exercise.dividerAfterSet === setIndex + 1 ? (
                      <View style={styles.setDivider} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        })}

        {completedAt != null ? (
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>
              Completed · {formatCompleted(completedAt)}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.completeBtn,
            completedAt != null && styles.completeBtnDone,
            pressed && styles.completeBtnPressed,
          ]}
          onPress={onComplete}
        >
          <Text
            style={[
              styles.completeBtnText,
              completedAt != null && styles.completeBtnTextDone,
            ]}
          >
            {completedAt != null ? 'Update completion time' : 'Complete workout'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: colors.muted,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  block: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockIncrease: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  increasePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: spacing.md,
  },
  increasePillText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: fonts.extrabold,
    letterSpacing: 0.3,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 17,
    fontFamily: fonts.bold,
    flexShrink: 1,
    paddingRight: spacing.md,
  },
  target: {
    color: colors.accent,
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    color: colors.muted,
    fontSize: 10,
    fontFamily: fonts.semibold,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  setDivider: {
    height: 1,
    backgroundColor: colors.accent,
    opacity: 0.45,
    marginVertical: spacing.sm,
  },
  colSet: {
    width: 24,
    textAlign: 'center',
  },
  colTarget: {
    width: 32,
    textAlign: 'center',
  },
  colLast: {
    width: 36,
    textAlign: 'center',
  },
  colLastRpe: {
    width: 30,
    textAlign: 'center',
  },
  colInput: {
    flex: 1,
    marginHorizontal: 2,
  },
  setLabel: {
    color: colors.text,
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  targetReps: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  lastWeight: {
    color: colors.text,
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  lastRpe: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    color: colors.text,
    backgroundColor: colors.bg,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  inputMissing: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  completedBadge: {
    alignSelf: 'center',
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  completedBadgeText: {
    color: colors.success,
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  completeBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  completeBtnDone: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  completeBtnPressed: {
    opacity: 0.7,
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: fonts.extrabold,
    letterSpacing: 0.3,
  },
  completeBtnTextDone: {
    color: colors.muted,
    fontFamily: fonts.bold,
  },
});
