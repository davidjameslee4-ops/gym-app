import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { storage } from '@/src/utils/storage';
import { UserProfile, WeightEntry, WorkoutLog } from '@/src/types/workout';
import { useFocusEffect } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export default function ProgressScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');

  // Nutrition calculator
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState<string>('moderate');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');
  const [nutritionResults, setNutritionResults] = useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const savedProfile = await storage.getItem('userProfile', null) as UserProfile | null;
    const savedWeights = await storage.getItem('weightEntries', []) as WeightEntry[];
    const savedLogs = await storage.getItem('workoutLogs', []) as WorkoutLog[];
    
    setProfile(savedProfile);
    setWeightEntries(savedWeights);
    setLogs(savedLogs);

    // Pre-populate nutrition calculator
    if (savedProfile) {
      setAge(savedProfile.age?.toString() || '');
      setHeight(savedProfile.height?.toString() || '');
      setWeight(savedProfile.currentWeight.toString());
    }
  };

  const addWeightEntry = async () => {
    if (!newWeight.trim()) return;
    
    const entry: WeightEntry = {
      id: `weight-${Date.now()}`,
      date: new Date().toISOString(),
      weight: parseFloat(newWeight),
    };

    const updated = [...weightEntries, entry];
    await storage.setItem('weightEntries', updated);
    setWeightEntries(updated);

    // Update profile current weight
    if (profile) {
      const updatedProfile = { ...profile, currentWeight: parseFloat(newWeight) };
      await storage.setItem('userProfile', updatedProfile);
      setProfile(updatedProfile);
    }

    setNewWeight('');
    setShowWeightModal(false);
  };

  const calculateNutrition = () => {
    const ageNum = parseInt(age);
    const heightNum = parseInt(height);
    const weightNum = parseFloat(weight);

    if (!ageNum || !heightNum || !weightNum) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // BMR using Mifflin-St Jeor equation
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
    } else {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;
    }

    // Activity multiplier
    const activityMultipliers: any = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const tdee = bmr * activityMultipliers[activityLevel];

    // Adjust for goal
    let calories = tdee;
    if (goal === 'lose') calories = tdee - 500;
    if (goal === 'gain') calories = tdee + 300;

    // Macros: 30% protein, 40% carbs, 30% fat
    const protein = (calories * 0.30) / 4;
    const carbs = (calories * 0.40) / 4;
    const fat = (calories * 0.30) / 9;

    setNutritionResults({
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
    });
  };

  // Calculate stats
  const totalWorkouts = logs.length;
  const totalSets = logs.reduce((sum, log) => 
    sum + log.exercises.reduce((s, e) => s + e.sets, 0), 0
  );

  const calculateStreak = () => {
    if (logs.length === 0) return 0;
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === streak) streak++;
      else break;
    }
    return streak;
  };

  const calculateLongestStreak = () => {
    if (logs.length === 0) return 0;
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let longest = 1;
    let current = 1;
    for (let i = 1; i < sortedLogs.length; i++) {
      const prev = new Date(sortedLogs[i - 1].date);
      const curr = new Date(sortedLogs[i].date);
      prev.setHours(0, 0, 0, 0);
      curr.setHours(0, 0, 0, 0);
      const diff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }
    return longest;
  };

  const getWeeklyCompletion = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weekLogs = logs.filter(log => new Date(log.date) >= startOfWeek);
    return Math.round((weekLogs.length / 7) * 100);
  };

  const getMonthlyCompletion = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const monthLogs = logs.filter(log => new Date(log.date) >= startOfMonth);
    return Math.round((monthLogs.length / daysInMonth) * 100);
  };

  // Simple chart rendering
  const renderWeightChart = () => {
    if (weightEntries.length < 2) {
      return (
        <View style={styles.emptyChart}>
          <Text style={[styles.emptyChartText, { color: colors.textSecondary }]}>
            Add at least 2 weight entries to see chart
          </Text>
        </View>
      );
    }

    const sorted = [...weightEntries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const weights = sorted.map(e => e.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = maxW - minW || 1;
    const chartHeight = 150;
    const chartWidth = screenWidth - 80;

    return (
      <View style={styles.chartContainer}>
        <View style={[styles.chart, { height: chartHeight, width: chartWidth }]}>
          {sorted.map((entry, idx) => {
            const x = (idx / (sorted.length - 1)) * chartWidth;
            const y = chartHeight - ((entry.weight - minW) / range) * (chartHeight - 20) - 10;
            return (
              <View
                key={entry.id}
                style={[
                  styles.chartDot,
                  {
                    left: x - 4,
                    top: y - 4,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            );
          })}
          {/* Draw lines between points */}
          {sorted.map((entry, idx) => {
            if (idx === sorted.length - 1) return null;
            const next = sorted[idx + 1];
            const x1 = (idx / (sorted.length - 1)) * chartWidth;
            const y1 = chartHeight - ((entry.weight - minW) / range) * (chartHeight - 20) - 10;
            const x2 = ((idx + 1) / (sorted.length - 1)) * chartWidth;
            const y2 = chartHeight - ((next.weight - minW) / range) * (chartHeight - 20) - 10;
            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
            return (
              <View
                key={`line-${idx}`}
                style={{
                  position: 'absolute',
                  left: x1,
                  top: y1,
                  width: length,
                  height: 2,
                  backgroundColor: colors.primary,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: '0 0',
                }}
              />
            );
          })}
        </View>
        <View style={styles.chartLabels}>
          <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>
            Min: {minW.toFixed(1)}
          </Text>
          <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>
            Max: {maxW.toFixed(1)}
          </Text>
        </View>
      </View>
    );
  };

  const weightChange = weightEntries.length >= 2 
    ? weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight 
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowWeightModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Top Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="flame" size={28} color={colors.primary} />
            <Text style={[styles.statBoxValue, { color: colors.text }]}>{calculateStreak()}</Text>
            <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Current Streak</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="trophy" size={28} color={colors.primary} />
            <Text style={[styles.statBoxValue, { color: colors.text }]}>{calculateLongestStreak()}</Text>
            <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Longest Streak</Text>
          </View>
        </View>

        {/* Weight Progress */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Weight Progress</Text>
          </View>

          <View style={styles.weightStats}>
            <View style={styles.weightStat}>
              <Text style={[styles.weightStatLabel, { color: colors.textSecondary }]}>Current</Text>
              <Text style={[styles.weightStatValue, { color: colors.text }]}>
                {profile?.currentWeight || 0} {profile?.weightUnit || 'kg'}
              </Text>
            </View>
            <View style={styles.weightStat}>
              <Text style={[styles.weightStatLabel, { color: colors.textSecondary }]}>Goal</Text>
              <Text style={[styles.weightStatValue, { color: colors.text }]}>
                {profile?.goalWeight || 0} {profile?.weightUnit || 'kg'}
              </Text>
            </View>
            <View style={styles.weightStat}>
              <Text style={[styles.weightStatLabel, { color: colors.textSecondary }]}>Change</Text>
              <Text style={[styles.weightStatValue, { color: weightChange < 0 ? colors.success : colors.primary }]}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} {profile?.weightUnit || 'kg'}
              </Text>
            </View>
          </View>

          {renderWeightChart()}
        </View>

        {/* Completion Stats */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Completion Rate</Text>
          
          <View style={styles.completionRow}>
            <View style={styles.completionItem}>
              <Text style={[styles.completionLabel, { color: colors.textSecondary }]}>This Week</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        backgroundColor: colors.primary,
                        width: `${Math.min(getWeeklyCompletion(), 100)}%`
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressBarText, { color: colors.text }]}>
                  {getWeeklyCompletion()}%
                </Text>
              </View>
            </View>

            <View style={styles.completionItem}>
              <Text style={[styles.completionLabel, { color: colors.textSecondary }]}>This Month</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        backgroundColor: colors.primary,
                        width: `${Math.min(getMonthlyCompletion(), 100)}%`
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressBarText, { color: colors.text }]}>
                  {getMonthlyCompletion()}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Workout Stats */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout Stats</Text>
          <View style={styles.workoutStats}>
            <View style={styles.workoutStat}>
              <Ionicons name="barbell" size={32} color={colors.primary} />
              <Text style={[styles.workoutStatValue, { color: colors.text }]}>{totalWorkouts}</Text>
              <Text style={[styles.workoutStatLabel, { color: colors.textSecondary }]}>Total Workouts</Text>
            </View>
            <View style={styles.workoutStat}>
              <Ionicons name="repeat" size={32} color={colors.primary} />
              <Text style={[styles.workoutStatValue, { color: colors.text }]}>{totalSets}</Text>
              <Text style={[styles.workoutStatLabel, { color: colors.textSecondary }]}>Total Sets</Text>
            </View>
          </View>
        </View>

        {/* Nutrition Calculator */}
        <TouchableOpacity
          style={[styles.nutritionButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowNutritionModal(true)}
        >
          <Ionicons name="nutrition" size={24} color="#FFFFFF" />
          <Text style={styles.nutritionButtonText}>Nutrition Calculator</Text>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Add Weight Modal */}
      <Modal visible={showWeightModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Weight</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder={`Weight (${profile?.weightUnit || 'kg'})`}
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={newWeight}
              onChangeText={setNewWeight}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setNewWeight('');
                  setShowWeightModal(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={addWeightEntry}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Nutrition Calculator Modal */}
      <Modal visible={showNutritionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nutrition Calculator</Text>
              <TouchableOpacity onPress={() => setShowNutritionModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.nutritionForm}>
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Age</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="25"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={age}
                    onChangeText={setAge}
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Height (cm)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="175"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Weight (kg)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="70"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Gender</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[styles.optionButton, { borderColor: colors.border }, gender === 'male' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setGender('male')}
                >
                  <Text style={[styles.optionText, { color: colors.text }, gender === 'male' && { color: '#FFFFFF' }]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, { borderColor: colors.border }, gender === 'female' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setGender('female')}
                >
                  <Text style={[styles.optionText, { color: colors.text }, gender === 'female' && { color: '#FFFFFF' }]}>Female</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Activity Level</Text>
              <View style={styles.activityOptions}>
                {[
                  { id: 'sedentary', label: 'Sedentary' },
                  { id: 'light', label: 'Light' },
                  { id: 'moderate', label: 'Moderate' },
                  { id: 'active', label: 'Active' },
                  { id: 'very_active', label: 'Very Active' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.activityOption, { borderColor: colors.border }, activityLevel === opt.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setActivityLevel(opt.id)}
                  >
                    <Text style={[styles.optionText, { color: colors.text }, activityLevel === opt.id && { color: '#FFFFFF' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Goal</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[styles.optionButton, { borderColor: colors.border }, goal === 'lose' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setGoal('lose')}
                >
                  <Text style={[styles.optionText, { color: colors.text }, goal === 'lose' && { color: '#FFFFFF' }]}>Lose</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, { borderColor: colors.border }, goal === 'maintain' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setGoal('maintain')}
                >
                  <Text style={[styles.optionText, { color: colors.text }, goal === 'maintain' && { color: '#FFFFFF' }]}>Maintain</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, { borderColor: colors.border }, goal === 'gain' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setGoal('gain')}
                >
                  <Text style={[styles.optionText, { color: colors.text }, goal === 'gain' && { color: '#FFFFFF' }]}>Gain</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.calculateButton, { backgroundColor: colors.primary }]}
                onPress={calculateNutrition}
              >
                <Text style={styles.calculateButtonText}>Calculate</Text>
              </TouchableOpacity>

              {nutritionResults && (
                <View style={[styles.resultsContainer, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                  <Text style={[styles.resultsTitle, { color: colors.text }]}>Your Daily Targets</Text>
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Calories</Text>
                    <Text style={[styles.resultValue, { color: colors.primary }]}>{nutritionResults.calories} kcal</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Protein</Text>
                    <Text style={[styles.resultValue, { color: colors.text }]}>{nutritionResults.protein}g</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Carbohydrates</Text>
                    <Text style={[styles.resultValue, { color: colors.text }]}>{nutritionResults.carbs}g</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Fat</Text>
                    <Text style={[styles.resultValue, { color: colors.text }]}>{nutritionResults.fat}g</Text>
                  </View>
                  <View style={[styles.resultDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>BMR</Text>
                    <Text style={[styles.resultValue, { color: colors.textSecondary }]}>{nutritionResults.bmr} kcal</Text>
                  </View>
                  <View style={styles.resultRow}>
                    <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>TDEE</Text>
                    <Text style={[styles.resultValue, { color: colors.textSecondary }]}>{nutritionResults.tdee} kcal</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  addButton: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  statBoxValue: { fontSize: 28, fontWeight: 'bold' },
  statBoxLabel: { fontSize: 12, textAlign: 'center' },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  weightStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  weightStat: { alignItems: 'center' },
  weightStatLabel: { fontSize: 12, marginBottom: 4 },
  weightStatValue: { fontSize: 18, fontWeight: 'bold' },
  chartContainer: { marginTop: 12 },
  chart: {
    position: 'relative',
    marginBottom: 12,
  },
  chartDot: {
    position: 'absolute',
    width: 8, height: 8, borderRadius: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: { fontSize: 11 },
  emptyChart: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyChartText: { fontSize: 14 },
  completionRow: { gap: 16 },
  completionItem: {},
  completionLabel: { fontSize: 14, marginBottom: 8 },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1, height: 12, borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 6 },
  progressBarText: { fontSize: 14, fontWeight: 'bold', minWidth: 50 },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  workoutStat: { alignItems: 'center', gap: 8 },
  workoutStatValue: { fontSize: 28, fontWeight: 'bold' },
  workoutStatLabel: { fontSize: 12 },
  nutritionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  nutritionButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalContentLarge: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1, borderRadius: 8, padding: 12,
    fontSize: 16, marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: { fontSize: 16, fontWeight: 'bold' },
  nutritionForm: {},
  formRow: { flexDirection: 'row', gap: 12 },
  formHalf: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  optionText: { fontSize: 14, fontWeight: '600' },
  activityOptions: {
    gap: 8,
    marginBottom: 8,
  },
  activityOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  calculateButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  resultsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  resultLabel: { fontSize: 14 },
  resultValue: { fontSize: 16, fontWeight: 'bold' },
  resultDivider: {
    height: 1,
    marginVertical: 8,
  },
});
