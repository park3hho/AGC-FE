import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { useMobile } from '@/hooks/useMobile'
import { PLAYBOOKS } from '@/playbooks'
import { renderMarkdown } from '@/utils/markdown'
import styles from './Playbooks.module.css'

// 설정 › 플레이북 — 섹션: 목록 · 본문. 앞으로 반복할 작업 방식(디자인 규칙 · 법 체크 등)을 문서로 모아 둔다.
//   문서는 src/playbooks/*.md (코드와 같이 커밋). 메뉴는 개발자 모드에서만 보인다 (menuConst dev: true)
export default function PlaybooksPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const mobile = useMobile()
  const picked = PLAYBOOKS.find((p) => p.key === params.get('doc'))
  const current = picked || PLAYBOOKS[0]
  const html = useMemo(() => (current ? renderMarkdown(current.text) : ''), [current])
  // 모바일 — 목록 화면 / 본문 화면을 나눈다 (?doc 있으면 본문, 뒤로가면 목록. 2026-10-30 모바일 설계 §4.15)
  const showList = !mobile || !picked
  const showBody = !mobile || !!picked

  return (
    <main className="page-flat">
      {mobile && picked ? (
        <PageHeader title={picked.title} back />
      ) : (
        <PageHeader title="플레이북" sub="앞으로 같은 방식으로 일하기 위한 문서 · 개발자 전용" />
      )}
      <div className={`fit-row ${styles.layout}`}>
        {showList && (
        <Section name="목록" id="playbook-list" sub={`${PLAYBOOKS.length}개`} flush fill>
          <ul className={styles.list}>
            {PLAYBOOKS.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  className={p.key === current?.key ? styles.on : undefined}
                  onClick={() => (mobile ? navigate(`?doc=${p.key}`) : setParams({ doc: p.key }))}
                >
                  <b>{p.title}</b>
                  <span>{p.key}.md</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
        )}
        {showBody && (
        <Section
          name="본문"
          id="playbook-body"
          title={mobile ? false : current?.title || '본문'}
          fill="stretch"
        >
          {current ? (
            <article className={styles.doc} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className={styles.empty}>문서가 없어요. src/playbooks 에 .md 를 넣으면 여기에 보여요.</p>
          )}
        </Section>
        )}
      </div>
    </main>
  )
}
