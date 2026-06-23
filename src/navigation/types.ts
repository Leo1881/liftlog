export type RootStackParamList = {
  Home: undefined;
  Day: { dayId: string; sessionId?: string };
  DayHistory: { dayId: string; dayLabel: string };
  Progress: undefined;
  ExerciseProgress: { exerciseKey: string; name: string };
};
