import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  createJiyunBundle,
  getBundleCandidates,
  getJiyunList,
  updateJiyunBundle,
} from '@/api/jiyun'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { JIYUN_STATUS, KR_COURIERS, MARKETS, TRANSPORTS } from '@/constants/orderConst'
import { useMobile } from '@/hooks/useMobile'
import styles from './JiyunBundle.module.css'

// 알리페이 잔액 충전 환율 — 1위안 202원 (USER 규칙, 잔액 결제는 청구 확정)
const ALIPAY_BALANCE_RATE = 202
const PARCEL_STATUS = { ordered: '판매처 발송 전', shipped: '중국 안 배송 중', arrived: '창고 입고' }
const baseNo = (no) => (no || '').replace(/-\d{1,2}$/, '')
const won = (n) => `${Math.round(n).toLocaleString()}원`
const nowIso = () => new Date().toISOString()

// 판매 › 집운 › 묶어서 보내기 (2026-11-11)
//   받는 사람이 같은 주문 여러 건(같은 고객이 따로 주문)을 집운 한 번(합포장)으로 — 배송비 한 번, 국내 송장 하나.
//   받는 사람이 다르면 묶지 않는다 (통관이 받는 사람 1명 단위, 섞으면 집운이 주소를 하나로 바꿔 버림).
//   위: 묶을 거리(받는 사람별) → 고르고 집운 번호·무게·배송비를 넣으면 주문별로 무게 비율로 나눠 기록.
//   아래: 이미 묶은 집운 — 출고·국내 송장을 묶음 전체에 한 번에.
export default function JiyunBundlePage() {
  const navigate = useNavigate()
  const mobile = useMobile()
  const [groups, setGroups] = useState(null)
  const [bundles, setBundles] = useState(null)
  const [error, setError] = useState('')
  const [openKey, setOpenKey] = useState(null)
  const [done, setDone] = useState('')

  const load = useCallback(() => {
    setError('')
    getBundleCandidates()
      .then((g) => {
        setGroups(g)
        setOpenKey((k) => k ?? g.find((x) => x.ready > 0)?.key ?? null)
      })
      .catch((err) => setError(err.message))
    getJiyunList({ limit: 200 })
      .then((items) => {
        const by = {}
        for (const j of items) {
          if (j.status === 'cancelled') continue
          ;(by[baseNo(j.jiyunNo)] ||= []).push(j)
        }
        setBundles(
          Object.entries(by)
            .filter(([, list]) => list.length > 1 || list[0].status === 'requested')
            .filter(([, list]) => list.some((j) => j.status === 'requested' || !j.krTrackingNo))
            .map(([no, list]) => ({ no, list: list.sort((a, b) => a.id - b.id) })),
        )
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(load, [load])

  return (
    <main className="page-flat">
      <PageHeader
        title="집운 묶어서 보내기"
        sub="같은 고객 주문은 창고에서 한 상자로 — 배송비 한 번, 국내 송장 하나"
        back
        action={
          <button className="btn-secondary btn-md" onClick={() => navigate('/jiyun')}>
            집운 기록
          </button>
        }
      />
      {error && <p className={`form-error ${styles.pad}`}>{error}</p>}
      {done && <p className={styles.done}>{done}</p>}

      <Section name="묶을 주문" id="candidates" sub={groups && `${groups.length}명`}>
        {groups && groups.length === 0 && (
          <p className={styles.empty}>
            창고에 들어와서 집운을 기다리는 소포가 없어요. 같은 고객 주문이 여러 건이면 오는 중에도 여기
            미리 보여요.
          </p>
        )}
        {(groups || []).map((g) => (
          <BundleGroup
            key={g.key}
            g={g}
            open={openKey === g.key}
            onToggle={() => setOpenKey(openKey === g.key ? null : g.key)}
            mobile={mobile}
            onSaved={(items) => {
              setDone(
                `${g.receiver} ${items.length}건을 집운 ${baseNo(items[0].jiyunNo)} 하나로 기록했어요`,
              )
              setOpenKey(null)
              load()
            }}
          />
        ))}
      </Section>

      <Section name="출고 · 국내 송장" id="dispatch" sub={bundles && `${bundles.length}묶음`}>
        {bundles && bundles.length === 0 && (
          <p className={styles.empty}>출고나 국내 송장을 기다리는 집운이 없어요.</p>
        )}
        {(bundles || []).map((b) => (
          <DispatchRow
            key={b.no}
            b={b}
            onSaved={(n) => {
              setDone(`집운 ${b.no} — 주문 ${n}건에 같이 넣었어요`)
              load()
            }}
          />
        ))}
      </Section>
    </main>
  )
}

function BundleGroup({ g, open, onToggle, onSaved, mobile }) {
  // 고른 소포 — 창고에 들어온 것만 기본으로
  const [picked, setPicked] = useState(() => {
    const s = {}
    for (const o of g.orders) for (const p of o.parcels) if (p.ready) s[`${o.id}:${p.no}`] = true
    return s
  })
  const [weights, setWeights] = useState({}) // orderId → kg (이 주문 몫)
  const [form, setForm] = useState({
    jiyunNo: '',
    feeCny: '',
    transport: 'sea',
    payMethod: 'alipay',
    balance: true, // 알리페이 잔액 (1위안 202원, 청구 확정)
    chargedKrw: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const chosen = useMemo(
    () =>
      g.orders
        .map((o) => ({
          order: o,
          packages: o.parcels.filter((p) => p.no && picked[`${o.id}:${p.no}`]).map((p) => p.no),
        }))
        .filter((x) => x.packages.length > 0),
    [g, picked],
  )
  const krw =
    form.chargedKrw !== ''
      ? Number(form.chargedKrw)
      : form.balance && form.feeCny
        ? Math.round(Number(form.feeCny) * ALIPAY_BALANCE_RATE)
        : null

  // 미리 보기 — BE 와 같은 방식 (무게를 다 넣었으면 무게 비율, 아니면 소포 수 비율 · 끝수는 마지막)
  const preview = useMemo(() => {
    const allW = chosen.length > 0 && chosen.every((x) => Number(weights[x.order.id]) > 0)
    const ws = chosen.map((x) => (allW ? Number(weights[x.order.id]) : x.packages.length))
    const sum = ws.reduce((a, b) => a + b, 0) || 1
    const split = (total, cents) => {
      if (total == null || total === '' || Number.isNaN(Number(total))) return chosen.map(() => null)
      const q = cents ? 100 : 1
      const parts = ws.map((w) => Math.round((Number(total) * w * q) / sum) / q)
      if (parts.length)
        parts[parts.length - 1] =
          Math.round((Number(total) - parts.slice(0, -1).reduce((a, b) => a + b, 0)) * q) / q
      return parts
    }
    return { allW, fee: split(form.feeCny, true), krw: split(krw, false) }
  }, [chosen, weights, form.feeCny, krw])

  const waiting = g.orders.flatMap((o) => o.parcels.filter((p) => !p.ready))

  const submit = async () => {
    setError('')
    if (!chosen.length) return setError('묶을 소포를 골라주세요')
    if (!form.jiyunNo.trim()) return setError('집운 번호(LP…)를 적어주세요')
    if (
      waiting.length > 0 &&
      !window.confirm(`아직 안 온 소포가 ${waiting.length}개 있어요. 지금 온 것만 먼저 묶을까요?`)
    )
      return
    setSaving(true)
    try {
      const items = await createJiyunBundle(
        {
          jiyunNo: form.jiyunNo.trim(),
          status: 'requested',
          transport: form.transport,
          requestedAt: nowIso(),
          feeCny: form.feeCny,
          payMethod: form.payMethod,
          payCurrency: form.payMethod === 'alipay' ? 'CNY' : '',
          payAmount: form.payMethod === 'alipay' ? form.feeCny : '',
          chargedKrw: krw ?? '',
          chargedStatus: form.balance && krw != null ? 'settled' : 'none',
          chargedAt: form.balance ? nowIso() : '',
          chargedSource: form.balance ? '알리페이 잔액 결제(1위안 202원 충전분)' : '',
        },
        chosen.map((x) => ({
          orderId: x.order.id,
          packages: x.packages,
          weightKg: weights[x.order.id] || '',
        })),
      )
      onSaved(items)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className={`${styles.group} ${open ? styles.groupOn : ''}`}>
      <button type="button" className={styles.gHead} onClick={onToggle} aria-expanded={open}>
        <b>{g.receiver}</b>
        <span className={styles.weak}>{g.region}</span>
        <span className={styles.gCount}>
          주문 {g.orders.length}건 · 입고 {g.ready}
          {g.coming > 0 && <em> · 오는 중 {g.coming}</em>}
        </span>
        <span className={g.coming === 0 ? styles.tagGo : styles.tagWait}>
          {g.ready === 0 ? '다 오면 묶음' : g.coming === 0 ? '다 왔어요 · 묶어서 결제' : '일부 입고'}
        </span>
      </button>

      {open && (
        <div className={styles.gBody}>
          <div className={styles.orders}>
            {g.orders.map((o) => (
              <div key={o.id} className={styles.order}>
                <div className={styles.oHead}>
                  <span className={styles.mark}>{MARKETS[o.market]?.short}</span>
                  <b>{o.code}</b>
                  <span className={styles.oName}>
                    {o.productName}
                    {o.optionName && ` · ${o.optionName}`} ×{o.quantity}
                  </span>
                  <label className={styles.wInput}>
                    <input
                      inputMode="decimal"
                      placeholder="kg"
                      aria-label={`${o.code} 이 주문 몫 무게`}
                      value={weights[o.id] || ''}
                      onChange={(e) => setWeights({ ...weights, [o.id]: e.target.value })}
                    />
                    kg
                  </label>
                </div>
                {o.parcels.map((p) => (
                  <label
                    key={`${p.purchaseId}:${p.no}`}
                    className={`${styles.parcel} ${p.ready ? '' : styles.parcelWait}`}
                  >
                    <input
                      type="checkbox"
                      disabled={!p.no}
                      checked={!!picked[`${o.id}:${p.no}`]}
                      onChange={(e) => setPicked({ ...picked, [`${o.id}:${p.no}`]: e.target.checked })}
                    />
                    <span className={styles.pNo}>{p.no || '송장 없음'}</span>
                    <span className={p.ready ? styles.ok : styles.weak}>
                      {PARCEL_STATUS[p.cnStatus] || p.cnStatus}
                    </span>
                    {!mobile && <span className={styles.weak}>구매 #{p.purchaseId}</span>}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className={styles.fields}>
            <label>
              집운 번호 (LP…)
              <input className="form-input" value={form.jiyunNo} onChange={set('jiyunNo')} />
            </label>
            <label>
              배송비 합계 (위안)
              <input
                className="form-input"
                inputMode="decimal"
                placeholder="예: 125.00"
                value={form.feeCny}
                onChange={set('feeCny')}
              />
            </label>
            <label>
              운송
              <select className="form-input" value={form.transport} onChange={set('transport')}>
                {Object.entries(TRANSPORTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              결제
              <select
                className="form-input"
                value={form.balance ? 'balance' : form.payMethod}
                onChange={(e) =>
                  setForm({
                    ...form,
                    balance: e.target.value === 'balance',
                    payMethod: e.target.value === 'balance' ? 'alipay' : e.target.value,
                  })
                }
              >
                <option value="balance">알리페이 잔액 (1위안 202원)</option>
                <option value="card">카드 (원화는 청구 후)</option>
              </select>
            </label>
            <label>
              원화 합계
              <input
                className="form-input"
                inputMode="numeric"
                placeholder={krw != null ? String(krw) : '청구 확인 후'}
                value={form.chargedKrw}
                onChange={set('chargedKrw')}
              />
            </label>
          </div>

          {chosen.length > 0 && (
            <table className={styles.split}>
              <thead>
                <tr>
                  <th>주문</th>
                  <th>소포</th>
                  <th>{preview.allW ? '무게' : '나누는 기준'}</th>
                  <th>배송비</th>
                  <th>원화</th>
                </tr>
              </thead>
              <tbody>
                {chosen.map((x, i) => (
                  <tr key={x.order.id}>
                    <td>{x.order.code}</td>
                    <td>{x.packages.length}개</td>
                    <td>{preview.allW ? `${weights[x.order.id]}kg` : `소포 ${x.packages.length}개`}</td>
                    <td>{preview.fee[i] != null ? `¥${preview.fee[i].toFixed(2)}` : '-'}</td>
                    <td>{preview.krw[i] != null ? won(preview.krw[i]) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!preview.allW && chosen.length > 1 && (
            <p className={styles.hint}>주문별 무게(kg)를 넣으면 무게 비율로 나눠요. 비우면 소포 수로 나눠요.</p>
          )}

          {error && <p className="form-error">{error}</p>}
          <button
            type="button"
            className="btn-primary btn-md"
            onClick={submit}
            disabled={saving || chosen.length === 0}
          >
            {saving ? '저장 중…' : `${chosen.length}건 집운 하나로 기록`}
          </button>
        </div>
      )}
    </div>
  )
}

function DispatchRow({ b, onSaved }) {
  const first = b.list[0]
  const [courier, setCourier] = useState(first.krCourier || 'CJGLS')
  const [no, setNo] = useState(first.krTrackingNo || '')
  const [hbl, setHbl] = useState(first.hbl || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dispatched = b.list.every((j) => j.status === 'dispatched')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const patch = { kr_courier: courier || null, kr_tracking_no: no.trim() || null, hbl: hbl.trim() || null }
      if (!dispatched) Object.assign(patch, { status: 'dispatched', dispatched_at: nowIso() })
      const items = await updateJiyunBundle(first.id, patch)
      onSaved(items.length)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className={styles.dRow}>
      <div className={styles.dHead}>
        <b>{b.no}</b>
        <span className={styles.weak}>{JIYUN_STATUS[first.status]?.label}</span>
        <span className={styles.dCodes}>
          {b.list.map((j) => j.order.code).join(' · ')}
        </span>
      </div>
      <div className={styles.dFields}>
        <select
          className="form-input"
          aria-label="국내 택배사"
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
        >
          {Object.entries(KR_COURIERS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          className="form-input"
          placeholder="국내 송장"
          aria-label="국내 송장"
          value={no}
          onChange={(e) => setNo(e.target.value)}
        />
        <input
          className="form-input"
          placeholder="H B/L (모르면 비움)"
          aria-label="국제 운송장"
          value={hbl}
          onChange={(e) => setHbl(e.target.value)}
        />
        <button type="button" className="btn-primary btn-md" onClick={save} disabled={saving}>
          {saving ? '저장 중…' : dispatched ? `${b.list.length}건에 송장 넣기` : `출고 · ${b.list.length}건에 넣기`}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
