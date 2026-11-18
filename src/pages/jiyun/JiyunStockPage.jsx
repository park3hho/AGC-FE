import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getJiyunStock, updateJiyunStock, useJiyunStock as applyStock } from '@/api/jiyunStock'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import styles from './JiyunStock.module.css'

const kstDay = (iso) => (iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(5, 10) : '-')
const TABS = [
  { key: 'available', label: '보관 중' },
  { key: 'all', label: '전체' },
]
const DOT = { 창고: 'ok', '이동 중': 'warn' }

// 판매 › 집운 재고 (2026-11-18)
//   판매처가 이미 보낸 뒤 고객이 취소해서 환불 못 받은 소포 — 반품 대신 창고에 두고, 같은 상품 다음 주문에 쓴다.
//   쓰기: 주문 코드를 넣으면 그 소포의 타오바오 구매가 새 주문으로 옮겨 간다 (원가도 새 주문으로). 그 뒤 집운 결제는 새 고객 주소로.
export default function JiyunStockPage() {
  const [tab, setTab] = useState('available')
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [codes, setCodes] = useState({})
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => {
    setError('')
    getJiyunStock({ status: tab })
      .then(setItems)
      .catch((e) => setError(e.message))
  }, [tab])
  useEffect(load, [load])

  const act = async (id, fn) => {
    setBusy(id)
    setError('')
    try {
      await fn()
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="page-flat">
      <PageHeader title="집운 재고" sub="고객이 취소했지만 이미 보낸 소포 — 같은 상품 다음 주문에 씀" />
      <Section
        name="재고 목록"
        id="stock-list"
        flush
        fill
        sub={items ? `${items.length}개` : ''}
        action={
          <div className={styles.tabs}>
            {TABS.map((t) => (
              <button key={t.key} type="button" className={tab === t.key ? styles.tabOn : styles.tab} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        }
      >
        {error && <p className={styles.error}>{error}</p>}
        {items && !items.length && <p className={styles.empty}>보관 중인 재고가 없어요.</p>}
        {items?.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>상품</th>
                <th>위치</th>
                <th>원래 주문</th>
                <th className={styles.num}>원가</th>
                <th>생긴 날</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className={styles.name}>{s.label}</div>
                    <div className={styles.sub}>
                      {s.sku} · {s.purchase?.shopName}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.dot} ${styles[DOT[s.where]] || ''}`} />
                    {s.where || '-'}
                    {s.purchase?.cnTrackingNo && <div className={styles.sub}>{s.purchase.cnTrackingNo}</div>}
                  </td>
                  <td>
                    {s.sourceOrder ? <Link to={`/orders/${s.sourceOrder.id}`}>{s.sourceOrder.code}</Link> : '-'}
                  </td>
                  <td className={styles.num}>
                    {s.costCny != null ? `¥${s.costCny}` : '-'}
                    {s.costKrw != null && <div className={styles.sub}>{s.costKrw.toLocaleString()}원</div>}
                  </td>
                  <td>{kstDay(s.createdAt)}</td>
                  <td>
                    {s.statusLabel}
                    {s.usedOrder && (
                      <div className={styles.sub}>
                        → <Link to={`/orders/${s.usedOrder.id}`}>{s.usedOrder.code}</Link>
                      </div>
                    )}
                  </td>
                  <td className={styles.actions}>
                    {s.status === 'available' && (
                      <>
                        <input
                          className={styles.code}
                          placeholder="OR-yymmdd-xxxx"
                          value={codes[s.id] || ''}
                          onChange={(e) => setCodes((c) => ({ ...c, [s.id]: e.target.value }))}
                        />
                        <button
                          type="button"
                          className={styles.btn}
                          disabled={!codes[s.id] || busy === s.id}
                          onClick={() => act(s.id, () => applyStock(s.id, codes[s.id]))}
                        >
                          주문에 쓰기
                        </button>
                        <button
                          type="button"
                          className={styles.link}
                          disabled={busy === s.id}
                          onClick={() => act(s.id, () => updateJiyunStock(s.id, { status: 'returned' }))}
                        >
                          반품함
                        </button>
                        <button
                          type="button"
                          className={styles.link}
                          disabled={busy === s.id}
                          onClick={() => act(s.id, () => updateJiyunStock(s.id, { status: 'written_off' }))}
                        >
                          손실 처리
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </main>
  )
}
