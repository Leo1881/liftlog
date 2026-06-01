import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { exerciseKey } from '../db/workouts';
import type { RootStackParamList } from '../navigation/types';
import { listUniqueExerciseNames } from '../routine';
import { colors, fonts, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Progress'>;

type Props = {
  navigation: Nav;
};

const EXERCISES = listUniqueExerciseNames()
  .map((name) => ({ name, key: exerciseKey(name) }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function ProgressScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <FlatList
        data={EXERCISES}
        keyExtractor={(item) => item.key}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xl }]}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.cardShadow, pressed && styles.cardPressed]}
            onPress={() =>
              navigation.navigate('ExerciseProgress', { exerciseKey: item.key, name: item.name })
            }
          >
            <View style={styles.card}>
              <View style={styles.accentBar} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>
        )}
      />
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
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fonts.semibold,
  },
  chevron: {
    color: colors.muted,
    fontSize: 28,
    fontFamily: fonts.regular,
    paddingRight: spacing.lg,
    marginTop: -2,
  },
});
