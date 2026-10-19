import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getUsers, setUserActive } from '@/api/user'
import PageHeader from '@/components/common/PageHeader'
import Pager from '@/components/common/Pager'
import Section from '@/components/common/Section'
import { ROLE_LABEL } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import { useFitRows } from '@/hooks/useFitRows'
import styles from './Users.module.css'

// 사용자 관리 — 섹션: 사용자 목록. 남은 높이에 맞춘 페이지 넘김 (DESIGN.md §4.4)
export default function UserListPage() {
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const listRef = useRef(null)
  const pageSize = useFitRows(listRef, { fallback: 57 })

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
  }, [])

  const toggle = async (u) => {
    try {
      const updated = await setUserActive(u.id, !u.active)
      setUsers(users.map((x) => (x.id === u.id ? updated : x)))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const list = users || []
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize))
  const current = Math.min(page, pageCount)
  const rows = list.slice((current - 1) * pageSize, current * pageSize)

  return (
    <main className="page-flat">
      <PageHeader
        title="사용자 관리"
        back
        action={
          <button className="btn-primary btn-md" onClick={() => navigate('/admin/users/new')}>
            사용자 추가
          </button>
        }
      />

      <Section
        name="사용자 목록"
        id="list"
        sub={users && `${users.length}명`}
        flush
        fill
        bodyRef={listRef}
        footer={
          <Pager
            page={current}
            pageCount={pageCount}
            total={users ? users.length : null}
            unit="명"
            onChange={setPage}
          />
        }
      >
        {error && <p className={`form-error ${styles.msg}`}>{error}</p>}
        <div className={styles.list} data-fit-list>
        {rows.map((u) => (
          <div key={u.id} className={styles.row}>
            <div className={styles.body}>
              <div className={styles.name}>
                {u.name} <span className={styles.sub}>@{u.username}</span>
              </div>
              <div className={styles.sub}>{ROLE_LABEL[u.role]}</div>
            </div>
            <span className={u.active ? styles.active : styles.inactive}>
              {u.active ? '사용 중' : '멈춤'}
            </span>
            {u.id !== me.id && (
              <button className="btn-secondary btn-sm" onClick={() => toggle(u)}>
                {u.active ? '멈추기' : '다시 쓰기'}
              </button>
            )}
          </div>
        ))}
        </div>
      </Section>
    </main>
  )
}
