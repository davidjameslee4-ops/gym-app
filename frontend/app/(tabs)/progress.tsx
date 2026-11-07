import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { storage } from '@/src/utils/storage';
import {
  BodyMeasurementEntry,
  BodyMeasurementValues,
  UserProfile,
  WeightEntry,
  WorkoutLog,
} from '@/src/types/workout';
import { useFocusEffect } from 'expo-router';
import { loadStreak, StreakResult } from '@/src/utils/streak';
import BodyLineChart from '@/src/components/BodyLineChart';
import {
  MEASUREMENTS,
  MEASUREMENTS_KEY,
  MeasureKey,
  RANGES,
  RangeKey,
  describeMeasurements,
  formatChange,
  formatDay,
  formatValue,
  latestMeasurementValues,
  latestWeight,
  measurePoints,
  readNumberField,
  summarize,
  weightPoints,
} from '@/src/utils/bodyStats';

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export default function ProgressScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [measureEntries, setMeasureEntries] = useState<BodyMeasurementEntry[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [streak, setStreak] = useState<StreakResult>({ current: 0, longest: 0, today: 'pending' });

  // weigh-in modal: add (editingWeight null) or edit
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null);
  const [newWeight, setNewWeight] = useState('');
  const [weightError, setWeightError] = useState('');

  // measurements modal
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<BodyMeasurementEntry | null>(null);
  const [measureForm, setMeasureForm] = useState<Record<MeasureKey, string>>({
    chest: '', waist: '', hips: '', neck: '', arm: '', thigh: '',
  });
  const [measureError, setMeasureError] = useState('');

  // chart choices
  const [weightRange, setWeightRange] = useState<RangeKey>('all');
  const [measureRange, setMeasureRange] = useState<RangeKey>('all');
  const [measureKey, setMeasureKey] = useState<MeasureKey>('waist');
  const [showAllWeights, setShowAllWeights] = useState(false);
  const [showAllMeasures, setShowAllMeasures] = useState(false);

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
    const savedMeasures = await storage.getItem(MEASUREMENTS_KEY, []) as BodyMeasurementEntry[];
    const savedLogs = await storage.getItem('workoutLogs', []) as WorkoutLog[];

    setProfile(savedProfile);
    setWeightEntries(Array.isArray(savedWeights) ? savedWeights : []);
    setMeasureEntries(Array.isArray(savedMeasures) ? savedMeasures : []);
    setLogs(savedLogs);
    setStreak(await loadStreak());
  };

  // ---- weigh-ins ----

  const openAddWeight = () => {
    setEditingWeight(null);
    setNewWeight('');
    setWeightError('');
    setShowWeightModal(true);
  };

  const openEditWeight = (entry: WeightEntry) => {
    setEditingWeight(entry);
    setNewWeight(String(entry.weight).replace('.', ','));
    setWeightError('');
    setShowWeightModal(true);
  };

  const closeWeightModal = () => {
    setNewWeight('');
    setWeightError('');
    setEditingWeight(null);
    setShowWeightModal(false);
  };

  // Keep the profile's current weight in step with the newest weigh-in, as adding one always did.
  const syncCurrentWeight = async (updated: WeightEntry[]) => {
    if (!profile) return;
    const latest = latestWeight(updated);
    if (!latest || latest.weight === profile.currentWeight) return;
    const updatedProfile = { ...profile, currentWeight: latest.weight };
    await storage.setItem('userProfile', updatedProfile);
    setProfile(updatedProfile);
  };

  const saveWeight = async () => {
    const field = readNumberField(newWeight);
    if (field.kind === 'empty') {
      setWeightError('Type your weight first, like 82,5.');
      return;
    }
    if (field.kind === 'bad') {
      setWeightError("That isn't a weight I can read. Use digits, like 82,5 or 82.5.");
      return;
    }

    if (editingWeight) {
      const wasLatest = latestWeight(weightEntries)?.id === editingWeight.id;
      const updated = weightEntries.map(e =>
        e.id === editingWeight.id ? { ...e, weight: field.value } : e
      );
      await storage.setItem('weightEntries', updated);
      setWeightEntries(updated);
      if (wasLatest) await syncCurrentWeight(updated);
    } else {
      const entry: WeightEntry = {
        id: `weight-${Date.now()}`,
        date: new Date().toISOString(),
        weight: field.value,
      };
      const updated = [...weightEntries, entry];
      await storage.setItem('weightEntries', updated);
      setWeightEntries(updated);
      await syncCurrentWeight(updated);
    }
    closeWeightModal();
  };

  const deleteWeight = (entry: WeightEntry) => {
    Alert.alert(
      'Delete this weigh-in?',
      `${formatDay(entry.date)}: ${formatValue(entry.weight)} ${profile?.weightUnit || 'kg'}. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const wasLatest = latestWeight(weightEntries)?.id === entry.id;
            const updated = weightEntries.filter(e => e.id !== entry.id);
            await storage.setItem('weightEntries', updated);
            setWeightEntries(updated);
            if (wasLatest) await syncCurrentWeight(updated);
            closeWeightModal();
          },
        },
      ]
    );
  };

  // ---- body measurements ----

  const fieldsFrom = (values: BodyMeasurementValues): Record<MeasureKey, string> => {
    const out = { chest: '', waist: '', hips: '', neck: '', arm: '', thigh: '' } as Record<MeasureKey, string>;
    MEASUREMENTS.forEach(m => {
      const v = values[m.key];
      if (typeof v === 'number') out[m.key] = String(v).replace('.', ',');
    });
    return out;
  };

  const openAddMeasure = () => {
    setEditingMeasure(null);
    // Pre-fill with the last value of each measurement, so only changes need typing.
    setMeasureForm(fieldsFrom(latestMeasurementValues(measureEntries)));
    setMeasureError('');
    setShowMeasureModal(true);
  };

  const openEditMeasure = (entry: BodyMeasurementEntry) => {
    setEditingMeasure(entry);
    setMeasureForm(fieldsFrom(entry.values || {}));
    setMeasureError('');
    setShowMeasureModal(true);
  };

  const closeMeasureModal = () => {
    setEditingMeasure(null);
    setMeasureError('');
    setShowMeasureModal(false);
  };

  const saveMeasure = async () => {
    const values: BodyMeasurementValues = {};
    for (const m of MEASUREMENTS) {
      const field = readNumberField(measureForm[m.key]);
      if (field.kind === 'bad') {
        setMeasureError(`${m.label} isn't a number I can read. Use digits, like 84,5.`);
        return;
      }
      if (field.kind === 'ok') values[m.key] = field.value;
    }
    if (!Object.keys(values).length) {
      setMeasureError('Type at least one measurement, or tap Cancel.');
      return;
    }

    if (editingMeasure) {
      const updated = measureEntries.map(e => (e.id === editingMeasure.id ? { ...e, values } : e));
      await storage.setItem(MEASUREMENTS_KEY, updated);
      setMeasureEntries(updated);
    } else {
      const entry: BodyMeasurementEntry = {
        id: newId('measure'),
        date: new Date().toISOString(),
        values,
      };
      const updated = [...measureEntries, entry];
      await storage.setItem(MEASUREMENTS_KEY, updated);
      setMeasureEntries(updated);
    }
    closeMeasureModal();
  };

  const deleteMeasure = (entry: BodyMeasurementEntry) => {
    Alert.alert(
      'Delete these measurements?',
      `${formatDay(entry.date)}: ${describeMeasurements(entry.values)}. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = measureEntries.filter(e => e.id !== entry.id);
            await storage.setItem(MEASUREMENTS_KEY, updated);
            setMeasureEntries(updated);
            closeMeasureModal();
          },
        },
      ]
    );
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

  // ---- body charts ----
  const unit = profile?.weightUnit || 'kg';
  const now = Date.now();
  const goal = profile && profile.goalWeight > 0 ? profile.goalWeight : undefined;

  const weightPts = weightPoints(weightEntries, weightRange, now);
  const weightSum = summarize(weightPts);
  const measurePts = measurePoints(measureEntries, measureKey, measureRange, now);
  const measureSum = summarize(measurePts);
  const measureLabel = MEASUREMENTS.find(m => m.key === measureKey)?.label || '';

  const newestWeights = [...weightEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const newestMeasures = [...measureEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Weight: a fall is green and a rise is red. Measurements are neutral: a bigger arm is not a 'bad' change.
  const changeColor = (v: number | null, neutral: boolean) => {
    if (v === null || v === 0 || neutral) return colors.text;
    const good = v < 0;
    return good ? colors.success : colors.primary;
  };

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.chip,
        { borderColor: colors.border, backgroundColor: active ? colors.primary : colors.background },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>{label}</Text>
    </Pressable>
  );

  const StatCell = ({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) => (
    <View style={styles.weightStat}>
      <Text style={[styles.weightStatLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.weightStatValue, { color: valueColor || colors.text }]}>{value}</Text>
    </View>
  );

  const PillButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, { backgroundColor: colors.primary }]}
      accessibilityRole="button"
    >
      <Ionicons name="add" size={16} color="#FFFFFF" />
      <Text style={styles.pillText}>{label}</Text>
    </TouchableOpacity>
  );

  const renderWeightSection = () => {
    if (!weightEntries.length) {
      return (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No weigh-ins yet. Tap + Log weight, and the chart fills in as you add more.
        </Text>
      );
    }
    return (
      <>
        <View style={styles.chipRow}>
          {RANGES.map(r => (
            <Chip key={r.key} label={r.label} active={weightRange === r.key} onPress={() => setWeightRange(r.key)} />
          ))}
        </View>

        {weightPts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No weigh-ins in the last {weightRange === '30' ? '30' : '90'} days. Pick All to see them.
          </Text>
        ) : (
          <>
            <View style={styles.weightStats}>
              <StatCell label="Start" value={`${formatValue(weightSum.start as number)} ${unit}`} />
              <StatCell label="Latest" value={`${formatValue(weightSum.latest as number)} ${unit}`} />
              <StatCell
                label="Change"
                value={weightSum.change === null ? '—' : `${formatChange(weightSum.change)} ${unit}`}
                valueColor={changeColor(weightSum.change, false)}
              />
            </View>
            <BodyLineChart points={weightPts} unit={unit} goal={goal} colors={colors} />
          </>
        )}

        <Text style={[styles.subTitle, { color: colors.textSecondary }]}>Weigh-ins, newest first</Text>
        {(showAllWeights ? newestWeights : newestWeights.slice(0, 6)).map(e => (
          <Pressable
            key={e.id}
            onPress={() => openEditWeight(e)}
            style={[styles.listRow, { borderColor: colors.border }]}
            accessibilityRole="button"
          >
            <Text style={[styles.listDate, { color: colors.text }]}>{formatDay(e.date)}</Text>
            <Text style={[styles.listValue, { color: colors.text }]}>
              {formatValue(e.weight)} {unit}
            </Text>
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
        {newestWeights.length > 6 && (
          <TouchableOpacity onPress={() => setShowAllWeights(!showAllWeights)} style={styles.moreButton}>
            <Text style={[styles.moreText, { color: colors.primary }]}>
              {showAllWeights ? 'Show fewer' : `Show all ${newestWeights.length}`}
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  const renderMeasureSection = () => {
    if (!measureEntries.length) {
      return (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No measurements yet. Tap + Measurements to log chest, waist, hips, neck, arm or thigh in cm.
        </Text>
      );
    }
    return (
      <>
        <View style={styles.chipRow}>
          {MEASUREMENTS.map(m => (
            <Chip key={m.key} label={m.label} active={measureKey === m.key} onPress={() => setMeasureKey(m.key)} />
          ))}
        </View>
        <View style={styles.chipRow}>
          {RANGES.map(r => (
            <Chip key={r.key} label={r.label} active={measureRange === r.key} onPress={() => setMeasureRange(r.key)} />
          ))}
        </View>

        {measurePts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No {measureLabel.toLowerCase()} numbers in this range. Pick All to see them, or log one.
          </Text>
        ) : (
          <>
            <View style={styles.weightStats}>
              <StatCell label="Start" value={`${formatValue(measureSum.start as number)} cm`} />
              <StatCell label="Latest" value={`${formatValue(measureSum.latest as number)} cm`} />
              <StatCell
                label="Change"
                value={measureSum.change === null ? '—' : `${formatChange(measureSum.change)} cm`}
                valueColor={changeColor(measureSum.change, true)}
              />
            </View>
            <BodyLineChart points={measurePts} unit="cm" colors={colors} />
          </>
        )}

        <Text style={[styles.subTitle, { color: colors.textSecondary }]}>Entries, newest first</Text>
        {(showAllMeasures ? newestMeasures : newestMeasures.slice(0, 4)).map(e => (
          <Pressable
            key={e.id}
            onPress={() => openEditMeasure(e)}
            style={[styles.listRow, { borderColor: colors.border }]}
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.listDate, { color: colors.text }]}>{formatDay(e.date)}</Text>
              <Text style={[styles.listSmall, { color: colors.textSecondary }]}>
                {describeMeasurements(e.values)}
              </Text>
            </View>
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
        {newestMeasures.length > 4 && (
          <TouchableOpacity onPress={() => setShowAllMeasures(!showAllMeasures)} style={styles.moreButton}>
            <Text style={[styles.moreText, { color: colors.primary }]}>
              {showAllMeasures ? 'Show fewer' : `Show all ${newestMeasures.length}`}
            </Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={openAddWeight}
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

        {/* Body weight */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Body Weight</Text>
            <PillButton label="Log weight" onPress={openAddWeight} />
          </View>
          {renderWeightSection()}
        </View>

        {/* Body measurements */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Measurements</Text>
            <PillButton label="Measurements" onPress={openAddMeasure} />
          </View>
          {renderMeasureSection()}
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

      {/* Weigh-in modal: add or edit */}
      <Modal visible={showWeightModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingWeight ? 'Edit weigh-in' : 'Log Weight'}
            </Text>
            {editingWeight && (
              <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
                {formatDay(editingWeight.date)}
              </Text>
            )}
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder={`Weight (${unit}), e.g. 82,5`}
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={newWeight}
              onChangeText={text => {
                setNewWeight(text);
                setWeightError('');
              }}
            />
            {!!weightError && <Text style={[styles.errorText, { color: colors.error }]}>{weightError}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={closeWeightModal}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={saveWeight}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
            {editingWeight && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteWeight(editingWeight)}>
                <Text style={[styles.deleteText, { color: colors.error }]}>Delete this weigh-in</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Measurements modal: add or edit, all fields optional */}
      <Modal visible={showMeasureModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.measureModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingMeasure ? 'Edit measurements' : 'Add measurements'}
            </Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              {editingMeasure
                ? `${formatDay(editingMeasure.date)}. Fill in what you measured; leave the rest empty.`
                : 'In cm. Only type what you measured; the rest stay empty.'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {MEASUREMENTS.map(m => (
                <View key={m.key} style={styles.measureRow}>
                  <Text style={[styles.measureLabel, { color: colors.text }]}>{m.label}</Text>
                  <View style={styles.measureInputWrap}>
                    <TextInput
                      style={[styles.measureInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      placeholder="—"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      value={measureForm[m.key]}
                      onChangeText={text => {
                        setMeasureForm({ ...measureForm, [m.key]: text });
                        setMeasureError('');
                      }}
                    />
                    <Text style={[styles.measureUnit, { color: colors.textSecondary }]}>cm</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            {!!measureError && <Text style={[styles.errorText, { color: colors.error }]}>{measureError}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={closeMeasureModal}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={saveMeasure}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
            {editingMeasure && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteMeasure(editingMeasure)}>
                <Text style={[styles.deleteText, { color: colors.error }]}>Delete these measurements</Text>
              </TouchableOpacity>
            )}
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingLeft: 6, paddingRight: 12, paddingVertical: 6, borderRadius: 16,
  },
  pillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  subTitle: { fontSize: 13, marginTop: 16, marginBottom: 6 },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listDate: { fontSize: 15, fontWeight: '600' },
  listValue: { fontSize: 15, marginLeft: 'auto' },
  listSmall: { fontSize: 12, marginTop: 2 },
  moreButton: { alignItems: 'center', paddingVertical: 10 },
  moreText: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 14, lineHeight: 20, paddingVertical: 12 },
  errorText: { fontSize: 13, marginBottom: 8 },
  modalHint: { fontSize: 13, marginTop: -8, marginBottom: 12 },
  deleteButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  deleteText: { fontSize: 15, fontWeight: '600' },
  measureModal: { maxHeight: '90%' },
  measureRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  measureLabel: { fontSize: 16, flex: 1 },
  measureInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 150 },
  measureInput: {
    flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, textAlign: 'right',
  },
  measureUnit: { fontSize: 14, width: 24 },
});
