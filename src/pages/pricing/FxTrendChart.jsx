import { useLayoutEffect, useRef, useState } from 'react'

import { formatFx } from '@/utils/pricing'
import styles from './FxTrendChart.module.css'

const PAD = { top: 10, right: 12, bottom: 22, left: 48 }
const KST = { timeZone: 'Asia/Seoul' }

// 눈금 — 범위를 4칸 정도로 나누는 보기 좋은 간격 (1 · 2 · 5 × 10ⁿ)
const niceTicks = (min, max) => {
  const raw = (max - min || 1) / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw)
  const ticks = []
  for (let v = Math.floor(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(+v.toFixed(6))
  if (ticks[ticks.length - 1] < max) ticks.push(+(ticks[ticks.length - 1] + step).toFixed(6))
  return ticks
}

// 하루 안이면 '09:14', 아니면 '10.21'
const axisLabel = (ms, short) => {
  const d = new Date(ms)
  if (short) return d.toLocaleTimeString('ko-KR', { ...KST, hour: '2-digit', minute: '2-digit', hour12: false })
  const [m, day] = d.toLocaleDateString('sv-SE', KST).slice(5).split('-')
  return `${Number(m)}.${Number(day)}`
}
const tipLabel = (ms) =>
  new Date(ms).toLocaleString('sv-SE', { ...KST, hour12: false }).slice(0, 16)

// 환율 추이 선 그래프 — 가로축은 실제 시각(매시간 기록이 빠진 구간은 그만큼 비어 보임).
// 부모 높이를 그대로 쓴다 (SVG, 크기가 바뀌면 다시 그림).
export default function FxTrendChart({
  points, // Array<{ at: ISO 문자열, rate: number }>: 오래된 → 최근
  emptyText = '기록이 쌓이면 추이가 보여요',
}) {
  const boxRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState(null) // index

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pts = points.map((p) => ({ t: Date.parse(p.at), rate: p.rate }))
  const { w, h } = size

  if (pts.length < 2) {
    return (
      <div ref={boxRef} className={styles.box}>
        <p className={styles.empty}>{emptyText}</p>
      </div>
    )
  }

  const rates = pts.map((p) => p.rate)
  const lo = Math.min(...rates)
  const hi = Math.max(...rates)
  const margin = Math.max((hi - lo) * 0.15, 0.05)
  const ticks = niceTicks(lo - margin, hi + margin)
  const yMin = ticks[0]
  const yMax = ticks[ticks.length - 1]
  const t0 = pts[0].t
  const t1 = pts[pts.length - 1].t
  const short = t1 - t0 <= 36 * 3600 * 1000
  const iw = Math.max(1, w - PAD.left - PAD.right)
  const ih = Math.max(1, h - PAD.top - PAD.bottom)
  const x = (t) => PAD.left + ((t - t0) / (t1 - t0 || 1)) * iw
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * ih

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.rate).toFixed(1)}`).join('')
  const base = PAD.top + ih
  const area = `${line}L${x(t1).toFixed(1)},${base}L${PAD.left},${base}Z`
  const xLabels = [t0, (t0 + t1) / 2, t1]

  // 커서에서 가장 가까운 시각의 점
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const t = t0 + ((e.clientX - r.left - PAD.left) / iw) * (t1 - t0)
    let best = 0
    pts.forEach((p, i) => {
      if (Math.abs(p.t - t) < Math.abs(pts[best].t - t)) best = i
    })
    setHover(best)
  }

  const hp = hover == null ? null : pts[hover]
  const tipLeft = hp ? Math.min(Math.max(x(hp.t) - 64, 0), w - 128) : 0

  return (
    <div ref={boxRef} className={styles.box}>
      {w > 0 && h > 0 && (
        <svg
          width={w}
          height={h}
          className={styles.svg}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`환율 추이 ${tipLabel(t0)} ~ ${tipLabel(t1)}, 최저 ${lo} 최고 ${hi}`}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={w - PAD.right} y1={y(v)} y2={y(v)} className={styles.grid} />
              <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className={styles.axis}>
                {formatFx(String(v))}
              </text>
            </g>
          ))}
          {xLabels.map((t, k) => (
            <text
              key={k}
              x={x(t)}
              y={h - 6}
              textAnchor={['start', 'middle', 'end'][k]}
              className={styles.axis}
            >
              {axisLabel(t, short)}
            </text>
          ))}
          <path d={area} className={styles.area} />
          <path d={line} className={styles.line} />
          {pts.length <= 60 &&
            pts.map((p) => <circle key={p.t} cx={x(p.t)} cy={y(p.rate)} r="2" className={styles.mark} />)}
          {hp && (
            <g>
              <line x1={x(hp.t)} x2={x(hp.t)} y1={PAD.top} y2={base} className={styles.cross} />
              <circle cx={x(hp.t)} cy={y(hp.rate)} r="4" className={styles.dot} />
            </g>
          )}
        </svg>
      )}
      {hp && (
        <div className={styles.tip} style={{ left: tipLeft }}>
          <b>{formatFx(String(hp.rate))}원</b>
          <span>{tipLabel(hp.t)}</span>
        </div>
      )}
    </div>
  )
}
