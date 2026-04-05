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

const questionSchemaByNodeId: Record<string, NodeQuestion[]> = {}

export function getQuestionsForNode(nodeId: string): NodeQuestion[] {
  return questionSchemaByNodeId[nodeId] ?? defaultQuestions
}
