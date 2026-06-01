import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { openDatabase } from './src/db/database';
import { seedIfEmpty } from './src/db/seed';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors, fonts, spacing } from './src/theme';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    void (async () => {
      try {
        await openDatabase();
        await seedIfEmpty();
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to open database');
      }
    })();
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!ready || !fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return <RootNavigator />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.regular,
    paddingHorizontal: spacing.xl,
    textAlign: 'center',
  },
});
