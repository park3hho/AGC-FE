import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { getExchangeRate } from '@/api/exchangeRate'
import Icon from '@/components/Icon'
import { screenByPath } from '@/constants/screenConst'
import { useSectionLabels } from '@/hooks/useSectionLabels'
import { formatFx } from '@/utils/pricing'
import styles from './AppLayout.module.css'

// 공통 › 위쪽 바 — 위치(빵가루) · 제품 검색 · 현재 환율 · 섹션 이름 보기
export default function Topbar({
  screen, // object: 지금 화면 (SCREENS 한 줄)
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [q, setQ] = useState('')
  const [fx, setFx] = useState(null)
  const [showSections, toggleSections] = useSectionLabels()

  // 환율 화면에서 저장하고 나오면 바로 반영되게 화면을 옮길 때마다 다시 읽는다
  useEffect(() => {
    getExchangeRate()
      .then((d) => setFx(d.current))
      .catch(() => setFx(null))
  }, [pathname])

  const search = (e) => {
    e.preventDefault()
    const v = q.trim()
    navigate(v ? `/research/products?q=${encodeURIComponent(v)}` : '/research/products')
    setQ('')
  }

  const parent = screen.parent ? screenByPath(screen.parent) : null

  return (
    <header className={styles.topbar} data-section="공통 › 위쪽 바">
      <div className={styles.crumb}>
        {screen.group && <span className={styles.crumbGroup}>{screen.group} / </span>}
        {parent && (
          <span className={styles.crumbGroup}>
            <Link to={parent.path}>{parent.name}</Link> /{' '}
          </span>
        )}
        <b>{screen.name}</b>
      </div>

      <form className={styles.search} onSubmit={search}>
        <Icon name="search" size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제품명·코드 검색 (중국어 가능)"
          aria-label="제품 검색"
        />
      </form>

      {fx && (
        <Link to="/exchange-rate" className={styles.fx} title="환율 설정으로">
          {fx.source === 'default' && <span className={styles.fxDot} />}
          1위안 = <b>{formatFx(fx.cnyKrw)}원</b>
          <span className={styles.fxMeta}>
            {fx.source === 'default' ? ' · 기본값' : ` · ${fx.date}`}
          </span>
        </Link>
      )}

      <button
        type="button"
        className={`${styles.sectionToggle} ${showSections ? styles.sectionToggleOn : ''}`}
        onClick={toggleSections}
        aria-pressed={showSections}
        title="화면의 섹션 이름을 보여줘요 — '화면 › 섹션' 으로 부르면 돼요"
      >
        <Icon name="sections" size={16} />
        <span className={styles.sectionToggleText}>섹션 이름</span>
      </button>
    </header>
  )
}
