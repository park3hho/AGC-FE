import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getApiCredentials } from '@/api/apiCredential'
import { getExchangeRate } from '@/api/exchangeRate'
import { getPriceResearches } from '@/api/priceResearch'
import { getProducts } from '@/api/product'
import Badge from '@/components/Badge'
import Icon from '@/components/Icon'
import Thumb from '@/components/Thumb'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import SectionTabs, { useSectionTabs } from '@/components/common/SectionTabs'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { PRICING_STATUS } from '@/constants/pricingConst'
import { useAuth } from '@/hooks/useAuth'
import { useFitRows } from '@/hooks/useFitRows'
import { todayKst } from '@/utils/date'
import { keyStatuses } from '@/utils/apiKey'
import { formatCny, formatFx } from '@/utils/pricing'
import styles from './HomePage.module.css'

const yesterdayKst = () =>
  new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

// 모바일 섹션 탭 — 한 화면 = 한 섹션 (DESIGN.md §4.4). 할 일을 먼저
const TABS = [
  { id: 'todo', name: '할 일' },
  { id: 'stats', name: '현황 숫자' },
  { id: 'flow', name: '진행 단계' },
  { id: 'recent', name: '최근 제품' },
]

// 홈 › 최근 제품 — 남은 높이에 들어가는 개수만 (스크롤 대신 줄이기, 나머지는 '전체 보기')
// useFitRows 가 처음부터 섹션을 지켜볼 수 있게, 데이터가 오고 나서 그리는 이 컴포넌트 안에 둔다
function RecentProducts({
  products, // Array<Product>: 최근 추가 순
  className, // string?: 모바일 탭으로 가릴 때
  onAll, // function: 전체 보기
  onOpen, // function(product): 행 클릭
}) {
  const ref = useRef(null)
  const fit = useFitRows(ref, { fallback: 65 })

  return (
    <Section
      name="최근 제품"
      id="recent"
      flush
      fill
      bodyRef={ref}
      className={className}
      action={
        <button className="btn-text" onClick={onAll}>
          전체 보기
        </button>
      }
    >
      {products.length === 0 && <p className={styles.empty}>아직 제품이 없어요</p>}
      <div className={styles.recent} data-fit-list>
        {products.slice(0, fit).map((p) => (
          <ListItem
            key={p.id}
            left={<Thumb src={p.photoUrl} size={44} />}
            title={p.titleKo || p.titleCn || '-'}
            sub={[
              p.code,
              p.latestSurvey && `옵션 ${p.latestSurvey.optionCount}`,
              p.latestSurvey?.minPriceCny && `${formatCny(p.latestSurvey.minPriceCny)}~`,
            ]
              .filter(Boolean)
              .join(' · ')}
            right={
              <Badge tone={PRICING_STATUS[p.pricingStatus].tone}>
                {PRICING_STATUS[p.pricingStatus].label}
              </Badge>
            }
            onClick={() => onOpen(p)}
          />
        ))}
      </div>
    </Section>
  )
}

// 홈 — 섹션: 현황 숫자 · 진행 단계 · 최근 제품 · 할 일 (DESIGN.md §4.6)
// 데스크탑: 한 화면에 전부 (최근 제품 개수를 높이에 맞춤) · 모바일: 섹션 탭으로 하나씩
export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canResearch = hasFeature(user, FEATURE.RESEARCH)
  const [data, setData] = useState(null) // { products, surveyCount, fx }
  const [error, setError] = useState('')
  const tabs = useSectionTabs(TABS)
  const canSeeKeys = hasFeature(user, FEATURE.ACCOUNT_VIEW)
  const [keys, setKeys] = useState([]) // API 키 — 만료·재인증이 가까우면 할 일에 띄운다

  useEffect(() => {
    if (!canSeeKeys) return
    getApiCredentials()
      .then(setKeys)
      .catch(() => setKeys([])) // 키 목록을 못 받아도 홈은 그대로
  }, [canSeeKeys])

  useEffect(() => {
    if (!canResearch) return
    Promise.all([getProducts(), getPriceResearches(), getExchangeRate()])
      .then(([products, surveys, fx]) =>
        setData({ products, surveyCount: surveys.length, fx: fx.current }),
      )
      .catch((err) => setError(err.message))
  }, [canResearch])

  const header = (
    <PageHeader
      title={`안녕하세요, ${user.name}님`}
      sub="오늘 할 일과 진행 현황이에요"
      action={
        canResearch && (
          <>
            <button
              className="btn-secondary btn-md"
              onClick={() => navigate('/research/prices/new')}
            >
              가격조사 추가
            </button>
            <button
              className="btn-primary btn-md"
              onClick={() => navigate('/research/products/new')}
            >
              제품 추가
            </button>
          </>
        )
      }
    />
  )

  if (!canResearch || error || !data) {
    return (
      <main className="page-flat">
        {header}
        {error && <p className="form-error">{error}</p>}
      </main>
    )
  }

  const { products, surveyCount, fx } = data
  const count = (s) => products.filter((p) => s.includes(p.pricingStatus)).length
  const done = count(['done'])
  const todo = count(['pending', 'partial'])
  const noSurvey = count(['nosurvey'])
  const today = products.filter((p) => p.addedAt === todayKst()).length
  const yesterday = products.filter((p) => p.addedAt === yesterdayKst()).length
  const fxDefault = fx.source === 'default'

  const steps = [
    { n: 1, label: '제품조사', text: `${products.length}개 등록`, path: '/research/products' },
    {
      n: 2,
      label: '가격조사',
      text: `${surveyCount}건 · 조사 없는 제품 ${noSurvey}`,
      path: '/research/prices',
    },
    { n: 3, label: '가격 책정', text: `${todo}개 대기`, path: '/pricing', hot: todo > 0 },
    { n: 4, label: '상품 등록', text: '준비 중' },
    { n: 5, label: '주문 처리', text: '준비 중' },
  ]

  // API 키 만료·재인증 — 급한 것만 (utils/apiKey.keyStatuses)
  const keyTodos = keys.flatMap((k) =>
    keyStatuses(k)
      .filter((s) => s.alert)
      .map((s) => ({
        key: `key-${k.id}-${s.kind}`,
        icon: 'key',
        tone: 'warning',
        title: `${k.service} — ${s.kind === 'expire' ? '키 만료' : '재인증'} 챙겨주세요`,
        sub: s.text,
        button: '보기',
        path: '/accounts/api-keys',
      })),
  )

  const todos = [
    ...keyTodos,
    todo > 0 && {
      key: 'pricing',
      icon: 'tag',
      tone: 'warning',
      title: `판매가를 아직 안 정한 제품 ${todo}개`,
      sub: '조사는 끝났어요. 목표 차익으로 한 번에 맞출 수 있어요',
      button: '정하기',
      path: '/pricing',
    },
    fxDefault && {
      key: 'fx',
      icon: 'exchange',
      tone: 'primary',
      title: `환율이 기본값(${formatFx(fx.cnyKrw)}원)이에요`,
      sub: '오늘 환율을 저장하면 원가·차익이 다시 계산돼요',
      button: '저장하기',
      path: '/exchange-rate',
    },
    noSurvey > 0 && {
      key: 'survey',
      icon: 'yuan',
      tone: 'neutral',
      title: `가격조사가 없는 제품 ${noSurvey}개`,
      sub: '조사를 넣어야 판매가를 정할 수 있어요',
      button: '보기',
      path: '/research/products?status=nosurvey',
    },
  ].filter(Boolean)

  return (
    <main className="page-flat">
      {header}
      <SectionTabs {...tabs} />

      <Section name="현황 숫자" id="stats" title={false} plain className={tabs.hide('stats')}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>조사한 제품</div>
            <div className={styles.statValue}>
              {products.length}
              <small>개</small>
            </div>
            <div className={styles.statMeta}>
              오늘 +{today} · 어제 +{yesterday}
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>가격조사</div>
            <div className={styles.statValue}>
              {surveyCount}
              <small>건</small>
            </div>
            <div className={styles.statMeta}>조사 없는 제품 {noSurvey}개</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>가격 책정 완료</div>
            <div className={styles.statValue}>
              {done}
              <small>/ {products.length}</small>
            </div>
            <div className={styles.bar}>
              <i style={{ width: `${products.length ? (done / products.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>현재 환율</div>
            <div className={styles.statValue}>
              {formatFx(fx.cnyKrw)}
              <small>원/위안</small>
            </div>
            <div className={`${styles.statMeta} ${fxDefault ? styles.warn : ''}`}>
              {fxDefault ? '기본값 사용 중 · 아직 저장 안 함' : `${fx.date} 저장`}
            </div>
          </div>
        </div>
      </Section>

      <Section name="진행 단계" id="flow" title={false} flush className={tabs.hide('flow')}>
        <div className={styles.flow}>
          {steps.map((s) => (
            <button
              key={s.n}
              type="button"
              className={`${styles.step} ${s.hot ? styles.hot : ''}`}
              disabled={!s.path}
              onClick={() => navigate(s.path)}
            >
              <span className={styles.stepN}>{s.n}단계</span>
              <span className={styles.stepLabel}>{s.label}</span>
              <span className={styles.stepText}>{s.text}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* 최근 제품 · 할 일 — 남은 높이를 나눠 쓴다. 모바일에서 다른 탭을 보면 통째로 숨김 */}
      <div
        className={`fit-row ${styles.columns} ${
          tabs.mobile && !['recent', 'todo'].includes(tabs.value) ? 'mobile-hidden' : ''
        }`}
      >
        <RecentProducts
          products={products}
          className={tabs.hide('recent')}
          onAll={() => navigate('/research/products')}
          onOpen={(p) => navigate(`/research/products/${p.id}`)}
        />

        <Section
          name="할 일"
          id="todo"
          sub={todos.length ? `${todos.length}건` : ''}
          flush
          fill
          className={tabs.hide('todo')}
        >
          {todos.length === 0 && <p className={styles.empty}>지금 할 일이 없어요</p>}
          {todos.map((t) => (
            <div key={t.key} className={styles.todo}>
              <span className={`${styles.todoIcon} ${styles[t.tone]}`}>
                <Icon name={t.icon} size={18} />
              </span>
              <span className={styles.todoText}>
                <b>{t.title}</b>
                <small>{t.sub}</small>
              </span>
              <button className="btn-secondary btn-sm" onClick={() => navigate(t.path)}>
                {t.button}
              </button>
            </div>
          ))}
        </Section>
      </div>
    </main>
  )
}
