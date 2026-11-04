// High-protein recipes for the Nutrition tab.
// Every ingredient carries tags (pork, dairy, gluten …) and an ordered list of
// substitutes, so the "Foods I don't eat" filter can swap them by data alone.
// Protein / kcal per ingredient are approximate (SA supermarket labels), and a
// recipe's totals are the sum of its ingredients, so swaps update the numbers.

export type FoodTag =
  | 'pork' | 'beef' | 'chicken' | 'fish' | 'shellfish'
  | 'eggs' | 'dairy' | 'nuts' | 'gluten' | 'soy';

export interface Food {
  name: string;          // shown in the ingredient list, e.g. "Pork chops (lean)"
  label: string;         // short word used in titles/steps, e.g. "Pork Chops"
  qty: string;           // "150 g", "3 large"
  protein: number;       // grams
  kcal: number;
  tags: FoodTag[];
  note?: string;         // cooking tip shown when this food is used as a swap
}

export interface Ingredient extends Food {
  key?: string;          // placeholder used in title/steps: "{main}"
  alts?: Food[];         // substitutes, best first
}

export type MealSection = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

export interface Recipe {
  id: string;
  section: MealSection;
  title: string;         // may contain {key} placeholders
  prepMins: number;
  ingredients: Ingredient[];
  steps: string[];       // may contain {key} placeholders
}

const r1 = (n: number) => Math.round(n * 10) / 10;

// food(name, label, perUnitProtein, perUnitKcal, tags) -> builder(amount, qtyText)
const per100 = (name: string, label: string, p: number, kcal: number, tags: FoodTag[] = [], note?: string) =>
  (grams: number, qty?: string): Food => ({
    name, label, qty: qty ?? `${grams} g`,
    protein: r1((p * grams) / 100), kcal: Math.round((kcal * grams) / 100), tags, note,
  });

// ---------- foods (per 100 g unless stated) ----------
const chickenBreast = per100('Chicken breast', 'Chicken', 23, 110, ['chicken']);
const cookedChicken = per100('Cooked chicken breast, sliced', 'Chicken', 31, 165, ['chicken']);
const chickenThigh = per100('Chicken thighs, skinless', 'Chicken', 19, 135, ['chicken']);
const chickenMince = per100('Chicken mince', 'Chicken Mince', 20, 120, ['chicken']);
const porkChop = per100('Pork chops (lean, trimmed)', 'Pork Chops', 21, 150, ['pork']);
const porkMince = per100('Pork mince', 'Pork Mince', 18, 200, ['pork']);
const backBacon = per100('Back bacon', 'Bacon', 20, 215, ['pork']);
const beefBacon = per100('Beef bacon (beef rashers)', 'Beef Bacon', 20, 170, ['beef']);
const turkeyBacon = per100('Turkey bacon', 'Turkey Bacon', 20, 160, []);
const ham = per100('Ham, sliced', 'Ham', 18, 115, ['pork']);
const smokedChicken = per100('Smoked chicken slices', 'Smoked Chicken', 20, 110, ['chicken']);
const beefPastrami = per100('Lean beef pastrami', 'Pastrami', 22, 120, ['beef']);
const beefSteak = per100('Lean beef steak (rump)', 'Beef Steak', 22, 140, ['beef']);
const beefStrips = per100('Lean beef strips', 'Beef', 22, 140, ['beef']);
const beefMince = per100('Lean beef mince', 'Beef Mince', 20, 165, ['beef']);
const biltong = per100('Beef biltong', 'Biltong', 55, 250, ['beef']);
const chickenBiltong = per100('Chicken biltong', 'Chicken Biltong', 60, 240, ['chicken']);
const roastChickpeas = per100('Roasted chickpeas (snack pack)', 'Roasted Chickpeas', 18, 380, []);
const tuna = per100('Tuna in water, drained (1 can)', 'Tuna', 25, 110, ['fish']);
const hake = per100('Hake fillet', 'Hake', 17, 80, ['fish']);
const salmon = per100('Salmon fillet', 'Salmon', 20, 200, ['fish']);
const prawns = per100('Prawns, peeled', 'Prawn', 19, 90, ['shellfish']);
const tofu = per100('Firm tofu', 'Tofu', 13, 120, ['soy'], 'Press out the water, then cook it like the original.');
const tofuScramble = per100('Firm tofu, crumbled', 'Tofu', 13, 120, ['soy'],
  'Crumble the tofu and fry it like scrambled egg, with a pinch of turmeric and salt.');
const chickpeas = per100('Chickpeas, canned, drained', 'Chickpeas', 7, 120, []);
const chickpeaMash = per100('Chickpeas, canned, drained and mashed', 'Chickpeas', 7, 120, [],
  'Mash with a fork and fry for 2–3 min with the seasoning instead of egg.');
const lentils = per100('Lentils, canned, drained', 'Lentil', 9, 115, []);
const blackBeans = per100('Black beans, canned, drained', 'Bean', 7, 115, []);
const kidneyBeans = per100('Kidney beans, canned, drained', 'Bean', 7, 110, []);

const greekYoghurt = per100('Fat-free Greek yoghurt', 'Greek Yoghurt', 10, 65, ['dairy']);
const soyYoghurt = per100('Plain soy yoghurt (dairy-free)', 'Soy Yoghurt', 4, 70, ['soy']);
const coconutYoghurt = per100('Coconut yoghurt (dairy-free)', 'Coconut Yoghurt', 1, 100, []);
const cottageCheese = per100('Cottage cheese (low fat)', 'Cottage Cheese', 11, 95, ['dairy']);
const cheddar = per100('Cheddar, grated', 'Cheese', 25, 400, ['dairy']);
const vegCheese = per100('Dairy-free cheese, grated', 'Dairy-free Cheese', 1, 300, []);
const feta = per100('Feta, crumbled', 'Feta', 15, 265, ['dairy']);
const avocado = per100('Avocado, diced', 'Avocado', 2, 160, []);
const milk = per100('Low-fat milk', 'Milk', 3.4, 50, ['dairy']);
const soyMilk = per100('Soy milk', 'Soy Milk', 3.3, 40, ['soy']);
const oatMilk = per100('Oat milk', 'Oat Milk', 1, 48, ['gluten']);
const almondMilk = per100('Almond milk', 'Almond Milk', 0.5, 15, ['nuts']);
const butter = per100('Butter', 'Butter', 0.5, 720, ['dairy']);
const oliveOil = per100('Olive oil', 'Olive Oil', 0, 880, []);
const whey = per100('Whey protein powder', 'Whey', 80, 400, ['dairy']);
const peaProtein = per100('Plant (pea) protein powder', 'Plant Protein', 75, 380, []);

const wwBread = per100('Wholewheat bread', 'Toast', 10, 245, ['gluten']);
const gfBread = per100('Gluten-free bread', 'GF Toast', 4, 230, []);
const wrap = per100('Large wholewheat wrap', 'Wrap', 8, 300, ['gluten']);
const gfWrap = per100('Gluten-free wrap', 'GF Wrap', 5, 290, []);
const lettuceCups = per100('Large lettuce leaves (as cups)', 'Lettuce', 1, 15, []);
const pasta = per100('Pasta (dry)', 'Pasta', 12.5, 355, ['gluten']);
const gfPasta = per100('Gluten-free pasta (dry)', 'Pasta', 7, 355, []);
const oats = per100('Rolled oats', 'Oats', 13, 380, ['gluten']);
const gfOats = per100('Gluten-free oats', 'Oats', 13, 380, []);
const riceCakes = per100('Rice cakes', 'Rice Cakes', 7, 380, []);

const peanutButter = per100('Peanut butter', 'Peanut Butter', 25, 590, ['nuts']);
const tahini = per100('Tahini (sesame paste)', 'Tahini', 17, 600, []);
const almonds = per100('Almonds', 'Almonds', 21, 580, ['nuts']);
const pumpkinSeeds = per100('Pumpkin seeds', 'Pumpkin Seeds', 30, 560, []);
const soySauce = per100('Soy sauce', 'Soy', 6, 60, ['soy', 'gluten']);
const lemonSalt = per100('Lemon juice + pinch of salt', 'Lemon', 0, 25, []);

const rice = per100('Cooked brown rice', 'Rice', 2.6, 130, []);
const sweetPotato = per100('Sweet potato', 'Sweet Potato', 1.6, 86, []);
const babyPotatoes = per100('Baby potatoes', 'Potatoes', 2, 77, []);
const veg = (name: string, grams: number, p: number, kcal: number, qty?: string): Ingredient =>
  ({ name, label: name, qty: qty ?? `${grams} g`, protein: p, kcal, tags: [] });

// eggs (per large egg ≈ 6.5 g protein, 75 kcal)
const eggs = (n: number, how = 'large'): Food => ({
  name: `Eggs`, label: 'Eggs', qty: `${n} ${how}`, protein: r1(n * 6.5), kcal: n * 75, tags: ['eggs'],
});
const eggAlts = (n: number): Food[] => [tofuScramble(n * 50), chickpeaMash(n * 40)];

// ---------- swappable ingredient helpers ----------
const withAlts = (main: Food, alts: Food[], key?: string): Ingredient => ({ ...main, key, alts });
const sChickenBreast = (g: number, key = 'main') => withAlts(chickenBreast(g), [chickenThigh(g), tofu(g)], key);
// Coconut yoghurt has almost no protein, so where yoghurt is the main protein
// it comes with half a scoop of plant protein stirred in.
const coconutPlus = (g: number): Food => {
  const c = coconutYoghurt(g);
  return { ...c, name: `${c.name} + ½ scoop plant protein`, qty: `${g} g + 15 g`, protein: r1(c.protein + 11), kcal: c.kcal + 57 };
};
const sGreekYoghurt = (g: number, qty?: string, key = 'yog', main = false) =>
  withAlts(greekYoghurt(g, qty), [soyYoghurt(g, qty), main ? coconutPlus(g) : coconutYoghurt(g, qty)], key);
const sCheddar = (g: number) => withAlts(cheddar(g), [vegCheese(g)], 'cheese');
const sMilk = (ml: number) => withAlts(milk(ml, `${ml} ml`), [soyMilk(ml, `${ml} ml`), oatMilk(ml, `${ml} ml`), almondMilk(ml, `${ml} ml`)]);
const sWhey = () => withAlts(whey(30, '1 scoop (30 g)'), [peaProtein(30, '1 scoop (30 g)')]);
const sWwBread = (slices: number) => withAlts(wwBread(slices * 35, `${slices} slice${slices > 1 ? 's' : ''}`), [gfBread(slices * 35, `${slices} slice${slices > 1 ? 's' : ''}`)]);
const sWrap = () => withAlts(wrap(60, '1 large'), [gfWrap(60, '1 large'), lettuceCups(60, '3–4 leaves')], 'wrap');
const sPasta = (g: number) => withAlts(pasta(g), [gfPasta(g)]);
const sOats = (g: number) => withAlts(oats(g), [gfOats(g)]);
const sPeanutButter = (g: number, qty: string) => withAlts(peanutButter(g, qty), [tahini(g, qty)]);
const sSoySauce = () => withAlts(soySauce(15, '1 Tbsp'), [lemonSalt(15, '1 Tbsp')]);
const sOil = () => oliveOil(5, '1 tsp') as Ingredient;
const sEggs = (n: number, how = 'large') => withAlts(eggs(n, how), eggAlts(n), 'egg');
const sTuna = (key = 'main') => withAlts(tuna(120, '1 can (120 g drained)'), [cookedChicken(120), chickpeas(240, '1 can (240 g drained)')], key);

export const RECIPES: Recipe[] = [
  // ---------------- Breakfast ----------------
  {
    id: 'b-bacon-egg', section: 'Breakfast', title: '{bacon} & {egg} on Toast', prepMins: 15,
    ingredients: [
      withAlts(backBacon(60, '3 rashers (60 g)'), [beefBacon(60, '3 rashers (60 g)'), turkeyBacon(60, '3 rashers (60 g)')], 'bacon'),
      sEggs(3), sWwBread(1), veg('Baby spinach', 30, 1, 10, '1 handful'),
    ],
    steps: [
      'Fry the {bacon} in a dry pan until crisp, 3–4 min. Set aside.',
      'Wilt the spinach in the same pan for 30 sec.',
      'Whisk the {egg} with a pinch of salt and pepper, add to the pan and stir gently until just set.',
      'Serve on the toast with the {bacon} on top.',
    ],
  },
  {
    id: 'b-yoghurt-bowl', section: 'Breakfast', title: '{yog} Protein Bowl', prepMins: 5,
    ingredients: [
      sGreekYoghurt(200, undefined, 'yog', true), sOats(30), veg('Mixed berries (fresh or frozen)', 100, 1, 50),
      withAlts(almonds(15), [pumpkinSeeds(15)], 'nuts'), veg('Honey', 7, 0, 20, '1 tsp'),
    ],
    steps: [
      'Spoon the yoghurt into a bowl.',
      'Top with the oats, berries and {nuts}.',
      'Drizzle with honey and eat straight away.',
    ],
  },
  {
    id: 'b-protein-oats', section: 'Breakfast', title: '{pb} Protein Oats', prepMins: 8,
    ingredients: [sOats(50), sMilk(250), sWhey(), veg('Banana, sliced', 60, 0.5, 53, '½'), { ...sPeanutButter(16, '1 Tbsp'), key: 'pb' }],
    steps: [
      'Cook the oats in the milk for 3–4 min, stirring, until thick (or microwave 2 min).',
      'Take off the heat and stir in the protein powder with a splash more milk.',
      'Top with banana and the {pb}.',
    ],
  },
  {
    id: 'b-cottage-toast', section: 'Breakfast', title: '{cottage}, {egg} & Tomato Toast', prepMins: 10,
    ingredients: [
      sWwBread(2),
      withAlts(cottageCheese(125), [tofu(125, '125 g, crumbled'), avocado(70, '½ avocado')], 'cottage'),
      sEggs(2), veg('Tomato, sliced', 100, 1, 20, '1'),
    ],
    steps: [
      'Boil the {egg} for 8 min (or fry), then peel and slice.',
      'Toast the bread and spread thickly with the {cottage}.',
      'Top with tomato and the {egg}. Season with salt, pepper and chilli flakes.',
    ],
  },
  {
    id: 'b-ham-omelette', section: 'Breakfast', title: '{ham} & {cheese} Omelette', prepMins: 10,
    ingredients: [
      sEggs(3),
      withAlts(ham(60, '3 slices (60 g)'), [smokedChicken(60, '3 slices (60 g)'), beefPastrami(60, '3 slices (60 g)')], 'ham'),
      sCheddar(30), veg('Mushrooms, sliced', 50, 1.5, 10), sOil(),
    ],
    steps: [
      'Fry the mushrooms in the oil for 2–3 min.',
      'Whisk the {egg} with salt and pepper and pour over the mushrooms.',
      'When almost set, add the {ham} and cheese to one half.',
      'Fold over, cook 1 more min and slide onto a plate.',
    ],
  },
  {
    id: 'b-burrito', section: 'Breakfast', title: 'Breakfast Burrito', prepMins: 12,
    ingredients: [sWrap(), sEggs(2), blackBeans(80) as Ingredient, sCheddar(20), veg('Salsa or chopped tomato', 30, 0.5, 10, '2 Tbsp')],
    steps: [
      'Scramble the {egg} in a non-stick pan.',
      'Warm the beans in the microwave for 1 min.',
      'Fill the {wrap} with the {egg}, beans, cheese and salsa. Roll up tightly.',
      'Toast seam-side down in a dry pan for 1 min (skip if using lettuce).',
    ],
  },

  // ---------------- Lunch ----------------
  {
    id: 'l-chicken-rice', section: 'Lunch', title: '{main}, Rice & Broccoli Bowl', prepMins: 20,
    ingredients: [sChickenBreast(150), rice(150) as Ingredient, veg('Broccoli', 100, 3, 35), sSoySauce(), sOil()],
    steps: [
      'Cut the {main} into strips and season with salt, pepper and paprika.',
      'Fry in the oil for 6–8 min until cooked through.',
      'Steam or microwave the broccoli for 3–4 min.',
      'Serve over the rice and drizzle with the sauce.',
    ],
  },
  {
    id: 'l-tuna-pasta', section: 'Lunch', title: '{main} Pasta Salad', prepMins: 15,
    ingredients: [
      sPasta(75), sTuna(), veg('Sweetcorn', 50, 1.5, 45),
      sGreekYoghurt(40, '2 Tbsp'), veg('Cucumber & peppers, diced', 80, 0.5, 15, '1 cup'),
    ],
    steps: [
      'Cook the pasta, drain and rinse under cold water.',
      'Mix the yoghurt with lemon juice, salt and pepper.',
      'Toss the pasta with the {main}, corn, cucumber and peppers and the dressing.',
      'Keeps 2 days in the fridge — good for meal prep.',
    ],
  },
  {
    id: 'l-chicken-wrap', section: 'Lunch', title: '{main} & Hummus Wrap', prepMins: 5,
    ingredients: [
      sWrap(), withAlts(cookedChicken(120), [tuna(120, '1 can (120 g drained)'), chickpeas(200)], 'main'),
      veg('Hummus', 30, 2, 80, '2 Tbsp'), veg('Lettuce & tomato', 60, 1, 15, '1 handful'),
    ],
    steps: [
      'Spread the hummus over the {wrap}.',
      'Add the {main}, lettuce and tomato. Season.',
      'Roll up tightly and cut in half.',
    ],
  },
  {
    id: 'l-burrito-bowl', section: 'Lunch', title: '{main} Burrito Bowl', prepMins: 20,
    ingredients: [
      withAlts(beefMince(150), [chickenMince(150), lentils(200)], 'main'),
      rice(120) as Ingredient, kidneyBeans(80) as Ingredient, veg('Salsa', 50, 0.5, 15, '3 Tbsp'), sCheddar(20),
    ],
    steps: [
      'Brown the {main} in a hot pan, 6–8 min. Add 1 tsp each of cumin, paprika and a pinch of chilli.',
      'Stir in the beans and warm through.',
      'Serve over the rice, topped with salsa and cheese.',
    ],
  },
  {
    id: 'l-prawn-rice', section: 'Lunch', title: '{main} Fried Rice', prepMins: 15,
    ingredients: [
      withAlts(prawns(150), [hake(150), chickenBreast(150)], 'main'),
      sEggs(2), rice(150) as Ingredient, veg('Frozen peas & mixed veg', 80, 3, 50), sSoySauce(), sOil(),
    ],
    steps: [
      'Fry the {main} in the oil until cooked, 3–5 min. Set aside.',
      'Scramble the {egg} in the same pan, then add the veg and cook 2 min.',
      'Add the rice and fry until hot. Stir in the sauce.',
      'Return the {main} to the pan and toss together.',
    ],
  },
  {
    id: 'l-chickpea-salad', section: 'Lunch', title: 'Chickpea & {feta} Salad with {egg}', prepMins: 12,
    ingredients: [
      chickpeas(200) as Ingredient, sEggs(2, 'boiled'),
      withAlts(feta(40), [avocado(70, '½ avocado')], 'feta'),
      veg('Cucumber & tomato, chopped', 150, 1, 30), sOil(),
    ],
    steps: [
      'Boil the {egg} for 9 min, cool and quarter (or pan-fry if using tofu or chickpeas).',
      'Toss the chickpeas, cucumber and tomato with the oil, lemon juice, salt and pepper.',
      'Top with the {egg} and {feta}.',
    ],
  },

  // ---------------- Dinner ----------------
  {
    id: 'd-pork-chops', section: 'Dinner', title: '{main} with Sweet Potato & Greens', prepMins: 30,
    ingredients: [
      withAlts(porkChop(150, '150 g (1 large chop)'), [chickenBreast(150), beefSteak(150), tofu(150)], 'main'),
      sweetPotato(200) as Ingredient, veg('Green beans', 100, 2, 30), sOil(),
    ],
    steps: [
      'Cube the sweet potato, toss with half the oil and roast at 200°C for 25 min.',
      'Season the {main} with salt, pepper and garlic.',
      'Pan-fry in the rest of the oil 4–6 min per side until cooked through. Rest 3 min.',
      'Steam the green beans for 4 min and serve everything together.',
    ],
  },
  {
    id: 'd-hake', section: 'Dinner', title: 'Lemon Garlic {main} & Potatoes', prepMins: 25,
    ingredients: [
      withAlts(hake(180), [chickenBreast(150), tofu(180)], 'main'),
      babyPotatoes(200) as Ingredient,
      withAlts(butter(10, '2 tsp'), [oliveOil(9, '2 tsp')], 'butter'),
      veg('Side salad', 80, 1, 20),
    ],
    steps: [
      'Boil the potatoes for 15 min until tender.',
      'Melt the {butter} in a pan with 1 crushed garlic clove.',
      'Cook the {main} 3–4 min per side (chicken needs 6–7). Squeeze over lemon.',
      'Serve with the potatoes and salad.',
    ],
  },
  {
    id: 'd-beef-stirfry', section: 'Dinner', title: '{main} & Broccoli Stir-fry', prepMins: 20,
    ingredients: [
      withAlts(beefStrips(150), [chickenBreast(150), tofu(150)], 'main'),
      veg('Broccoli', 100, 3, 35), rice(150) as Ingredient, sSoySauce(), sOil(),
    ],
    steps: [
      'Get a pan or wok very hot with the oil.',
      'Stir-fry the {main} for 2–3 min (chicken 5–6) and remove.',
      'Stir-fry the broccoli with garlic and ginger for 3 min.',
      'Return the {main}, add the sauce and serve over the rice.',
    ],
  },
  {
    id: 'd-bolognese', section: 'Dinner', title: 'Lean {main} Bolognese', prepMins: 30,
    ingredients: [
      withAlts(beefMince(150), [chickenMince(150), lentils(200)], 'main'),
      sPasta(75), veg('Tomato passata or tinned tomatoes', 150, 2, 70), veg('Onion & garlic', 60, 1, 25, '½ onion, 1 clove'),
    ],
    steps: [
      'Fry the onion and garlic for 3 min.',
      'Add the {main} and brown for 6–8 min.',
      'Add the tomatoes and dried herbs, simmer 15 min.',
      'Serve over the cooked pasta.',
    ],
  },
  {
    id: 'd-pork-mince-bowl', section: 'Dinner', title: 'Honey-Garlic {main} Rice Bowl', prepMins: 20,
    ingredients: [
      withAlts(porkMince(150), [chickenMince(150), beefMince(150)], 'main'),
      rice(150) as Ingredient, veg('Stir-fry veg mix', 100, 2, 35), sSoySauce(), veg('Honey', 7, 0, 20, '1 tsp'),
    ],
    steps: [
      'Brown the {main} in a hot pan for 6–8 min, breaking it up.',
      'Add the veg and 1 crushed garlic clove, cook 3 min.',
      'Stir in the sauce and honey and bubble for 1 min.',
      'Serve over the rice.',
    ],
  },
  {
    id: 'd-salmon', section: 'Dinner', title: 'Baked {main}, Rice & Greens', prepMins: 25,
    ingredients: [
      withAlts(salmon(150), [chickenThigh(150), tofu(150)], 'main'),
      rice(150) as Ingredient, veg('Green beans or broccoli', 100, 2.5, 30),
    ],
    steps: [
      'Heat the oven to 200°C. Season the {main} with salt, pepper and lemon.',
      'Bake for 12–15 min (chicken thighs 25 min).',
      'Steam the greens and serve with the rice.',
    ],
  },

  // ---------------- Snacks ----------------
  {
    id: 's-biltong', section: 'Snacks', title: '{main} & an Apple', prepMins: 1,
    ingredients: [
      withAlts(biltong(50), [chickenBiltong(50), roastChickpeas(50)], 'main'),
      veg('Apple', 150, 0.5, 80, '1'),
    ],
    steps: ['Grab and go — great between meals or after training.'],
  },
  {
    id: 's-shake', section: 'Snacks', title: 'Banana Protein Shake', prepMins: 3,
    ingredients: [sWhey(), sMilk(250), veg('Banana', 120, 1, 105, '1'), sPeanutButter(16, '1 Tbsp')],
    steps: ['Blend everything with a few ice cubes until smooth.'],
  },
  {
    id: 's-cottage', section: 'Snacks', title: '{main} & Pineapple', prepMins: 2,
    ingredients: [
      withAlts(cottageCheese(200), [soyYoghurt(200), coconutPlus(200)], 'main'),
      veg('Pineapple pieces', 80, 0.5, 40),
    ],
    steps: ['Spoon the {main} into a bowl and top with pineapple and a pinch of cinnamon.'],
  },
  {
    id: 's-eggs-hummus', section: 'Snacks', title: '{egg} & Hummus Snack Plate', prepMins: 10,
    ingredients: [sEggs(3, 'boiled'), veg('Hummus', 30, 2, 80, '2 Tbsp'), veg('Carrot sticks', 100, 1, 40)],
    steps: ['Boil the {egg} for 9 min (or batch-cook for the week).', 'Peel and eat with the hummus and carrot sticks.'],
  },
  {
    id: 's-tuna-ricecakes', section: 'Snacks', title: '{main} on Rice Cakes', prepMins: 5,
    ingredients: [sTuna(), riceCakes(28, '3 rice cakes'), sGreekYoghurt(40, '2 Tbsp'), veg('Cucumber, sliced', 50, 0.3, 8)],
    steps: ['Mix the {main} with the yoghurt, salt and pepper.', 'Pile onto the rice cakes and top with cucumber.'],
  },
  {
    id: 's-pb-dip', section: 'Snacks', title: 'Yoghurt {pb} Dip & Apple', prepMins: 3,
    ingredients: [sGreekYoghurt(150, undefined, 'yog', true), { ...sPeanutButter(16, '1 Tbsp'), key: 'pb' }, veg('Apple, sliced', 150, 0.5, 80, '1')],
    steps: ['Stir the {pb} and a pinch of cinnamon into the yoghurt.', 'Dip the apple slices.'],
  },
];

export const SECTIONS: MealSection[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
