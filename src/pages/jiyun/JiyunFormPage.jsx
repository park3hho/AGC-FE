import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { createJiyun, deleteJiyun, getJiyun, updateJiyun } from '@/api/jiyun'
import { getOrder } from '@/api/order'
import { getPurchases } from '@/api/taobaoPurchase'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import {
  CHARGED_STATUS,
  JIYUN_STATUS,
  KR_COURIERS,
  MARKETS,
  PAY_CURRENCY,
  PAY_METHOD,
  TRANSPORTS,
} from '@/constants/orderConst'
import { useMobile } from '@/hooks/useMobile'
import m from '../orders/FormMobile.module.css'
import styles from '../orders/Orders.module.css'
import JiyunFormMobile from './JiyunFormMobile'

// ISO → <input type="datetime-local"> 값 (KST)
const toLocal = (iso) =>
  iso
    ? new Date(iso)
        .toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' })
        .slice(0, 16)
        .replace(' ', 'T')
    : ''
// <input type="datetime-local"> 값 (KST) → ISO
const fromLocal = (v) => (v ? `${v}:00+09:00` : '')
const nowLocal = () => toLocal(new Date().toISOString())

const EMPTY = {
  jiyunNo: '',
  status: 'requested',
  packages: [],
  weightKg: '',
  feeCny: '',
  transport: 'sea',
  requestedAt: '',
  payMethod: '',
  payCurrency: '',
  payAmount: '',
  chargedKrw: '',
  chargedStatus: 'none',
  chargedAt: '',
  chargedSource: '',
  dispatchedAt: '',
  hbl: '',
  krCourier: '',
  krTrackingNo: '',
  memo: '',
}

const orderLabel = (o) =>
  `${o.code || '코드 없음'} · ${MARKETS[o.market].label} ${o.orderNo} · ${o.productName}${o.optionName ? ` (${o.optionName})` : ''} ×${o.quantity}`

// 판매 › 주문 접수 › 집운 기록 추가 · 수정 — 섹션: 입력 (저장 버튼은 섹션 아래 고정)
//   집운 번호(배송 요청 번호) 하나 = 기록 1건, 고객 주문 1건에 붙는다. 집운 번호만 필수, 나머지는 아는 만큼.
//   배송비 실제 결제 · 출고 · H B/L · 국내 송장. 저장하면 그 고객 주문의 추적 기록에 남는다 (이전값 → 새값).
export default function JiyunFormPage() {
  const { orderId, id } = useParams()
  const [params] = useSearchParams()
  const editing = id != null
  const backOrder = orderId || params.get('order') || ''
  const fromList = params.get('from') === 'jiyun'
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [order, setOrder] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const mobile = useMobile()

  useEffect(() => {
    const load = async () => {
      if (editing) {
        const j = await getJiyun(id)
        setForm({
          ...j,
          requestedAt: toLocal(j.requestedAt),
          chargedAt: toLocal(j.chargedAt),
          dispatchedAt: toLocal(j.dispatchedAt),
        })
        setOrder(j.order)
      } else {
        const [{ order: o }, purchases] = await Promise.all([
          getOrder(orderId),
          getPurchases({ orderId }),
        ])
        // 이 고객 주문의 타오바오 구매기록에서 중국 운송장을 묶인 소포로 미리 채운다
        setForm({
          ...EMPTY,
          requestedAt: nowLocal(),
          packages: purchases.map((p) => p.cnTrackingNo).filter(Boolean),
        })
        setOrder(o)
      }
      setLoaded(true)
    }
    load().catch((err) => setError(err.message))
  }, [editing, id, orderId])

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    setError('')
  }
  const setStatus = (s) => {
    const next = { ...form, status: s }
    if (s === 'dispatched' && !next.dispatchedAt) next.dispatchedAt = nowLocal()
    setForm(next)
    setError('')
  }

  const back = () =>
    navigate(fromList ? '/jiyun' : backOrder ? `/orders?id=${backOrder}` : '/orders', {
      replace: true,
    })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.jiyunNo.trim()) return setError('집운 번호(배송 요청 번호)를 적어주세요')
    setSaving(true)
    try {
      const body = {
        ...form,
        packages: form.packages.map((p) => p.trim()).filter(Boolean),
        requestedAt: fromLocal(form.requestedAt),
        chargedAt: fromLocal(form.chargedAt),
        dispatchedAt: fromLocal(form.dispatchedAt),
      }
      if (editing) await updateJiyun(id, body)
      else await createJiyun(orderId, body)
      back()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('이 집운 기록을 삭제할까요? (추적 기록은 남아요)')) return
    try {
      await deleteJiyun(id)
      back()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader
        title={editing ? '집운 기록을 고쳐요' : '집운 배송 요청을 적어요'}
        sub="저장하면 이 고객 주문의 추적 기록에 남아요"
        back
        action={
          editing && (
            <button type="button" className={`btn-ghost btn-md ${styles.bad}`} onClick={remove}>
              삭제
            </button>
          )
        }
      />

      <Section
        name="입력"
        id="form"
        title={false}
        fill
        footer={
          <div className={mobile ? `sticky-cta ${m.foot}` : styles.formFoot}>
            {error && <p className="form-error">{error}</p>}
            <button
              className="btn-primary btn-md btn-full"
              type="submit"
              disabled={saving || !loaded}
            >
              {saving ? '저장 중…' : editing ? '수정 저장' : '집운 기록 저장'}
            </button>
          </div>
        }
      >
        {mobile ? (
          <JiyunFormMobile {...{ form, setForm, set, setStatus, nowLocal, order, editing }} />
        ) : (
          <>
        <div className={styles.fGroup}>
          <h3 className={styles.fTitle}>고객 주문</h3>
          <p className={styles.linkText}>{order ? orderLabel(order) : '불러오는 중…'}</p>
        </div>

        <div className={styles.fGroup}>
          <h3 className={styles.fTitle}>집운 배송 요청</h3>
          <div className={styles.fGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="jiyunNo">
                집운 번호 (배송 요청 번호) · 필수
              </label>
              <input
                id="jiyunNo"
                className="form-input"
                autoComplete="off"
                value={form.jiyunNo}
                onChange={set('jiyunNo')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="requestedAt">
                배송 요청 일시
              </label>
              <input
                id="requestedAt"
                className="form-input"
                type="datetime-local"
                value={form.requestedAt}
                onChange={set('requestedAt')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="weightKg">
                무게 (kg, 집운이 잰 요금 무게)
              </label>
              <input
                id="weightKg"
                className="form-input"
                inputMode="decimal"
                placeholder="예: 2.5"
                value={form.weightKg}
                onChange={set('weightKg')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="feeCny">
                배송비 (위안, 집운 표시 금액)
              </label>
              <input
                id="feeCny"
                className="form-input"
                inputMode="decimal"
                placeholder="예: 39.00"
                value={form.feeCny}
                onChange={set('feeCny')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="transport">
                운송
              </label>
              <select
                id="transport"
                className="form-input"
                value={form.transport}
                onChange={set('transport')}
              >
                <option value="">모름</option>
                {Object.entries(TRANSPORTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="packages">
              묶인 소포 (중국 운송장, 쉼표로 여러 개)
            </label>
            <input
              id="packages"
              className="form-input"
              autoComplete="off"
              placeholder="예: SF5145503342072"
              value={form.packages.join(', ')}
              onChange={(e) => setForm({ ...form, packages: e.target.value.split(/[,\s]+/) })}
            />
          </div>
        </div>

        <div className={styles.fGroup}>
          <h3 className={styles.fTitle}>배송비 실제 결제</h3>
          <div className={styles.fGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="payMethod">
                결제수단
              </label>
              <select
                id="payMethod"
                className="form-input"
                value={form.payMethod}
                onChange={set('payMethod')}
              >
                <option value="">모름</option>
                {Object.entries(PAY_METHOD).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="payAmount">
                결제창 금액 (결제 수수료 포함)
              </label>
              <div className={styles.amountRow}>
                <select
                  className="form-input"
                  aria-label="결제 통화"
                  value={form.payCurrency}
                  onChange={set('payCurrency')}
                >
                  <option value="">통화</option>
                  {PAY_CURRENCY.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  id="payAmount"
                  className="form-input"
                  inputMode="decimal"
                  placeholder="예: 5.65"
                  value={form.payAmount}
                  onChange={set('payAmount')}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="chargedKrw">
                실제 청구 원화 (카드사·카카오페이 기준)
              </label>
              <input
                id="chargedKrw"
                className="form-input"
                inputMode="numeric"
                placeholder="예: 7650"
                value={form.chargedKrw}
                onChange={set('chargedKrw')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="chargedStatus">
                청구 확인
              </label>
              <select
                id="chargedStatus"
                className="form-input"
                value={form.chargedStatus}
                onChange={set('chargedStatus')}
              >
                {Object.entries(CHARGED_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="chargedAt">
                결제 일시
              </label>
              <input
                id="chargedAt"
                className="form-input"
                type="datetime-local"
                value={form.chargedAt}
                onChange={set('chargedAt')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="chargedSource">
                확인한 곳
              </label>
              <input
                id="chargedSource"
                className="form-input"
                placeholder="예: 현대카드 앱 승인내역"
                value={form.chargedSource}
                onChange={set('chargedSource')}
              />
            </div>
          </div>
        </div>

        <div className={styles.fGroup}>
          <h3 className={styles.fTitle}>출고 · 국제 운송 · 국내 송장</h3>
          <div className={styles.statusPick} role="radiogroup" aria-label="집운 상태">
            {Object.entries(JIYUN_STATUS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={form.status === k}
                className={`${styles.chip} ${form.status === k ? styles.chipOn : ''}`}
                onClick={() => setStatus(k)}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className={styles.fGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="dispatchedAt">
                집운 출고 일시
              </label>
              <input
                id="dispatchedAt"
                className="form-input"
                type="datetime-local"
                value={form.dispatchedAt}
                onChange={set('dispatchedAt')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="hbl">
                국제 운송장 (H B/L — 통관 조회 번호)
              </label>
              <input
                id="hbl"
                className="form-input"
                autoComplete="off"
                value={form.hbl}
                onChange={set('hbl')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="krCourier">
                국내 택배사
              </label>
              <select
                id="krCourier"
                className="form-input"
                value={form.krCourier}
                onChange={set('krCourier')}
              >
                <option value="">모름</option>
                {Object.entries(KR_COURIERS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="krTrackingNo">
                국내 송장 (마켓 발송처리에 씀)
              </label>
              <input
                id="krTrackingNo"
                className="form-input"
                autoComplete="off"
                value={form.krTrackingNo}
                onChange={set('krTrackingNo')}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="memo">
              메모
            </label>
            <input id="memo" className="form-input" value={form.memo} onChange={set('memo')} />
          </div>
        </div>
          </>
        )}
      </Section>
    </form>
  )
}
