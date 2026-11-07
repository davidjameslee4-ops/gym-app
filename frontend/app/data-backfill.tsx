import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { onDataChanged } from '@/src/utils/dataEvents';
import {
  applyBackfill,
  BackfillPlan,
  countBackfilled,
  DEFAULT_START,
  formatDMY,
  loadActiveProgram,
  parseDateText,
  planBackfill,
  removeBackfilled,
  shortDate,
  yesterdayLocal,
} from '@/src/utils/backfill';
import { storage } from '@/src/utils/storage';
import { WorkoutLog, WorkoutProgram } from '@/src/types/workout';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function FillHistoryScreen() {
  const { colors } = useTheme();
  const [fromText, setFromText] = useState(formatDMY(DEFAULT_START));
  const [toText, setToText] = useState(formatDMY(yesterdayLocal()));
  const [program, setProgram] = useState<WorkoutProgram | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [filledCount, setFilledCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = async () => {
    setProgram(await loadActiveProgram());
    setLogs(((await storage.getItem('workoutLogs', null)) as unknown as WorkoutLog[] | null) || []);
    setFilledCount(await countBackfilled());
  };

  useEffect(() => {
    load();
    return onDataChanged(load);
  }, []);

  const from = parseDateText(fromText);
  const to = parseDateText(toText);
  const yesterday = yesterdayLocal();

  // Plain-words check of the two dates, then the plan they would produce.
  const problem = useMemo(() => {
    if (!from) return 'Type the start date like 1/1/2026.';
    if (!to) return 'Type the end date like 6/11/2026.';
    if (from > to) return 'The start date is after the end date.';
    if (to >= new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1))
      return 'The end date can be yesterday at the latest. Today\'s workout is yours to tap.';
    return null;
  }, [fromText, toText]);

  const plan: BackfillPlan | null = useMemo(() => {
    if (problem || !from || !to || !program) return null;
    return planBackfill(program, logs, from, to);
  }, [problem, program, logs, fromText, toText]);

  const previewText = plan
    ? plan.entries.length === 0
      ? `Nothing to add from ${shortDate(from!)} to ${shortDate(to!)}: every scheduled workout day in that range already has an entry.`
      : `This will add ${plural(plan.entries.length, 'completed workout', 'completed workouts')} from ${shortDate(from!)} to ${shortDate(to!)}. Existing entries stay as they are.`
    : null;

  const onFill = () => {
    if (!plan || plan.entries.length === 0 || !from || !to) return;
    Alert.alert(
      'Fill in past history?',
      `${previewText}\n\nYour current data is kept as a safety copy first. You can remove these entries at the bottom of this screen at any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fill in',
          onPress: async () => {
            setBusy(true);
            try {
              const added = await applyBackfill(from, to);
              await load();
              setDone(`Added ${plural(added, 'completed workout', 'completed workouts')}. Home, History and Progress now show the run.`);
              Alert.alert('Done', `Added ${plural(added, 'completed workout', 'completed workouts')}.\n\nHome, History and Progress now show the run.`);
            } catch (e: any) {
              Alert.alert('Nothing was added', e?.message || 'Something went wrong, so nothing changed.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const onRemove = () => {
    if (filledCount === 0) return;
    Alert.alert(
      'Remove the filled-in workouts?',
      `This removes the ${plural(filledCount, 'workout', 'workouts')} added by Fill in past history. Everything you logged yourself stays.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const removed = await removeBackfilled();
              await load();
              setDone(null);
              Alert.alert('Removed', `Removed ${plural(removed, 'filled-in workout', 'filled-in workouts')}.`);
            } catch (e: any) {
              Alert.alert('Nothing was removed', e?.message || 'Something went wrong, so nothing changed.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings'))}
          style={styles.back}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Fill in past history</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.lead, { color: colors.text }]}>
          Marks every workout day in the range as done, using your weekly schedule. Use it for days you trained but did not tap Mark as Complete.
        </Text>
        <Text style={[styles.small, { color: colors.textSecondary }]}>
          It can't add weights or sets, so those days show as done without exercise details. Days you already logged are not changed.
        </Text>

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>From</Text>
            <TextInput
              testID="backfill-from"
              value={fromText}
              onChangeText={setFromText}
              placeholder="1/1/2026"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>To</Text>
            <TextInput
              testID="backfill-to"
              value={toText}
              onChangeText={setToText}
              placeholder="dd/mm/yyyy"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            />
          </View>
        </View>

        {problem ? (
          <Text testID="backfill-problem" style={[styles.body, { color: colors.error }]}>{problem}</Text>
        ) : null}

        {previewText ? (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text testID="backfill-preview" style={[styles.body, { color: colors.text }]}>{previewText}</Text>
            {plan && plan.alreadyLogged > 0 ? (
              <Text style={[styles.small, { color: colors.textSecondary }]}>
                {plural(plan.alreadyLogged, 'day', 'days')} already logged, left as they are.
              </Text>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          testID="backfill-fill"
          disabled={!plan || plan.entries.length === 0 || busy}
          onPress={onFill}
          style={[
            styles.button,
            { backgroundColor: colors.primary, opacity: plan && plan.entries.length > 0 && !busy ? 1 : 0.5 },
          ]}
        >
          <Text style={styles.buttonText}>Fill in past history</Text>
        </TouchableOpacity>

        {done ? (
          <Text testID="backfill-done" style={[styles.small, { color: colors.success }]}>{done}</Text>
        ) : null}

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Undo</Text>
          <Text testID="backfill-count" style={[styles.body, { color: colors.text }]}>
            {filledCount === 0
              ? 'No filled-in workouts on this phone.'
              : `${plural(filledCount, 'filled-in workout is', 'filled-in workouts are')} on this phone.`}
          </Text>
          <TouchableOpacity
            testID="backfill-remove"
            disabled={filledCount === 0 || busy}
            onPress={onRemove}
            style={[styles.buttonOutline, { borderColor: colors.error, opacity: filledCount > 0 && !busy ? 1 : 0.5 }]}
          >
            <Text style={[styles.buttonOutlineText, { color: colors.error }]}>Undo / remove filled-in workouts</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  back: { paddingRight: 8, paddingVertical: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 48 },
  lead: { fontSize: 16, lineHeight: 22, marginBottom: 8 },
  small: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 21, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 12, marginVertical: 12 },
  field: { flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginVertical: 10 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginVertical: 10 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonOutline: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonOutlineText: { fontSize: 15, fontWeight: '600' },
});
