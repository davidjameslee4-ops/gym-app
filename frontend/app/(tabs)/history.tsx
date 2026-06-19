import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '@/src/contexts/ThemeContext';
import { storage } from '@/src/utils/storage';
import { WorkoutLog } from '@/src/types/workout';
import { useFocusEffect } from 'expo-router';

export default function HistoryScreen() {
  const { colors, theme } = useTheme();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});

  useFocusEffect(
    React.useCallback(() => {
      loadLogs();
    }, [])
  );

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const savedLogs = await storage.getItem('workoutLogs', []) as WorkoutLog[];
    setLogs(savedLogs);
    
    // Create marked dates for calendar
    const marked: any = {};
    savedLogs.forEach(log => {
      const dateKey = log.date.split('T')[0];
      marked[dateKey] = {
        marked: true,
        dotColor: colors.primary,
        selected: dateKey === selectedDate,
        selectedColor: colors.primary,
      };
    });
    
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      };
    }
    
    setMarkedDates(marked);
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    const log = logs.find(l => l.date.startsWith(day.dateString));
    if (log) {
      setSelectedLog(log);
      setShowDetailModal(true);
    }
  };

  const getRecentLogs = () => {
    return logs
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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

      const diffDays = Math.floor(
        (currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const getMonthlyStats = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyLogs = logs.filter(
      log => new Date(log.date) >= firstDayOfMonth
    );
    return monthlyLogs.length;
  };

  const currentStreak = calculateStreak();
  const monthlyWorkouts = getMonthlyStats();
  const totalWorkouts = logs.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>History</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="flame" size={32} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{currentStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="calendar" size={32} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{monthlyWorkouts}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Month</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="trophy" size={32} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{totalWorkouts}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={[styles.calendarContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout Calendar</Text>
          <Calendar
            theme={{
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.textSecondary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textSecondary,
              dotColor: colors.primary,
              selectedDotColor: '#FFFFFF',
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
            }}
            markedDates={markedDates}
            onDayPress={handleDayPress}
            markingType='dot'
          />
        </View>

        {/* Recent Workouts */}
        <View style={styles.recentSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Workouts</Text>
          {getRecentLogs().length > 0 ? (
            getRecentLogs().map(log => (
              <TouchableOpacity
                key={log.id}
                style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setSelectedLog(log);
                  setShowDetailModal(true);
                }}
              >
                <View style={styles.logHeader}>
                  <View>
                    <Text style={[styles.logTitle, { color: colors.text }]}>{log.dayName}</Text>
                    <Text style={[styles.logDate, { color: colors.textSecondary }]}>
                      {formatDate(log.date)} • {formatTime(log.date)}
                    </Text>
                  </View>
                  {log.completed && (
                    <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={[styles.logFocus, { color: colors.primary }]}>{log.focus}</Text>
                <Text style={[styles.logExercises, { color: colors.textSecondary }]}>
                  {log.exercises.length} exercises
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No workout history yet.
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Complete workouts to see them here!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Workout Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedLog?.dayName}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView style={styles.modalBody}>
                <Text style={[styles.modalDate, { color: colors.textSecondary }]}>
                  {formatDate(selectedLog.date)} • {formatTime(selectedLog.date)}
                </Text>
                <View style={[styles.modalFocusBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                  <Text style={[styles.modalFocusText, { color: colors.primary }]}>
                    {selectedLog.focus}
                  </Text>
                </View>

                <View style={styles.exercisesList}>
                  {selectedLog.exercises.map((exercise, index) => (
                    <View
                      key={`${exercise.exerciseId}-${index}`}
                      style={[styles.exerciseItem, { borderBottomColor: colors.border }]}
                    >
                      <View style={styles.exerciseNumber}>
                        <Text style={[styles.exerciseNumberText, { color: colors.primary }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.exerciseDetails}>
                        <Text style={[styles.exerciseName, { color: colors.text }]}>
                          {exercise.name}
                        </Text>
                        <Text style={[styles.exerciseStats, { color: colors.textSecondary }]}>
                          {exercise.sets} sets × {exercise.reps} reps
                          {exercise.weight && ` @ ${exercise.weight}kg`}
                        </Text>
                        {exercise.notes && (
                          <Text style={[styles.exerciseNotes, { color: colors.textSecondary }]}>
                            {exercise.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  calendarContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recentSection: {
    padding: 16,
  },
  logCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logDate: {
    fontSize: 13,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logFocus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  logExercises: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalDate: {
    fontSize: 14,
    marginBottom: 12,
  },
  modalFocusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalFocusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exercisesList: {
    gap: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseStats: {
    fontSize: 14,
    marginBottom: 4,
  },
  exerciseNotes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
