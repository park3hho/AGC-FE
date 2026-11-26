import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { getShippingRule } from '@/api/shipping'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import { useFitRows } from '@/hooks/useFitRows'
import ShippingTabs from '@/pages/shipping/ShippingTabs'
import { cnyToKrw, formatCny, formatFx, formatWon } from '@/utils/pricing'
import styles from './Shipping.module.css'

const formatMl = (ml) => `${ml.toLocaleString('ko-KR')}ml`

// 모바일은 한 번에 한 섹션 (DESIGN.md §4.4)
const MOBILE_TABS = [
  { id: 'table', name: '요금표' },
  { id: 'rule', name: '요금 규칙' },
  { id: 'estimate', name: '운임 예측' },
  { id: 'guide', name: '공식 기준' },
]

// 집운 운임 예측 수식 — BE services/pricing/jiyun_estimate.py 와 같은 내용 (2026-11-26)
// 주문 예상 운임: GET /jiyun-estimate/order/{id} · 물건 추가: POST /jiyun-estimate {items, add}
const ESTIMATE_STEPS = [
  {
    k: '① 옵션 1개 무게',
    f: '같은 옵션 실측 중앙값 → 없으면 같은 제품 다른 옵션 실측 × (용량 ÷ 그 옵션 용량) → 없으면 예측',
  },
  {
    k: '   예측 · 음료',
    f: '실제 = 용량(ml) × k + 상자 500g   (k = 실측으로 맞춘 1ml당 무게, 약 1.03g)',
  },
  {
    k: '   예측 · 과자·차',
    f: '실제 = 용량(g) × 1~1.5 + 상자 500g(한 번) · 부피 = 옵션에 적힌 상자 cm, 없으면 실측 상자 중앙값',
  },
  { k: '② 부피 무게', f: '가로 × 세로 × 높이(cm) ÷ 6000' },
  { k: '③ 계산 무게 W', f: 'max(Σ 실제 무게, Σ 부피 무게) × 1.01   (합포장은 소포 무게를 더함)' },
  { k: '④ 청구 kg', f: 'W ≤ 1kg → 1kg · 넘으면 1 + ⌈(W − 1) ÷ 0.5⌉ × 0.5' },
  { k: '⑤ 운임', f: '첫 1kg 요금 + (청구 kg − 1) ÷ 0.5 × ¥2' },
  {
    k: '   첫 1kg 요금',
    f: '식품 ¥33 (기본) · 일반 ¥21.5 (그 제품만 든 집운이 일반 요금으로 나온 적 있을 때, 섞이면 식품)',
  },
  { k: '⑥ 30kg 넘음', f: 'n = ⌈W ÷ 30⌉ 개로 나눠 보냄 → n × 운임(W ÷ n)   (한 번에 보내면 대형 요금)' },
  { k: '⑦ 물건 추가', f: '추가 운임 = 운임(지금 묶음 + 추가) − 운임(지금 묶음)' },
]

// 배송비 — 무게 구간별 요금표. 위안은 BE 요금 규칙, 원화 = 위안 × 현재 환율 (환율을 바꾸면 같이 바뀐다)
// 옵션별 실제 배송비는 가격 책정 화면에서 계산한다
// 요금표는 남은 높이를 채우고, 들어가는 구간 수만큼 한 페이지로 보여준다 (DESIGN.md §4.4)
export default function ShippingFeePage() {
  const [data, setData] = useState(null) // { fx, rule, brackets }
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const tableRef = useRef(null)
  const pageSize = useFitRows(tableRef, { fallback: 45 })
  const tabs = useSectionTabs(MOBILE_TABS)

  useEffect(() => {
    getShippingRule()
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="배송" sub={<ShippingTabs />} subKeep back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!data) return null

  const { fx, rule, brackets } = data
  const max = brackets[brackets.length - 1] // 소형 한도 구간 (30kg)
  const maxKrw = max ? cnyToKrw(max.shippingCny, fx.cnyKrw) : null
  const pageCount = Math.max(1, Math.ceil(brackets.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const rows = brackets.slice(start, start + pageSize)

  return (
    <main className="page-flat">
      <PageHeader title="배송" sub={<ShippingTabs />} subKeep back />
      <SectionTabs {...tabs} />

      {/* 요금 규칙 + 현재 환율 */}
      <Section name="요금 규칙" id="rule" title={false} plain className={tabs.hide('rule')}>
        <div className={styles.rule}>
          <div className={styles.ruleTitle}>
            {rule.service} · {rule.category}
          </div>
          <div className={styles.hint}>
            첫 {Number(rule.firstKg)}kg {formatCny(rule.firstCny)} · {Number(rule.stepKg)}kg마다{' '}
            {formatCny(rule.stepCny)} · 최대 {Number(rule.maxKg)}kg
          </div>
          <div className={styles.hint}>
            무게 = 용량(ml) × 1g + 박스 {rule.boxWeightG}g → {Number(rule.stepKg)}kg 단위 올림
          </div>
          {max && (
            <div className={styles.ruleMax}>
              최대 {Number(max.billableKg)}kg = 용량 {formatMl(max.maxVolumeMl)}까지 ·{' '}
              {formatCny(max.shippingCny)} ·{' '}
              <strong>{maxKrw == null ? '-' : formatWon(maxKrw)}</strong>
            </div>
          )}
          <div className={styles.hint}>
            {Number(rule.maxKg)}kg을 넘으면 이 요금표(집운 소형)로 보낼 수 없어요. 관세는 반영하지
            않아요.
          </div>
          {rule.volumetric && (
            <div className={styles.hint}>
              차(티백)는 부피 무게도 봐요 — 상자 {rule.volumetric.boxCm.join('×')}cm ÷{' '}
              {rule.volumetric.divisor} = {rule.volumetric.boxWeightG / 1000}kg, 실제 무게와 큰
              값으로 계산
            </div>
          )}
          <div className={styles.ruleFx}>
            <span>
              환율 <strong>1위안 = {formatFx(fx.cnyKrw)}원</strong>
              {!fx.date && <span className={styles.hint}> · 기본값</span>}
            </span>
            <Link to="/exchange-rate" className="btn-text">
              환율 설정
            </Link>
          </div>
        </div>
      </Section>

      {/* 집운 운임 예측 수식 — 실측 우선, 없으면 예측 (2026-11-26) */}
      <Section name="운임 예측" id="estimate" title={false} plain className={tabs.hide('estimate')}>
        <details className={`${styles.rule} ${styles.guide}`}>
          <summary className={styles.ruleTitle}>
            운임 예측 수식 <span className={styles.hint}>· 실측 우선, 없으면 예측</span>
          </summary>
          <div className={styles.formula}>
            {ESTIMATE_STEPS.map((s) => (
              <div key={s.k} className={styles.formulaRow}>
                <span className={styles.formulaKey}>{s.k}</span>
                <span>{s.f}</span>
              </div>
            ))}
          </div>
          <div className={styles.hint}>
            대조 11-26 · 실제 집운 60건(예외 3건 뺀) — 실측 있는 37건 전부 일치 · 전체 평균 오차 ¥1.27
            (예전 ¥5.03) · 집운 결제마다 실측이 쌓여 예측이 실측으로 바뀜
          </div>
        </details>
      </Section>

      {/* 타오바오 공식 집운 기준 — 표시용 (계산은 식품 요율) */}
      <Section name="공식 기준" id="guide" title={false} plain className={tabs.hide('guide')}>
        <details className={`${styles.rule} ${styles.guide}`}>
          <summary className={styles.ruleTitle}>
            타오바오 공식 집운 기준 <span className={styles.hint}>· 해운 택배 (한국)</span>
          </summary>
          {rule.eta && <div className={styles.hint}>{rule.eta}</div>}
          <div className={styles.guideRates}>
            {rule.rates.map((r) => (
              <div key={r.cn} className={styles.guideRate}>
                <span className={r.applied ? styles.guideOn : undefined}>
                  {r.name} <span className={styles.hint}>{r.cn}</span>
                  {r.applied && <span className={styles.guideTag}>AGC 계산</span>}
                </span>
                <span className={styles.hint}>{r.range}</span>
                <span>{r.price}</span>
              </div>
            ))}
          </div>
          <ul className={styles.guideList}>
            {rule.billableRule && <li>계산 무게: {rule.billableRule}</li>}
            {rule.rounding.map((t) => (
              <li key={t}>{t}</li>
            ))}
            {rule.sizeLimits.map((t) => (
              <li key={t}>{t}</li>
            ))}
            {rule.taxNote && <li>{rule.taxNote}</li>}
            {rule.notes.map((t) => (
              <li key={t}>{t}</li>
            ))}
            {rule.volumetric && <li>부피 무게 나누는 값: {rule.volumetric.sourceNote}</li>}
          </ul>
          {rule.sourceUrl && (
            <div className={styles.hint}>
              출처{' '}
              <a href={rule.sourceUrl} target="_blank" rel="noreferrer" className="btn-text">
                타오바오 집운 안내
              </a>
              {rule.sourceChecked && ` · ${rule.sourceChecked} 확인`}
            </div>
          )}
        </details>
      </Section>

      {/* 무게 구간별 요금표 */}
      <Section
        name="요금표"
        id="table"
        title="무게 구간별 요금"
        sub={`${brackets.length}구간`}
        flush
        fill
        bodyRef={tableRef}
        className={tabs.hide('table')}
        footer={
          <Pager
            page={current}
            pageCount={pageCount}
            total={brackets.length}
            unit="구간"
            onChange={setPage}
          />
        }
      >
        <div className={styles.table} role="table" aria-label="무게별 배송비">
          <div className={`${styles.tableRow} ${styles.tableHead}`} role="row" data-fit-head>
            <span role="columnheader">무게</span>
            <span role="columnheader">용량</span>
            <span role="columnheader" className={styles.num}>
              위안
            </span>
            <span role="columnheader" className={styles.num}>
              원화
            </span>
          </div>
          {rows.map((b, j) => {
            const i = start + j
            const krw = cnyToKrw(b.shippingCny, fx.cnyKrw)
            const prevMl = i > 0 ? brackets[i - 1].maxVolumeMl : null
            return (
              <div key={b.billableKg} className={styles.tableRow} role="row" data-fit-row>
                <span role="cell">{Number(b.billableKg)}kg</span>
                <span role="cell" className={styles.hint}>
                  {prevMl == null
                    ? `~${formatMl(b.maxVolumeMl)}`
                    : `${formatMl(prevMl + 1)}~${formatMl(b.maxVolumeMl)}`}
                </span>
                <span role="cell" className={`${styles.num} ${styles.hint}`}>
                  {formatCny(b.shippingCny)}
                </span>
                <span role="cell" className={`${styles.num} ${styles.fee}`}>
                  {krw == null ? '-' : formatWon(krw)}
                </span>
              </div>
            )
          })}
        </div>
      </Section>
    </main>
  )
}
