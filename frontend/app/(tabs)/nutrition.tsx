import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { onDataChanged } from '@/src/utils/dataEvents';
import { SECTIONS, MealSection, FoodTag } from '@/src/constants/recipes';
import {
  DEFAULT_EXCLUSIONS,
  EXCLUDE_OPTIONS,
  Exclusions,
  ShownRecipe,
  filterRecipes,
  loadExclusions,
  saveExclusions,
  swapWord,
} from '@/src/utils/foodSwaps';

const SECTION_ICONS: Record<MealSection, keyof typeof Ionicons.glyphMap> = {
  Breakfast: 'sunny',
  Lunch: 'restaurant',
  Dinner: 'moon',
  Snacks: 'nutrition',
};

export default function NutritionScreen() {
  const { colors } = useTheme();
  const [exclusions, setExclusions] = useState<Exclusions>(DEFAULT_EXCLUSIONS);
  const [showFilter, setShowFilter] = useState(false);
  const [customText, setCustomText] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadExclusions().then(setExclusions);
    return onDataChanged(() => {
      loadExclusions().then(setExclusions);
    });
  }, []);

  const update = (next: Exclusions) => {
    setExclusions(next);
    saveExclusions(next);
  };

  const toggleTag = (tag: FoodTag) => {
    const has = exclusions.tags.includes(tag);
    update({ ...exclusions, tags: has ? exclusions.tags.filter(t => t !== tag) : [...exclusions.tags, tag] });
  };

  const addCustom = () => {
    const food = customText.trim();
    if (!food) return;
    if (!exclusions.custom.some(c => c.toLowerCase() === food.toLowerCase())) {
      update({ ...exclusions, custom: [...exclusions.custom, food] });
    }
    setCustomText('');
  };

  const removeCustom = (food: string) =>
    update({ ...exclusions, custom: exclusions.custom.filter(c => c !== food) });

  const { recipes, hidden } = useMemo(() => filterRecipes(exclusions), [exclusions]);

  const excludedLabels = [
    ...EXCLUDE_OPTIONS.filter(o => exclusions.tags.includes(o.tag)).map(o => o.label),
    ...exclusions.custom,
  ];

  const renderRecipe = (r: ShownRecipe) => {
    const open = expanded === r.id;
    return (
      <TouchableOpacity
        key={r.id}
        testID={`recipe-${r.id}`}
        activeOpacity={0.8}
        onPress={() => setExpanded(open ? null : r.id)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: open ? colors.primary : colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{r.title}</Text>
            <View style={styles.metaRow}>
              <Text style={[styles.protein, { color: colors.primary }]}>{r.protein} g protein</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>  ·  {r.kcal} kcal  ·  {r.prepMins} min</Text>
            </View>
            {r.swaps.length > 0 && (
              <View style={styles.swapRow}>
                {r.swaps.map((s, i) => (
                  <View key={i} style={[styles.swapBadge, { borderColor: colors.primary }]}>
                    <Ionicons name="swap-horizontal" size={12} color={colors.primary} />
                    <Text style={[styles.swapText, { color: colors.primary }]}>
                      swapped: {swapWord(s.from)} → {swapWord(s.to)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </View>

        {open && (
          <View style={[styles.detail, { borderTopColor: colors.border }]}>
            <Text style={[styles.detailHeading, { color: colors.text }]}>Ingredients (1 serving)</Text>
            {r.ingredients.map((ing, i) => (
              <View key={i} style={styles.ingRow}>
                <Text style={[styles.ingQty, { color: colors.textSecondary }]}>{ing.qty}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ingName, { color: colors.text }]}>
                    {ing.name}
                    {ing.swappedFrom ? <Text style={{ color: colors.primary }}>  (instead of {ing.swappedFrom.label.toLowerCase()})</Text> : null}
                  </Text>
                  {ing.swappedFrom && ing.note ? (
                    <Text style={[styles.ingNote, { color: colors.textSecondary }]}>{ing.note}</Text>
                  ) : null}
                </View>
              </View>
            ))}
            <Text style={[styles.detailHeading, { color: colors.text, marginTop: 12 }]}>Steps</Text>
            {r.steps.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.text }]}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nutrition</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Simple high-protein meals</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {/* Foods I don't eat */}
        <TouchableOpacity
          testID="exclude-toggle"
          style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowFilter(!showFilter)}
        >
          <Ionicons name="options" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Foods I don't eat</Text>
            <Text style={[styles.filterSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {excludedLabels.length ? `${excludedLabels.join(', ')} · swapped for alternatives` : 'Nothing excluded'}
            </Text>
          </View>
          <Ionicons name={showFilter ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {showFilter && (
          <View style={[styles.filterPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.filterHint, { color: colors.textSecondary }]}>
              Tap what you don't eat. Recipes swap it for something else.
            </Text>
            <View style={styles.chips}>
              {EXCLUDE_OPTIONS.map(o => {
                const on = exclusions.tags.includes(o.tag);
                return (
                  <TouchableOpacity
                    key={o.tag}
                    testID={`exclude-${o.tag}`}
                    onPress={() => toggleTag(o.tag)}
                    style={[
                      styles.chip,
                      { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : 'transparent' },
                    ]}
                  >
                    {on && <Ionicons name="close" size={14} color="#FFFFFF" />}
                    <Text style={[styles.chipText, { color: on ? '#FFFFFF' : colors.text }]}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
              {exclusions.custom.map(c => (
                <TouchableOpacity
                  key={`c-${c}`}
                  onPress={() => removeCustom(c)}
                  style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primary }]}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                  <Text style={[styles.chipText, { color: '#FFFFFF' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customRow}>
              <TextInput
                testID="exclude-input"
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Add another food, e.g. mushrooms"
                placeholderTextColor={colors.textSecondary}
                value={customText}
                onChangeText={setCustomText}
                onSubmitEditing={addCustom}
                returnKeyType="done"
              />
              <TouchableOpacity testID="exclude-add" style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={addCustom}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {SECTIONS.map(section => {
          const list = recipes.filter(r => r.section === section);
          return (
            <View key={section} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name={SECTION_ICONS[section]} size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section}</Text>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{list.length}</Text>
              </View>
              {list.length ? list.map(renderRecipe) : (
                <Text style={[styles.empty, { color: colors.textSecondary }]}>No recipes fit your filters here.</Text>
              )}
            </View>
          );
        })}

        {hidden.length > 0 && (
          <Text testID="hidden-note" style={[styles.hiddenNote, { color: colors.textSecondary }]}>
            {hidden.length} recipe{hidden.length > 1 ? 's' : ''} hidden (no good swap for{' '}
            {Array.from(new Set(hidden.map(h => h.reason.toLowerCase()))).join(', ')})
          </Text>
        )}
        <Text style={[styles.footnote, { color: colors.textSecondary }]}>
          Protein and calories are approximate, per serving.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerSub: { fontSize: 14, marginTop: 2 },
  content: { flex: 1 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterTitle: { fontSize: 16, fontWeight: '600' },
  filterSub: { fontSize: 13, marginTop: 2 },
  filterPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterHint: { fontSize: 13, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  customRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  addButton: { paddingHorizontal: 18, borderRadius: 8, justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', flex: 1 },
  sectionCount: { fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  protein: { fontSize: 14, fontWeight: 'bold' },
  meta: { fontSize: 13 },
  swapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  swapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  swapText: { fontSize: 12, fontWeight: '600' },
  detail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  detailHeading: { fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  ingRow: { flexDirection: 'row', gap: 10, paddingVertical: 3 },
  ingQty: { width: 92, fontSize: 14 },
  ingName: { fontSize: 14 },
  ingNote: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  stepRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  empty: { fontSize: 14, fontStyle: 'italic' },
  hiddenNote: { fontSize: 13, textAlign: 'center', marginTop: 16, paddingHorizontal: 24 },
  footnote: { fontSize: 12, textAlign: 'center', marginTop: 12 },
});
