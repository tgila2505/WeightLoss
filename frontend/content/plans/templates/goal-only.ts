import type { GoalType } from '@/lib/seo/pseo-combinations';

const GOAL_INTRO: Record<GoalType, string> = {
  'burn-fat':
    'Burning fat specifically targets stored body fat while preserving lean muscle. This plan combines a moderate calorie deficit with high protein to maximise the ratio of fat lost versus muscle retained — so the scale number matters less than your body composition.',
  'tone-up':
    'Toning up means reducing body fat while building or maintaining muscle — creating a firmer, more defined appearance. This requires a small calorie deficit, high protein, and resistance training. You cannot tone fat; you reveal muscle by losing fat on top of it.',
  'lose-weight-fast':
    'Rapid weight loss requires a larger calorie deficit — typically 750–1000 kcal/day. This plan sets an aggressive but safe target with high protein to minimise muscle loss, and a structured schedule to prevent the metabolic slowdown that undermines fast-loss diets.',
  'slim-down':
    'Slimming down focuses on overall size reduction — losing both fat and water retention for a leaner silhouette. This plan uses a consistent calorie deficit, reduced sodium, and high-volume low-calorie foods to create a significant size change quickly.',
  'healthy-eating':
    'Sustainable fat loss through healthy eating means replacing calorie-dense processed foods with nutrient-dense whole foods — not extreme restriction. This plan focuses on food quality, adequate protein, and building habits that support your weight and health for the long term.',
  'body-recomposition':
    'Body recomposition — simultaneously losing fat and gaining muscle — is achievable at a maintenance or slight deficit when protein intake is high and resistance training is consistent. Progress is slower than a pure cut, but the result is a more favourable body composition without the physical cost of aggressive restriction.',
  'lose-weight':
    'Sustainable weight loss comes down to a consistent calorie deficit combined with adequate protein intake. This plan is built around that principle — giving you the macro targets, food choices, and weekly schedule your body needs to lose fat without sacrificing muscle.',
  'lose-belly-fat':
    'Belly fat (visceral fat) responds particularly well to calorie restriction paired with moderate cardio. This plan combines a structured calorie deficit with foods that minimise insulin spikes — the primary driver of abdominal fat accumulation.',
  'lose-10kg':
    'Losing 10 kg safely takes 10–14 weeks at 0.7–1.0 kg per week. This plan sets your weekly calorie and protein targets, gives you a repeatable meal framework, and tracks your progress so you know you\'re on schedule.',
  'lose-20kg':
    'A 20 kg transformation requires patience and a structured approach. This plan phases your calorie targets across three stages — aggressive deficit, maintenance recalibration, and final push — to prevent metabolic adaptation and keep progress consistent.',
  'get-lean':
    'Getting lean means reducing body fat while preserving (or building) muscle. This plan combines a moderate calorie deficit with high protein intake and resistance training support to shift your body composition without the metabolic cost of aggressive restriction.',
  'lose-5kg':
    'Losing 5 kg is an achievable short-term goal that can be reached in 5–8 weeks with a consistent calorie deficit. This plan focuses on simple, repeatable food choices and a protein-forward approach to drop fat quickly without muscle loss.',
};

const GOAL_FOODS: Record<GoalType, string[]> = {
  'burn-fat': ['Salmon', 'Eggs', 'Green tea', 'Broccoli', 'Chicken breast', 'Almonds', 'Berries'],
  'tone-up': ['Chicken breast', 'Eggs', 'Cottage cheese', 'Brown rice', 'Spinach', 'Almonds', 'Greek yoghurt'],
  'lose-weight-fast': ['Turkey breast', 'Egg whites', 'Broccoli', 'Greek yoghurt', 'Sweet potato', 'Tuna', 'Leafy greens'],
  'slim-down': ['Cucumber', 'Celery', 'Watermelon', 'Chicken breast', 'Asparagus', 'Lemon water', 'Greek yoghurt'],
  'healthy-eating': ['Oats', 'Salmon', 'Lentils', 'Avocado', 'Blueberries', 'Broccoli', 'Whole grain bread'],
  'body-recomposition': ['Lean beef', 'Eggs', 'Quinoa', 'Greek yoghurt', 'Chicken breast', 'Cottage cheese', 'Sweet potato'],
  'lose-weight': ['Chicken breast', 'Greek yoghurt', 'Leafy greens', 'Oats', 'Eggs', 'Lentils', 'Sweet potato'],
  'lose-belly-fat': ['Salmon', 'Avocado', 'Blueberries', 'Broccoli', 'Almonds', 'Green tea', 'Apple cider vinegar'],
  'lose-10kg': ['Turkey mince', 'Cottage cheese', 'Brown rice', 'Asparagus', 'Tuna', 'Chickpeas', 'Banana'],
  'lose-20kg': ['Tofu', 'Quinoa', 'Kale', 'Lean beef', 'Black beans', 'Cauliflower', 'Berries'],
  'get-lean': ['Whey protein', 'Lean chicken', 'Broccoli', 'Brown rice', 'Eggs', 'Almonds', 'Cottage cheese'],
  'lose-5kg': ['Chicken breast', 'Greek yoghurt', 'Oats', 'Eggs', 'Berries', 'Leafy greens', 'Sweet potato'],
};

const GOAL_MISTAKES: Record<GoalType, string[]> = {
  'burn-fat': [
    'Doing only cardio — resistance training is equally important for maximising fat-to-muscle ratio.',
    'Cutting calories too aggressively — a deficit over 1000 kcal/day accelerates muscle loss.',
    'Ignoring sleep — poor sleep increases the proportion of lean mass lost versus fat.',
  ],
  'tone-up': [
    'Avoiding weights because of fear of bulking — women and most men cannot bulk without deliberate effort.',
    'Focusing on the scale — toning increases muscle density; weight may stay the same while composition improves.',
    'Not eating enough protein — without 1.8–2.2 g/kg/day, muscle preservation is impaired.',
  ],
  'lose-weight-fast': [
    'Setting an unsustainable deficit and abandoning the plan after two weeks.',
    'Neglecting protein — at aggressive deficits, muscle loss accelerates without adequate protein.',
    'Confusing water weight loss in week one with fat loss — real fat loss is ~0.5–1.0 kg/week maximum.',
  ],
  'slim-down': [
    'Relying on water manipulation tricks — diuretics and sodium cuts create temporary results only.',
    'Under-eating — very low calorie intakes cause muscle loss and rebound weight gain.',
    'Not distinguishing fat loss from bloating reduction — both contribute to slimming but require different interventions.',
  ],
  'healthy-eating': [
    'Labelling foods as "good" or "bad" — this mindset leads to restriction cycles and overeating.',
    'Assuming healthy food means unlimited portions — calorie density still applies to whole foods.',
    'Changing everything at once — habit-based changes sustain long-term results; gradual substitution works better.',
  ],
  'body-recomposition': [
    'Expecting fast results — recomposition is slower than a pure cut or bulk; 3–6 months is realistic.',
    'Eating in too large a deficit — recomposition works at or near maintenance calories, not a 750 kcal deficit.',
    'Skipping resistance training sessions — progressive overload is the stimulus for the muscle-building half of recomposition.',
  ],
  'lose-weight': [
    'Eating too little protein — muscle loss masks fat loss progress on the scale.',
    'Skipping meals to "save" calories — this triggers overeating later in the day.',
    'Relying on cardio alone without tracking food intake.',
  ],
  'lose-belly-fat': [
    'Targeting belly fat with ab exercises — spot reduction is a myth.',
    'Eating "low-fat" foods that are high in added sugar.',
    'Chronic stress — elevated cortisol directly promotes abdominal fat storage.',
  ],
  'lose-10kg': [
    'Setting a deficit that\'s too aggressive and unsustainable past week 3.',
    'Not accounting for weekends — two days of overeating can negate a week\'s deficit.',
    'Weighing yourself daily and reacting to normal fluctuations.',
  ],
  'lose-20kg': [
    'Treating it as one long diet instead of structured phases with planned breaks.',
    'Ignoring sleep — poor sleep raises ghrelin (hunger hormone) and undermines adherence.',
    'Expecting linear progress — weight loss plateaus are normal and temporary.',
  ],
  'get-lean': [
    'Cutting calories too aggressively — muscle loss will stall the lean look.',
    'Neglecting resistance training while in a deficit.',
    'Confusing "light and flat" with lean — depleted glycogen stores look flat, not lean.',
  ],
  'lose-5kg': [
    'Treating 5 kg as "easy" and underestimating the need for a consistent deficit.',
    'Skipping tracking because the goal feels small — accuracy matters even for modest targets.',
    'Losing mostly water weight in week one and expecting the same rate to continue.',
  ],
};

const GOAL_FAQ: Record<GoalType, Array<{ q: string; a: string }>> = {
  'burn-fat': [
    { q: 'What is the fastest way to burn fat?', a: 'A consistent calorie deficit of 500–750 kcal/day combined with high protein (1.8–2.2 g/kg) and resistance training produces the best fat-to-muscle loss ratio. Fad approaches lose more muscle than fat.' },
    { q: 'Does cardio burn fat better than weights?', a: 'Cardio burns more calories per session; weights build muscle that raises your resting metabolic rate. The combination is superior to either alone for long-term fat loss.' },
    { q: 'Can I target fat loss in specific areas?', a: 'No — spot reduction is a myth. Fat is lost systemically based on genetics. A calorie deficit reduces fat throughout the body.' },
    { q: 'How long to see fat loss results?', a: 'Visible changes in the mirror take 4–6 weeks. Measurable changes (body fat % or measurements) are detectable within 2 weeks of consistent deficit.' },
  ],
  'tone-up': [
    { q: 'What does "toning up" actually mean?', a: 'Toning = lower body fat percentage + visible muscle definition. It requires losing fat (calorie deficit) and maintaining or building muscle (protein + resistance training).' },
    { q: 'How much resistance training do I need to tone up?', a: '2–4 sessions per week of full-body or split resistance training is sufficient. Progressive overload (gradually increasing weight or reps) is essential.' },
    { q: 'Will lifting weights make me bulky?', a: 'No. Significant muscle hypertrophy requires a calorie surplus, high training volume, and months of consistent effort. In a deficit with moderate training, you build shape — not size.' },
    { q: 'How long does it take to tone up?', a: 'Visible toning changes take 8–12 weeks of consistent training and nutrition. Initial changes are in posture and muscle firmness; visible definition appears as body fat decreases.' },
  ],
  'lose-weight-fast': [
    { q: 'How much weight can I safely lose per week?', a: 'A maximum of 1.0–1.5 kg/week is considered safe for most people. A 750–1000 kcal/day deficit achieves this range.' },
    { q: 'Is rapid weight loss dangerous?', a: 'Aggressive deficits (over 1000 kcal/day) for extended periods risk muscle loss, nutrient deficiencies, and metabolic adaptation. Planned 2-week fast-loss phases followed by maintenance breaks are safer.' },
    { q: 'What is the best diet for fast weight loss?', a: 'High protein (1.8–2.2 g/kg), moderate deficit (750–1000 kcal below TDEE), and resistance training produce the fastest body composition improvement.' },
    { q: 'Will I regain weight after losing it fast?', a: 'Rapid weight loss followed by a return to old habits causes rebound. A maintenance phase after reaching your goal — gradually increasing calories back to TDEE — is essential to prevent this.' },
  ],
  'slim-down': [
    { q: 'What is the difference between slimming down and losing weight?', a: 'Slimming down describes reducing body size and bloating — both fat loss and reduced water retention contribute. Losing weight refers specifically to the scale number.' },
    { q: 'How can I slim down my waist specifically?', a: 'A total body calorie deficit reduces waist size. Reducing sodium lowers water retention. Resistance training improves posture, which visually slims the waist even without fat loss.' },
    { q: 'Does drinking water help slim down?', a: '2–3 litres of water per day reduces water retention, supports metabolism, and reduces false hunger signals.' },
    { q: 'How long to slim down noticeably?', a: 'Noticeable slimming — visible in clothing and the mirror — typically takes 3–5 weeks of consistent calorie deficit and reduced sodium.' },
  ],
  'healthy-eating': [
    { q: 'What is the healthiest diet for weight loss?', a: 'The Mediterranean diet has the strongest evidence base for both weight management and long-term health. It emphasises vegetables, legumes, fish, olive oil, and moderate portions without strict restriction.' },
    { q: 'Can I lose weight just by eating healthy?', a: 'Yes, if "eating healthy" means eating less calorie-dense food. Whole foods are naturally lower in calorie density, making it easier to eat at a deficit without strict tracking.' },
    { q: 'Do I need to give up my favourite foods?', a: 'No. Sustainable healthy eating includes moderate amounts of any food. The goal is to make whole foods the majority of your diet, not to eliminate foods you enjoy.' },
    { q: 'How do I start eating healthier without feeling overwhelmed?', a: 'Replace one processed food per week with a whole food equivalent. Focus on adding vegetables to every meal before reducing anything. Habit stacking is more effective than wholesale diet changes.' },
  ],
  'body-recomposition': [
    { q: 'Is body recomposition possible for everyone?', a: 'Body recomposition is easiest for beginners, people returning after a break (muscle memory), and those with significant body fat. Advanced lifters with low body fat find recomposition very slow.' },
    { q: 'How many calories should I eat for recomposition?', a: 'Eat at or slightly below maintenance (0–300 kcal deficit). On training days, eat at maintenance. On rest days, eat at a slight deficit. This maximises muscle protein synthesis while sustaining fat loss.' },
    { q: 'How much protein do I need for body recomposition?', a: '2.0–2.4 g of protein per kg of body weight per day — higher than standard fat-loss recommendations.' },
    { q: 'How do I track recomposition progress?', a: 'Do not track progress solely by scale weight. Use body measurements, progress photos, and strength metrics. DEXA scans every 8–12 weeks give the most accurate body composition data.' },
  ],
  'lose-weight': [
    { q: 'How many calories should I eat to lose weight?', a: 'A deficit of 500 kcal/day produces approximately 0.5 kg of fat loss per week. Your exact target depends on your TDEE (Total Daily Energy Expenditure). The calculator above estimates your personalised target.' },
    { q: 'How much protein do I need?', a: 'Aim for 1.6–2.2 g of protein per kg of body weight. Protein preserves muscle during a deficit and keeps you full.' },
    { q: 'Is it safe to lose more than 1 kg per week?', a: 'Losses above 1 kg/week are usually partly water weight in the first two weeks. Sustained loss above 1 kg/week risks muscle mass and metabolic adaptation. 0.5–0.75 kg/week is the optimal target.' },
    { q: 'Do I need to exercise to lose weight?', a: 'Diet drives weight loss. Exercise improves body composition (more muscle, less fat) and increases your calorie budget. Both together produce the best long-term results.' },
  ],
  'lose-belly-fat': [
    { q: 'Can I target belly fat specifically?', a: 'No. Spot reduction is physiologically impossible. A calorie deficit reduces fat across your whole body; genetics determines where you lose it first. Visceral belly fat does respond well to calorie restriction.' },
    { q: 'What foods cause belly fat?', a: 'Excess calories cause fat gain everywhere, including the belly. Foods that promote insulin spikes (refined carbs, sugary drinks) are associated with greater visceral fat accumulation.' },
    { q: 'How long to lose belly fat?', a: 'Visible results typically take 8–12 weeks of consistent calorie deficit. Visceral fat (internal) reduces faster than subcutaneous fat (under skin).' },
    { q: 'Does stress cause belly fat?', a: 'Chronically elevated cortisol promotes visceral fat storage. Stress management (sleep, recovery, lower stimulant intake) is a genuine lever for reducing belly fat.' },
  ],
  'lose-10kg': [
    { q: 'How long does it take to lose 10 kg?', a: 'At a safe rate of 0.5–1.0 kg/week, losing 10 kg takes 10–20 weeks. A 500–750 kcal/day deficit is the target range.' },
    { q: 'What if I plateau before reaching 10 kg?', a: 'Plateaus are normal after 4–6 weeks. Recalculate your TDEE (it decreases as you lose weight), take a one-week maintenance break to reset hunger hormones, then resume.' },
    { q: 'Should I count calories or just follow the meal plan?', a: 'Following the meal plan is easier to start. Once you understand your portion sizes, calorie counting gives you flexibility. Use both initially.' },
    { q: 'Can I drink alcohol while losing 10 kg?', a: 'Alcohol contains 7 kcal/g and displaces protein metabolism. Occasional moderate consumption is manageable if tracked; regular drinking significantly slows progress.' },
  ],
  'lose-20kg': [
    { q: 'Is losing 20 kg realistic?', a: 'Yes. 20 kg at 0.75 kg/week takes approximately 27 weeks (6–7 months). A structured, phased plan prevents the metabolic adaptation that derails long-term diets.' },
    { q: 'Will I need surgery or medication?', a: 'This plan is a lifestyle-based approach. If you have a BMI above 40 or significant comorbidities, consult your GP — medical options may complement your plan.' },
    { q: 'What do I do about loose skin?', a: 'Slower weight loss (0.5–0.75 kg/week), high protein intake, and resistance training all reduce loose skin risk. Gradual loss gives skin time to adapt.' },
    { q: 'How do I maintain after losing 20 kg?', a: 'The maintenance phase recalibrates your TDEE and eating patterns. Most people need to continue tracking food intake for 6–12 months post-goal before maintenance habits are fully automatic.' },
  ],
  'get-lean': [
    { q: 'What body fat percentage is considered lean?', a: 'For men, 10–15% body fat is visibly lean. For women, 18–23%. Athletic lean is below these thresholds but requires more structured effort to maintain.' },
    { q: 'How do I get lean without losing muscle?', a: 'A moderate deficit (300–500 kcal/day), high protein (2.0–2.4 g/kg), and progressive resistance training are the three pillars. You cannot "get lean" without all three.' },
    { q: 'Is cardio necessary to get lean?', a: 'Cardio accelerates the deficit and improves cardiovascular health but is not strictly necessary. Structured resistance training alone can produce lean results if diet is controlled.' },
    { q: 'How long does it take to get lean?', a: 'Starting from 20–25% body fat, reaching 12–15% body fat takes 16–24 weeks. Expect 0.5–1.0% body fat loss per week as the sustainable target.' },
  ],
  'lose-5kg': [
    { q: 'How long does it take to lose 5 kg?', a: 'At a safe rate of 0.5–1.0 kg/week, losing 5 kg takes 5–10 weeks. A deficit of 500 kcal/day is a sustainable and achievable target for most people.' },
    { q: 'Is 5 kg noticeable?', a: 'Yes — 5 kg of fat loss is visually significant, especially around the waist, face, and upper body. Combined with higher protein and training, body composition improves noticeably.' },
    { q: 'Can I lose 5 kg without exercise?', a: 'Diet accounts for the majority of fat loss. You can lose 5 kg through diet alone, but adding 2–3 sessions of moderate cardio or resistance training per week significantly improves results and preserves muscle.' },
    { q: 'What if I regain the weight after losing 5 kg?', a: 'Regain is common when returning to old habits. Maintaining a slight deficit (100–200 kcal/day below TDEE) after reaching your goal, alongside a high-protein diet, is the most effective strategy to keep it off.' },
  ],
};

export interface GoalTemplateContent {
  intro: string;
  foodsToPrioritize: string[];
  commonMistakes: string[];
  faq: Array<{ q: string; a: string }>;
}

export function getGoalOnlyContent(goalType: GoalType): GoalTemplateContent {
  return {
    intro: GOAL_INTRO[goalType],
    foodsToPrioritize: GOAL_FOODS[goalType],
    commonMistakes: GOAL_MISTAKES[goalType],
    faq: GOAL_FAQ[goalType],
  };
}
