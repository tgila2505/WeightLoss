import type { DietType, GoalType } from '@/lib/seo/pseo-combinations';

type ComboKey = `${GoalType}:${DietType}`;

function key(goal: GoalType, diet: DietType): ComboKey {
  return `${goal}:${diet}`;
}

const DIET_INTRO: Record<DietType, string> = {
  keto: 'The ketogenic diet restricts carbohydrates to under 50 g/day, forcing the body into ketosis — a metabolic state where fat becomes the primary fuel. Combined with a calorie deficit, keto is highly effective for fat loss and appetite suppression.',
  mediterranean: 'The Mediterranean diet emphasises whole grains, olive oil, fish, vegetables, and legumes. It is the most evidence-backed dietary pattern for long-term health outcomes and supports gradual, sustainable fat loss without strict restriction.',
  'intermittent-fasting': 'Intermittent fasting (IF) cycles between eating and fasting windows — typically 16:8 (fast 16 hours, eat within 8). It simplifies calorie control, improves insulin sensitivity, and suits people who prefer fewer, larger meals.',
  'low-carb': 'Low-carb eating reduces carbohydrate intake to 50–130 g/day — more flexible than strict keto but still effective for reducing insulin levels, controlling hunger, and accelerating fat loss.',
  'plant-based': 'A whole-food plant-based diet eliminates animal products and focuses on vegetables, legumes, whole grains, and nuts. When protein intake is managed carefully, it supports fat loss while improving cardiovascular and metabolic markers.',
  paleo: 'The paleo diet eliminates processed foods, grains, and dairy in favour of lean meats, fish, vegetables, nuts, and fruits. It naturally reduces calorie density while keeping protein high — making it effective for fat loss without counting calories.',
  'calorie-deficit': 'A structured calorie deficit without dietary restrictions is the most flexible approach to fat loss. You eat what you enjoy within your calorie and protein targets. Tracking is essential — this approach only works with accurate measurement.',
  vegan: 'A vegan diet eliminates all animal products — meat, fish, dairy, and eggs — in favour of plant-based whole foods. When planned carefully around protein completeness, it supports fat loss while providing a high volume of fibre-rich, low-calorie-density foods.',
};

const COMBO_FOODS: Partial<Record<ComboKey, string[]>> = {
  [key('lose-weight', 'keto')]: ['Avocado', 'Salmon', 'Eggs', 'Spinach', 'Macadamia nuts', 'Butter', 'Cauliflower'],
  [key('lose-weight', 'mediterranean')]: ['Olive oil', 'Lentils', 'Sardines', 'Tomatoes', 'Walnuts', 'Greek yoghurt', 'Oats'],
  [key('lose-weight', 'intermittent-fasting')]: ['Chicken breast', 'Brown rice', 'Broccoli', 'Eggs', 'Almonds', 'Sweet potato', 'Greek yoghurt'],
  [key('lose-weight', 'low-carb')]: ['Beef mince', 'Courgette', 'Feta cheese', 'Chicken thighs', 'Nuts', 'Berries', 'Cucumber'],
  [key('lose-weight', 'plant-based')]: ['Tofu', 'Tempeh', 'Lentils', 'Chickpeas', 'Quinoa', 'Edamame', 'Hemp seeds'],
  [key('lose-weight', 'paleo')]: ['Grass-fed beef', 'Sweet potato', 'Blueberries', 'Almonds', 'Salmon', 'Avocado', 'Eggs'],
  [key('lose-weight', 'calorie-deficit')]: ['Chicken breast', 'Greek yoghurt', 'Oats', 'Eggs', 'Lentils', 'Broccoli', 'Banana'],
  [key('lose-belly-fat', 'keto')]: ['Salmon', 'Avocado', 'Eggs', 'Spinach', 'Olive oil', 'Almonds', 'Coconut oil'],
  [key('get-lean', 'keto')]: ['Chicken thigh', 'Eggs', 'Avocado', 'Greek yoghurt (full fat)', 'Salmon', 'Spinach', 'Cheese'],
  [key('get-lean', 'calorie-deficit')]: ['Chicken breast', 'Egg whites', 'Greek yoghurt', 'Brown rice', 'Broccoli', 'Whey protein', 'Tuna'],
};

const COMBO_MISTAKES: Partial<Record<ComboKey, string[]>> = {
  [key('lose-weight', 'keto')]: [
    'Not tracking net carbs — hidden carbs in sauces and processed foods knock you out of ketosis.',
    'Under-eating electrolytes (sodium, potassium, magnesium) — causes the "keto flu".',
    'Eating too much protein — excess protein can be converted to glucose via gluconeogenesis.',
  ],
  [key('lose-weight', 'intermittent-fasting')]: [
    'Breaking the fast with ultra-processed foods — IF doesn\'t compensate for poor food quality.',
    'Eating the entire day\'s calories in one meal — poor protein distribution undermines muscle retention.',
    'Using IF as a reason to ignore calorie targets — you can overeat within an 8-hour window.',
  ],
  [key('lose-weight', 'plant-based')]: [
    'Under-eating protein — plant proteins are less bioavailable; you need higher quantities.',
    'Relying on processed vegan foods — vegan junk food is still junk food.',
    'Ignoring vitamin B12 and omega-3s — deficiencies affect energy and cognition.',
  ],
};

export interface GoalDietTemplateContent {
  dietIntro: string;
  foodsToPrioritize: string[];
  commonMistakes: string[];
  proteinTarget: string;
  calorieGuidance: string;
}

export function getGoalDietContent(goalType: GoalType, dietType: DietType): GoalDietTemplateContent {
  const comboKey = key(goalType, dietType);

  const defaultFoods = [
    'Lean protein source (chicken, fish, eggs)',
    'Non-starchy vegetables',
    'Healthy fat source (avocado, olive oil, nuts)',
    'Low-GI carbohydrate (if not keto/low-carb)',
    'Fermented food (Greek yoghurt, kimchi)',
    'Dark leafy greens',
    'Berries or low-sugar fruit',
  ];

  const defaultMistakes = [
    'Not tracking food intake accurately — portion estimates are consistently low by 20–40%.',
    'Treating weekends as "off days" — two days of untracked eating can erase a week\'s deficit.',
    'Under-eating protein — 1.6–2.2 g/kg/day is the evidence-based target for fat loss.',
  ];

  return {
    dietIntro: DIET_INTRO[dietType],
    foodsToPrioritize: COMBO_FOODS[comboKey] ?? defaultFoods,
    commonMistakes: COMBO_MISTAKES[comboKey] ?? defaultMistakes,
    proteinTarget: '1.6–2.2 g per kg of body weight per day',
    calorieGuidance: dietType === 'keto' || dietType === 'low-carb'
      ? 'Keep net carbs under 50 g/day (keto) or 100 g/day (low-carb). Protein: 1.8–2.2 g/kg. Fat fills remaining calories.'
      : 'Set a deficit of 500–750 kcal/day below your TDEE. Protein: 1.6–2.0 g/kg. Split remaining calories between carbs and fat based on preference.',
  };
}
