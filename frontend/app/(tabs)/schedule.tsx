import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { storage } from '@/src/utils/storage';
import { WorkoutProgram, WorkoutDay, Exercise } from '@/src/types/workout';
import { DEFAULT_WORKOUT_PROGRAM } from '@/src/constants/defaultWorkout';
import { useFocusEffect } from 'expo-router';
import ExercisePicker from '@/src/components/ExercisePicker';

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [activeProgram, setActiveProgram] = useState<WorkoutProgram | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingFocusDayId, setEditingFocusDayId] = useState<string | null>(null);
  const [focusInput, setFocusInput] = useState('');
  // Exercise currently selected for reordering (tap an exercise to select it)
  const [movingExerciseId, setMovingExerciseId] = useState<string | null>(null);
  
  // Form states
  const [programName, setProgramName] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseSets, setExerciseSets] = useState('3');
  const [exerciseReps, setExerciseReps] = useState('10-12');
  const [exerciseWeight, setExerciseWeight] = useState('');
  const [exerciseNotes, setExerciseNotes] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadPrograms();
    }, [])
  );

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    let savedPrograms = await storage.getItem('workoutPrograms', null) as WorkoutProgram[] | null;
    
    if (!savedPrograms || savedPrograms.length === 0) {
      savedPrograms = [DEFAULT_WORKOUT_PROGRAM];
      await storage.setItem('workoutPrograms', savedPrograms);
    }
    
    setPrograms(savedPrograms);
    const active = savedPrograms.find(p => p.isActive) || savedPrograms[0];
    setActiveProgram(active);
  };

  const savePrograms = async (updatedPrograms: WorkoutProgram[]) => {
    await storage.setItem('workoutPrograms', updatedPrograms);
    setPrograms(updatedPrograms);
    const active = updatedPrograms.find(p => p.isActive) || updatedPrograms[0];
    setActiveProgram(active);
  };

  const handleAddProgram = async () => {
    if (!programName.trim()) {
      Alert.alert('Error', 'Please enter a program name');
      return;
    }

    const newProgram: WorkoutProgram = {
      id: `program-${Date.now()}`,
      name: programName,
      isActive: false,
      createdAt: new Date().toISOString(),
      days: [
        { id: `day-${Date.now()}-0`, name: 'Day 1', focus: 'Full Body', exercises: [] },
      ],
    };

    const updatedPrograms = [...programs, newProgram];
    await savePrograms(updatedPrograms);
    setProgramName('');
    setShowProgramModal(false);
  };

  const handleSwitchProgram = async (programId: string) => {
    const updatedPrograms = programs.map(p => ({
      ...p,
      isActive: p.id === programId,
    }));
    await savePrograms(updatedPrograms);
  };

  const handleDeleteProgram = async (programId: string) => {
    if (programs.length === 1) {
      Alert.alert('Error', 'Cannot delete the last program');
      return;
    }

    Alert.alert(
      'Delete Program',
      'Are you sure you want to delete this program?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedPrograms = programs.filter(p => p.id !== programId);
            if (updatedPrograms.length > 0 && activeProgram?.id === programId) {
              updatedPrograms[0].isActive = true;
            }
            await savePrograms(updatedPrograms);
          },
        },
      ]
    );
  };

  const handleDuplicateProgram = async (program: WorkoutProgram) => {
    const newProgram: WorkoutProgram = {
      ...program,
      id: `program-${Date.now()}`,
      name: `${program.name} (Copy)`,
      isActive: false,
      createdAt: new Date().toISOString(),
    };
    const updatedPrograms = [...programs, newProgram];
    await savePrograms(updatedPrograms);
  };

  const handleAddExercise = async () => {
    if (!exerciseName.trim() || !selectedDay) return;

    const newExercise: Exercise = {
      id: `exercise-${Date.now()}`,
      name: exerciseName,
      sets: parseInt(exerciseSets) || 3,
      reps: exerciseReps,
      weight: exerciseWeight ? parseFloat(exerciseWeight) : undefined,
      notes: exerciseNotes,
    };

    const updatedPrograms = programs.map(p => {
      if (p.id === activeProgram?.id) {
        return {
          ...p,
          days: p.days.map(d => {
            if (d.id === selectedDay.id) {
              return {
                ...d,
                exercises: editingExercise
                  ? d.exercises.map(e => e.id === editingExercise.id ? { ...newExercise, id: e.id } : e)
                  : [...d.exercises, newExercise],
              };
            }
            return d;
          }),
        };
      }
      return p;
    });

    await savePrograms(updatedPrograms);
    resetExerciseForm();
  };

  const handleDeleteExercise = async (dayId: string, exerciseId: string) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedPrograms = programs.map(p => {
              if (p.id === activeProgram?.id) {
                return {
                  ...p,
                  days: p.days.map(d => {
                    if (d.id === dayId) {
                      return {
                        ...d,
                        exercises: d.exercises.filter(e => e.id !== exerciseId),
                      };
                    }
                    return d;
                  }),
                };
              }
              return p;
            });
            await savePrograms(updatedPrograms);
          },
        },
      ]
    );
  };

  const handleMoveExercise = async (dayId: string, exerciseId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const updatedPrograms = programs.map(p => {
      if (p.id !== activeProgram?.id) return p;
      return {
        ...p,
        days: p.days.map(d => {
          if (d.id !== dayId) return d;
          const from = d.exercises.findIndex(e => e.id === exerciseId);
          if (from === -1) return d;
          const last = d.exercises.length - 1;
          let to = from;
          if (direction === 'up') to = Math.max(0, from - 1);
          if (direction === 'down') to = Math.min(last, from + 1);
          if (direction === 'top') to = 0;
          if (direction === 'bottom') to = last;
          if (to === from) return d;
          const exercises = [...d.exercises];
          const [moved] = exercises.splice(from, 1);
          exercises.splice(to, 0, moved);
          return { ...d, exercises };
        }),
      };
    });
    await savePrograms(updatedPrograms);
  };

  const resetExerciseForm = () => {
    setExerciseName('');
    setExerciseSets('3');
    setExerciseReps('10-12');
    setExerciseWeight('');
    setExerciseNotes('');
    setEditingExercise(null);
    setShowExerciseModal(false);
  };

  const openEditExercise = (day: WorkoutDay, exercise: Exercise) => {
    setSelectedDay(day);
    setEditingExercise(exercise);
    setExerciseName(exercise.name);
    setExerciseSets(exercise.sets.toString());
    setExerciseReps(exercise.reps);
    setExerciseWeight(exercise.weight?.toString() || '');
    setExerciseNotes(exercise.notes || '');
    setShowExerciseModal(true);
  };

  const startEditingFocus = (day: WorkoutDay) => {
    setEditingFocusDayId(day.id);
    setFocusInput(day.focus || '');
  };

  const cancelEditingFocus = () => {
    setEditingFocusDayId(null);
    setFocusInput('');
  };

  const saveFocus = async (dayId: string) => {
    const trimmed = focusInput.trim();
    if (!trimmed) {
      Alert.alert('Invalid Input', 'Muscle groups cannot be empty. Enter a value or cancel.');
      return;
    }

    const updatedPrograms = programs.map(p => {
      if (p.id === activeProgram?.id) {
        return {
          ...p,
          days: p.days.map(d => (d.id === dayId ? { ...d, focus: trimmed } : d)),
        };
      }
      return p;
    });

    await savePrograms(updatedPrograms);
    setEditingFocusDayId(null);
    setFocusInput('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Schedule</Text>
        <TouchableOpacity
          testID="schedule-add-program-button"
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowProgramModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Program Selector */}
      <View style={[styles.programSelector, { backgroundColor: colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.programList}>
          {programs.map(program => (
            <TouchableOpacity
              key={program.id}
              style={[
                styles.programChip,
                { borderColor: colors.border },
                program.isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => handleSwitchProgram(program.id)}
              onLongPress={() => {
                Alert.alert(
                  program.name,
                  'Choose an action',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Duplicate', onPress: () => handleDuplicateProgram(program) },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => handleDeleteProgram(program.id),
                    },
                  ]
                );
              }}
            >
              <Text
                style={[
                  styles.programChipText,
                  { color: colors.text },
                  program.isActive && { color: '#FFFFFF' },
                ]}
              >
                {program.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Workout Days */}
      <ScrollView style={styles.daysContainer}>
        {activeProgram?.days.map((day, index) => (
          <View key={day.id} style={[styles.dayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.dayHeader}
              onPress={() => editingFocusDayId === day.id ? undefined : setExpandedDay(expandedDay === day.id ? null : day.id)}
              activeOpacity={editingFocusDayId === day.id ? 1 : 0.7}
            >
              <View style={styles.dayHeaderLeft}>
                <View style={[styles.dayNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.dayNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.dayHeaderTextWrap}>
                  <Text style={[styles.dayName, { color: colors.text }]}>{day.name}</Text>
                  {editingFocusDayId === day.id ? (
                    <View style={styles.focusEditRow}>
                      <TextInput
                        testID={`focus-input-${day.id}`}
                        style={[
                          styles.focusInput,
                          {
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderColor: colors.primary,
                          },
                        ]}
                        value={focusInput}
                        onChangeText={setFocusInput}
                        placeholder="e.g., Chest + Triceps"
                        placeholderTextColor={colors.textSecondary}
                        autoFocus
                        onSubmitEditing={() => saveFocus(day.id)}
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        testID={`focus-save-${day.id}`}
                        style={[styles.focusIconButton, { backgroundColor: colors.success }]}
                        onPress={() => saveFocus(day.id)}
                      >
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID={`focus-cancel-${day.id}`}
                        style={[styles.focusIconButton, { backgroundColor: colors.error }]}
                        onPress={cancelEditingFocus}
                      >
                        <Ionicons name="close" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      testID={`focus-edit-${day.id}`}
                      style={styles.focusDisplayRow}
                      onPress={() => startEditingFocus(day)}
                      activeOpacity={0.6}
                    >
                      <Text
                        style={[
                          styles.dayFocus,
                          {
                            color: day.focus ? colors.textSecondary : colors.textSecondary,
                            fontStyle: day.focus ? 'normal' : 'italic',
                          },
                        ]}
                      >
                        {day.focus || 'No muscle groups assigned'}
                      </Text>
                      <Ionicons
                        name="pencil"
                        size={14}
                        color={colors.primary}
                        style={styles.focusEditIcon}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {editingFocusDayId !== day.id && (
                <View style={styles.dayHeaderRight}>
                  <Text style={[styles.exerciseCount, { color: colors.textSecondary }]}>
                    {day.exercises.length} exercises
                  </Text>
                  <Ionicons
                    name={expandedDay === day.id ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </View>
              )}
            </TouchableOpacity>

            {expandedDay === day.id && (
              <View style={styles.dayContent}>
                {day.exercises.length > 1 && (
                  <Text style={[styles.reorderHint, { color: colors.textSecondary }]}>
                    Tap an exercise to move it up or down
                  </Text>
                )}
                {day.exercises.map((exercise, idx) => {
                  const isMoving = movingExerciseId === exercise.id;
                  const isFirst = idx === 0;
                  const isLast = idx === day.exercises.length - 1;
                  return (
                  <TouchableOpacity
                    key={exercise.id}
                    testID={`exercise-card-${exercise.id}`}
                    activeOpacity={0.7}
                    onPress={() => setMovingExerciseId(isMoving ? null : exercise.id)}
                    style={[
                      styles.exerciseCard,
                      { borderTopColor: colors.border },
                      isMoving && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + '1A',
                        ...styles.exerciseCardSelected,
                      },
                    ]}
                  >
                    <View style={styles.exerciseHeader}>
                      <Text style={[styles.exerciseNumber, { color: colors.primary }]}>#{idx + 1}</Text>
                      <Text style={[styles.exerciseNameText, { color: colors.text }]}>{exercise.name}</Text>
                      {isMoving && (
                        <View style={styles.moveButtons}>
                          {([
                            { dir: 'top', icon: 'play-skip-back', disabled: isFirst, rotate: true },
                            { dir: 'up', icon: 'arrow-up', disabled: isFirst, rotate: false },
                            { dir: 'down', icon: 'arrow-down', disabled: isLast, rotate: false },
                            { dir: 'bottom', icon: 'play-skip-forward', disabled: isLast, rotate: true },
                          ] as const).map(btn => (
                            <TouchableOpacity
                              key={btn.dir}
                              testID={`move-${btn.dir}-${exercise.id}`}
                              accessibilityLabel={`Move ${btn.dir}`}
                              disabled={btn.disabled}
                              onPress={() => handleMoveExercise(day.id, exercise.id, btn.dir)}
                              style={[
                                styles.moveButton,
                                { backgroundColor: btn.disabled ? colors.border : colors.primary },
                              ]}
                            >
                              <Ionicons
                                name={btn.icon}
                                size={18}
                                color="#FFFFFF"
                                style={btn.rotate ? { transform: [{ rotate: '90deg' }] } : undefined}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                    <Text style={[styles.exerciseDetails, { color: colors.textSecondary }]}>
                      {exercise.sets} sets × {exercise.reps}{/min|sec/i.test(exercise.reps) ? '' : ' reps'}
                      {exercise.weight && ` @ ${exercise.weight}kg`}
                    </Text>
                    {exercise.notes && (
                      <Text style={[styles.exerciseNotes, { color: colors.textSecondary }]}>
                        Note: {exercise.notes}
                      </Text>
                    )}
                    <View style={styles.exerciseActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                        onPress={() => openEditExercise(day, exercise)}
                      >
                        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.error }]}
                        onPress={() => handleDeleteExercise(day.id, exercise.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Delete</Text>
                      </TouchableOpacity>
                      {isMoving && (
                        <TouchableOpacity
                          testID={`move-done-${exercise.id}`}
                          style={[styles.actionButton, { backgroundColor: colors.success }]}
                          onPress={() => setMovingExerciseId(null)}
                        >
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[styles.addExerciseButton, { borderColor: colors.primary }]}
                  onPress={() => {
                    setSelectedDay(day);
                    setShowExerciseModal(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                  <Text style={[styles.addExerciseText, { color: colors.primary }]}>Add Exercise</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add Program Modal */}
      <Modal visible={showProgramModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Program</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Program Name"
              placeholderTextColor={colors.textSecondary}
              value={programName}
              onChangeText={setProgramName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setProgramName('');
                  setShowProgramModal(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddProgram}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Exercise Modal */}
      <Modal visible={showExerciseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingExercise ? 'Edit Exercise' : 'Add Exercise'}
            </Text>
            <ScrollView>
              <ExercisePicker value={exerciseName} onChange={setExerciseName} />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.inputHalf, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Sets"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={exerciseSets}
                  onChangeText={setExerciseSets}
                />
                <TextInput
                  style={[styles.inputHalf, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Reps (e.g., 10-12)"
                  placeholderTextColor={colors.textSecondary}
                  value={exerciseReps}
                  onChangeText={setExerciseReps}
                />
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Weight (optional)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={exerciseWeight}
                onChangeText={setExerciseWeight}
              />
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Notes (optional)"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                value={exerciseNotes}
                onChangeText={setExerciseNotes}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={resetExerciseForm}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddExercise}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  {editingExercise ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programSelector: {
    paddingVertical: 12,
  },
  programList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  programChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  programChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  daysContainer: {
    flex: 1,
    padding: 16,
  },
  dayCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayHeaderTextWrap: {
    flex: 1,
  },
  dayFocus: {
    fontSize: 13,
    marginTop: 2,
  },
  focusDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 4,
    gap: 6,
  },
  focusEditIcon: {
    opacity: 0.8,
  },
  focusEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  focusInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    minWidth: 0,
  },
  focusIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseCount: {
    fontSize: 13,
  },
  dayContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  exerciseCard: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  exerciseCardSelected: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginVertical: 4,
  },
  reorderHint: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  moveButtons: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  moveButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  exerciseNameText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  exerciseNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  addExerciseText: {
    fontSize: 15,
    fontWeight: '600',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
