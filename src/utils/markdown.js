// 아주 작은 마크다운 → HTML (플레이북 문서용). 우리가 쓴 문서만 넣는다 — 먼저 HTML 을 이스케이프한다.
//   지원: # 제목 · 문단 · - / 1. 목록 · - [ ] 체크 · | 표 | · ``` 코드 ``` · > 인용 · --- · **굵게** · `코드` · [링크](url)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')

const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim())

export function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^```/.test(line)) {
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++])
      i++
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`)
      continue
    }
    const h = line.match(/^(#{1,4})\s+(.+)$/)
    if (h) {
      const n = h[1].length
      out.push(`<h${n}>${inline(h[2])}</h${n}>`)
      i++
      continue
    }
    if (/^---+\s*$/.test(line)) {
      out.push('<hr />')
      i++
      continue
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]))
      out.push(
        `<div class="md-table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      )
      continue
    }
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(inline(lines[i++].replace(/^>\s?/, '')))
      out.push(`<blockquote>${buf.join('<br />')}</blockquote>`)
      continue
    }
    const li = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
    if (li) {
      const ordered = /\d/.test(li[2])
      const items = []
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
        if (m) {
          const sub = m[1].length >= 2
          let body = m[3]
          const box = body.match(/^\[( |x)\]\s+(.*)$/i)
          body = box ? `<span class="md-check">${box[1].trim() ? '☑' : '☐'}</span> ${inline(box[2])}` : inline(body)
          items.push(sub && items.length ? { sub: true, html: body } : { html: body })
          i++
        } else if (/^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1].html += ' ' + inline(lines[i].trim())
          i++
        } else break
      }
      const tag = ordered ? 'ol' : 'ul'
      out.push(`<${tag}>${items.map((it) => `<li${it.sub ? ' class="md-sub"' : ''}>${it.html}</li>`).join('')}</${tag}>`)
      continue
    }
    if (!line.trim()) {
      i++
      continue
    }
    const buf = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*[-*]\s|\s*\d+\.\s|\s*\||---)/.test(lines[i])) buf.push(inline(lines[i++]))
    if (!buf.length) buf.push(inline(lines[i++]))
    out.push(`<p>${buf.join('<br />')}</p>`)
  }
  return out.join('\n')
}
