export type QuestionType = "text" | "number" | "select"

export interface NodeQuestion {
  id: string
  label: string
  type: QuestionType
  required: boolean
  options?: string[]
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
  "identity-name": [
    {
      id: "preferred_name",
      label: "What name should appear in your profile?",
      type: "text",
      required: true,
    },
  ],
  "identity-location": [
    {
      id: "city",
      label: "Which city are you in?",
      type: "text",
      required: true,
    },
  ],
  "goals-health": [
    {
      id: "target_weight",
      label: "Target weight (kg)",
      type: "number",
      required: true,
    },
    {
      id: "motivation",
      label: "Main motivation",
      type: "text",
      required: true,
    },
  ],
  "goals-energy": [
    {
      id: "energy_goal",
      label: "Describe your energy goal",
      type: "text",
      required: true,
    },
  ],
  "habits-exercise": [
    {
      id: "frequency",
      label: "Exercise frequency per week",
      type: "number",
      required: true,
    },
    {
      id: "intensity",
      label: "Preferred intensity",
      type: "select",
      required: true,
      options: ["Low", "Moderate", "High"],
    },
  ],
  "habits-exercise-walking": [
    {
      id: "walking_minutes",
      label: "Walking minutes per day",
      type: "number",
      required: true,
    },
  ],
  "habits-sleep": [
    {
      id: "sleep_hours",
      label: "Hours of sleep per night",
      type: "number",
      required: true,
    },
    {
      id: "sleep_quality",
      label: "Sleep quality",
      type: "select",
      required: true,
      options: ["Poor", "Fair", "Good"],
    },
  ],
}

export function getQuestionsForNode(nodeId: string): NodeQuestion[] {
  return questionSchemaByNodeId[nodeId] ?? defaultQuestions
}
