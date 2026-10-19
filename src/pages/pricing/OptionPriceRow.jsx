import Thumb from '@/components/Thumb'
import { GOOD_MARGIN_PCT, SALE_PRICE_UNIT } from '@/constants/pricingConst'
import { formatCny, formatPct, formatWon } from '@/utils/pricing'
import styles from './Pricing.module.css'

// 옵션 1행 — 왼쪽 옵션명·원가, 오른쪽 판매가 입력·차익
export default function OptionPriceRow({
  option, // ShippingOption: 기준 조사 옵션 (priceCny · shippingCny · billableKg)
  value, // string: 판매가 입력값
  cost, // number?: 원가 + 배송비 (설정이 모자라면 null)
  result, // { profit, marginPct }?: calcOption 결과 (판매가 없으면 null)
  addon, // number?: 네이버 추가금 (대표가 기준) — 쿠팡은 undefined
  invalid, // boolean?: 판매가 입력 오류
  onChange, // function(string): 판매가 바뀜
}) {
  const name = option.option2 ? `${option.option1} / ${option.option2}` : option.option1

  let tone = ''
  if (result && result.profit < 0) tone = styles.loss
  else if (result && result.marginPct >= GOOD_MARGIN_PCT) tone = styles.good

  return (
    <div className={styles.row}>
      <div className={styles.rowLeft}>
        {option.photoUrl && <Thumb src={option.photoUrl} size={32} />}
        <div className={styles.rowText}>
          <div className={styles.optionName}>{name}</div>
          <div className={styles.optionSub}>
            {formatCny(option.priceCny)}
            {option.shippingCny != null
              ? ` + 배송 ${formatCny(option.shippingCny)} (${option.billableKg}kg)`
              : ''}
            {cost != null && ` · 원가+배송 ${formatWon(cost)}`}
          </div>
          {option.shippingCny == null && (
            <div className={styles.optionWarn}>
              용량을 못 읽어 배송비를 계산할 수 없어요 (옵션 이름에 245ml×24 처럼)
            </div>
          )}
          {option.overLimit && (
            <div className={styles.optionWarn}>30kg 초과 — 집운 소형으로 못 보내요</div>
          )}
        </div>
      </div>

      <div className={styles.rowRight}>
        <input
          className={`form-input ${styles.compact} ${styles.priceInput} ${invalid ? 'form-input-error' : ''}`}
          type="number"
          inputMode="numeric"
          min={0}
          step={SALE_PRICE_UNIT}
          placeholder="판매가"
          aria-label={`${name} 판매가`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {result && (
          <div className={`${styles.result} ${tone}`}>
            차익 {formatWon(result.profit)} · {formatPct(result.marginPct)}
          </div>
        )}
        {addon != null && (
          <div className={styles.addon}>{addon === 0 ? '대표가' : `+${formatWon(addon)}`}</div>
        )}
      </div>
    </div>
  )
}
