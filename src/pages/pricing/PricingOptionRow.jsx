import Thumb from '@/components/Thumb'
import { GOOD_MARGIN_PCT, LOW_MARGIN_PCT, MARGIN_BAR_MAX_PCT } from '@/constants/pricingConst'
import { digitsOnly, formatCny, formatPct, formatWon, withCommas } from '@/utils/pricing'
import styles from './Pricing.module.css'

const toneOf = (result) => {
  if (!result) return ''
  if (result.profit < 0) return styles.neg
  if (result.marginPct < LOW_MARGIN_PCT) return styles.low
  if (result.marginPct >= GOOD_MARGIN_PCT) return styles.good
  return styles.ok
}

// 판매처 1칸 — 판매가 입력 + 차익·마진 막대 + (네이버) 대표가·추가금
function PriceCell({
  name, // string: 옵션 이름 (입력칸 라벨용)
  platformLabel, // string: 판매처 이름
  value, // string: 판매가 (숫자만)
  result, // { profit, marginPct }?: 계산 결과
  addon, // { amount, isBase, over }?: 네이버 추가금 — 쿠팡은 undefined
  invalid, // boolean?: 판매가 입력 오류
  changed, // boolean?: 저장된 값과 다름
  onChange, // function(string): 판매가 바뀜 (숫자만)
}) {
  const tone = toneOf(result)
  const barPct = result ? Math.max(0, Math.min(100, (result.marginPct / MARGIN_BAR_MAX_PCT) * 100)) : 0

  return (
    <div className={styles.cell}>
      <div className={styles.priceLine}>
        <input
          className={`form-input ${styles.compact} ${styles.priceInput} ${
            invalid ? 'form-input-error' : changed ? styles.changed : ''
          }`}
          type="text"
          inputMode="numeric"
          placeholder="판매가"
          aria-label={`${name} ${platformLabel} 판매가`}
          value={withCommas(value)}
          onChange={(e) => onChange(digitsOnly(e.target.value))}
        />
        {addon && (
          <span
            className={`${styles.badge} ${addon.isBase ? styles.badgeBase : ''} ${
              addon.over ? styles.badgeBad : ''
            }`}
            title={addon.over ? '네이버 옵션 추가금 한도를 넘어요' : undefined}
          >
            {addon.isBase ? '대표가' : `+${addon.amount.toLocaleString('ko-KR')}`}
          </span>
        )}
      </div>
      <div className={`${styles.meta} ${tone}`}>
        <span className={styles.bar}>
          <i style={{ width: `${barPct}%` }} />
        </span>
        <span className={styles.metaText}>
          {result ? `차익 ${formatWon(result.profit)} · ${formatPct(result.marginPct)}` : '-'}
        </span>
      </div>
    </div>
  )
}

// 옵션 1행 — 왼쪽 옵션·원가, 오른쪽 판매처별 칸
export default function PricingOptionRow({
  option, // ShippingOption: 옵션 (priceCny · shippingCny · billableKg)
  cost, // number?: 원가 + 배송비 (원)
  cells, // Array<{ platform, value, result, addon, invalid, changed }>: 판매처별 칸
  onChange, // function(platformKey, value): 판매가 바뀜
}) {
  const name = option.option2 ? `${option.option1} / ${option.option2}` : option.option1

  return (
    <div className={`${styles.grid} ${styles.row}`}>
      <div className={styles.opt}>
        {option.photoUrl && <Thumb src={option.photoUrl} size={32} />}
        <div className={styles.optText}>
          <div className={styles.optionName}>{name}</div>
          <div className={styles.optionSub}>
            {formatCny(option.priceCny)}
            {option.shippingCny != null &&
              ` + 배송 ${formatCny(option.shippingCny)} (${option.billableKg}kg)`}
          </div>
          {cost != null && <div className={styles.optionSub}>원가+배송 {formatWon(cost)}</div>}
          {option.shippingCny == null && (
            <div className={styles.optionWarn}>용량을 못 읽어 배송비를 몰라요 (245ml×24 처럼)</div>
          )}
          {option.overLimit && <div className={styles.optionWarn}>30kg 초과 — 집운 소형 불가</div>}
        </div>
      </div>

      {cells.map((c) => (
        <PriceCell
          key={c.platform.key}
          name={name}
          platformLabel={c.platform.label}
          value={c.value}
          result={c.result}
          addon={c.addon}
          invalid={c.invalid}
          changed={c.changed}
          onChange={(v) => onChange(c.platform.key, v)}
        />
      ))}
    </div>
  )
}

