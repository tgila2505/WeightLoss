import type { GoalType } from '@/lib/seo/pseo-combinations';

const GOAL_INTRO: Record<GoalType, string> = {
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
  'lose-weight': ['Chicken breast', 'Greek yoghurt', 'Leafy greens', 'Oats', 'Eggs', 'Lentils', 'Sweet potato'],
  'lose-belly-fat': ['Salmon', 'Avocado', 'Blueberries', 'Broccoli', 'Almonds', 'Green tea', 'Apple cider vinegar'],
  'lose-10kg': ['Turkey mince', 'Cottage cheese', 'Brown rice', 'Asparagus', 'Tuna', 'Chickpeas', 'Banana'],
  'lose-20kg': ['Tofu', 'Quinoa', 'Kale', 'Lean beef', 'Black beans', 'Cauliflower', 'Berries'],
  'get-lean': ['Whey protein', 'Lean chicken', 'Broccoli', 'Brown rice', 'Eggs', 'Almonds', 'Cottage cheese'],
  'lose-5kg': ['Chicken breast', 'Greek yoghurt', 'Oats', 'Eggs', 'Berries', 'Leafy greens', 'Sweet potato'],
};

const GOAL_MISTAKES: Record<GoalType, string[]> = {
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
