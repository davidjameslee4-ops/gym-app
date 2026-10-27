import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import {
  loadExerciseLibrary,
  addExerciseToLibrary,
  removeExerciseFromLibrary,
} from '@/src/utils/exerciseLibrary';

interface Props {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

/**
 * A tappable "Exercise Name" field. Tapping it opens a searchable list of saved
 * exercises; typing a name that isn't there offers to add it, and new names are
 * remembered for next time. Long-press a name to remove it from the list.
 */
export default function ExercisePicker({ value, onChange, placeholder = 'Select exercise' }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const searchRef = useRef<TextInput>(null);

  const refresh = async () => setLibrary(await loadExerciseLibrary());

  useEffect(() => {
    if (open) {
      refresh();
      setQuery('');
      setAdding(false);
      setNewName('');
    }
  }, [open]);

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase();
    return q ? library.filter(n => n.toLowerCase().includes(q)) : library;
  }, [library, trimmed]);
  const exactMatch = library.some(n => n.toLowerCase() === trimmed.toLowerCase());

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const addAndChoose = async (name: string) => {
    const clean = await addExerciseToLibrary(name);
    if (!clean) return;
    await refresh();
    choose(clean);
  };

  const confirmRemove = (name: string) => {
    const doRemove = async () => {
      await removeExerciseFromLibrary(name);
      await refresh();
    };
    const msg = `Remove "${name}" from your exercise list? Workouts that already use it won't change.`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(msg)) doRemove();
      return;
    }
    Alert.alert('Remove exercise', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: doRemove },
    ]);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.field, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.fieldText, { color: value ? colors.text : colors.textSecondary }]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.primary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Choose exercise</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {adding ? (
              <View>
                <TextInput
                  style={[styles.search, { backgroundColor: colors.background, color: colors.text, borderColor: colors.primary }]}
                  placeholder="New exercise name"
                  placeholderTextColor={colors.textSecondary}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={() => addAndChoose(newName)}
                />
                <View style={styles.addActions}>
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.border }]}
                    onPress={() => setAdding(false)}
                  >
                    <Text style={[styles.addButtonText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary, opacity: newName.trim() ? 1 : 0.5 }]}
                    disabled={!newName.trim()}
                    onPress={() => addAndChoose(newName)}
                  >
                    <Text style={[styles.addButtonText, { color: '#FFFFFF' }]}>Save exercise</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  {'It\'ll be saved to your list for next time.'}
                </Text>
              </View>
            ) : (
              <>
                <View style={[styles.searchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="search" size={18} color={colors.textSecondary} />
                  <TextInput
                    ref={searchRef}
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search exercises"
                    placeholderTextColor={colors.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (trimmed && !exactMatch) addAndChoose(trimmed);
                      else if (filtered.length === 1) choose(filtered[0]);
                    }}
                  />
                  {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {trimmed && !exactMatch ? (
                  <TouchableOpacity
                    style={[styles.addRow, { borderColor: colors.primary }]}
                    onPress={() => addAndChoose(trimmed)}
                  >
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                    <Text style={[styles.addRowText, { color: colors.primary }]} numberOfLines={1}>
                      {`Add "${trimmed}"`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.addRow, { borderColor: colors.primary }]}
                    onPress={() => setAdding(true)}
                  >
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                    <Text style={[styles.addRowText, { color: colors.primary }]}>Add new exercise</Text>
                  </TouchableOpacity>
                )}

                <FlatList
                  data={filtered}
                  keyExtractor={item => item}
                  keyboardShouldPersistTaps="handled"
                  style={styles.list}
                  ListEmptyComponent={
                    <Text style={[styles.empty, { color: colors.textSecondary }]}>No saved exercise matches.</Text>
                  }
                  renderItem={({ item }) => {
                    const selected = item.toLowerCase() === value.trim().toLowerCase();
                    return (
                      <TouchableOpacity
                        style={[
                          styles.item,
                          { borderBottomColor: colors.border },
                          selected && { backgroundColor: colors.primary + '22' },
                        ]}
                        onPress={() => choose(item)}
                        onLongPress={() => confirmRemove(item)}
                        delayLongPress={450}
                      >
                        <Text
                          style={[
                            styles.itemText,
                            { color: selected ? colors.primary : colors.text },
                            selected && { fontWeight: '700' },
                          ]}
                        >
                          {item}
                        </Text>
                        {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  }}
                />
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Long-press an exercise to remove it from the list.
                </Text>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    height: '80%',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  search: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  addRowText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  list: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  itemText: {
    fontSize: 16,
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  addActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  addButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
