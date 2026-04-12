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
  'high-protein': 'A high-protein diet prioritises protein intake at 25–35% of total calories — typically 1.8–2.4 g/kg of body weight. High protein preserves muscle during a deficit, increases satiety, and raises the thermic effect of food, burning more calories through digestion.',
  whole30: 'Whole30 is a 30-day elimination protocol that removes sugar, alcohol, grains, legumes, and dairy to reset metabolic health. It produces fat loss through food quality improvement and the elimination of ultra-processed food intake without calorie counting.',
  dash: 'The DASH (Dietary Approaches to Stop Hypertension) diet emphasises fruits, vegetables, whole grains, and low-fat dairy while limiting sodium, saturated fat, and added sugar. Designed to lower blood pressure, it is also highly effective for sustainable fat loss.',
  'anti-inflammatory': 'The anti-inflammatory diet reduces chronic inflammation — a driver of metabolic dysfunction, insulin resistance, and stubborn fat. It emphasises omega-3 rich fish, colourful vegetables, olive oil, turmeric, and berries while avoiding refined sugar, seed oils, and processed meats.',
  carnivore: 'The carnivore diet eliminates all plant foods in favour of animal products — meat, fish, eggs, and some dairy. It is highly satiating, eliminates most processed food by default, and produces significant fat loss through appetite suppression rather than calorie counting.',
  flexitarian: 'A flexitarian diet is predominantly plant-based but includes occasional meat or fish. It captures most of the metabolic benefits of plant-based eating while removing the rigidity that makes fully plant-based diets hard to sustain — making it one of the most adherence-friendly approaches.',
};

const COMBO_FOODS: Partial<Record<ComboKey, string[]>> = {
  // lose-weight
  [key('lose-weight', 'keto')]: ['Avocado', 'Salmon', 'Eggs', 'Spinach', 'Macadamia nuts', 'Butter', 'Cauliflower'],
  [key('lose-weight', 'mediterranean')]: ['Olive oil', 'Lentils', 'Sardines', 'Tomatoes', 'Walnuts', 'Greek yoghurt', 'Oats'],
  [key('lose-weight', 'intermittent-fasting')]: ['Chicken breast', 'Brown rice', 'Broccoli', 'Eggs', 'Almonds', 'Sweet potato', 'Greek yoghurt'],
  [key('lose-weight', 'low-carb')]: ['Beef mince', 'Courgette', 'Feta cheese', 'Chicken thighs', 'Nuts', 'Berries', 'Cucumber'],
  [key('lose-weight', 'plant-based')]: ['Tofu', 'Tempeh', 'Lentils', 'Chickpeas', 'Quinoa', 'Edamame', 'Hemp seeds'],
  [key('lose-weight', 'paleo')]: ['Grass-fed beef', 'Sweet potato', 'Blueberries', 'Almonds', 'Salmon', 'Avocado', 'Eggs'],
  [key('lose-weight', 'calorie-deficit')]: ['Chicken breast', 'Greek yoghurt', 'Oats', 'Eggs', 'Lentils', 'Broccoli', 'Banana'],
  // lose-belly-fat
  [key('lose-belly-fat', 'keto')]: ['Salmon', 'Avocado', 'Eggs', 'Spinach', 'Olive oil', 'Almonds', 'Coconut oil'],
  // get-lean
  [key('get-lean', 'keto')]: ['Chicken thigh', 'Eggs', 'Avocado', 'Greek yoghurt (full fat)', 'Salmon', 'Spinach', 'Cheese'],
  [key('get-lean', 'calorie-deficit')]: ['Chicken breast', 'Egg whites', 'Greek yoghurt', 'Brown rice', 'Broccoli', 'Whey protein', 'Tuna'],

  // ── burn-fat ──────────────────────────────────────────────────────────────
  [key('burn-fat', 'keto')]: ['Salmon', 'MCT oil', 'Eggs', 'Avocado', 'Spinach', 'Sardines', 'Macadamia nuts'],
  [key('burn-fat', 'mediterranean')]: ['Sardines', 'Olive oil', 'Walnuts', 'Blueberries', 'Arugula', 'Green tea', 'Chickpeas'],
  [key('burn-fat', 'intermittent-fasting')]: ['Chicken breast', 'Eggs', 'Almonds', 'Broccoli', 'Greek yoghurt', 'Berries', 'Green tea'],
  [key('burn-fat', 'low-carb')]: ['Lean beef', 'Eggs', 'Spinach', 'Almonds', 'Avocado', 'Asparagus', 'Cheese'],
  [key('burn-fat', 'calorie-deficit')]: ['Chicken breast', 'Egg whites', 'Broccoli', 'Greek yoghurt', 'Tuna', 'Spinach', 'Green tea'],
  [key('burn-fat', 'plant-based')]: ['Tempeh', 'Edamame', 'Flaxseeds', 'Dark leafy greens', 'Berries', 'Green tea', 'Lentils'],
  [key('burn-fat', 'paleo')]: ['Grass-fed beef', 'Salmon', 'Sweet potato (small)', 'Eggs', 'Almonds', 'Blueberries', 'Broccoli'],
  [key('burn-fat', 'vegan')]: ['Tempeh', 'Flaxseeds', 'Edamame', 'Spinach', 'Blueberries', 'Green tea', 'Lentils'],
  [key('burn-fat', 'high-protein')]: ['Chicken breast', 'Egg whites', 'Cottage cheese', 'Tuna', 'Greek yoghurt', 'White fish', 'Turkey'],
  [key('burn-fat', 'whole30')]: ['Salmon', 'Eggs', 'Coconut oil', 'Sweet potato', 'Dark leafy greens', 'Almonds', 'Berries'],
  [key('burn-fat', 'dash')]: ['Salmon', 'Oats', 'Blueberries', 'Broccoli', 'Walnuts', 'Lentils', 'Low-fat yoghurt'],
  [key('burn-fat', 'anti-inflammatory')]: ['Salmon', 'Turmeric', 'Blueberries', 'Walnuts', 'Olive oil', 'Kale', 'Ginger'],
  [key('burn-fat', 'carnivore')]: ['Salmon', 'Beef ribeye', 'Eggs', 'Chicken thigh', 'Liver', 'Sardines', 'Bone broth'],
  [key('burn-fat', 'flexitarian')]: ['Salmon (2–3×/wk)', 'Lentils', 'Eggs', 'Berries', 'Spinach', 'Almonds', 'Oats'],

  // ── tone-up ───────────────────────────────────────────────────────────────
  [key('tone-up', 'keto')]: ['Chicken thigh', 'Eggs', 'Avocado', 'Cheese', 'Beef mince', 'Spinach', 'Bacon'],
  [key('tone-up', 'mediterranean')]: ['Grilled fish', 'Olive oil', 'Lentils', 'Eggs', 'Greek yoghurt', 'Whole grain bread', 'Walnuts'],
  [key('tone-up', 'intermittent-fasting')]: ['Lean beef', 'Eggs', 'Brown rice', 'Broccoli', 'Almonds', 'Cottage cheese', 'Sweet potato'],
  [key('tone-up', 'low-carb')]: ['Chicken breast', 'Eggs', 'Avocado', 'Cottage cheese', 'Lean beef', 'Leafy greens', 'Walnuts'],
  [key('tone-up', 'calorie-deficit')]: ['Chicken breast', 'Eggs', 'Greek yoghurt', 'Brown rice', 'Broccoli', 'Whey protein', 'Tuna'],
  [key('tone-up', 'plant-based')]: ['Tofu', 'Seitan', 'Tempeh', 'Quinoa', 'Lentils', 'Edamame', 'Hemp seeds'],
  [key('tone-up', 'paleo')]: ['Chicken breast', 'Eggs', 'Sweet potato', 'Almonds', 'Salmon', 'Blueberries', 'Lean beef'],
  [key('tone-up', 'vegan')]: ['Tofu', 'Tempeh', 'Seitan', 'Quinoa', 'Lentils', 'Chickpeas', 'Hemp seeds'],
  [key('tone-up', 'high-protein')]: ['Chicken breast', 'Cottage cheese', 'Greek yoghurt', 'Egg whites', 'Turkey', 'Tuna', 'Lean beef'],
  [key('tone-up', 'whole30')]: ['Chicken breast', 'Eggs', 'Sweet potato', 'Almonds', 'Salmon', 'Avocado', 'Broccoli'],
  [key('tone-up', 'dash')]: ['Lean turkey', 'Low-fat cottage cheese', 'Quinoa', 'Leafy greens', 'Walnuts', 'Lentils', 'Berries'],
  [key('tone-up', 'anti-inflammatory')]: ['Salmon', 'Chicken breast', 'Turmeric', 'Leafy greens', 'Olive oil', 'Berries', 'Walnuts'],
  [key('tone-up', 'carnivore')]: ['Beef sirloin', 'Eggs', 'Chicken breast', 'Salmon', 'Turkey', 'Pork tenderloin', 'Liver'],
  [key('tone-up', 'flexitarian')]: ['Chicken (3–4×/wk)', 'Tofu', 'Lentils', 'Eggs', 'Quinoa', 'Greek yoghurt', 'Broccoli'],

  // ── lose-weight-fast ──────────────────────────────────────────────────────
  [key('lose-weight-fast', 'keto')]: ['Chicken breast', 'Egg whites', 'Spinach', 'Salmon', 'Cauliflower rice', 'Broccoli', 'Cucumber'],
  [key('lose-weight-fast', 'mediterranean')]: ['Grilled fish', 'Arugula', 'Tomatoes', 'Cucumber', 'Lentils', 'Greek yoghurt', 'Lemon'],
  [key('lose-weight-fast', 'intermittent-fasting')]: ['Lean chicken', 'Broccoli', 'Egg whites', 'Greek yoghurt', 'Berries', 'Leafy greens', 'Tuna'],
  [key('lose-weight-fast', 'low-carb')]: ['Turkey breast', 'Egg whites', 'Courgette', 'Celery', 'Chicken breast', 'Cottage cheese', 'Cucumber'],
  [key('lose-weight-fast', 'calorie-deficit')]: ['Turkey breast', 'Egg whites', 'Broccoli', 'Celery', 'Greek yoghurt', 'Tuna', 'Leafy greens'],
  [key('lose-weight-fast', 'plant-based')]: ['Tofu', 'Broccoli', 'Spinach', 'Lentils', 'Cucumber', 'Berries', 'Green tea'],
  [key('lose-weight-fast', 'paleo')]: ['Lean chicken', 'Egg whites', 'Broccoli', 'Asparagus', 'Berries', 'Turkey', 'Sweet potato (small)'],
  [key('lose-weight-fast', 'vegan')]: ['Tofu', 'Edamame', 'Broccoli', 'Spinach', 'Cucumber', 'Berries', 'Green tea'],
  [key('lose-weight-fast', 'high-protein')]: ['Chicken breast', 'Egg whites', 'Cottage cheese', 'Tuna', 'Turkey', 'Greek yoghurt', 'White fish'],
  [key('lose-weight-fast', 'whole30')]: ['Lean chicken', 'Egg whites', 'Broccoli', 'Asparagus', 'Courgette', 'Berries', 'Salsa'],
  [key('lose-weight-fast', 'dash')]: ['Turkey breast', 'Oats (measured)', 'Spinach', 'Tomatoes', 'Berries', 'Low-fat yoghurt', 'Lentils'],
  [key('lose-weight-fast', 'anti-inflammatory')]: ['Salmon', 'Spinach', 'Turmeric', 'Berries', 'Broccoli', 'Ginger tea', 'Olive oil (measured)'],
  [key('lose-weight-fast', 'carnivore')]: ['Chicken breast (lean)', 'Egg whites', 'Tuna', 'Turkey', 'Lean beef', 'White fish', 'Bone broth'],
  [key('lose-weight-fast', 'flexitarian')]: ['Chicken (4–5×/wk)', 'Tofu', 'Broccoli', 'Egg whites', 'Berries', 'Spinach', 'Greek yoghurt'],

  // ── slim-down ─────────────────────────────────────────────────────────────
  [key('slim-down', 'keto')]: ['Cucumber', 'Salmon', 'Avocado', 'Leafy greens', 'Eggs', 'Asparagus', 'Celery'],
  [key('slim-down', 'mediterranean')]: ['Cucumber', 'Tomatoes', 'Fennel', 'Greek yoghurt', 'Olive oil (measured)', 'Artichoke', 'Lemon'],
  [key('slim-down', 'intermittent-fasting')]: ['Cucumber', 'Watermelon', 'Chicken breast', 'Asparagus', 'Celery', 'Lemon water', 'Ginger'],
  [key('slim-down', 'low-carb')]: ['Cucumber', 'Celery', 'Chicken breast', 'Leafy greens', 'Asparagus', 'Feta', 'Almonds'],
  [key('slim-down', 'calorie-deficit')]: ['Cucumber', 'Celery', 'Watermelon', 'Chicken breast', 'Asparagus', 'Lemon water', 'Greek yoghurt'],
  [key('slim-down', 'plant-based')]: ['Cucumber', 'Celery', 'Leafy greens', 'Tofu', 'Fennel', 'Berries', 'Green tea'],
  [key('slim-down', 'paleo')]: ['Cucumber', 'Asparagus', 'Lean beef', 'Berries', 'Almonds', 'Spinach', 'Watermelon'],
  [key('slim-down', 'vegan')]: ['Cucumber', 'Celery', 'Watermelon', 'Tofu', 'Fennel', 'Leafy greens', 'Peppermint tea'],
  [key('slim-down', 'high-protein')]: ['Chicken breast', 'Egg whites', 'Cottage cheese', 'Cucumber', 'Asparagus', 'Greek yoghurt', 'Tuna'],
  [key('slim-down', 'whole30')]: ['Cucumber', 'Asparagus', 'Chicken breast', 'Berries', 'Leafy greens', 'Courgette', 'Lemon water'],
  [key('slim-down', 'dash')]: ['Celery', 'Cucumber', 'Spinach', 'Oats (measured)', 'Greek yoghurt', 'Berries', 'Asparagus'],
  [key('slim-down', 'anti-inflammatory')]: ['Cucumber', 'Celery', 'Ginger tea', 'Turmeric', 'Leafy greens', 'Berries', 'Fennel'],
  [key('slim-down', 'carnivore')]: ['Lean chicken', 'Egg whites', 'Tuna', 'Turkey', 'Bone broth', 'White fish', 'Sardines'],
  [key('slim-down', 'flexitarian')]: ['Cucumber', 'Chicken (3–4×/wk)', 'Tofu', 'Celery', 'Spinach', 'Berries', 'Green tea'],

  // ── healthy-eating ────────────────────────────────────────────────────────
  [key('healthy-eating', 'keto')]: ['Avocado', 'Salmon', 'Eggs', 'Leafy greens', 'Olive oil', 'Walnuts', 'Cauliflower'],
  [key('healthy-eating', 'mediterranean')]: ['Olive oil', 'Lentils', 'Whole grain bread', 'Salmon', 'Tomatoes', 'Greek yoghurt', 'Walnuts'],
  [key('healthy-eating', 'intermittent-fasting')]: ['Oats', 'Eggs', 'Avocado', 'Berries', 'Greek yoghurt', 'Almonds', 'Leafy greens'],
  [key('healthy-eating', 'low-carb')]: ['Eggs', 'Avocado', 'Berries', 'Chicken', 'Nuts', 'Leafy greens', 'Cheese (moderate)'],
  [key('healthy-eating', 'calorie-deficit')]: ['Oats', 'Chicken breast', 'Lentils', 'Mixed vegetables', 'Eggs', 'Greek yoghurt', 'Seasonal fruit'],
  [key('healthy-eating', 'plant-based')]: ['Lentils', 'Chickpeas', 'Quinoa', 'Avocado', 'Berries', 'Dark leafy greens', 'Walnuts'],
  [key('healthy-eating', 'paleo')]: ['Salmon', 'Eggs', 'Sweet potato', 'Berries', 'Almonds', 'Avocado', 'Leafy greens'],
  [key('healthy-eating', 'vegan')]: ['Chickpeas', 'Lentils', 'Quinoa', 'Avocado', 'Berries', 'Leafy greens', 'Nuts'],
  [key('healthy-eating', 'high-protein')]: ['Chicken breast', 'Greek yoghurt', 'Cottage cheese', 'Eggs', 'Lentils', 'Salmon', 'Turkey'],
  [key('healthy-eating', 'whole30')]: ['Chicken', 'Eggs', 'Sweet potato', 'Avocado', 'Salmon', 'Berries', 'Almonds'],
  [key('healthy-eating', 'dash')]: ['Oats', 'Salmon', 'Lentils', 'Berries', 'Low-fat yoghurt', 'Leafy greens', 'Whole grain bread'],
  [key('healthy-eating', 'anti-inflammatory')]: ['Salmon', 'Blueberries', 'Olive oil', 'Turmeric', 'Leafy greens', 'Walnuts', 'Avocado'],
  [key('healthy-eating', 'carnivore')]: ['Salmon', 'Beef', 'Eggs', 'Liver', 'Sardines', 'Bone broth', 'Chicken'],
  [key('healthy-eating', 'flexitarian')]: ['Lentils', 'Salmon (2–3×/wk)', 'Eggs', 'Avocado', 'Berries', 'Oats', 'Leafy greens'],

  // ── body-recomposition ────────────────────────────────────────────────────
  [key('body-recomposition', 'keto')]: ['Lean beef', 'Eggs', 'Avocado', 'Cheese', 'Salmon', 'Spinach', 'Chicken thigh'],
  [key('body-recomposition', 'mediterranean')]: ['Grilled chicken', 'Olive oil', 'Lentils', 'Eggs', 'Greek yoghurt', 'Whole grain pasta', 'Fish'],
  [key('body-recomposition', 'intermittent-fasting')]: ['Lean beef', 'Eggs', 'Brown rice', 'Broccoli', 'Cottage cheese', 'Almonds', 'Greek yoghurt'],
  [key('body-recomposition', 'low-carb')]: ['Chicken breast', 'Eggs', 'Avocado', 'Cottage cheese', 'Lean beef', 'Leafy greens', 'Walnuts'],
  [key('body-recomposition', 'calorie-deficit')]: ['Chicken breast', 'Eggs', 'Greek yoghurt', 'Cottage cheese', 'Brown rice', 'Broccoli', 'Lean beef'],
  [key('body-recomposition', 'plant-based')]: ['Tofu', 'Tempeh', 'Seitan', 'Quinoa', 'Lentils', 'Hemp seeds', 'Edamame'],
  [key('body-recomposition', 'paleo')]: ['Chicken breast', 'Eggs', 'Sweet potato', 'Almonds', 'Lean beef', 'Salmon', 'Berries'],
  [key('body-recomposition', 'vegan')]: ['Tofu', 'Tempeh', 'Seitan', 'Quinoa', 'Hemp seeds', 'Lentils', 'Chickpeas'],
  [key('body-recomposition', 'high-protein')]: ['Chicken breast', 'Eggs', 'Cottage cheese', 'Greek yoghurt', 'Lean beef', 'Turkey', 'Whey protein'],
  [key('body-recomposition', 'whole30')]: ['Chicken breast', 'Eggs', 'Sweet potato', 'Almonds', 'Lean beef', 'Salmon', 'Broccoli'],
  [key('body-recomposition', 'dash')]: ['Lean turkey', 'Low-fat cottage cheese', 'Quinoa', 'Leafy greens', 'Walnuts', 'Lentils', 'Eggs'],
  [key('body-recomposition', 'anti-inflammatory')]: ['Salmon', 'Turmeric', 'Dark leafy greens', 'Eggs', 'Olive oil', 'Blueberries', 'Walnuts'],
  [key('body-recomposition', 'carnivore')]: ['Beef sirloin', 'Eggs', 'Chicken breast', 'Salmon', 'Turkey', 'Pork tenderloin', 'Liver'],
  [key('body-recomposition', 'flexitarian')]: ['Chicken (3–4×/wk)', 'Tofu', 'Eggs', 'Lentils', 'Quinoa', 'Greek yoghurt', 'Sweet potato'],
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

  // ── burn-fat ──────────────────────────────────────────────────────────────
  [key('burn-fat', 'keto')]: [
    'Using high-fat dairy freely — fat calories still count and a tablespoon of butter is 100 kcal.',
    'Relying on fasted cardio as the main strategy — total 24-hour fat balance matters more than the fasted state.',
    'Skipping resistance training — without muscle stimulus, the body burns lean mass alongside fat.',
  ],
  [key('burn-fat', 'mediterranean')]: [
    'Over-pouring olive oil — 1 tablespoon is 120 kcal; mediterranean portions are measured, not free-poured.',
    'Eating generous legume portions without tracking — they add substantial carbohydrate and calorie load.',
    'Neglecting resistance training — the Mediterranean diet alone without exercise burns muscle as readily as fat.',
  ],
  [key('burn-fat', 'intermittent-fasting')]: [
    'Breaking the fast with a large mixed meal immediately — an insulin spike blunts fat oxidation for hours.',
    'Drinking sweetened beverages during the fasting window — any caloric drink breaks the fast.',
    'Using IF as a proxy for calorie control — you can easily overeat within an 8-hour window.',
  ],
  [key('burn-fat', 'low-carb')]: [
    'Over-eating saturated fat without tracking total calories — low-carb removes one lever but not the calorie equation.',
    'Skipping electrolyte replacement — lower insulin excretion from low-carb increases sodium loss, causing exercise fatigue.',
    'Expecting the same rapid scale drop as keto — low-carb does not produce the initial glycogen-water loss that strict keto creates.',
  ],
  [key('burn-fat', 'calorie-deficit')]: [
    'Cutting calories so aggressively that training intensity drops — fat oxidation requires aerobic capacity that adequate fuelling supports.',
    'Tracking calories but not protein — under-eating protein causes the deficit to come from muscle, not fat.',
    'Doing only cardio for the deficit — resistance training shifts the fat-to-muscle loss ratio significantly in your favour.',
  ],
  [key('burn-fat', 'plant-based')]: [
    'Using nuts and seeds as the primary protein — they are very calorie-dense and quickly erase a deficit.',
    'Not supplementing creatine — deficiency reduces high-intensity training performance needed for maximal fat burning.',
    'Eating too many starchy carbs for protein completeness — easy to over-consume when combining grains and legumes.',
  ],
  [key('burn-fat', 'paleo')]: [
    'Eating too much nut butter — paleo-friendly but calorically dense; two tablespoons equals 200 kcal.',
    'Using large portions of red meat as the default protein — excess calories even from whole foods prevents fat burning.',
    'Not tracking sweet potato and fruit intake — natural sugars raise insulin and affect fat oxidation timing.',
  ],
  [key('burn-fat', 'vegan')]: [
    'Treating avocado and coconut products as unlimited — plant-based fat sources are calorically dense regardless of origin.',
    'Not supplementing iron — deficiencies reduce VO2 max and exercise capacity, limiting fat-burning workout intensity.',
    'Using plant-based protein bars as meal replacements — most are calorie-dense and sugar-laden despite being vegan.',
  ],
  [key('burn-fat', 'high-protein')]: [
    'Setting protein so high that dietary fat drops below sustainable levels — fat is essential for hormone production including those regulating metabolism.',
    'Over-relying on shakes for protein — whole food protein sources have a higher thermic effect and are superior for fat burning.',
    'Assuming high protein alone creates the deficit — protein calories still count toward your total.',
  ],
  [key('burn-fat', 'whole30')]: [
    'Eating too many dates and dried fruit — Whole30-compliant but extremely calorie and sugar dense.',
    'Treating nuts and coconut aminos as free foods — compliant does not mean unlimited.',
    'Not tracking calories during Whole30 — the protocol omits tracking, so most people underestimate intake and stall fat loss.',
  ],
  [key('burn-fat', 'dash')]: [
    'Not adjusting sodium strategically — very low sodium impairs exercise performance and reduces fat-burning workout intensity.',
    'Consuming too many whole grain servings — DASH allows generous grain portions that can easily exceed a fat-loss calorie target.',
    'Relying on blood pressure benefits without addressing total calorie intake for fat loss specifically.',
  ],
  [key('burn-fat', 'anti-inflammatory')]: [
    'Pouring olive oil generously — the foundation of anti-inflammatory eating but the most calorie-dense food (9 kcal/g).',
    'Focusing on omega-3s while ignoring total calorie intake — inflammation reduction does not automatically create a deficit.',
    'Eating unlimited nuts and seeds — anti-inflammatory staples are extremely calorie-dense and must be measured.',
  ],
  [key('burn-fat', 'carnivore')]: [
    'Eating exclusively fatty cuts — ribeye and brisket have 3–4× the calories of lean cuts per 100 g.',
    'Not tracking total food intake — carnivore is satiating, but "eat until full" can still exceed a fat-loss calorie target.',
    'Training hard without any carbohydrate support — glycolytic exercise performance drops significantly on carnivore, reducing fat-burning capacity.',
  ],
  [key('burn-fat', 'flexitarian')]: [
    'Not planning the plant-based days — unstructured plant days often result in high-carb, low-protein meals that don\'t support fat burning.',
    'Eating larger portions on meat-containing days to compensate — calorie consistency across all days matters.',
    'Using the "flexitarian" label to excuse inconsistency — the fat-burning benefit comes from the cumulative deficit, not the diet name.',
  ],

  // ── tone-up ───────────────────────────────────────────────────────────────
  [key('tone-up', 'keto')]: [
    'Cutting carbs before high-intensity training sessions — glycogen depletion reduces workout intensity and undermines the muscle stimulus needed for toning.',
    'Not hitting 1.8–2.2 g/kg protein on keto — fat should fill calories after protein is met, not the other way around.',
    'Expecting toning from diet alone — the "tone" comes from muscle built through resistance training, not keto itself.',
  ],
  [key('tone-up', 'mediterranean')]: [
    'Treating the Mediterranean diet as a general wellness plan without a calorie target — without a deficit, fat won\'t reduce to reveal muscle.',
    'Under-eating protein — Mediterranean portions of fish and legumes often fall short of the 1.8–2.2 g/kg needed for muscle preservation.',
    'Skipping structured resistance training — toning requires progressive overload, not just activity.',
  ],
  [key('tone-up', 'intermittent-fasting')]: [
    'Training fasted and then not prioritising protein in the first post-workout meal — muscle protein synthesis peaks in the post-training window.',
    'Distributing protein across only one or two meals — toning requires adequate leucine intake at each meal to trigger muscle protein synthesis.',
    'Using IF as the primary strategy without tracking total protein and calories.',
  ],
  [key('tone-up', 'low-carb')]: [
    'Restricting carbs so much that training performance drops — reduced workout intensity limits the muscle stimulus needed for toning.',
    'Confusing low-carb with low-protein — fat should fill remaining calories after protein, not replace it.',
    'Neglecting post-workout carbohydrate — a small carb intake after resistance training improves recovery without breaking low-carb targets.',
  ],
  [key('tone-up', 'calorie-deficit')]: [
    'Setting the deficit too aggressively — a deficit greater than 500 kcal/day accelerates muscle loss and prevents toning.',
    'Focussing only on cardio in the deficit — resistance training is the direct stimulus for muscle definition.',
    'Not eating enough protein — without 1.8–2.2 g/kg/day, the deficit eats into muscle, not fat.',
  ],
  [key('tone-up', 'plant-based')]: [
    'Under-estimating protein needs — plant proteins have lower bioavailability; aim for 2.0–2.4 g/kg to match the effect of 1.8 g/kg from animal sources.',
    'Relying on processed vegan meat products as primary protein — they are often high in sodium and low in leucine.',
    'Skipping creatine supplementation — one of the most evidence-backed supplements for muscle retention during a deficit.',
  ],
  [key('tone-up', 'paleo')]: [
    'Eating too much fruit and sweet potato — paleo-compliant but can add sufficient carbohydrate to stall fat loss if not measured.',
    'Not tracking total protein intake — paleo emphasises food quality but doesn\'t automatically deliver adequate protein for toning.',
    'Avoiding all dairy — Greek yoghurt and cottage cheese are highly effective protein sources that paleo excludes unnecessarily for toning goals.',
  ],
  [key('tone-up', 'vegan')]: [
    'Not combining complementary proteins (grains + legumes) — incomplete amino acid profiles reduce muscle protein synthesis.',
    'Avoiding creatine because it\'s animal-derived — synthetic creatine monohydrate is vegan and significantly aids muscle retention during a deficit.',
    'Under-eating total calories in an attempt to lose fat fast — recomposition requires near-maintenance calories, not aggressive restriction.',
  ],
  [key('tone-up', 'high-protein')]: [
    'Setting protein so high (3+ g/kg) that carbohydrates drop too low to fuel resistance training sessions.',
    'Eating protein without adjusting training intensity — protein without progressive overload does not produce muscle definition.',
    'Neglecting carbohydrate timing around workouts — even in a high-protein plan, pre- and post-workout carbs improve session quality.',
  ],
  [key('tone-up', 'whole30')]: [
    'Not tracking total protein intake on Whole30 — the protocol focuses on food quality, not muscle-supporting protein targets.',
    'Treating Whole30 as a short-term challenge rather than a foundation for sustainable toning habits.',
    'Eating too many nuts and compliant snacks between meals — excess calories stall the fat loss needed to reveal muscle definition.',
  ],
  [key('tone-up', 'dash')]: [
    'Under-eating protein on DASH — the standard plan emphasises grains and dairy volume but often falls short of the 1.8 g/kg needed for toning.',
    'Avoiding resistance training on DASH — the diet supports cardiovascular health but toning requires a strength component.',
    'Consuming too many whole grain portions — DASH allows generous grain servings that can easily exceed a toning calorie target.',
  ],
  [key('tone-up', 'anti-inflammatory')]: [
    'Consuming excessive olive oil and nuts for their anti-inflammatory benefits without tracking calorie impact.',
    'Confusing reduced inflammation with visible toning — inflammation reduction improves recovery but definition requires a calorie deficit and resistance training.',
    'Under-eating protein in favour of plant foods — anti-inflammatory eating must be deliberately structured to hit 1.8–2.2 g/kg for toning.',
  ],
  [key('tone-up', 'carnivore')]: [
    'Eating fatty cuts exclusively — high fat intake on carnivore can easily create a calorie surplus that prevents fat reduction.',
    'Neglecting electrolytes — carnivore increases sodium and potassium excretion, causing energy crashes that undermine training sessions.',
    'Using carnivore without resistance training — a high-protein diet without training stimulus does not produce visible muscle definition.',
  ],
  [key('tone-up', 'flexitarian')]: [
    'Eating inconsistently across plant and meat days — protein intake must be consistently high every day for muscle retention.',
    'Not planning plant-based days for protein completeness — unstructured plant days often fall well below the protein target.',
    'Treating flexitarian as a passive approach — deliberate protein and calorie tracking is as important as food quality.',
  ],

  // ── lose-weight-fast ──────────────────────────────────────────────────────
  [key('lose-weight-fast', 'keto')]: [
    'Starting fast weight loss on keto simultaneously — the keto adaptation period (2–4 weeks) reduces exercise capacity right when you need a large deficit.',
    'Not tracking electrolytes — at an aggressive deficit on keto, sodium and magnesium depletion causes crashes that derail consistency.',
    'Confusing initial rapid water loss (3–5 kg in week one) with sustained fat loss rate.',
  ],
  [key('lose-weight-fast', 'mediterranean')]: [
    'Using Mediterranean food quality as justification for generous portions — olive oil, nuts, and whole grains are calorie-dense.',
    'Not hitting adequate protein during a large deficit — under 1.8 g/kg at 750–1000 kcal deficit significantly accelerates muscle loss.',
    'Expecting Mediterranean eating to produce fast results without strict calorie control — the diet is health-supporting but not inherently fast-loss.',
  ],
  [key('lose-weight-fast', 'intermittent-fasting')]: [
    'Combining IF with a very large deficit and high-intensity training — the combination increases cortisol and accelerates muscle loss.',
    'Breaking a long fast with high-calorie foods because you "deserve it" — the fasting window does not create a calorie budget.',
    'Not planning adequate protein within the eating window — 1.8–2.2 g/kg must be consumed within a compressed timeframe.',
  ],
  [key('lose-weight-fast', 'low-carb')]: [
    'Confusing a low-carb approach with licence to eat unlimited fat — calories still govern fast weight loss.',
    'Under-eating protein during the large deficit — muscle loss at aggressive deficits is substantially higher without adequate protein.',
    'Not planning a 1-week maintenance break every 4 weeks — metabolic adaptation accelerates with continuous aggressive restriction.',
  ],
  [key('lose-weight-fast', 'calorie-deficit')]: [
    'Setting a deficit so large (over 1000 kcal/day) that it is unsustainable past week 2.',
    'Not planning a structured 1-week break every 4–5 weeks — diet breaks prevent the metabolic adaptation that halts progress.',
    'Eating the same foods every day to simplify tracking — food boredom is the primary driver of abandonment on fast-loss plans.',
  ],
  [key('lose-weight-fast', 'plant-based')]: [
    'Under-eating protein — at a large deficit, plant protein bioavailability demands even higher intake to prevent muscle loss.',
    'Eating high-calorie-density plant foods (nuts, seeds, oils) to feel full — this quickly erodes the large deficit required.',
    'Not meal-prepping — plant-based fast-loss diets require preparation to ensure adequate protein without defaulting to starchy foods.',
  ],
  [key('lose-weight-fast', 'paleo')]: [
    'Eating large portions of paleo-compliant calorie-dense foods (nuts, avocado, fatty meats) — paleo compliance does not equal fast weight loss.',
    'Not tracking — the paleo approach naturally discourages measuring; fast results require precision.',
    'Training at high intensity while in a large deficit on paleo — without carbohydrate support, performance drops sharply.',
  ],
  [key('lose-weight-fast', 'vegan')]: [
    'Under-eating protein — vegan fast-loss plans must deliberately engineer high protein (tofu, tempeh, seitan, edamame) at every meal.',
    'Eating large amounts of bread, pasta, and rice for convenience — starchy plant foods are easy to over-consume and stall fast loss.',
    'Combining a large deficit with inadequate B12 and iron — deficiencies reduce energy and exercise capacity, making the aggressive plan feel unsustainable.',
  ],
  [key('lose-weight-fast', 'high-protein')]: [
    'Eating so much protein (3+ g/kg) that fat intake drops below 20% of calories — severely low dietary fat disrupts hormone production during an already stressful large deficit.',
    'Relying on protein shakes for convenience at the expense of volume — liquid calories don\'t fill you the same way solid food does.',
    'Expecting scale drops greater than 1.5 kg/week to be sustainable — beyond week one water loss, fat loss caps at roughly 1 kg/week even at large deficits.',
  ],
  [key('lose-weight-fast', 'whole30')]: [
    'Treating Whole30 as a fast-loss protocol by default — without deliberate calorie control, Whole30 can easily be over-eaten.',
    'Eating too many Whole30-compliant snacks (dates, nut butter, fruit) — compliant foods can easily add 400–600 kcal between meals.',
    'Not planning beyond the 30-day window — fast weight loss requires structured continuation, not a reset back to old habits.',
  ],
  [key('lose-weight-fast', 'dash')]: [
    'Following DASH portion sizes without calculating a specific calorie deficit — DASH is designed for health, not aggressive fat loss.',
    'Consuming the maximum recommended grain servings on DASH — at a fast-loss deficit, grain portions need to be reduced below DASH defaults.',
    'Expecting DASH to produce fast results — the diet is inherently moderate; a specific calorie target must be added.',
  ],
  [key('lose-weight-fast', 'anti-inflammatory')]: [
    'Using high-calorie anti-inflammatory foods (olive oil, nuts, fatty fish) without measuring portions — inflammation reduction does not offset calories.',
    'Combining a very large deficit with high stress — chronic stress is itself inflammatory and undermines the fast-loss goal.',
    'Prioritising anti-inflammatory eating quality at the expense of calorie tracking — both must be managed simultaneously.',
  ],
  [key('lose-weight-fast', 'carnivore')]: [
    'Eating fatty meat freely because "carnivore is satiating" — a 750–1000 kcal deficit still requires deliberate portion sizing.',
    'Not adjusting electrolytes aggressively — carnivore combined with a large deficit causes severe electrolyte depletion.',
    'Expecting the initial water loss from carnivore (glycogen depletion) to continue — real fat loss follows, but at a much slower rate.',
  ],
  [key('lose-weight-fast', 'flexitarian')]: [
    'Being "flexible" on the most important days — fast weight loss requires consistent calorie control regardless of whether it\'s a plant or meat day.',
    'Using plant days as lower-effort days — under-eating protein on plant days while over-eating on meat days averages to poor results.',
    'Not tracking on restaurant or social eating days — these are the highest-risk occasions for fast-loss plans.',
  ],

  // ── slim-down ─────────────────────────────────────────────────────────────
  [key('slim-down', 'keto')]: [
    'Confusing keto water-weight loss with body size reduction — the initial 2–4 kg loss is glycogen and water, not fat or size.',
    'Not reducing sodium even while on keto — excess sodium causes water retention that counteracts slimming despite the diet.',
    'Eating too much fat to compensate for low carbs — keto slimming still requires a calorie deficit.',
  ],
  [key('slim-down', 'mediterranean')]: [
    'Not reducing sodium intake — even healthy Mediterranean foods like olives, feta, and canned fish are high in sodium and worsen water retention.',
    'Drinking wine regularly — alcohol causes water retention and adds calories that directly work against slimming.',
    'Expecting the Mediterranean diet alone to slim without a calorie deficit — food quality does not substitute for energy balance.',
  ],
  [key('slim-down', 'intermittent-fasting')]: [
    'Breaking the fast with high-sodium foods — salt retention in the eating window defeats the anti-bloat benefit of fasting.',
    'Drinking only coffee and tea during the fasting window — adequate hydration (2+ litres) reduces water retention and supports slimming.',
    'Using IF to compensate for high-calorie meals — the eating window must still be within your total calorie target.',
  ],
  [key('slim-down', 'low-carb')]: [
    'Not distinguishing water-weight loss from fat loss — initial low-carb slimming is largely glycogen and water.',
    'Reintroducing high-sodium processed foods while cutting carbs — sodium retention masks the slimming effect.',
    'Confusing low-carb compliance with a calorie deficit — without a deficit, body fat does not reduce.',
  ],
  [key('slim-down', 'calorie-deficit')]: [
    'Under-drinking water — dehydration paradoxically increases water retention and bloating.',
    'Eating high-sodium foods within your calorie target — calories can be on track but water retention prevents visible slimming.',
    'Not including fibre-rich foods — poor gut motility causes bloating that masks slimming progress despite fat loss.',
  ],
  [key('slim-down', 'plant-based')]: [
    'Over-eating legumes and cruciferous vegetables — nutritious but high in fermentable fibre that causes bloating in early stages.',
    'Not managing sodium in plant-based convenience foods — tinned beans, soy sauce, and plant milks often add significant hidden sodium.',
    'Expecting plant-based eating alone to slim without a calorie target — food quality does not offset energy surplus.',
  ],
  [key('slim-down', 'paleo')]: [
    'Eating too much red meat and salt — paleo-compliant cured meats and salted nuts contribute sodium-driven water retention.',
    'Not tracking fruit intake — natural fruit sugars are paleo-friendly but can contribute to bloating and excess calories.',
    'Treating paleo compliance as sufficient — a calorie deficit is still required for body size reduction.',
  ],
  [key('slim-down', 'vegan')]: [
    'Over-eating cruciferous vegetables and lentils before the gut adapts — fermentable carbohydrates cause significant early-stage bloating.',
    'Relying on soy-based products with high sodium — processed vegan foods commonly contain sodium levels that drive water retention.',
    'Expecting rapid slimming from plant-based eating without reducing calories — volume eating can easily match or exceed your target.',
  ],
  [key('slim-down', 'high-protein')]: [
    'Under-drinking water with high protein intake — inadequate hydration increases water retention and reduces the slimming effect.',
    'Eating high-protein processed foods (deli meat, protein bars) with excess sodium — the slimming goal requires low-sodium protein sources.',
    'Neglecting fibre — high-protein diets without adequate vegetables cause constipation that directly opposes slimming.',
  ],
  [key('slim-down', 'whole30')]: [
    'Eating large amounts of Whole30-compliant dried fruit — high sugar content causes insulin spikes and water retention.',
    'Not tracking sodium — even Whole30-compliant sauces and condiments can contain significant sodium.',
    'Treating Whole30 as inherently slimming — the protocol does not automatically create a calorie deficit.',
  ],
  [key('slim-down', 'dash')]: [
    'Consuming maximum sodium allowed on DASH (2300 mg/day) — slimming benefits are greater at the lower 1500 mg/day DASH target.',
    'Eating maximum recommended grain and dairy servings — these can add more calories than a slimming deficit allows.',
    'Not increasing water intake — DASH without 2+ litres of water daily does not maximise the slimming effect.',
  ],
  [key('slim-down', 'anti-inflammatory')]: [
    'Using excessive olive oil and avocado — their anti-inflammatory properties are real, but the calorie density works against slimming.',
    'Not reducing sodium in anti-inflammatory condiments — soy sauce, miso, and tamari are anti-inflammatory but high sodium.',
    'Treating reduced inflammation as equivalent to slimming — they are related but require separate interventions.',
  ],
  [key('slim-down', 'carnivore')]: [
    'Eating cured and processed meats — high sodium in deli meats, bacon, and jerky causes the water retention that prevents slimming.',
    'Confusing the initial water-weight loss from carnivore with ongoing slimming.',
    'Not tracking portion sizes — carnivore removes dietary variety but not calorie density; red meat portions matter.',
  ],
  [key('slim-down', 'flexitarian')]: [
    'Eating high-sodium plant foods on plant days and cured meats on meat days — a double sodium load from both directions.',
    'Not planning consistent water intake across all diet days — hydration reduces retention regardless of whether it\'s a plant or meat day.',
    'Using flexibility as an excuse for inconsistency — slimming requires consistent calorie and sodium management every day.',
  ],

  // ── healthy-eating ────────────────────────────────────────────────────────
  [key('healthy-eating', 'keto')]: [
    'Choosing processed keto products (bars, fat bombs) over whole foods — these undermine the healthy-eating goal.',
    'Over-eating saturated fat without considering cardiovascular context — healthy keto emphasises unsaturated fats like olive oil and avocado.',
    'Assuming keto compliance equals healthy eating — nutrient variety is still important and often limited on strict keto.',
  ],
  [key('healthy-eating', 'mediterranean')]: [
    'Drinking wine regularly as part of the "Mediterranean lifestyle" — the diet\'s health benefits are independent of alcohol, which adds empty calories.',
    'Using olive oil generously on everything — healthy fat, but portion control still applies to calorie management.',
    'Eating white bread or refined grains in place of the whole grain versions — the health benefit depends entirely on food quality.',
  ],
  [key('healthy-eating', 'intermittent-fasting')]: [
    'Breaking the fast with ultra-processed "healthy" foods — IF does not compensate for poor food quality within the eating window.',
    'Using the fasting window as justification for a large eating window meal — healthy eating requires quality regardless of timing.',
    'Treating IF as a permanent cure rather than a tool — some people thrive on it; others experience worse food relationships.',
  ],
  [key('healthy-eating', 'low-carb')]: [
    'Avoiding all carbohydrates including vegetables and legumes — low-carb healthy eating should restrict refined carbs, not fibre-rich whole foods.',
    'Eating high quantities of processed low-carb products — these often contain artificial sweeteners and additives inconsistent with healthy-eating goals.',
    'Under-eating fibre — low-carb diets commonly restrict fibre sources, which negatively impacts gut health.',
  ],
  [key('healthy-eating', 'calorie-deficit')]: [
    'Labelling low-calorie processed foods as "healthy" — a low-calorie food can still be nutritionally poor.',
    'Restricting too aggressively — chronic under-eating undermines metabolism and creates an unhealthy relationship with food.',
    'Treating calorie tracking as the goal rather than a tool — the aim is long-term whole food habits, not permanent measurement.',
  ],
  [key('healthy-eating', 'plant-based')]: [
    'Assuming plant-based equals healthy — highly processed vegan foods (chips, sugary drinks, white bread) are plant-based but not health-supporting.',
    'Under-eating protein — plant-based healthy eating requires deliberate protein planning with legumes, tofu, and whole grains.',
    'Not supplementing B12 — deficiency is universal in fully plant-based diets and directly affects energy and neurological health.',
  ],
  [key('healthy-eating', 'paleo')]: [
    'Treating paleo as automatically healthy — large quantities of red meat and coconut oil are paleo-compliant but not universally health-optimal.',
    'Eliminating all legumes and whole grains — both have strong evidence for cardiovascular and metabolic health benefits.',
    'Over-eating paleo-compliant snacks (trail mix, nut butter) — healthy ingredients in calorie-dense combinations still contribute to weight gain.',
  ],
  [key('healthy-eating', 'vegan')]: [
    'Equating vegan with healthy — french fries, Oreos, and soda are technically vegan.',
    'Not planning for adequate omega-3s — ALA from flaxseeds and walnuts converts poorly to DHA; consider an algae-based supplement.',
    'Changing everything at once — adding one new whole food per week produces more durable habits than a wholesale diet overhaul.',
  ],
  [key('healthy-eating', 'high-protein')]: [
    'Sourcing protein primarily from processed meats and protein bars — these conflict with the healthy-eating objective.',
    'Ignoring micronutrient quality in favour of hitting the protein target — healthy eating requires vegetables, fibre, and variety beyond protein.',
    'Setting protein targets so high that food variety is sacrificed — variety is a core principle of healthy eating.',
  ],
  [key('healthy-eating', 'whole30')]: [
    'Treating Whole30 as the destination rather than a reset — reintroducing problematic foods after the 30 days defeats the purpose.',
    'Eating compliant but calorie-dense foods freely — Whole30 does not automatically produce a healthy weight.',
    'Not using the reintroduction phase — the structured reintroduction identifies individual food sensitivities, which is the most health-valuable part of Whole30.',
  ],
  [key('healthy-eating', 'dash')]: [
    'Following the DASH servings guide without adjusting to personal calorie needs — the template is a starting point, not a fixed prescription.',
    'Choosing low-fat dairy products that substitute fat with sugar — many low-fat yoghurts and milk alternatives contain added sugar.',
    'Treating DASH as medical treatment rather than a dietary framework — it works best combined with general lifestyle improvements.',
  ],
  [key('healthy-eating', 'anti-inflammatory')]: [
    'Expecting specific foods to "cancel out" unhealthy patterns — turmeric in coffee does not compensate for a diet of processed foods.',
    'Over-supplementing anti-inflammatory nutrients in pill form instead of whole food sources — food-based intake is consistently superior.',
    'Neglecting sleep and stress management — chronic inflammation is driven equally by lifestyle factors as by diet.',
  ],
  [key('healthy-eating', 'carnivore')]: [
    'Eliminating all plant foods in the name of carnivore health benefits — fibre, phytonutrients, and antioxidants from plants have robust evidence for long-term health.',
    'Not monitoring blood lipids — saturated fat intake on carnivore can significantly alter cholesterol profiles.',
    'Treating carnivore as a permanent healthy-eating strategy — most longevity research supports diverse diets with ample vegetables.',
  ],
  [key('healthy-eating', 'flexitarian')]: [
    'Using "flexitarian" to justify eating processed meat and plant foods interchangeably — the health benefit comes from whole food plant meals, not just reduced meat.',
    'Not planning the plant-based days — unstructured plant days default to pasta, bread, and cheese rather than vegetables and legumes.',
    'Treating every meal as a negotiation rather than building consistent whole-food habits.',
  ],

  // ── body-recomposition ────────────────────────────────────────────────────
  [key('body-recomposition', 'keto')]: [
    'Eating in a large deficit expecting recomposition — body recomposition requires maintenance or slight deficit calories, not aggressive restriction.',
    'Not tracking protein rigorously on keto — fat tends to fill calories by default; protein (2.0–2.4 g/kg) must be deliberately prioritised.',
    'Expecting fast body composition changes — recomposition is slower than a cut or bulk; 3–6 months of consistent effort is required.',
  ],
  [key('body-recomposition', 'mediterranean')]: [
    'Under-eating protein on Mediterranean — the diet\'s fish and legume portions often fall short of the 2.0–2.4 g/kg needed for recomposition.',
    'Setting a large calorie deficit — recomposition requires near-maintenance calories for the muscle-building half to work.',
    'Skipping resistance training — the Mediterranean diet is health-supportive but recomposition is impossible without progressive overload.',
  ],
  [key('body-recomposition', 'intermittent-fasting')]: [
    'Combining a large fasting window with high-intensity training — compressed eating windows at maintenance calories make adequate protein very difficult.',
    'Eating at a significant deficit within the eating window — recomposition works at maintenance, not 500+ kcal below.',
    'Distributing protein unevenly — muscle protein synthesis requires adequate leucine at each meal, which is hard to achieve in 1–2 eating occasions.',
  ],
  [key('body-recomposition', 'low-carb')]: [
    'Severely restricting carbohydrates while trying to build muscle — glycogen from carbs fuels the resistance training sessions that drive the muscle-building half of recomposition.',
    'Not eating at maintenance — recomposition requires near-maintenance calorie intake, not a traditional fat-loss deficit.',
    'Tracking weight as the primary progress metric — recomposition rarely shows significant scale change; use body measurements and strength.',
  ],
  [key('body-recomposition', 'calorie-deficit')]: [
    'Using a 500+ kcal deficit — recomposition requires a 0–300 kcal deficit maximum; larger deficits prioritise fat loss over muscle gain.',
    'Not periodising calorie intake — eating at maintenance on training days and slight deficit on rest days optimises recomposition.',
    'Tracking only scale weight — muscle gain masks fat loss; use body measurements, photos, and strength metrics.',
  ],
  [key('body-recomposition', 'plant-based')]: [
    'Under-eating protein — recomposition requires 2.0–2.4 g/kg; plant protein bioavailability demands even higher intake.',
    'Eating in a significant deficit — recomposition is a near-maintenance strategy; a large plant-based deficit prioritises fat loss over the muscle gain component.',
    'Not tracking leucine intake — leucine is the amino acid that triggers muscle protein synthesis and is lower in most plant proteins.',
  ],
  [key('body-recomposition', 'paleo')]: [
    'Avoiding all starchy carbohydrates — sweet potato and fruit post-workout are important for glycogen replenishment that supports the muscle-building component.',
    'Eating in too large a deficit — paleo restriction can inadvertently create a 500+ kcal deficit, converting a recomposition strategy into a fat-loss diet.',
    'Not tracking progress beyond the scale — body recomposition often shows no scale change for weeks while body composition improves significantly.',
  ],
  [key('body-recomposition', 'vegan')]: [
    'Under-eating total calories — vegan diets can easily fall below maintenance on high-volume, low-calorie-density whole foods.',
    'Not supplementing creatine — one of the most evidence-backed supplements for muscle retention and strength, and commonly deficient on vegan diets.',
    'Expecting the same recomposition rate as omnivores — plant protein quality differences mean results may be slower; consistency over 6+ months is required.',
  ],
  [key('body-recomposition', 'high-protein')]: [
    'Setting protein so high (3+ g/kg) that calorie intake rises above maintenance — a surplus at high protein still creates fat gain alongside muscle gain.',
    'Not adjusting calories to training volume — maintenance intake on a rest day may be a surplus on a low-activity day.',
    'Expecting protein alone to drive recomposition — progressive resistance training with increasing loads is equally important as nutrition.',
  ],
  [key('body-recomposition', 'whole30')]: [
    'Treating Whole30 as a recomposition plan by default — without deliberate calorie and protein targets, the protocol doesn\'t produce recomposition.',
    'Eating in too large a deficit — Whole30 food quality improvements often create inadvertent restriction; recomposition requires near-maintenance.',
    'Not tracking protein — Whole30 does not require tracking, but recomposition demands precision around the 2.0–2.4 g/kg protein target.',
  ],
  [key('body-recomposition', 'dash')]: [
    'Following DASH grain servings without adjusting for recomposition protein needs — standard DASH is not calibrated for the 2.0–2.4 g/kg protein recomposition requires.',
    'Eating in a large deficit — DASH for recomposition must be calibrated to maintenance, not fat loss.',
    'Using cardiovascular-focused exercise as the primary training — recomposition requires progressive resistance training, which DASH health guidelines don\'t emphasise.',
  ],
  [key('body-recomposition', 'anti-inflammatory')]: [
    'Using anti-inflammatory eating as the primary strategy for recomposition — inflammation management supports recovery but the recomposition stimulus comes from resistance training.',
    'Under-eating protein in favour of anti-inflammatory plant foods — anti-inflammatory diets tend toward lower protein unless deliberately planned.',
    'Not tracking calories to maintenance — anti-inflammatory food quality can mask inadvertent under-eating that prevents muscle synthesis.',
  ],
  [key('body-recomposition', 'carnivore')]: [
    'Eating in a large deficit — carnivore\'s appetite-suppressing effect often creates a bigger deficit than intended, prioritising fat loss over recomposition.',
    'Not including post-workout carbohydrates — glycogen supports the training intensity required for the muscle-building component of recomposition.',
    'Measuring success only by scale weight — body recomposition on carnivore may show unchanged weight while body composition improves significantly.',
  ],
  [key('body-recomposition', 'flexitarian')]: [
    'Under-eating protein on plant days — flexitarian recomposition requires protein targets to be hit consistently on every day, not just meat days.',
    'Eating in a large deficit on plant days to "compensate" for meat days — recomposition requires consistent near-maintenance across the week.',
    'Not tracking strength progression as a recomposition metric — increasing training loads confirm that the muscle-building half of recomposition is working.',
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
