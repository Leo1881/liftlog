import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Image, StyleSheet } from 'react-native';

import { DayScreen } from '../screens/DayScreen';
import { ExerciseProgressScreen } from '../screens/ExerciseProgressScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { colors, fonts } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

const styles = StyleSheet.create({
  headerLogo: {
    height: 24,
    width: 24 * (624 / 106),
  },
});

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.bold },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerTitleAlign: 'center',
            headerTitle: () => (
              <Image
                source={require('../../assets/header-logo.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            ),
          }}
        />
        <Stack.Screen name="Day" component={DayScreen} />
        <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: 'Progress' }} />
        <Stack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
