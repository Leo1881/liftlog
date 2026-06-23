import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCompletedSessionCounts } from '../db/workouts';
import type { RootStackParamList } from '../navigation/types';
import { ROUTINE } from '../routine';
import { colors, fonts, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: Nav;
};

function sessionPillLabel(count: number): string {
  return count === 1 ? '1 Session' : `${count} Sessions`;
}

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [completedCounts, setCompletedCounts] = useState<Map<string, number>>(new Map());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const counts = await getCompletedSessionCounts();
        if (active) {
          setCompletedCounts(counts);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      <FlatList
        data={ROUTINE}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.cardShadow, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate('Day', { dayId: item.id })}
          >
            <View style={styles.card}>
              <View style={styles.accentBar} />
              <View style={styles.cardBody}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  <Pressable
                    style={styles.sessionPill}
                    onPress={() =>
                      navigation.navigate('DayHistory', { dayId: item.id, dayLabel: item.label })
                    }
                  >
                    <Text style={styles.sessionPillText}>
                      {sessionPillLabel(completedCounts.get(item.id) ?? 0)}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.cardSub}>{item.exercises.length} exercises</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        )}
      />
      <Pressable style={styles.progressBtn} onPress={() => navigation.navigate('Progress')}>
        <Text style={styles.progressBtnText}>View progress</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  cardShadow: {
    borderRadius: 12,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
  },
  cardBody: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: fonts.bold,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sessionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginLeft: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionPillText: {
    color: colors.accent,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.semibold,
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cardSub: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  chevron: {
    color: colors.muted,
    fontSize: 28,
    fontFamily: fonts.regular,
    paddingRight: spacing.lg,
    marginTop: -2,
  },
  progressBtn: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    marginTop: spacing.sm,
  },
  progressBtnText: {
    color: colors.accent,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
});
