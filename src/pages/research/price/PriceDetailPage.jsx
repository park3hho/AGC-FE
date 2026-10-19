import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getPriceResearch } from '@/api/priceResearch'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import Thumb from '@/components/Thumb'
import { useFitRows } from '@/hooks/useFitRows'
import styles from '../Research.module.css'
import detail from '../Detail.module.css'
import own from './PriceDetail.module.css'

const won = (n) => (n == null ? '-' : `${Number(n).toLocaleString('ko-KR')}원`)

function ExternalLink({
  href, // string?: 바깥 주소
}) {
  if (!href) return '-'
  return (
    <a href={href} target="_blank" rel="noreferrer">
      열기
    </a>
  )
}

const TABS = [
  { id: 'info', name: '기본 정보' },
  { id: 'options', name: '옵션' },
  { id: 'domestic', name: '국내 최저가' },
]

// 가격조사 상세 — 섹션: 연결된 제품 · 기본 정보 · 옵션 · 국내 최저가 (DESIGN.md §4.6)
// 화면 맞춤 (§4.4): 기본 정보 · 국내 최저가를 한 줄에 나란히, 옵션이 남은 높이를 채우고 페이지 넘김.
// 모바일: 연결된 제품(한 줄)은 늘 보이고, 나머지는 섹션 탭으로 하나씩.
export default function PriceDetailPage() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [optionPage, setOptionPage] = useState(1)
  const optionRef = useRef(null)
  const optionSize = useFitRows(optionRef, { fallback: 49 })
  const tabs = useSectionTabs(TABS)
  const fillOf = (sectionId, desktop) => (tabs.mobile ? tabs.active(sectionId) : desktop)

  useEffect(() => {
    setOptionPage(1)
    getPriceResearch(id)
      .then(setItem)
      .catch((err) => setError(err.message))
  }, [id])

  if (error) {
    return (
      <main className="page-flat">
        <PageHeader title="가격조사" back />
        <p className="form-error">{error}</p>
      </main>
    )
  }
  if (!item) return null

  const pageCount = Math.max(1, Math.ceil(item.options.length / optionSize))
  const current = Math.min(optionPage, pageCount)
  const rows = item.options.slice((current - 1) * optionSize, current * optionSize)

  return (
    <main className="page-flat">
      <PageHeader title={item.code} sub="가격조사" back />

      <Section name="연결된 제품" id="product" title={false} plain>
        <Link to={`/research/products/${item.productId}`} className={styles.linked}>
          <Thumb src={item.photoUrl} size={40} />
          <div className={own.linkedText}>
            <div className={styles.linkedTitle}>{item.productTitle}</div>
            <div className={styles.hint}>{item.productCode}</div>
          </div>
        </Link>
      </Section>

      <SectionTabs {...tabs} />

      <div className={own.pair}>
        <Section
          name="기본 정보"
          id="info"
          fill={fillOf('info', false)}
          className={tabs.hide('info')}
        >
          <dl className={detail.rows}>
            <div className={detail.row}>
              <dt>조사일</dt>
              <dd>{item.researchedAt}</dd>
            </div>
            <div className={detail.row}>
              <dt>타오바오</dt>
              <dd>
                <ExternalLink href={item.taobaoUrl} />
              </dd>
            </div>
          </dl>
        </Section>

        <Section
          name="국내 최저가"
          id="domestic"
          title="쿠팡·네이버 최저가"
          fill={fillOf('domestic', false)}
          className={tabs.hide('domestic')}
        >
          <dl className={detail.rows}>
            <div className={detail.row}>
              <dt>쿠팡</dt>
              <dd>
                {won(item.coupangMinPrice)} · <ExternalLink href={item.coupangUrl} />
              </dd>
            </div>
            <div className={detail.row}>
              <dt>네이버</dt>
              <dd>
                {won(item.naverMinPrice)} · <ExternalLink href={item.naverUrl} />
              </dd>
            </div>
          </dl>
        </Section>
      </div>

      <Section
        name="옵션"
        id="options"
        sub={`총 ${item.options.length}종류`}
        flush
        fill={fillOf('options', true)}
        className={`${own.options} ${tabs.hide('options')}`}
        bodyRef={optionRef}
        footer={<Pager page={current} pageCount={pageCount} onChange={setOptionPage} />}
      >
        <table className={detail.optionTable}>
          <thead data-fit-head>
            <tr>
              <th>옵션1</th>
              <th>옵션2</th>
              <th className={detail.price}>가격 (위안)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} data-fit-row>
                <td>
                  <span className={detail.optionCell}>
                    {o.photoUrl && <Thumb src={o.photoUrl} size={32} />}
                    {o.option1}
                  </span>
                </td>
                <td>{o.option2 || '-'}</td>
                <td className={detail.price}>¥{o.priceCny}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </main>
  )
}
