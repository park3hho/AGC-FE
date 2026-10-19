import { BULK_MODES, BULK_TARGET_ALL } from '@/constants/pricingConst'
import { digitsOnly, withCommas } from '@/utils/pricing'
import styles from './Pricing.module.css'

// 일괄 적용 바 — [목표 차익 | 목표 마진 | 판매가] [값] [전체 | 쿠팡 | 네이버] [적용]
export default function PricingBulkBar({
  bulk, // { mode, amount, target }: 현재 선택
  platforms, // Array<{ key, label }>: 대상으로 고를 판매처
  message, // { text, error }: 적용 결과 안내
  onChange, // function(partial): bulk 일부 바꿈
  onApply, // function: 적용
}) {
  const mode = BULK_MODES.find((m) => m.key === bulk.mode) || BULK_MODES[0]
  const isWon = mode.unit === '원'
  const targets = [{ key: BULK_TARGET_ALL, label: '전체' }, ...platforms]

  return (
    <div className={styles.bulkWrap}>
      <div className={styles.bulk}>
        <div className={styles.segment} role="group" aria-label="일괄 적용 방식">
          {BULK_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`${styles.segmentItem} ${bulk.mode === m.key ? styles.segmentActive : ''}`}
              aria-pressed={bulk.mode === m.key}
              onClick={() => onChange({ mode: m.key, amount: m.initial })}
            >
              {m.label}
            </button>
          ))}
        </div>

        <span className={styles.amount}>
          <input
            className={`form-input ${styles.compact} ${styles.amountInput}`}
            type="text"
            inputMode={isWon ? 'numeric' : 'decimal'}
            aria-label={`${mode.label} 값`}
            placeholder={isWon ? '금액' : '마진'}
            value={isWon ? withCommas(bulk.amount) : bulk.amount}
            onChange={(e) =>
              onChange({
                amount: isWon ? digitsOnly(e.target.value) : e.target.value.replace(/[^0-9.]/g, ''),
              })
            }
          />
          <span className={styles.unit}>{mode.unit}</span>
        </span>

        <div className={styles.segment} role="group" aria-label="일괄 적용 대상">
          {targets.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.segmentItem} ${bulk.target === t.key ? styles.segmentActive : ''}`}
              aria-pressed={bulk.target === t.key}
              onClick={() => onChange({ target: t.key })}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button type="button" className="btn-secondary btn-sm" onClick={onApply}>
          적용
        </button>
      </div>
      {message.text ? (
        <p className={message.error ? 'form-error' : styles.bulkNote}>{message.text}</p>
      ) : (
        <p className={styles.bulkNote}>
          {bulk.mode === 'sale' ? '모든 옵션에 같은 판매가를 넣어요' : '100원 단위로 올려서 계산해요'}
        </p>
      )}
    </div>
  )
}
