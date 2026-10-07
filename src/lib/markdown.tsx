import type { ReactNode } from 'react'

/**
 * Small markdown subset renderer for model output: ##/### headings, "- " lists,
 * **bold**, paragraphs. Builds React nodes directly so model text is never
 * injected as HTML.
 */
export function renderMarkdown(src: string): ReactNode[] {
  const out: ReactNode[] = []
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  let list: string[] = []
  let para: string[] = []
  let key = 0

  const flushList = () => {
    if (list.length === 0) return
    out.push(
      <ul key={key++}>
        {list.map((item, i) => (
          <li key={i} style={{ animationDelay: `${Math.min(i, 4) * 56}ms` }}>
            {inline(item)}
          </li>
        ))}
      </ul>,
    )
    list = []
  }
  const flushPara = () => {
    if (para.length === 0) return
    out.push(<p key={key++}>{inline(para.join(' '))}</p>)
    para = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (heading) {
      flushList()
      flushPara()
      out.push(<h3 key={key++}>{inline(heading[2])}</h3>)
    } else if (bullet) {
      flushPara()
      list.push(bullet[1])
    } else if (line.trim() === '') {
      flushList()
      flushPara()
    } else {
      flushList()
      para.push(line.trim())
    }
  }
  flushList()
  flushPara()
  return out
}

function inline(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}
