import { useRef, useState } from 'react'

import Section from '@/components/common/Section'
import { MARKETS } from '@/constants/orderConst'
import { formatWon } from '@/utils/pricing'
import styles from './Orders.module.css'

// 판매 › 주문 접수 › 금액 — 들어온 돈(판매가 · 할인 · 고객 결제 · 수수료 · 정산)과 나간 돈(타오바오 구매 · 집운 배송비) · 이익 (2026-10-29)
//   빠진 돈 줄(할인 · 수수료 · 타오바오 구매 · 집운 배송비)을 누르면 아래에 증빙이 펼쳐진다 — 파일은 새 탭에서 열림, 그 자리에서 올리기
//   원화가 확정되지 않은 비용은 위안 × 오늘 환율로 추정하고 '(추정)' 을 붙인다

const won = (n) => (n == null ? '-' : n.toLocaleString('ko-KR'))
const minus = (n) => (n == null ? '-' : `−${won(n)}`)

// 마켓 정산 화면 — 수수료 증빙을 아직 파일로 못 받았을 때 바로 가 보는 곳
const SETTLE_LINKS = {
  coupang: { label: '쿠팡 Wing 정산 현황', url: 'https://wing.coupang.com/tenants/msf/wing/view/payment-report-view' },
  naver: { label: '스마트스토어 정산 내역', url: 'https://sell.smartstore.naver.com/#/naverpay/settlemgt/settlement' },
}

const CHARGED = { approved: '승인 금액', settled: '청구 확정' }

// 비용 1건의 원화 — 실제 청구 원화 > 원화 결제창 금액 > 위안 × 환율(추정)
export function costKrw(cny, { chargedKrw, chargedStatus, payCurrency, payAmount }, fx) {
  if (chargedKrw !== '' && chargedKrw != null)
    return { krw: Number(chargedKrw), est: chargedStatus === 'none', how: CHARGED[chargedStatus] || '청구 원화' }
  if (payCurrency === 'KRW' && payAmount) return { krw: Math.round(Number(payAmount)), est: false, how: '원화 결제' }
  if (cny && fx) return { krw: Math.round(Number(cny) * Number(fx)), est: true, how: `¥${cny} × ${Number(fx).toFixed(2)}` }
  return { krw: null, est: true, how: '금액 없음' }
}

function Docs({ docs }) {
  if (!docs.length) return <p className={styles.evNone}>올린 증빙이 없어요.</p>
  return (
    <ul className={styles.evList}>
      {docs.map((d) => (
        <li key={d.id}>
          <a href={d.url} target="_blank" rel="noreferrer">
            {d.contentType === 'application/pdf' ? 'PDF' : '사진'} · {d.name} ↗
          </a>
          {d.memo && <small>{d.memo}</small>}
        </li>
      ))}
    </ul>
  )
}

function UploadButton({ onFile, busy }) {
  const ref = useRef(null)
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) onFile(f)
        }}
      />
      <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? '올리는 중…' : '증빙 올리기'}
      </button>
    </>
  )
}

// 빠진 돈 한 줄 — 누르면 증빙 칸이 펼쳐진다
function CutRow({ k, open, onToggle, label, value, note, warn, children }) {
  return (
    <>
      <button
        type="button"
        className={`${styles.mRow} ${styles.mCut} ${open ? styles.mOpen : ''} ${warn ? styles.sellerCut : ''}`}
        onClick={() => onToggle(open ? null : k)}
        aria-expanded={open}
        title="눌러서 증빙 보기"
      >
        <span className={styles.mLabel}>
          {label} <i className={styles.mCaret}>{open ? '▾' : '▸'} 증빙</i>
        </span>
        <span className={styles.mVal}>
          {value}
          {note && <small>{note}</small>}
        </span>
      </button>
      {open && <div className={styles.evBox}>{children}</div>}
    </>
  )
}

export default function OrderMoney({
  order: o, // 고른 주문 (화면 모양)
  purchases, // 이 주문의 타오바오 구매 [] | null(불러오는 중)
  jiyuns, // 이 주문의 집운 기록 [] | null
  docs, // 이 주문의 증빙 []
  fx, // string|number: 오늘 1위안 원화 (추정용)
  onUpload, // async (file, { kind, purchaseId?, jiyunId? }) => void
  onShowRaw, // () => void: 마켓 원본 보기
  onPurchase, // (id?) => void: 구매기록 열기
  onJiyun, // (id?) => void: 집운 기록 열기
}) {
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(null)
  const a = o.amount
  const m = MARKETS[o.market]?.label || o.market
  const cancelled = o.stage === 'cancelled'

  const up = (key, meta) => async (file) => {
    setBusy(key)
    try {
      await onUpload(file, meta)
    } finally {
      setBusy(null)
    }
  }
  const docsOf = (pred) => (docs || []).filter(pred)

  const pList = (purchases || []).map((p) => ({ p, c: costKrw(p.paidCny, p, fx) }))
  const jList = (jiyuns || []).map((j) => ({ j, c: costKrw(j.feeCny, j, fx) }))
  const sum = (list) => list.reduce((s, x) => s + (x.c.krw || 0), 0)
  const pKrw = pList.length ? sum(pList) : null
  const jKrw = jList.length ? sum(jList) : null
  const pEst = pList.some((x) => x.c.est)
  const jEst = jList.some((x) => x.c.est)
  const settle = a ? a.settlement : o.totalPrice ?? null
  const profit = cancelled || settle == null ? null : settle - (pKrw || 0) - (jKrw || 0)
  const profitEst = a?.estimated || pEst || jEst || jKrw == null
  const missing = [!pList.length && '타오바오 구매', !jList.length && '집운 배송비'].filter(Boolean)

  return (
    <Section
      name="금액"
      id="money"
      sub={
        profit == null
          ? cancelled
            ? '취소·반품'
            : null
          : `이익 ${profit >= 0 ? '+' : '−'}${won(Math.abs(profit))}원${profitEst ? ' (추정)' : ''}`
      }
    >
      <div className={styles.money}>
        <div className={styles.mHead}>들어온 돈</div>
        <div className={styles.mRow}>
          <span className={styles.mLabel}>판매가(총액)</span>
          <span className={styles.mVal}>{formatWon(a ? a.total : o.totalPrice)}</span>
        </div>
        {a?.discount > 0 && (
          <CutRow
            k="discount"
            open={open === 'discount'}
            onToggle={setOpen}
            label="할인"
            value={minus(a.discount)}
            note={`부담: ${m} ${won(a.discountMarket)} / 판매자 ${won(a.discountSeller)}`}
            warn={!!a.discountSeller}
          >
            <p>
              {a.discountSeller
                ? `판매자 부담 ${won(a.discountSeller)}원은 정산에서 빠져요.`
                : `${m}이 전부 부담해서 정산에서는 빠지지 않아요.`}{' '}
              근거는 마켓이 보낸 주문 원본에 있어요.
            </p>
            <div className={styles.evActs}>
              <button type="button" className="btn-secondary btn-sm" onClick={onShowRaw}>
                마켓 원본 보기
              </button>
            </div>
          </CutRow>
        )}
        <div className={styles.mRow}>
          <span className={styles.mLabel}>고객 결제</span>
          <span className={styles.mVal}>{formatWon(a ? a.paid : o.totalPrice)}</span>
        </div>
        {a && (
          <CutRow
            k="fee"
            open={open === 'fee'}
            onToggle={setOpen}
            label={`${m} 수수료${a.estimated && a.feeRate != null ? '(추정)' : ''}`}
            value={minus(a.fee)}
            note={
              a.feeDetail.length
                ? a.feeDetail.map((f) => `${f.label} ${won(f.amount)}`).join(' · ')
                : a.feeRate != null
                  ? `${a.feeRate}%`
                  : ''
            }
          >
            <Docs docs={docsOf((d) => d.kind === 'market')} />
            <div className={styles.evActs}>
              {SETTLE_LINKS[o.market] && (
                <a href={SETTLE_LINKS[o.market].url} target="_blank" rel="noreferrer">
                  {SETTLE_LINKS[o.market].label} ↗
                </a>
              )}
              <UploadButton busy={busy === 'fee'} onFile={up('fee', { kind: 'market' })} />
            </div>
          </CutRow>
        )}
        <div className={`${styles.mRow} ${styles.mTotal}`}>
          <span className={styles.mLabel}>
            {cancelled ? '정산' : a?.actual ? '정산 확정' : a?.estimated ? '정산 예정(추정)' : '정산 예정'}
          </span>
          <span className={styles.mVal}>
            {cancelled ? '없음 (취소·반품)' : settle == null ? '-' : formatWon(settle)}
            {a?.actual && o.settlementDate && <small>{o.settlementDate}</small>}
          </span>
        </div>

        <div className={styles.mHead}>나간 돈 (원가)</div>
        <CutRow
          k="purchase"
          open={open === 'purchase'}
          onToggle={setOpen}
          label={`타오바오 구매${pEst ? '(추정)' : ''}`}
          value={purchases == null ? '…' : pList.length ? minus(pKrw) : '아직 없음'}
          note={pList.map((x) => x.c.how).join(' · ')}
        >
          {!pList.length && <p className={styles.evNone}>아직 타오바오 구매기록이 없어요.</p>}
          {pList.map(({ p, c }) => (
            <div key={p.id} className={styles.evItem}>
              <div className={styles.evMeta}>
                <b>{p.taobaoOrderNo}</b>
                <span>
                  {p.paidCny ? `실결제 ¥${p.paidCny}` : ''}
                  {p.payAmount ? ` · 결제창 ${p.payCurrency} ${p.payAmount}` : ''}
                  {` · ${c.krw == null ? '-' : won(c.krw) + '원'} (${c.how})`}
                </span>
              </div>
              <Docs docs={docsOf((d) => d.purchaseId === p.id || (d.kind === 'card' && !d.jiyunId))} />
              <div className={styles.evActs}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => onPurchase(p.id)}>
                  구매기록 보기
                </button>
                <UploadButton
                  busy={busy === `p${p.id}`}
                  onFile={up(`p${p.id}`, { kind: 'purchase', purchaseId: p.id })}
                />
              </div>
            </div>
          ))}
        </CutRow>
        <CutRow
          k="jiyun"
          open={open === 'jiyun'}
          onToggle={setOpen}
          label={`집운 배송비${jEst ? '(추정)' : ''}`}
          value={jiyuns == null ? '…' : jList.length ? minus(jKrw) : '아직 없음'}
          note={jList.map((x) => x.c.how).join(' · ')}
        >
          {!jList.length && <p className={styles.evNone}>아직 집운 배송 요청 기록이 없어요.</p>}
          {jList.map(({ j, c }) => (
            <div key={j.id} className={styles.evItem}>
              <div className={styles.evMeta}>
                <b>{j.jiyunNo}</b>
                <span>
                  {j.weightKg ? `${j.weightKg}kg · ` : ''}
                  {j.feeCny ? `¥${j.feeCny}` : ''}
                  {` · ${c.krw == null ? '-' : won(c.krw) + '원'} (${c.how})`}
                </span>
              </div>
              <Docs docs={docsOf((d) => d.jiyunId === j.id)} />
              <div className={styles.evActs}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => onJiyun(j.id)}>
                  집운 기록 보기
                </button>
                <UploadButton busy={busy === `j${j.id}`} onFile={up(`j${j.id}`, { kind: 'jiyun', jiyunId: j.id })} />
              </div>
            </div>
          ))}
        </CutRow>
        <div className={`${styles.mRow} ${styles.mTotal} ${profit != null && profit < 0 ? styles.mLoss : ''}`}>
          <span className={styles.mLabel}>이익{profitEst && profit != null ? '(추정)' : ''}</span>
          <span className={styles.mVal}>
            {profit == null ? '-' : `${profit < 0 ? '−' : ''}${won(Math.abs(profit))}원`}
            {profit != null && missing.length > 0 && <small>{missing.join(' · ')} 빠짐</small>}
          </span>
        </div>
      </div>
    </Section>
  )
}
