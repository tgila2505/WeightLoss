"use client"

import { useMemo } from "react"
import type { CSSProperties } from "react"

import type { MindMapAnswerValue } from "@/lib/api-client"

import type { NodeQuestion } from "../schema/questions"

export interface DynamicFormProps {
  questions: NodeQuestion[]
  values: Record<string, MindMapAnswerValue | "">
  errors: Record<string, string>
  onChange: (questionId: string, value: MindMapAnswerValue | "") => void
}

export function validateAnswers(
  questions: NodeQuestion[],
  values: Record<string, MindMapAnswerValue | "">,
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const question of questions) {
    const value = values[question.id]

    if (question.required && (value === "" || value === undefined)) {
      errors[question.id] = "This field is required."
      continue
    }

    if (question.type === "number" && value !== "" && value !== undefined) {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors[question.id] = "Enter a valid number."
      }
    }

    if (question.type === "text" && typeof value === "string" && value.length > 120) {
      errors[question.id] = "Keep this answer under 120 characters."
    }

    if (
      question.type === "select" &&
      value !== "" &&
      value !== undefined &&
      question.options &&
      !question.options.includes(String(value))
    ) {
      errors[question.id] = "Choose a valid option."
    }
  }

  return errors
}

export function DynamicForm({
  questions,
  values,
  errors,
  onChange,
}: Readonly<DynamicFormProps>) {
  const renderedQuestions = useMemo(() => questions, [questions])

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {renderedQuestions.map((question) => (
        <label key={question.id} style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
            {question.label}
          </span>

          {question.type === "select" ? (
            <select
              value={String(values[question.id] ?? "")}
              onChange={(event) => onChange(question.id, event.target.value)}
              style={fieldStyle}
            >
              <option value="">Select an option</option>
              {(question.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={question.type === "number" ? "number" : "text"}
              value={values[question.id] ?? ""}
              maxLength={question.type === "text" ? 120 : undefined}
              onChange={(event) =>
                onChange(
                  question.id,
                  question.type === "number"
                    ? event.target.value === ""
                      ? ""
                      : Number(event.target.value)
                    : event.target.value,
                )
              }
              style={fieldStyle}
            />
          )}

          {errors[question.id] ? (
            <span style={{ fontSize: 12, color: "#dc2626" }}>{errors[question.id]}</span>
          ) : null}
        </label>
      ))}
    </div>
  )
}

const fieldStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#ffffff",
}
