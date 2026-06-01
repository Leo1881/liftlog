export type RootStackParamList = {
  Home: undefined;
  Day: { dayId: string };
  Progress: undefined;
  ExerciseProgress: { exerciseKey: string; name: string };
};
