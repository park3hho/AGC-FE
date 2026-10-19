import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getExchangeRate } from '@/api/exchangeRate'
import { getPriceResearches } from '@/api/priceResearch'
import { getProducts } from '@/api/product'
import Badge from '@/components/Badge'
import Icon from '@/components/Icon'
import Thumb from '@/components/Thumb'
import ListItem from '@/components/common/ListItem'
import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { FEATURE, hasFeature } from '@/constants/permissions'
import { PRICING_STATUS } from '@/constants/pricingConst'
import { useAuth } from '@/hooks/useAuth'
import { todayKst } from '@/utils/date'
import { formatCny, formatFx } from '@/utils/pricing'
import styles from './HomePage.module.css'

const yesterdayKst = () =>
  new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

// 홈 — 섹션: 현황 숫자 · 진행 단계 · 최근 제품 · 할 일 (DESIGN.md §4.6)
export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canResearch = hasFeature(user, FEATURE.RESEARCH)
  const [data, setData] = useState(null) // { products, surveyCount, fx }
  const [error, setError] = useState('')

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

  const todos = [
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

      <Section name="현황 숫자" id="stats" title={false} plain>
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

      <Section name="진행 단계" id="flow" title={false} flush>
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

      <div className={styles.columns}>
        <Section
          name="최근 제품"
          id="recent"
          flush
          action={
            <button className="btn-text" onClick={() => navigate('/research/products')}>
              전체 보기
            </button>
          }
        >
          {products.length === 0 && <p className={styles.empty}>아직 제품이 없어요</p>}
          <div className={styles.recent}>
            {products.slice(0, 5).map((p) => (
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
                onClick={() => navigate(`/research/products/${p.id}`)}
              />
            ))}
          </div>
        </Section>

        <Section name="할 일" id="todo" sub={todos.length ? `${todos.length}건` : ''} flush>
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
