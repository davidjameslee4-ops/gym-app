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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { storage } from '@/src/utils/storage';
import { UserProfile, WeightEntry, WorkoutLog } from '@/src/types/workout';
import { useFocusEffect } from 'expo-router';
import { loadStreak, StreakResult } from '@/src/utils/streak';

const { width: screenWidth } = Dimensions.get('window');

export default function ProgressScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [streak, setStreak] = useState<StreakResult>({ current: 0, longest: 0, today: 'pending' });

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
    setStreak(await loadStreak());
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

  // Calculate stats
  const totalWorkouts = logs.length;
  const totalSets = logs.reduce((sum, log) => 
    sum + log.exercises.reduce((s, e) => s + e.sets, 0), 0
  );

  // Streaks: rest / recovery days count, a missed workout day breaks it (see src/utils/streak.ts)
  const calculateStreak = () => streak.current;
  const calculateLongestStreak = () => streak.longest;

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
});
