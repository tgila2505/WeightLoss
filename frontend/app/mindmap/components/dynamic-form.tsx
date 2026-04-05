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

    if (question.required) {
      if (
        value === "" ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0)
      ) {
        errors[question.id] = "This field is required."
        continue
      }
    }

    if (question.type === "number" && value !== "" && value !== undefined) {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors[question.id] = "Enter a valid number."
      }
    }

    if (question.type === "text" && typeof value === "string" && value.length > 500) {
      errors[question.id] = "Keep this answer under 500 characters."
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
        <div key={question.id} style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
            {question.label}
          </span>

          {question.type === "checkbox-group" && (
            <CheckboxGroup
              question={question}
              value={Array.isArray(values[question.id]) ? (values[question.id] as string[]) : []}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "radio" && (
            <RadioGroup
              question={question}
              value={typeof values[question.id] === "string" ? (values[question.id] as string) : ""}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "yes-no" && (
            <YesNo
              value={typeof values[question.id] === "string" ? (values[question.id] as string) : ""}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "likert-5" && (
            <Likert5
              value={typeof values[question.id] === "number" ? (values[question.id] as number) : 0}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "rating-10" && (
            <Rating10
              value={typeof values[question.id] === "number" ? (values[question.id] as number) : 0}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "multi-text" && (
            <MultiText
              value={Array.isArray(values[question.id]) ? (values[question.id] as string[]) : []}
              placeholder={question.placeholder}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "select" && (
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
          )}

          {(question.type === "text" || question.type === "number") && (
            <input
              type={question.type === "number" ? "number" : "text"}
              value={typeof values[question.id] === "string" || typeof values[question.id] === "number" ? String(values[question.id] ?? "") : ""}
              placeholder={question.placeholder}
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
        </div>
      ))}
    </div>
  )
}

function CheckboxGroup({
  question,
  value,
  onChange,
}: {
  question: NodeQuestion
  value: string[]
  onChange: (val: string[]) => void
}) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {(question.options ?? []).map((option) => (
        <label key={option} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={value.includes(option)}
            onChange={() => toggle(option)}
            style={{ width: 16, height: 16, accentColor: "#2563eb" }}
          />
          <span style={{ fontSize: 14, color: "#334155" }}>{option}</span>
        </label>
      ))}
    </div>
  )
}

function RadioGroup({
  question,
  value,
  onChange,
}: {
  question: NodeQuestion
  value: string
  onChange: (val: string) => void
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {(question.options ?? []).map((option) => (
        <label key={option} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="radio"
            name={question.id}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            style={{ width: 16, height: 16, accentColor: "#2563eb" }}
          />
          <span style={{ fontSize: 14, color: "#334155" }}>{option}</span>
        </label>
      ))}
    </div>
  )
}

function YesNo({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {["yes", "no"].map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: "6px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            border: value === opt ? "2px solid #2563eb" : "1px solid #cbd5e1",
            backgroundColor: value === opt ? "#eff6ff" : "#ffffff",
            color: value === opt ? "#1d4ed8" : "#475569",
            cursor: "pointer",
            textTransform: "capitalize",
          }}
        >
          {opt === "yes" ? "Yes" : "No"}
        </button>
      ))}
    </div>
  )
}

const LIKERT_LABELS = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]

function Likert5({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          title={LIKERT_LABELS[n - 1]}
          onClick={() => onChange(n)}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            border: value === n ? "2px solid #2563eb" : "1px solid #cbd5e1",
            backgroundColor: value === n ? "#2563eb" : "#ffffff",
            color: value === n ? "#ffffff" : "#475569",
            cursor: "pointer",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function Rating10({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            border: value === n ? "2px solid #2563eb" : "1px solid #cbd5e1",
            backgroundColor: value === n ? "#2563eb" : "#ffffff",
            color: value === n ? "#ffffff" : "#475569",
            cursor: "pointer",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function MultiText({
  value,
  placeholder,
  onChange,
}: {
  value: string[]
  placeholder?: string
  onChange: (val: string[]) => void
}) {
  const entries = value.length > 0 ? value : [""]

  const updateAt = (index: number, text: string) => {
    const next = [...entries]
    next[index] = text
    onChange(next.filter((v) => v !== ""))
  }

  const addRow = () => onChange([...entries, ""])

  const removeAt = (index: number) => {
    const next = entries.filter((_, i) => i !== index)
    onChange(next.length > 0 ? next : [])
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {entries.map((entry, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="text"
            value={entry}
            placeholder={placeholder ?? "Enter value"}
            onChange={(e) => updateAt(i, e.target.value)}
            style={{ ...fieldStyle, flex: 1 }}
          />
          {entries.length > 1 && (
            <button
              type="button"
              onClick={() => removeAt(i)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #fca5a5",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px dashed #94a3b8",
          backgroundColor: "#f8fafc",
          color: "#475569",
          cursor: "pointer",
          fontSize: 13,
          textAlign: "left",
        }}
      >
        + Add another
      </button>
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
