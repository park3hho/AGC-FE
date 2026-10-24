import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { getOrder } from '@/api/order'
import { createPurchase, deletePurchase, getPurchase, updatePurchase } from '@/api/taobaoPurchase'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { CN_COURIERS, CN_STATUS, MARKETS } from '@/constants/orderConst'
import styles from './Orders.module.css'

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
  taobaoOrderNo: '',
  shopName: '',
  itemUrl: '',
  items: [{ name: '', qty: 1, priceCny: '' }],
  paidCny: '',
  purchasedAt: '',
  cnStatus: 'ordered',
  shippedAt: '',
  cnCourier: '',
  cnTrackingNo: '',
  arrivedAt: '',
  memo: '',
}

const orderLabel = (o) =>
  `${o.code || '코드 없음'} · ${MARKETS[o.market].label} ${o.orderNo} · ${o.productName}${o.optionName ? ` (${o.optionName})` : ''} ×${o.quantity}`

// 판매 › 주문 접수 › 타오바오 구매 추가 · 수정 — 섹션: 입력 (저장 버튼은 섹션 아래 고정)
//   타오바오 주문번호 하나 = 구매 1건, 고객 주문 1건에 붙는다. 주문번호만 필수, 나머지는 아는 만큼.
//   저장하면 그 고객 주문의 추적 기록에 남는다 (이전값 → 새값).
export default function PurchaseFormPage() {
  const { orderId, id } = useParams()
  const [params] = useSearchParams()
  const editing = id != null
  const backOrder = orderId || params.get('order') || ''
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [order, setOrder] = useState(null) // 붙는 고객 주문
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (editing) {
        const p = await getPurchase(id)
        setForm({
          ...p,
          items: p.items.length ? p.items : [{ name: '', qty: 1, priceCny: '' }],
          purchasedAt: toLocal(p.purchasedAt),
          shippedAt: toLocal(p.shippedAt),
          arrivedAt: toLocal(p.arrivedAt),
        })
        setOrder(p.order)
      } else {
        const { order: o } = await getOrder(orderId)
        setForm({
          ...EMPTY,
          purchasedAt: nowLocal(),
          items: [{ name: o.optionName || o.productName, qty: o.quantity, priceCny: '' }],
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
  const setItem = (i, key, v) =>
    setForm({ ...form, items: form.items.map((it, j) => (j === i ? { ...it, [key]: v } : it)) })
  // 상태를 바꾸면 그 단계 시각이 비어 있을 때 지금으로 채운다 (고칠 수 있음)
  const setStatus = (s) => {
    const next = { ...form, cnStatus: s }
    if (['shipped', 'arrived'].includes(s) && !next.shippedAt) next.shippedAt = nowLocal()
    if (s === 'arrived' && !next.arrivedAt) next.arrivedAt = nowLocal()
    setForm(next)
    setError('')
  }
  const back = () => navigate(backOrder ? `/orders?id=${backOrder}` : '/orders', { replace: true })

  const submit = async (e) => {
    e.preventDefault()
    const items = form.items
      .map((it) => ({ ...it, name: it.name.trim() }))
      .filter((it) => it.name || it.priceCny)
    if (!form.taobaoOrderNo.trim()) return setError('타오바오 주문번호를 적어주세요')
    if (items.some((it) => !it.name || !(Number(it.qty) >= 1)))
      return setError('옵션은 이름과 수량(1 이상)을 적어주세요')
    setSaving(true)
    try {
      const body = {
        ...form,
        items,
        purchasedAt: fromLocal(form.purchasedAt),
        shippedAt: fromLocal(form.shippedAt),
        arrivedAt: fromLocal(form.arrivedAt),
      }
      if (editing) await updatePurchase(id, body)
      else await createPurchase(orderId, body)
      back()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('이 타오바오 구매를 삭제할까요? (추적 기록은 남아요)')) return
    try {
      await deletePurchase(id)
      back()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader
        title={editing ? '타오바오 구매를 고쳐요' : '타오바오에서 산 내용을 적어요'}
        sub="저장하면 연결된 주문마다 추적 기록에 남아요"
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
          <div className={styles.formFoot}>
            {error && <p className="form-error">{error}</p>}
            <button
              className="btn-primary btn-md btn-full"
              type="submit"
              disabled={saving || !loaded}
            >
              {saving ? '저장 중…' : editing ? '수정 저장' : '구매 저장'}
            </button>
          </div>
        }
      >
        <div className={styles.fGroup}>
          <h3 className={styles.fTitle}>고객 주문</h3>
          <p className={styles.linkText}>{order ? orderLabel(order) : '불러오는 중…'}</p>
        </div>

        <div className={styles.fGroup}>
          <h3 className={styles.fTitle}>타오바오 구매</h3>
          <div className={styles.fGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="taobaoOrderNo">
                타오바오 주문번호 (订单号) · 필수
              </label>
              <input
                id="taobaoOrderNo"
                className="form-input"
                inputMode="numeric"
                autoComplete="off"
                value={form.taobaoOrderNo}
                onChange={set('taobaoOrderNo')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="shopName">
                판매처 (가게)
              </label>
              <input
                id="shopName"
                className="form-input"
                placeholder="예: 元气森林旗舰店"
                value={form.shopName}
                onChange={set('shopName')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="paidCny">
                실제 결제 (위안, 할인·배송비 반영)
              </label>
              <input
                id="paidCny"
                className="form-input"
                inputMode="decimal"
                placeholder="예: 35.50"
                value={form.paidCny}
                onChange={set('paidCny')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="purchasedAt">
                구매 일시
              </label>
              <input
                id="purchasedAt"
                className="form-input"
                type="datetime-local"
                value={form.purchasedAt}
                onChange={set('purchasedAt')}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="itemUrl">
              상품 링크 (없어도 돼요)
            </label>
            <input
              id="itemUrl"
              className="form-input"
              inputMode="url"
              placeholder="https://detail.tmall.com/item.htm?id=…"
              value={form.itemUrl}
              onChange={set('itemUrl')}
            />
          </div>
          <span className="form-label">산 옵션 · 수량 · 단가(위안)</span>
          {form.items.map((it, i) => (
            <div key={i} className={styles.itemRow}>
              <input
                className="form-input"
                placeholder="옵션 (맛·용량)"
                aria-label="옵션"
                value={it.name}
                onChange={(e) => setItem(i, 'name', e.target.value)}
              />
              <input
                className="form-input"
                type="number"
                min={1}
                aria-label="수량"
                value={it.qty}
                onChange={(e) => setItem(i, 'qty', e.target.value)}
              />
              <input
                className="form-input"
                inputMode="decimal"
                placeholder="단가"
                aria-label="단가 위안"
                value={it.priceCny}
                onChange={(e) => setItem(i, 'priceCny', e.target.value)}
              />
              <button
                type="button"
                className="btn-ghost btn-md"
                aria-label="이 줄 삭제"
                onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className={`btn-secondary btn-sm ${styles.addBtn}`}
            onClick={() =>
              setForm({ ...form, items: [...form.items, { name: '', qty: 1, priceCny: '' }] })
            }
          >
            옵션 줄 추가
          </button>
        </div>

        <div className={styles.fGroup}>
          <h3 className={styles.fTitle}>중국 내 배송 (판매처 → 집운 창고)</h3>
          <div className={styles.statusPick} role="radiogroup" aria-label="중국 배송 상태">
            {Object.entries(CN_STATUS).map(([k, s]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={form.cnStatus === k}
                className={`${styles.chip} ${form.cnStatus === k ? styles.chipOn : ''}`}
                onClick={() => setStatus(k)}
                title={s.hint}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className={styles.fGrid}>
            <div className="form-group">
              <label className="form-label" htmlFor="shippedAt">
                판매처 발송 일시
              </label>
              <input
                id="shippedAt"
                className="form-input"
                type="datetime-local"
                value={form.shippedAt}
                onChange={set('shippedAt')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cnCourier">
                중국 택배사
              </label>
              <input
                id="cnCourier"
                className="form-input"
                list="cn-couriers"
                autoComplete="off"
                value={form.cnCourier}
                onChange={set('cnCourier')}
              />
              <datalist id="cn-couriers">
                {CN_COURIERS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cnTrackingNo">
                중국 운송장 번호
              </label>
              <input
                id="cnTrackingNo"
                className="form-input"
                autoComplete="off"
                value={form.cnTrackingNo}
                onChange={set('cnTrackingNo')}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="arrivedAt">
                집운 창고 입고 일시
              </label>
              <input
                id="arrivedAt"
                className="form-input"
                type="datetime-local"
                value={form.arrivedAt}
                onChange={set('arrivedAt')}
              />
            </div>
          </div>
          <div>
            <div className="form-group">
              <label className="form-label" htmlFor="memo">
                메모
              </label>
              <input id="memo" className="form-input" value={form.memo} onChange={set('memo')} />
            </div>
          </div>
        </div>
      </Section>
    </form>
  )
}
