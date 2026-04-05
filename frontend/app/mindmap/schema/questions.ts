export type QuestionType =
  | "text"
  | "number"
  | "select"
  | "checkbox-group"
  | "radio"
  | "yes-no"
  | "likert-5"
  | "rating-10"
  | "multi-text"

export interface NodeQuestion {
  id: string
  label: string
  type: QuestionType
  required: boolean
  options?: string[]
  placeholder?: string
}

const defaultQuestions: NodeQuestion[] = [
  {
    id: "note",
    label: "Add a short note",
    type: "text",
    required: true,
  },
]

const questionSchemaByNodeId: Record<string, NodeQuestion[]> = {
  "past-medical-history-musculoskeletal": [
    {
      id: "conditions",
      label: "Select all musculoskeletal conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Back pain", "Neck pain", "Shoulder pain", "Hip pain", "Knee pain",
        "Foot/ankle pain", "Osteoarthritis", "Rheumatoid arthritis", "Osteoporosis",
        "Fibromyalgia", "Gout", "Other musculoskeletal",
      ],
    },
  ],
  "past-medical-history-cancer": [
    {
      id: "conditions",
      label: "Select all cancer diagnoses that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Breast", "Prostate", "Colon/rectal", "Lung", "Skin (melanoma)",
        "Skin (non-melanoma)", "Thyroid", "Lymphoma", "Leukemia", "Ovarian",
        "Uterine", "Bladder", "Kidney", "Other cancer",
      ],
    },
  ],
  "past-medical-history-cardiovascular": [
    {
      id: "conditions",
      label: "Select all cardiovascular conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Hypertension", "High cholesterol", "Coronary artery disease",
        "Heart attack", "Heart failure", "Atrial fibrillation", "Stroke/TIA",
        "Peripheral artery disease", "Deep vein thrombosis", "Pulmonary embolism",
        "Aortic aneurysm", "Valvular heart disease", "Other cardiovascular",
      ],
    },
  ],
  "past-medical-history-respiratory": [
    {
      id: "conditions",
      label: "Select all respiratory conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Asthma", "COPD/Emphysema", "Chronic bronchitis", "Sleep apnea",
        "Pulmonary fibrosis", "Pulmonary hypertension", "Recurrent pneumonia",
        "Other respiratory",
      ],
    },
  ],
  "past-medical-history-endocrine": [
    {
      id: "conditions",
      label: "Select all endocrine conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Type 1 Diabetes", "Type 2 Diabetes", "Pre-diabetes",
        "Hypothyroidism", "Hyperthyroidism", "Hashimoto's thyroiditis",
        "Graves' disease", "Adrenal insufficiency", "Cushing's syndrome",
        "Polycystic ovary syndrome (PCOS)", "Metabolic syndrome", "Other endocrine",
      ],
    },
  ],
  "past-medical-history-neurologic": [
    {
      id: "conditions",
      label: "Select all neurologic conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Migraines", "Tension headaches", "Epilepsy/seizures",
        "Multiple sclerosis", "Parkinson's disease", "Alzheimer's/dementia",
        "Neuropathy", "Tremor", "Vertigo/dizziness", "Concussion history",
        "Other neurologic",
      ],
    },
  ],
  "past-medical-history-psychiatric": [
    {
      id: "conditions",
      label: "Select all psychiatric conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Depression", "Anxiety disorder", "Panic disorder", "PTSD",
        "Bipolar disorder", "OCD", "Eating disorder", "ADHD", "Autism spectrum",
        "Schizophrenia", "Substance use disorder", "Other psychiatric",
      ],
    },
  ],
  "past-medical-history-infections": [
    {
      id: "conditions",
      label: "Select all chronic/recurrent infections that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Hepatitis B", "Hepatitis C", "HIV", "Lyme disease",
        "Recurrent UTIs", "H. pylori", "Epstein-Barr / mono",
        "COVID-19 (long COVID)", "Other chronic/recurrent infection",
      ],
    },
  ],
  "past-medical-history-gynecologic": [
    {
      id: "conditions",
      label: "Select all gynecologic conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Endometriosis", "Uterine fibroids", "Ovarian cysts",
        "Cervical dysplasia", "Pelvic inflammatory disease", "Infertility",
        "Menopause (natural)", "Surgical menopause", "Premature ovarian insufficiency",
        "Abnormal uterine bleeding", "Other gynecologic",
      ],
    },
  ],
  "past-medical-history-gastroenterological": [
    {
      id: "conditions",
      label: "Select all gastrointestinal conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "GERD/acid reflux", "Peptic ulcer disease", "Irritable bowel syndrome",
        "Inflammatory bowel disease (Crohn's/UC)", "Celiac disease",
        "Non-alcoholic fatty liver", "Gallstones/gallbladder disease", "Pancreatitis",
        "Diverticulosis/diverticulitis", "Chronic constipation", "Chronic diarrhea", "Other GI",
      ],
    },
  ],
  "past-medical-history-surgical": [
    {
      id: "procedures",
      label: "List past surgical procedures (one per line)",
      type: "multi-text",
      required: false,
      placeholder: "e.g. Appendectomy, 2015",
    },
  ],
  "past-medical-history-other": [
    {
      id: "conditions",
      label: "List any other medical conditions not covered above",
      type: "multi-text",
      required: false,
      placeholder: "e.g. Chronic fatigue syndrome",
    },
  ],
  "dental-hygiene": [
    {
      id: "brushing",
      label: "How often do you brush and floss?",
      type: "radio",
      required: false,
      options: [
        "Brush 2x/day + floss daily",
        "Brush 2x/day, floss sometimes",
        "Brush once/day",
        "Irregular brushing",
      ],
    },
    {
      id: "dental-visits",
      label: "How often do you visit the dentist?",
      type: "radio",
      required: false,
      options: ["Every 6 months", "Once a year", "Every 2+ years", "Rarely/never"],
    },
  ],
  "dental-history": [
    {
      id: "conditions",
      label: "Select all dental history items that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Cavities/fillings", "Gum disease (gingivitis/periodontitis)", "Tooth loss",
        "Root canals", "Crowns or bridges", "Dental implants",
        "Orthodontic treatment", "TMJ disorder", "Teeth grinding (bruxism)",
        "Dry mouth", "Other dental history",
      ],
    },
  ],
  "family-history-relative": [
    {
      id: "parent",
      label: "Parent(s) — select conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Heart disease", "Stroke", "Type 2 Diabetes", "Cancer",
        "Hypertension", "High cholesterol", "Obesity", "Alzheimer's/dementia",
        "Mental health disorder", "Autoimmune disease", "Osteoporosis", "Other",
      ],
    },
    {
      id: "sibling",
      label: "Sibling(s) — select conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Heart disease", "Stroke", "Type 2 Diabetes", "Cancer",
        "Hypertension", "High cholesterol", "Obesity", "Alzheimer's/dementia",
        "Mental health disorder", "Autoimmune disease", "Osteoporosis", "Other",
      ],
    },
    {
      id: "grandparent",
      label: "Grandparent(s) — select conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Heart disease", "Stroke", "Type 2 Diabetes", "Cancer",
        "Hypertension", "High cholesterol", "Obesity", "Alzheimer's/dementia",
        "Mental health disorder", "Autoimmune disease", "Osteoporosis", "Other",
      ],
    },
  ],
  "regular-medication-each-medicine": [
    {
      id: "medications",
      label: "List current medications (name, dose, frequency)",
      type: "multi-text",
      required: false,
      placeholder: "e.g. Metformin 500mg twice daily",
    },
  ],
  "nutrition-groups": [
    {
      id: "diet-pattern",
      label: "Which best describes your current diet pattern?",
      type: "radio",
      required: false,
      options: [
        "Omnivore (eat everything)",
        "Flexitarian (mostly plant-based, some meat)",
        "Pescatarian",
        "Vegetarian",
        "Vegan",
        "Keto/low-carb",
        "Paleo",
        "Mediterranean",
        "Other",
      ],
    },
    {
      id: "sensitivities",
      label: "Select any known food sensitivities or intolerances",
      type: "checkbox-group",
      required: false,
      options: [
        "Gluten", "Dairy", "Eggs", "Soy", "Nuts",
        "Shellfish", "Nightshades", "FODMAP foods", "None known",
      ],
    },
  ],
  "nutrition-habits": [
    {
      id: "meal-frequency",
      label: "How many times a day do you typically eat?",
      type: "radio",
      required: false,
      options: [
        "1-2 meals/day", "3 meals/day", "3 meals + snacks", "Grazing throughout day",
      ],
    },
    {
      id: "breakfast",
      label: "How often do you eat breakfast?",
      type: "radio",
      required: false,
      options: ["Always", "Most days", "Sometimes", "Rarely/never"],
    },
    {
      id: "home-cooking",
      label: "How often do you cook at home?",
      type: "radio",
      required: false,
      options: [
        "Most meals at home",
        "About half and half",
        "Mostly eat out / takeout",
      ],
    },
    {
      id: "tracks-macros",
      label: "Do you track calories or macros?",
      type: "yes-no",
      required: false,
    },
    {
      id: "intermittent-fasting",
      label: "Do you practice intermittent fasting?",
      type: "yes-no",
      required: false,
    },
    {
      id: "notes",
      label: "Any other dietary notes or restrictions?",
      type: "text",
      required: false,
      placeholder: "Optional",
    },
  ],
  "exercise-types": [
    {
      id: "types",
      label: "Select all types of exercise you currently do",
      type: "checkbox-group",
      required: false,
      options: [
        "Walking", "Running/jogging", "Cycling", "Swimming", "Weight training",
        "HIIT", "Yoga", "Pilates", "Team sports", "Martial arts", "Dancing",
        "Rowing", "Elliptical", "None currently",
      ],
    },
  ],
  "exercise-habits": [
    {
      id: "frequency",
      label: "How often do you exercise?",
      type: "radio",
      required: false,
      options: [
        "Daily", "4-6x/week", "2-3x/week", "Once a week",
        "A few times a month", "Rarely/never",
      ],
    },
    {
      id: "duration",
      label: "Typical session duration",
      type: "radio",
      required: false,
      options: ["< 20 min", "20-30 min", "30-45 min", "45-60 min", "> 60 min"],
    },
    {
      id: "intensity",
      label: "Typical intensity",
      type: "radio",
      required: false,
      options: [
        "Low (light activity, no sweat)",
        "Moderate (elevated HR, some sweat)",
        "High (hard breathing, heavy sweat)",
        "Varies widely",
      ],
    },
    {
      id: "limitations",
      label: "Any physical limitations or injuries affecting exercise?",
      type: "text",
      required: false,
      placeholder: "Optional",
    },
  ],
  "sleep-routine": [
    {
      id: "bedtime",
      label: "Typical bedtime",
      type: "text",
      required: false,
      placeholder: "e.g. 10:30 PM",
    },
    {
      id: "wake-time",
      label: "Typical wake time",
      type: "text",
      required: false,
      placeholder: "e.g. 6:30 AM",
    },
    {
      id: "total-sleep",
      label: "Total sleep per night (approximate)",
      type: "radio",
      required: false,
      options: ["< 5 hours", "5-6 hours", "6-7 hours", "7-8 hours", "> 8 hours"],
    },
    {
      id: "sleep-onset",
      label: "How long does it typically take to fall asleep?",
      type: "radio",
      required: false,
      options: ["< 10 min", "10-20 min", "20-30 min", "> 30 min"],
    },
  ],
  "sleep-habits": [
    {
      id: "screens-before-bed",
      label: "Do you use screens (phone/TV) within 1 hour of bed?",
      type: "yes-no",
      required: false,
    },
    {
      id: "afternoon-caffeine",
      label: "Do you consume caffeine after 2 PM?",
      type: "yes-no",
      required: false,
    },
    {
      id: "alcohol-for-sleep",
      label: "Do you use alcohol to help sleep?",
      type: "yes-no",
      required: false,
    },
    {
      id: "sleep-environment",
      label: "How would you describe your sleep environment?",
      type: "radio",
      required: false,
      options: [
        "Very dark and quiet",
        "Some light or noise",
        "Significant light/noise",
      ],
    },
    {
      id: "sleep-tracker",
      label: "Do you use a sleep tracking device?",
      type: "yes-no",
      required: false,
    },
  ],
  "sleep-symptoms-current-state": [
    {
      id: "symptoms",
      label: "Select all sleep symptoms you currently experience",
      type: "checkbox-group",
      required: false,
      options: [
        "Difficulty falling asleep", "Waking during the night", "Waking too early",
        "Non-restorative sleep", "Daytime sleepiness", "Snoring",
        "Witnessed apneas (gasping)", "Restless legs", "Nightmares",
        "Sleepwalking", "None of the above",
      ],
    },
    {
      id: "overall-quality",
      label: "Overall sleep quality",
      type: "radio",
      required: false,
      options: ["Excellent", "Good", "Fair", "Poor", "Very poor"],
    },
  ],
  "stress-tolerance-routine": [
    {
      id: "practices",
      label: "Select all stress management practices you use regularly",
      type: "checkbox-group",
      required: false,
      options: [
        "Meditation/mindfulness", "Deep breathing exercises", "Journaling",
        "Prayer/spiritual practice", "Time in nature", "Creative outlets (art, music)",
        "Physical exercise", "Social connection", "Professional therapy/counseling",
        "No regular stress management practice",
      ],
    },
    {
      id: "leisure-time",
      label: "How many hours of personal/leisure time do you get per day (average)?",
      type: "radio",
      required: false,
      options: ["< 30 min", "30-60 min", "1-2 hours", "> 2 hours"],
    },
  ],
  "stress-tolerance-habits": [
    {
      id: "work-life-balance",
      label: "How would you describe your work-life balance?",
      type: "radio",
      required: false,
      options: [
        "Well balanced",
        "Somewhat balanced",
        "Mostly work/responsibilities",
        "Severely imbalanced",
      ],
    },
    {
      id: "overwhelm-frequency",
      label: "How often do you feel overwhelmed or burned out?",
      type: "radio",
      required: false,
      options: [
        "Rarely",
        "Sometimes (a few times/month)",
        "Often (weekly)",
        "Almost constantly",
      ],
    },
    {
      id: "relaxation-practice",
      label: "Do you have a regular relaxation practice?",
      type: "yes-no",
      required: false,
    },
  ],
  "stress-symptoms-current-state": [
    {
      id: "symptoms",
      label: "Select all stress symptoms you currently experience",
      type: "checkbox-group",
      required: false,
      options: [
        "Irritability or mood swings", "Anxiety or worry", "Low mood/depression",
        "Brain fog / difficulty concentrating", "Forgetfulness",
        "Muscle tension or headaches", "Jaw clenching/teeth grinding",
        "Digestive upset", "Fatigue despite adequate sleep",
        "Increased appetite or cravings", "Decreased appetite",
        "Social withdrawal", "None of the above",
      ],
    },
    {
      id: "stress-level",
      label: "Overall current stress level (1 = very low, 10 = extreme)",
      type: "rating-10",
      required: false,
    },
  ],
  "relationships-quality": [
    {
      id: "relationship-rating",
      label: "How would you rate your closest personal relationships overall?",
      type: "radio",
      required: false,
      options: [
        "Excellent — very supportive",
        "Good — mostly positive",
        "Fair — some tension/challenges",
        "Poor — significant difficulties",
      ],
    },
    {
      id: "emotional-support",
      label: "Do you have people you can turn to for emotional support?",
      type: "radio",
      required: false,
      options: ["Yes, reliably", "Sometimes", "Rarely", "No"],
    },
  ],
  "relationships-habits": [
    {
      id: "social-frequency",
      label: "How often do you have meaningful social connection?",
      type: "radio",
      required: false,
      options: [
        "Daily meaningful connection",
        "Several times a week",
        "About once a week",
        "A few times a month",
        "Rarely",
      ],
    },
    {
      id: "lonely",
      label: "Do you feel lonely or isolated?",
      type: "yes-no",
      required: false,
    },
    {
      id: "relationship-stress",
      label: "Are relationship stressors a significant source of stress for you?",
      type: "yes-no",
      required: false,
    },
  ],
  "purpose-clarity-of-vision": [
    {
      id: "goal-clarity",
      label: "How clearly defined are your personal life goals?",
      type: "radio",
      required: false,
      options: [
        "Very clear — I know exactly what I'm working toward",
        "Somewhat clear — general direction but not specific",
        "Unclear — still figuring it out",
        "I haven't thought much about this",
      ],
    },
    {
      id: "vision",
      label: "What does living a healthy, fulfilling life look like to you?",
      type: "text",
      required: false,
      placeholder: "Brief description",
    },
  ],
  "purpose-assessment": [
    {
      id: "sense-of-purpose",
      label: "How strong is your sense of purpose in life?",
      type: "radio",
      required: false,
      options: [
        "Strong — I feel my life has clear meaning",
        "Moderate — I have some sense of purpose",
        "Weak — I often feel directionless",
        "Absent — I struggle to find meaning",
      ],
    },
    {
      id: "values-alignment",
      label: "Do your daily activities align with your core values?",
      type: "yes-no",
      required: false,
    },
    {
      id: "motivation",
      label: "What motivates you most to improve your health?",
      type: "text",
      required: false,
      placeholder: "Brief description",
    },
  ],
  "metabolic-flexibility-assessment": [
    {
      id: "between-meals",
      label: "How do you feel between meals (if you go 4-5 hours without eating)?",
      type: "radio",
      required: false,
      options: [
        "Fine — no hunger or energy dips",
        "Mild hunger but manageable",
        "Significant hunger and energy dip",
        "Irritable, shaky, or unable to focus",
      ],
    },
    {
      id: "morning-feeling",
      label: "How do you feel in the morning before eating?",
      type: "radio",
      required: false,
      options: [
        "Energized",
        "Neutral",
        "Groggy but okay after coffee",
        "Unable to function without eating immediately",
      ],
    },
    {
      id: "post-meal-crash",
      label: "Do you experience energy crashes after meals?",
      type: "yes-no",
      required: false,
    },
    {
      id: "carb-cravings",
      label: "Do you have strong cravings for carbohydrates or sugar?",
      type: "yes-no",
      required: false,
    },
  ],
  "metabolic-flexibility-habits": [
    {
      id: "eating-window",
      label: "What is your typical daily eating window?",
      type: "radio",
      required: false,
      options: [
        "< 8 hours (extended fasting)",
        "8-10 hours",
        "10-12 hours",
        "12-14 hours",
        "> 14 hours (eating most of the day)",
      ],
    },
    {
      id: "keto-history",
      label: "Have you ever followed a ketogenic or very low-carb diet?",
      type: "yes-no",
      required: false,
    },
    {
      id: "eat-on-waking",
      label: "Do you regularly eat within 1 hour of waking?",
      type: "yes-no",
      required: false,
    },
  ],
  "aerobics-capacity-current-state": [
    {
      id: "fitness-level",
      label: "How would you describe your current cardiovascular fitness?",
      type: "radio",
      required: false,
      options: [
        "Excellent — can sustain vigorous activity for 30+ min",
        "Good — comfortable with moderate activity",
        "Fair — get winded with moderate exertion",
        "Poor — short walks cause significant breathlessness",
      ],
    },
    {
      id: "stairs",
      label: "Can you climb 2 flights of stairs without stopping to catch your breath?",
      type: "radio",
      required: false,
      options: ["Yes, easily", "Yes, but I'm winded", "With difficulty", "No"],
    },
    {
      id: "exertion-symptoms",
      label: "Any symptoms during exertion (chest pain, palpitations, dizziness)?",
      type: "text",
      required: false,
      placeholder: "Optional — describe if yes",
    },
  ],
  "harmful-substance-habits": [
    {
      id: "smokes",
      label: "Do you currently smoke tobacco?",
      type: "yes-no",
      required: false,
    },
    {
      id: "tobacco-types",
      label: "If yes — tobacco types used",
      type: "checkbox-group",
      required: false,
      options: ["Cigarettes", "Cigars", "Pipe", "Chewing tobacco", "E-cigarettes/vaping"],
    },
    {
      id: "cigarettes-per-day",
      label: "If yes — how many per day?",
      type: "radio",
      required: false,
      options: ["< 5/day", "5-10/day", "11-20/day", "> 20/day"],
    },
    {
      id: "drinks-alcohol",
      label: "Do you drink alcohol?",
      type: "yes-no",
      required: false,
    },
    {
      id: "alcohol-frequency",
      label: "If yes — how much do you drink?",
      type: "radio",
      required: false,
      options: [
        "Occasionally (< 1x/week)",
        "1-3 drinks/week",
        "4-7 drinks/week",
        "1-2 drinks/day",
        "> 2 drinks/day",
      ],
    },
    {
      id: "recreational-drugs",
      label: "Do you use recreational drugs or cannabis?",
      type: "yes-no",
      required: false,
    },
    {
      id: "drug-details",
      label: "If yes — please describe (substance, frequency)",
      type: "text",
      required: false,
      placeholder: "Optional",
    },
    {
      id: "non-prescribed",
      label: "Do you use any non-prescribed medications or supplements?",
      type: "yes-no",
      required: false,
    },
  ],
  "gut-health-current-state": [
    {
      id: "symptoms",
      label: "Select all GI symptoms you currently experience",
      type: "checkbox-group",
      required: false,
      options: [
        "Bloating", "Gas/flatulence", "Abdominal pain or cramping",
        "Constipation (< 3 BMs/week)", "Diarrhea (loose stools > 3x/day)",
        "Alternating constipation and diarrhea", "Heartburn/acid reflux",
        "Nausea", "Food sensitivities/intolerances", "None of the above",
      ],
    },
    {
      id: "bowel-frequency",
      label: "Bowel movement frequency",
      type: "radio",
      required: false,
      options: ["< 3x/week", "3-6x/week", "Once daily", "2-3x daily", "> 3x daily"],
    },
    {
      id: "stool-consistency",
      label: "Typical stool consistency (Bristol scale)",
      type: "radio",
      required: false,
      options: [
        "Type 1-2 (hard/lumpy)",
        "Type 3-4 (normal)",
        "Type 5-6 (loose)",
        "Type 7 (watery)",
      ],
    },
    {
      id: "recent-antibiotics",
      label: "Have you taken antibiotics in the past 12 months?",
      type: "yes-no",
      required: false,
    },
    {
      id: "takes-probiotic",
      label: "Do you take a probiotic supplement?",
      type: "yes-no",
      required: false,
    },
  ],
  "detoxification-experience": [
    {
      id: "symptoms",
      label: "Select all that apply to your detoxification experience",
      type: "checkbox-group",
      required: false,
      options: [
        "Multiple chemical sensitivities",
        "Sensitivity to fragrances/cleaning products",
        "Poor alcohol tolerance (feel effects more than others)",
        "Skin rashes or hives without clear cause",
        "Frequent headaches",
        "Fatigue after eating certain foods",
        "Night sweats unrelated to menopause/illness",
        "None of the above",
      ],
    },
    {
      id: "heavy-metal-testing",
      label: "Have you ever been diagnosed with or tested for heavy metal toxicity?",
      type: "yes-no",
      required: false,
    },
  ],
  "detoxification-work": [
    {
      id: "work-environment",
      label: "Which best describes your primary work environment?",
      type: "radio",
      required: false,
      options: [
        "Office / desk work (indoor)",
        "Indoor — industrial/manufacturing",
        "Outdoor — agriculture/landscaping",
        "Healthcare setting",
        "Construction / trades",
        "Home-based",
        "Other",
      ],
    },
    {
      id: "chemical-exposure",
      label: "Are you regularly exposed to chemicals, pesticides, or industrial solvents?",
      type: "yes-no",
      required: false,
    },
    {
      id: "filtered-water",
      label: "Do you use filtered water for drinking and cooking?",
      type: "yes-no",
      required: false,
    },
    {
      id: "organic-frequency",
      label: "How often do you eat organic produce?",
      type: "radio",
      required: false,
      options: ["Always or mostly", "Sometimes", "Rarely", "Never"],
    },
  ],
  "inflammation-current-state": [
    {
      id: "symptoms",
      label: "Select all inflammation indicators that apply to you",
      type: "checkbox-group",
      required: false,
      options: [
        "Chronic joint pain or stiffness", "Persistent fatigue",
        "Recurrent skin issues (eczema, psoriasis, acne)",
        "Frequent infections or slow recovery",
        "Allergies (seasonal or food)", "Autoimmune diagnosis", "Brain fog",
        "Unexplained weight gain", "Puffiness or water retention", "None of the above",
      ],
    },
    {
      id: "pain-level",
      label: "Overall inflammation / pain level (1 = none, 10 = severe)",
      type: "rating-10",
      required: false,
    },
  ],
  "mental-health-current-state": [
    {
      id: "current-mood",
      label: "How would you describe your current mood most days?",
      type: "radio",
      required: false,
      options: [
        "Generally positive and stable",
        "Mostly okay with occasional low days",
        "Frequently low, anxious, or irritable",
        "Persistently struggling",
      ],
    },
    {
      id: "anxiety-level",
      label: "Current anxiety level (1 = very low, 10 = severe)",
      type: "rating-10",
      required: false,
    },
    {
      id: "depression-level",
      label: "Current depression level (1 = none, 10 = severe)",
      type: "rating-10",
      required: false,
    },
    {
      id: "seeing-therapist",
      label: "Are you currently working with a mental health professional?",
      type: "yes-no",
      required: false,
    },
    {
      id: "mental-health-meds",
      label: "Are you currently taking medication for mental health?",
      type: "yes-no",
      required: false,
    },
    {
      id: "symptoms",
      label: "Select all mental health symptoms you experience",
      type: "checkbox-group",
      required: false,
      options: [
        "Difficulty concentrating", "Low motivation", "Social withdrawal",
        "Irritability or anger", "Emotional numbness", "Panic attacks",
        "Intrusive thoughts", "None of the above",
      ],
    },
  ],
  "social-history-current-state": [
    {
      id: "employment",
      label: "Current employment status",
      type: "radio",
      required: false,
      options: [
        "Employed full-time", "Employed part-time", "Self-employed",
        "Retired", "Student", "Homemaker", "Unemployed/seeking work", "Disabled",
      ],
    },
    {
      id: "living-situation",
      label: "Current living situation",
      type: "radio",
      required: false,
      options: [
        "Living alone", "With partner/spouse", "With family (children/parents)",
        "With roommates", "Other",
      ],
    },
    {
      id: "education",
      label: "Highest level of education completed",
      type: "radio",
      required: false,
      options: [
        "High school / GED", "Some college", "Associate's degree",
        "Bachelor's degree", "Graduate/professional degree",
      ],
    },
    {
      id: "stressors",
      label: "Select all that apply to your daily environment",
      type: "checkbox-group",
      required: false,
      options: [
        "High-stress work", "Long commute (> 45 min each way)",
        "Shift work or irregular hours", "Caregiver responsibilities",
        "Financial stress", "Housing instability", "Food insecurity", "None of the above",
      ],
    },
  ],
  "diabetes-history-objectives": [
    {
      id: "goals",
      label: "Select all diabetes-related goals that apply to you",
      type: "checkbox-group",
      required: false,
      options: [
        "Prevent diabetes", "Manage blood sugar", "Reduce A1C",
        "Reduce insulin resistance", "Lose weight related to diabetes",
        "Reduce diabetes medications", "Understand my numbers better",
        "Other diabetes-related goal",
      ],
    },
  ],
  "diabetes-history-diagnosis": [
    {
      id: "diagnosis",
      label: "Have you been diagnosed with diabetes or pre-diabetes?",
      type: "radio",
      required: false,
      options: [
        "No", "Pre-diabetes", "Type 2 Diabetes", "Type 1 Diabetes",
        "Gestational diabetes (past)", "LADA / other",
      ],
    },
    {
      id: "diagnosis-details",
      label: "If diagnosed, when and what is your current management approach?",
      type: "text",
      required: false,
      placeholder: "e.g. Diagnosed 2020, currently on Metformin",
    },
    {
      id: "a1c",
      label: "Most recent HbA1c (if known)",
      type: "radio",
      required: false,
      options: [
        "< 5.7% (normal)", "5.7-6.4% (pre-diabetes)",
        "6.5-7.0%", "7.1-8.0%", "8.1-9.0%", "> 9.0%", "Don't know",
      ],
    },
  ],
  "diabetes-history-family-history": [
    {
      id: "family-diabetes",
      label: "Does diabetes run in your immediate family?",
      type: "radio",
      required: false,
      options: [
        "No family history", "One parent", "Both parents",
        "Siblings", "Multiple relatives", "Not sure",
      ],
    },
    {
      id: "gestational-family",
      label: "Was gestational diabetes present in your family (mother or sisters)?",
      type: "yes-no",
      required: false,
    },
  ],
  "diabetes-history-cultural": [
    {
      id: "cultural-practices",
      label: "Do cultural or religious practices influence your diet or lifestyle? (optional)",
      type: "text",
      required: false,
      placeholder: "Optional",
    },
    {
      id: "ethnicity",
      label: "Ethnic background (influences metabolic risk assessment)",
      type: "radio",
      required: false,
      options: [
        "White/Caucasian", "Hispanic/Latino", "Black/African American",
        "South Asian", "East Asian", "Southeast Asian", "Middle Eastern",
        "Indigenous/First Nations", "Mixed", "Prefer not to say",
      ],
    },
  ],
  "change-readiness-readiness": [
    {
      id: "motivated",
      label: "I am motivated to make significant changes to my lifestyle.",
      type: "likert-5",
      required: false,
    },
    {
      id: "capable",
      label: "I believe I am capable of making and sustaining these changes.",
      type: "likert-5",
      required: false,
    },
    {
      id: "clear-why",
      label: "I have a clear understanding of why I want to improve my health.",
      type: "likert-5",
      required: false,
    },
    {
      id: "time-resources",
      label: "I have the time and resources available to commit to a health program.",
      type: "likert-5",
      required: false,
    },
    {
      id: "social-support",
      label: "I have support from people in my life for making these changes.",
      type: "likert-5",
      required: false,
    },
    {
      id: "past-struggles",
      label: "I have tried to make these changes before and struggled.",
      type: "likert-5",
      required: false,
    },
    {
      id: "willing-to-track",
      label: "I am willing to track my food, activity, and habits regularly.",
      type: "likert-5",
      required: false,
    },
    {
      id: "wants-coaching",
      label: "I am ready to work with a health coach or practitioner.",
      type: "likert-5",
      required: false,
    },
    {
      id: "expects-results",
      label: "I expect to see meaningful results within 3-6 months.",
      type: "likert-5",
      required: false,
    },
  ],
}

export function getQuestionsForNode(nodeId: string): NodeQuestion[] {
  return questionSchemaByNodeId[nodeId] ?? defaultQuestions
}
