"use client"

import { useEffect, useMemo, useState } from "react"
import type { CSSProperties, FormEvent } from "react"

import type { MindMapAnswerValue } from "@/lib/api-client"

import { DynamicForm, validateAnswers } from "./dynamic-form"
import type { NodeQuestion } from "../schema/questions"
import type { MindMapNode } from "../types/graph"

interface NodeModalProps {
  node: MindMapNode | null
  isOpen: boolean
  questions: NodeQuestion[]
  initialValues: Record<string, MindMapAnswerValue>
  isSaving: boolean
  error: string
  onClose: () => void
  onSubmit: (answers: Record<string, MindMapAnswerValue>) => Promise<void>
}

export function NodeModal({
  node,
  isOpen,
  questions,
  initialValues,
  isSaving,
  error,
  onClose,
  onSubmit,
}: Readonly<NodeModalProps>) {
  const [values, setValues] = useState<Record<string, MindMapAnswerValue | "">>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const nextValues: Record<string, MindMapAnswerValue | ""> = {}

    for (const question of questions) {
      nextValues[question.id] = initialValues[question.id] ?? ""
    }

    setValues(nextValues)
    setValidationErrors({})
  }, [initialValues, isOpen, questions])

  const title = useMemo(() => node?.label ?? "Node", [node])

  if (!isOpen || !node) {
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const errors = validateAnswers(questions, values)
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    const answers: Record<string, MindMapAnswerValue> = {}

    for (const question of questions) {
      const value = values[question.id]

      if (value !== "" && value !== undefined) {
        answers[question.id] = value
      }
    }

    await onSubmit(answers)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 12,
          backgroundColor: "#ffffff",
          padding: 20,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)",
          display: "grid",
          gap: 16,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
          <p style={{ fontSize: 14, color: "#475569" }}>
            Complete this node to save profile details.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <DynamicForm
            questions={questions}
            values={values}
            errors={validationErrors}
            onChange={(questionId, value) => {
              setValues((current) => ({
                ...current,
                [questionId]: value,
              }))
            }}
          />

          {error ? <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p> : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} style={secondaryButtonStyle}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving} style={primaryButtonStyle}>
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  backgroundColor: "#ffffff",
  color: "#0f172a",
  padding: "8px 14px",
}

const primaryButtonStyle: CSSProperties = {
  border: "1px solid #2563eb",
  borderRadius: 8,
  backgroundColor: "#2563eb",
  color: "#ffffff",
  padding: "8px 14px",
}
