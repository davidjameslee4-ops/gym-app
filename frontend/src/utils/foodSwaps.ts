import { storage } from '@/src/utils/storage';
import { Food, FoodTag, Ingredient, Recipe, RECIPES } from '@/src/constants/recipes';

// "Foods I don't eat" — stored on the device as a JSON string.
const KEY = 'nutritionExclusions';

export interface Exclusions {
  tags: FoodTag[];
  custom: string[];
}

export const EXCLUDE_OPTIONS: { tag: FoodTag; label: string }[] = [
  { tag: 'pork', label: 'Pork' },
  { tag: 'beef', label: 'Beef' },
  { tag: 'chicken', label: 'Chicken' },
  { tag: 'fish', label: 'Fish' },
  { tag: 'shellfish', label: 'Shellfish' },
  { tag: 'eggs', label: 'Eggs' },
  { tag: 'dairy', label: 'Dairy' },
  { tag: 'nuts', label: 'Nuts' },
  { tag: 'gluten', label: 'Gluten/Wheat' },
  { tag: 'soy', label: 'Soy' },
];

// Abner doesn't eat pork, so Pork starts ticked; he can untick it.
export const DEFAULT_EXCLUSIONS: Exclusions = { tags: ['pork'], custom: [] };

export async function loadExclusions(): Promise<Exclusions> {
  const raw = await storage.getItem(KEY, null as string | null);
  if (!raw || typeof raw !== 'string') return DEFAULT_EXCLUSIONS;
  try {
    const parsed = JSON.parse(raw);
    const valid = new Set(EXCLUDE_OPTIONS.map(o => o.tag));
    return {
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: any) => valid.has(t)) : [],
      custom: Array.isArray(parsed.custom) ? parsed.custom.filter((c: any) => typeof c === 'string' && c.trim()) : [],
    };
  } catch {
    return DEFAULT_EXCLUSIONS;
  }
}

export async function saveExclusions(ex: Exclusions): Promise<void> {
  await storage.setItem(KEY, JSON.stringify(ex));
}

const isExcluded = (food: Food, ex: Exclusions) => {
  if (food.tags.some(t => ex.tags.includes(t))) return true;
  const name = food.name.toLowerCase();
  return ex.custom.some(c => c.trim() && name.includes(c.trim().toLowerCase()));
};

export interface Swap {
  from: Food;
  to: Food;
}

export interface ShownIngredient extends Food {
  swappedFrom?: Food;
}

export interface ShownRecipe {
  id: string;
  section: Recipe['section'];
  title: string;
  prepMins: number;
  protein: number;
  kcal: number;
  ingredients: ShownIngredient[];
  steps: string[];
  swaps: Swap[];
}

export interface FilterResult {
  recipes: ShownRecipe[];
  hidden: { title: string; reason: string }[];
}

const fill = (text: string, labels: Record<string, string>, lower: boolean) =>
  text.replace(/\{(\w+)\}/g, (_, k) => {
    const label = labels[k] ?? k;
    return lower ? label.toLowerCase() : label;
  });

// Apply exclusions to one recipe: swap each excluded ingredient for its first
// substitute that isn't excluded too. No usable substitute -> recipe is hidden.
export function applyExclusions(recipe: Recipe, ex: Exclusions): ShownRecipe | { hiddenBecause: string } {
  const shown: ShownIngredient[] = [];
  const swaps: Swap[] = [];
  const labels: Record<string, string> = {};

  for (const ing of recipe.ingredients) {
    let use: Food = ing;
    if (isExcluded(ing, ex)) {
      const alt = (ing.alts ?? []).find(a => !isExcluded(a, ex));
      if (!alt) return { hiddenBecause: ing.label.split(',')[0] };
      use = alt;
      swaps.push({ from: ing, to: alt });
    }
    const { alts, key, ...food } = ing as Ingredient;
    const final: ShownIngredient = use === ing ? food : { ...use, swappedFrom: food };
    shown.push(final);
    if (key) labels[key] = use.label;
  }

  const protein = Math.round(shown.reduce((s, i) => s + i.protein, 0));
  const kcal = Math.round(shown.reduce((s, i) => s + i.kcal, 0) / 10) * 10;
  return {
    id: recipe.id,
    section: recipe.section,
    title: fill(recipe.title, labels, false),
    prepMins: recipe.prepMins,
    protein,
    kcal,
    ingredients: shown,
    steps: recipe.steps.map(s => fill(s, labels, true)),
    swaps,
  };
}

export function filterRecipes(ex: Exclusions, recipes: Recipe[] = RECIPES): FilterResult {
  const out: FilterResult = { recipes: [], hidden: [] };
  for (const r of recipes) {
    const res = applyExclusions(r, ex);
    if ('hiddenBecause' in res) {
      out.hidden.push({ title: fill(r.title, Object.fromEntries(r.ingredients.filter(i => i.key).map(i => [i.key!, i.label])), false), reason: res.hiddenBecause });
    } else {
      out.recipes.push(res);
    }
  }
  return out;
}

// Short words for the "swapped" badge, e.g. "pork → chicken".
export const swapWord = (f: Food) => f.label.toLowerCase();
