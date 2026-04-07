'use client'

import type { ReactNode } from 'react'

interface Props {
  content: string
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-2xl font-bold text-slate-900 mt-8 mb-3',
  2: 'text-xl font-bold text-slate-900 mt-7 mb-2',
  3: 'text-lg font-semibold text-slate-800 mt-5 mb-2',
  4: 'text-base font-semibold text-slate-800 mt-4 mb-1',
}

function Heading({ level, children }: { level: number; children: ReactNode }) {
  const cls = HEADING_CLASS[level] ?? HEADING_CLASS[4]
  if (level === 1) return <h1 className={cls}>{children}</h1>
  if (level === 2) return <h2 className={cls}>{children}</h2>
  if (level === 3) return <h3 className={cls}>{children}</h3>
  return <h4 className={cls}>{children}</h4>
}

/** Minimal markdown-to-React renderer. Handles headings, bold, italic, lists, code blocks, blockquotes, paragraphs. */
export function MarkdownContent({ content }: Props) {
  const lines = content.split('\n')
  const elements: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') { i++; continue }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      elements.push(<Heading key={i} level={level}>{inlineFormat(headingMatch[2])}</Heading>)
      i++; continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-blue-300 pl-4 py-1 my-4 text-slate-600 italic text-sm">
          {inlineFormat(line.slice(2))}
        </blockquote>,
      )
      i++; continue
    }

    // Code block
    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      elements.push(
        <pre key={i} className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto text-sm my-5 font-mono">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      )
      i++; continue
    }

    // Unordered list
    if (line.match(/^[-*+]\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*+]\s/)) { items.push(lines[i].replace(/^[-*+]\s/, '')); i++ }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-1.5 my-4 text-slate-600 text-sm">
          {items.map((item, j) => <li key={j}>{inlineFormat(item)}</li>)}
        </ul>,
      )
      continue
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) { items.push(lines[i].replace(/^\d+\.\s/, '')); i++ }
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-1.5 my-4 text-slate-600 text-sm">
          {items.map((item, j) => <li key={j}>{inlineFormat(item)}</li>)}
        </ol>,
      )
      continue
    }

    // Paragraph (collect until blank line or block-level marker)
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,4}\s/) &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') &&
      !lines[i].match(/^[-*+\d]/)
    ) {
      paraLines.push(lines[i]); i++
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={i} className="text-slate-600 leading-relaxed my-4 text-[15px]">
          {inlineFormat(paraLines.join(' '))}
        </p>,
      )
    }
  }

  return <div>{elements}</div>
}

function inlineFormat(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/)
  return parts.map((part, i) => {
    if (part.startsWith('**') || part.startsWith('__')) {
      return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`')) {
      return <code key={i} className="font-mono text-sm bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('*') || part.startsWith('_')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return <a key={i} href={linkMatch[2]} className="text-blue-600 hover:underline">{linkMatch[1]}</a>
    }
    return part
  })
}
