import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getShippingAddresses } from '@/api/shippingAddress'
import Badge from '@/components/Badge'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { ADDRESS_USES } from '@/constants/shippingConst'
import { useAuth } from '@/hooks/useAuth'
import { addressChecks, codeOf, marketsOf, pickAddress } from '@/utils/shippingAddress'
import ShippingTabs from './ShippingTabs'
import styles from './ShippingAddress.module.css'

// 배송 경로 흐름 — 타오바오 판매자 → 배대지 → 해운/항공 → 입항 → 통관 → 국내 택배 → 고객
const flowOf = (a) => {
  const r = a.route || {}
  return [
    { label: '타오바오 판매자' },
    { label: a.name },
    { label: r.transportLabel || '해운', sub: r.forwarder || '물류사 미확인', weak: !r.forwarder },
    { label: r.port ? `${r.port} 입항` : '입항 항구', sub: r.port ? '' : '미확인', weak: !r.port },
    { label: '한국 통관' },
    {
      label: r.courierName || '국내 택배사',
      sub: r.courierName ? '' : '미정',
      weak: !r.courierName,
    },
    { label: '고객' },
  ]
}

// 배송 › 출고지·반품지 — 섹션: 구매대행 점검 · 배송 경로 · 주소. 출고지·반품지는 배대지 주소 하나로 쓰고, 마켓마다 주소록 번호만 다르다
export default function ShippingAddressPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = hasFeature(user, FEATURE.ACCOUNT_EDIT)
  const [address, setAddress] = useState(undefined) // undefined = 불러오는 중, null = 없음
  const [error, setError] = useState('')

  useEffect(() => {
    getShippingAddresses()
      .then((list) => setAddress(pickAddress(list)))
      .catch((err) => setError(err.message))
  }, [])

  const loaded = address !== undefined
  const a = address

  return (
    <main className="page-flat">
      <PageHeader
        title="배송"
        sub={<ShippingTabs />}
        back
        action={
          canEdit &&
          loaded && (
            <button
              className="btn-primary btn-md"
              onClick={() => navigate('/shipping/addresses/edit')}
            >
              {a ? '주소 수정' : '주소 넣기'}
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
        {loaded && (
          <ul className={styles.checks}>
            {addressChecks(a).map((c) => (
              <li key={c.key} className={styles[c.tone]}>
                <span className={styles.dot} aria-hidden />
                {c.text}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {a?.overseas && (
        <Section
          name="배송 경로"
          id="route"
          title="배송 경로"
          sub="마켓 송장 = 국내 택배사 + 국내 송장번호"
          action={
            <Badge tone={a.route?.confirmed ? 'success' : 'warning'}>
              {a.route?.confirmed ? '배대지 확인됨' : '배대지 확인 전'}
            </Badge>
          }
        >
          <ol className={styles.flow}>
            {flowOf(a).map((s, i) => (
              <li key={i} className={s.weak ? styles.flowWeak : undefined}>
                <b>{s.label}</b>
                {s.sub && <span>{s.sub}</span>}
              </li>
            ))}
          </ol>
          <dl className={styles.kv}>
            <dt>국내 택배사</dt>
            <dd>
              {a.route?.courierName ? (
                <>
                  {a.route.courierName}{' '}
                  <span className={styles.weak}>
                    ·{' '}
                    {Object.entries(a.route.courierCodes)
                      .map(([m, c]) => `${m} ${c}`)
                      .join(' · ')}
                  </span>
                </>
              ) : (
                <span className={styles.missing}>미정 — 발송처리 전에 정해야 해요</span>
              )}
            </dd>
            <dt>송장 나오는 때</dt>
            <dd>{a.route?.trackingWhen || <span className={styles.missing}>미확인</span>}</dd>
            <dt>국제 물류사</dt>
            <dd>{a.route?.forwarder || <span className={styles.missing}>미확인</span>}</dd>
            <dt>통관 조회</dt>
            <dd>{a.route?.customsRef || <span className={styles.missing}>미확인</span>}</dd>
          </dl>
          {a.route?.note && <p className={styles.memo}>{a.route.note}</p>}
        </Section>
      )}

      <Section name="주소" id="address" title="출고지·반품지 주소" sub="둘 다 이 주소 하나" fill>
        {loaded && !a && <p className={styles.empty}>아직 주소가 없어요</p>}
        {a && (
          <div className={styles.body}>
            <div className={styles.col}>
              <div className={styles.head}>
                <b className={styles.name}>{a.name}</b>
                <Badge tone={a.overseas ? 'primary' : 'danger'}>
                  {a.overseas ? `해외 ${a.country}` : '국내'}
                </Badge>
              </div>
              <p className={styles.addr}>
                {a.zipCode && <span className={styles.weak}>({a.zipCode}) </span>}
                {a.address}
                {a.addressDetail && <> · {a.addressDetail}</>}
              </p>
              {a.phone && <p className={styles.weak}>☎ {a.phone}</p>}
              {a.memo && <p className={styles.memo}>{a.memo}</p>}
            </div>
            <div className={styles.col}>
              <div className={styles.codes} role="table" aria-label="마켓 주소록 번호">
                <div className={`${styles.codeRow} ${styles.codeHead}`} role="row">
                  <span role="columnheader">마켓</span>
                  {ADDRESS_USES.map((u) => (
                    <span key={u.key} role="columnheader">
                      {u.label} 번호
                    </span>
                  ))}
                </div>
                {marketsOf(a).map((m) => (
                  <div key={m} className={styles.codeRow} role="row">
                    <span role="cell">{m}</span>
                    {ADDRESS_USES.map((u) => {
                      const c = codeOf(a, m, u.key)
                      return (
                        <span key={u.key} role="cell" className={c ? styles.code : styles.missing}>
                          {c ? c.code : '없음'}
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Section>
    </main>
  )
}
