import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { deleteShippingAddress, getShippingAddresses } from '@/api/shippingAddress'
import Badge from '@/components/Badge'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { useLabel } from '@/constants/shippingConst'
import { useAuth } from '@/hooks/useAuth'
import { addressChecks } from '@/utils/shippingAddress'
import ShippingTabs from './ShippingTabs'
import styles from './ShippingAddress.module.css'

// 주소 1곳 — 머리(이름 · 국가 · 용도/기본 · 수정/삭제) + 주소 | 마켓 주소 코드
function AddressCard({
  item, // object: 주소
  canEdit, // boolean
  onEdit, // function
  onDeleted, // function(id)
}) {
  const [error, setError] = useState('')
  const remove = async () => {
    if (!window.confirm(`${item.name} 주소를 삭제할까요?`)) return
    try {
      await deleteShippingAddress(item.id)
      onDeleted(item.id)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <b className={styles.name}>{item.name}</b>
        <Badge tone={item.overseas ? 'primary' : 'neutral'}>
          {item.overseas ? `해외 ${item.country}` : '국내'}
        </Badge>
        {item.uses.map((u) => (
          <Badge key={u} tone={item.defaults.includes(u) ? 'success' : 'neutral'}>
            {item.defaults.includes(u) ? `기본 ${useLabel(u)}` : useLabel(u)}
          </Badge>
        ))}
        {canEdit && (
          <span className={styles.actions}>
            <button type="button" className="btn-secondary btn-sm" onClick={onEdit}>
              수정
            </button>
            <button type="button" className={`btn-ghost btn-sm ${styles.danger}`} onClick={remove}>
              삭제
            </button>
          </span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.col}>
          <p className={styles.addr}>
            {item.zipCode && <span className={styles.weak}>({item.zipCode}) </span>}
            {item.address}
            {item.addressDetail && <> · {item.addressDetail}</>}
          </p>
          {item.phone && <p className={styles.weak}>☎ {item.phone}</p>}
          {item.memo && <p className={styles.memo}>{item.memo}</p>}
        </div>
        <div className={styles.col}>
          {item.marketCodes.length === 0 ? (
            <p className={styles.weak}>마켓 주소 번호가 없어요</p>
          ) : (
            <div className={styles.codes} role="table" aria-label="마켓 주소 번호">
              {item.marketCodes.map((c) => (
                <div key={`${c.market}-${c.use}`} className={styles.codeRow} role="row">
                  <span role="cell">{c.market}</span>
                  <span role="cell" className={styles.weak}>
                    {useLabel(c.use)}
                  </span>
                  <span role="cell" className={styles.code}>
                    {c.code}
                  </span>
                  <span role="cell" className={styles.weak}>
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

// 배송 › 출고지·반품지 — 섹션: 구매대행 점검 · 주소 목록. 상품 등록이 기본 출고지·반품지의 마켓 번호를 쓴다
export default function ShippingAddressListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = hasFeature(user, FEATURE.ACCOUNT_EDIT)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getShippingAddresses()
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  const checks = items ? addressChecks(items) : []

  return (
    <main className="page-flat">
      <PageHeader
        title="배송"
        sub={<ShippingTabs />}
        back
        action={
          canEdit && (
            <button
              className="btn-primary btn-md"
              onClick={() => navigate('/shipping/addresses/new')}
            >
              주소 추가
            </button>
          )
        }
      />

      <Section
        name="구매대행 점검"
        id="check"
        title="구매대행 점검"
        sub="상품 등록 전에 맞춰 둘 것"
      >
        {error && <p className="form-error">{error}</p>}
        <ul className={styles.checks}>
          {checks.map((c) => (
            <li key={c.key} className={styles[c.tone]}>
              <span className={styles.dot} aria-hidden />
              {c.text}
            </li>
          ))}
        </ul>
      </Section>

      <Section name="주소 목록" id="list" sub={items && `${items.length}곳`} flush fill>
        {items && items.length === 0 && <p className={styles.empty}>아직 주소가 없어요</p>}
        <div className={styles.list}>
          {(items || []).map((a) => (
            <AddressCard
              key={a.id}
              item={a}
              canEdit={canEdit}
              onEdit={() => navigate(`/shipping/addresses/${a.id}/edit`)}
              onDeleted={(id) => setItems((list) => list.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      </Section>
    </main>
  )
}
