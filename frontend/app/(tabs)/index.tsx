import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { storage } from '@/src/utils/storage';
import { UserProfile, WorkoutProgram, WorkoutDay, WorkoutLog } from '@/src/types/workout';
import { DEFAULT_WORKOUT_PROGRAM } from '@/src/constants/defaultWorkout';
import { dayTitle, hasCustomTitle } from '@/src/utils/dayTools';
import { useFocusEffect } from 'expo-router';
import {
  Completions,
  completionId,
  dateKey,
  isCompleted,
  loadCompletions,
  toggleCompletion,
} from '@/src/utils/exerciseCompletion';

const MOTIVATIONAL_MESSAGES = [
  "Let's crush this workout! 💪",
  "You're stronger than yesterday!",
  "Every rep counts!",
  "Make today count!",
  "Push your limits!",
  "Beast mode activated!",
  "Train insane or remain the same!",
  "Your only limit is you!",
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<WorkoutDay | null>(null);
  const [completions, setCompletions] = useState<Completions>({});
  const [activeProgram, setActiveProgram] = useState<WorkoutProgram | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [motivation, setMotivation] = useState('');
  const [todayCompleted, setTodayCompleted] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load profile
    const savedProfile = await storage.getItem('userProfile', null) as UserProfile | null;
    if (savedProfile) {
      setProfile(savedProfile);
    } else {
      // Set default profile
      const defaultProfile: UserProfile = {
        name: 'Gym User',
        currentWeight: 0,
        goalWeight: 0,
        weightUnit: 'kg',
      };
      setProfile(defaultProfile);
    }

    // Load active program and get today's workout
    const programs = await storage.getItem('workoutPrograms', null) as WorkoutProgram[] | null;
    let active: WorkoutProgram;
    
    if (!programs || programs.length === 0) {
      // Initialize with default program
      active = DEFAULT_WORKOUT_PROGRAM;
      await storage.setItem('workoutPrograms', [active]);
    } else {
      active = programs.find(p => p.isActive) || programs[0];
    }

    setActiveProgram(active);

    // Get today's workout based on day of week
    // JS getDay(): Sun=0..Sat=6; our program days array starts on Monday (index 0)
    const jsDay = new Date().getDay();
    const dayIndex = (jsDay + 6) % 7;
    const workout = active.days[dayIndex];
    setTodayWorkout(workout);
    setCompletions(await loadCompletions());

    // Calculate streak and check if today is completed
    const logs = await storage.getItem('workoutLogs', []) as WorkoutLog[];
    const streak = calculateStreak(logs);
    setCurrentStreak(streak);

    // Check if today's workout is already completed
    const today = new Date().toISOString().split('T')[0];
    const completedToday = logs.some(l => l.date.startsWith(today));
    setTodayCompleted(completedToday);

    // Set random motivational message
    const randomMessage = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    setMotivation(randomMessage);
  };

  const calculateStreak = (logs: WorkoutLog[]): number => {
    if (logs.length === 0) return 0;

    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const handleCompleteWorkout = async () => {
    if (!todayWorkout || !activeProgram || todayCompleted) return;

    Alert.alert(
      'Complete Workout',
      'Mark today\'s workout as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            const newLog: WorkoutLog = {
              id: `log-${Date.now()}`,
              date: new Date().toISOString(),
              programId: activeProgram.id,
              dayId: todayWorkout.id,
              dayName: hasCustomTitle(todayWorkout) ? `${dayTitle(todayWorkout)} (${todayWorkout.name})` : todayWorkout.name,
              focus: todayWorkout.focus,
              exercises: todayWorkout.exercises.map(e => ({
                exerciseId: e.id,
                name: e.name,
                sets: e.sets,
                reps: e.reps,
                weight: e.weight,
                notes: e.notes,
              })),
              completed: true,
            };

            const logs = await storage.getItem('workoutLogs', []) as WorkoutLog[];
            const updatedLogs = [...logs, newLog];
            await storage.setItem('workoutLogs', updatedLogs);
            
            setTodayCompleted(true);
            setCurrentStreak(calculateStreak(updatedLogs));
            Alert.alert('Great Job! 💪', 'Workout logged successfully!');
          },
        },
      ]
    );
  };

  const weightRemaining = profile ? Math.abs(profile.goalWeight - profile.currentWeight) : 0;
  const isLosing = profile ? profile.currentWeight > profile.goalWeight : false;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.name, { color: colors.text }]}>{profile?.name || 'Gym User'}</Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="flame" size={24} color="#FFFFFF" />
          <Text style={styles.streakText}>{currentStreak}</Text>
        </View>
      </View>

      {/* Motivational Quote */}
      <View style={[styles.motivationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="fitness" size={24} color={colors.primary} />
        <Text style={[styles.motivationText, { color: colors.text }]}>{motivation}</Text>
      </View>

      {/* Weight Stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Weight Progress</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Current</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {profile?.currentWeight || 0} {profile?.weightUnit || 'kg'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Goal</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {profile?.goalWeight || 0} {profile?.weightUnit || 'kg'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remaining</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {weightRemaining.toFixed(1)} {profile?.weightUnit || 'kg'}
            </Text>
          </View>
        </View>
      </View>

      {/* Today's Workout */}
      <View style={[styles.workoutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.workoutHeader}>
          <View style={styles.workoutHeaderLeft}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Today's Workout</Text>
            <Text testID="home-today-title" style={[styles.workoutDay, { color: colors.primary }]}>
              {todayWorkout ? dayTitle(todayWorkout) : 'Rest Day'}
            </Text>
            {todayWorkout && hasCustomTitle(todayWorkout) && (
              <Text style={[styles.workoutWeekday, { color: colors.textSecondary }]}>{todayWorkout.name}</Text>
            )}
          </View>
          <View style={[styles.focusBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
            <Text style={[styles.focusText, { color: colors.primary }]}>
              {todayWorkout?.focus || 'Rest'}
            </Text>
          </View>
        </View>

        {todayWorkout && todayWorkout.exercises.length > 0 ? (
          <View style={styles.exerciseList}>
            {todayWorkout.exercises.map((exercise, index) => {
              const cid = completionId(todayWorkout.id, exercise.id);
              const done = isCompleted(completions, dateKey(), cid);
              return (
              <View key={exercise.id} style={styles.exerciseItem}>
                <View style={[styles.exerciseNumber, { backgroundColor: colors.primary }, done && styles.doneFaded]}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={[styles.exerciseDetails, done && styles.doneFaded]}>
                  <Text
                    style={[
                      styles.exerciseName,
                      { color: colors.text },
                      done && { textDecorationLine: 'line-through' },
                    ]}
                  >
                    {exercise.name}
                  </Text>
                  <Text style={[styles.exerciseStats, { color: colors.textSecondary }]}>
                    {exercise.sets} sets × {exercise.reps}{/min|sec/i.test(exercise.reps) ? '' : ' reps'}
                    {exercise.weight ? ` @ ${exercise.weight}${profile?.weightUnit || 'kg'}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  testID={`home-done-toggle-${exercise.id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={done ? `Mark ${exercise.name} as not done` : `Mark ${exercise.name} as done`}
                  onPress={async () => setCompletions(await toggleCompletion(dateKey(), cid))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={30}
                    color={done ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              );
            })}
          </View>
        ) : (
          <Text style={[styles.restDayText, { color: colors.textSecondary }]}>Take a well-deserved rest!</Text>
        )}

        {todayWorkout && todayWorkout.exercises.length > 0 && (
          <TouchableOpacity
            testID="complete-workout-button"
            style={[
              styles.completeButton,
              { backgroundColor: todayCompleted ? colors.success : colors.primary },
            ]}
            onPress={handleCompleteWorkout}
            disabled={todayCompleted}
          >
            <Ionicons
              name={todayCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.completeButtonText}>
              {todayCompleted ? 'Workout Completed!' : 'Mark as Complete'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsRow}>
        <View style={[styles.quickStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="flame" size={32} color={colors.primary} />
          <Text style={[styles.quickStatValue, { color: colors.text }]}>{currentStreak}</Text>
          <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Day Streak</Text>
        </View>
        <View style={[styles.quickStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="barbell" size={32} color={colors.primary} />
          <Text style={[styles.quickStatValue, { color: colors.text }]}>
            {todayWorkout?.exercises.length || 0}
          </Text>
          <Text style={[styles.quickStatLabel, { color: colors.textSecondary }]}>Exercises</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  workoutCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  workoutDay: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  workoutHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  workoutWeekday: {
    fontSize: 12,
    marginTop: 2,
  },
  focusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: '55%',
    flexShrink: 1,
  },
  focusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  exerciseList: {
    gap: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  exerciseDetails: {
    flex: 1,
  },
  doneFaded: {
    opacity: 0.45,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseStats: {
    fontSize: 13,
  },
  moreText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  restDayText: {
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 16,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quickStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  quickStatLabel: {
    fontSize: 12,
  },
});
