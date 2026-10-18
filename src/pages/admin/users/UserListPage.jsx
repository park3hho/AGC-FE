import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getUsers, setUserActive } from '@/api/user'
import PageHeader from '@/components/common/PageHeader'
import { ROLE_LABEL } from '@/constants/permissions'
import { useAuth } from '@/hooks/useAuth'
import styles from './Users.module.css'

export default function UserListPage() {
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')

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

      <div>
        {error && <p className="form-error">{error}</p>}
        {(users || []).map((u) => (
          <div key={u.id} className={styles.row}>
            <div className={styles.body}>
              <div className={styles.name}>
                {u.name} <span className={styles.sub}>@{u.username}</span>
              </div>
              <div className={styles.sub}>{ROLE_LABEL[u.role]}</div>
            </div>
            <span className={u.active ? styles.active : styles.inactive}>{u.active ? '사용 중' : '멈춤'}</span>
            {u.id !== me.id && (
              <button className="btn-secondary btn-sm" onClick={() => toggle(u)}>
                {u.active ? '멈추기' : '다시 쓰기'}
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
