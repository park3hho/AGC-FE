import { Fragment } from 'react'

// 템플릿 문구 한 칸 — 줄바꿈(\n) = 줄, [[글자]] = 노란 확인 표시, _{글자} = 아래첨자 (예: VB_{6}),
//   emphasis 면 *글자* = 파란 강조
// 문자열을 HTML 로 넣지 않고 조각으로 나눠 그린다 (입력값이 그대로 HTML 이 되지 않게)
const TOKEN_RE = /(\[\[.+?\]\]|\*[^*\n]+\*|_\{[^}\n]+\})/g

function Line({
  text, // string: 한 줄
  emphasis, // boolean?: *글자* 강조 사용
}) {
  return text.split(TOKEN_RE).map((part, i) => {
    if (part.startsWith('[[') && part.endsWith(']]')) {
      return (
        <span key={i} className="dp-mark">
          {part.slice(2, -2)}
        </span>
      )
    }
    if (part.startsWith('_{') && part.endsWith('}') && part.length > 3) {
      return <sub key={i}>{part.slice(2, -1)}</sub>
    }
    if (emphasis && part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

export default function RichText({
  text, // string?: 문구
  emphasis = false, // boolean?: *글자* 를 파란 강조로
}) {
  const lines = String(text || '').split('\n')
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      <Line text={line} emphasis={emphasis} />
    </Fragment>
  ))
}
