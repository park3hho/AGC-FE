import PageHeader from '@/components/common/PageHeader'
import Section from '@/components/common/Section'
import { MARKETS } from '@/constants/marketConst'
import styles from './Markets.module.css'

const host = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

// 설정 › 판매처 — 섹션: 마켓마다 하나 (네이버 스마트스토어 · 쿠팡). 구매자 화면 · 관리 센터 · 바로가기 링크
export default function MarketsPage() {
  return (
    <main className="page-flat">
      <PageHeader title="판매처" sub="구매자가 보는 곳 · 내가 관리하는 곳" />

      <div className={styles.grid}>
        {MARKETS.map((m) => (
          <Section key={m.key} name={m.name} id={m.key} sub={m.storeName}>
            <dl className={styles.kv}>
              <dt>구매자 화면</dt>
              <dd>
                <a href={m.buyer.url} target="_blank" rel="noreferrer" className={styles.link}>
                  {host(m.buyer.url)} ↗
                </a>
                <span className={styles.note}>{m.buyer.note}</span>
              </dd>
              <dt>관리</dt>
              <dd>
                <a href={m.admin.url} target="_blank" rel="noreferrer" className={styles.link}>
                  {m.admin.label} ↗
                </a>
                <span className={styles.note}>{m.admin.note}</span>
              </dd>
              <dt>바로가기</dt>
              <dd className={styles.shortcuts}>
                {m.shortcuts.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                    {s.label} ↗
                  </a>
                ))}
              </dd>
              {m.ids.map((i) => [
                <dt key={`${i.label}-t`}>{i.label}</dt>,
                <dd key={`${i.label}-d`} className={styles.mono}>
                  {i.value}
                </dd>,
              ])}
            </dl>
          </Section>
        ))}
      </div>
    </main>
  )
}
