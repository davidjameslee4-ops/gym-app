import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import {
  applyImport,
  parseImportText,
  ParsedImport,
  readSafetyInfo,
  SafetyInfo,
  undoLastImport,
} from '@/src/utils/dataTransfer';
import { describeSummary } from '@/src/utils/dataSummary';

const dateWords = (iso: string | null) => {
  if (!iso) return 'an unknown date';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'an unknown date' : d.toLocaleString();
};

export default function ImportDataScreen() {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [safety, setSafety] = useState<SafetyInfo | null>(null);

  useEffect(() => {
    readSafetyInfo().then(setSafety);
  }, []);

  const onChange = (value: string) => {
    setText(value);
    setParsed(null);
    setError(null);
  };

  const onCheck = () => {
    try {
      setParsed(parseImportText(text));
      setError(null);
    } catch (e: any) {
      setParsed(null);
      setError(e?.message || 'That couldn\'t be read.');
    }
  };

  const finish = (title: string, message: string) => {
    setText('');
    setParsed(null);
    readSafetyInfo().then(setSafety);
    // Home and the other tabs reload their data when they come into view.
    router.replace('/(tabs)');
    Alert.alert(title, message);
  };

  const onReplace = () => {
    if (!parsed) return;
    const summary = describeSummary(parsed.summary);
    Alert.alert(
      'Replace the data on this phone?',
      `This replaces everything on this phone with:\n${summary}\n\nWhat's here now is kept as a safety copy, so you can undo it below.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await applyImport(parsed.data);
              finish('Imported', `${summary}\n\nHome, Schedule, History and Progress now show it. You can undo this at the bottom of Import data.`);
            } catch (e: any) {
              setError(e?.message || 'The import didn\'t work, so nothing changed.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const onUndo = () => {
    if (!safety) return;
    Alert.alert(
      'Undo the last import?',
      `This puts back the data from before the import (saved ${dateWords(safety.savedAt)}):\n${describeSummary(safety.summary)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await undoLastImport();
              finish('Undone', 'The data from before the import is back.');
            } catch (e: any) {
              setError(e?.message || 'Couldn\'t undo.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const pickFile = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt,application/json,text/plain';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        onChange(await file.text());
      } catch {
        setError('Couldn\'t open that file.');
      }
    };
    input.click();
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Import data</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.lead, { color: colors.text }]}>
          On your other phone: Settings, then Export, then Copy. Come back here, paste it below, and check it.
        </Text>
        <Text style={[styles.small, { color: colors.textSecondary }]}>
          Importing replaces the data on this phone. Your current data is kept as a safety copy first.
        </Text>

        <TextInput
          testID="import-box"
          value={text}
          onChangeText={onChange}
          placeholder="Paste your exported data here"
          placeholderTextColor={colors.textSecondary}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="top"
          style={[
            styles.box,
            { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        />

        {Platform.OS === 'web' ? (
          <TouchableOpacity
            testID="import-choose-file"
            onPress={pickFile}
            style={[styles.buttonOutline, { borderColor: colors.primary }]}
          >
            <Ionicons name="document-outline" size={20} color={colors.primary} />
            <Text style={[styles.buttonOutlineText, { color: colors.primary }]}>Choose file</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          testID="import-check"
          disabled={!text.trim() || busy}
          onPress={onCheck}
          style={[styles.button, { backgroundColor: colors.primary, opacity: text.trim() && !busy ? 1 : 0.5 }]}
        >
          <Text style={styles.buttonText}>Check the data</Text>
        </TouchableOpacity>

        {error ? (
          <View style={[styles.card, { borderColor: colors.error, backgroundColor: colors.surface }]}>
            <Text testID="import-error" style={[styles.body, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        {parsed ? (
          <View style={[styles.card, { borderColor: colors.success, backgroundColor: colors.surface }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Found in this export</Text>
            <Text testID="import-summary" style={[styles.body, { color: colors.text }]}>
              {describeSummary(parsed.summary)}
            </Text>
            <Text style={[styles.small, { color: colors.textSecondary }]}>
              Exported {dateWords(parsed.summary.exportedAt)}.
            </Text>
            <TouchableOpacity
              testID="import-replace"
              disabled={busy}
              onPress={onReplace}
              style={[styles.button, { backgroundColor: colors.error, marginTop: 6 }]}
            >
              <Text style={styles.buttonText}>Replace my data with this</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {safety ? (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Undo</Text>
            <Text style={[styles.small, { color: colors.text }]}>
              Safety copy from {dateWords(safety.savedAt)}: {describeSummary(safety.summary)}
            </Text>
            <TouchableOpacity
              testID="import-undo"
              disabled={busy}
              onPress={onUndo}
              style={[styles.buttonOutline, { borderColor: colors.primary, marginTop: 6 }]}
            >
              <Ionicons name="arrow-undo-outline" size={20} color={colors.primary} />
              <Text style={[styles.buttonOutlineText, { color: colors.primary }]}>Undo last import</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  back: { padding: 4, marginRight: 4 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  content: { padding: 16, gap: 14 },
  lead: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  box: {
    minHeight: 180,
    maxHeight: 320,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 8 },
  cardLabel: { fontSize: 13, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  buttonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  buttonOutlineText: { fontSize: 16, fontWeight: '700' },
});
