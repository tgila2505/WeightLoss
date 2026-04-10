"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, FormEvent } from "react"

import type { MindMapAnswerValue } from "@/lib/api-client"

import { DynamicForm, validateAnswers } from "./dynamic-form"
import type { NodeQuestion } from "../schema/questions"
import type { MindMapNode } from "../types/graph"

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
  const dialogRef = useRef<HTMLDivElement | null>(null)

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

  // Escape key → close modal
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  // Focus trap: auto-focus first focusable element; intercept Tab/Shift+Tab
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    const getFocusableElements = (): HTMLElement[] =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))

    // Focus the first focusable element when modal opens
    const focusables = getFocusableElements()
    focusables[0]?.focus()

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return
      }

      const elements = getFocusableElements()

      if (elements.length === 0) {
        event.preventDefault()
        return
      }

      const firstEl = elements[0]
      const lastEl = elements[elements.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === firstEl) {
          event.preventDefault()
          lastEl.focus()
        }
      } else {
        if (document.activeElement === lastEl) {
          event.preventDefault()
          firstEl.focus()
        }
      }
    }

    document.addEventListener("keydown", handleTabKey)

    return () => {
      document.removeEventListener("keydown", handleTabKey)
    }
  }, [isOpen])

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
      aria-labelledby="node-modal-title"
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
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          borderRadius: 12,
          backgroundColor: "#ffffff",
          padding: 20,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)",
          display: "grid",
          gap: 16,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <h2 id="node-modal-title" style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
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
