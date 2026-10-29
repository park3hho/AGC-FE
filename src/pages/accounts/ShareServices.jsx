import { SHARE_SERVICES, shareLabel } from '@/constants/accountConst'
import styles from './Accounts.module.css'

// 공유 서비스 고르기 — 로그인 계정 · API 키 폼 공용. 체크한 서비스의 서버만 이 값을 조회할 수 있다.
export function ShareServicesField({
  value, // string[]: 고른 서비스 code (fin · mkt · shop)
  onChange, // function(string[])
}) {
  const toggle = (code) =>
    onChange(value.includes(code) ? value.filter((x) => x !== code) : [...value, code])

  return (
    <div className="form-group">
      <span className="form-label">공유 서비스 (체크한 서비스 서버가 조회해요 · 없으면 AGC만)</span>
      <div className={styles.usages}>
        {SHARE_SERVICES.map((s) => (
          <label key={s.code} className={styles.usage} title={s.desc}>
            <input type="checkbox" checked={value.includes(s.code)} onChange={() => toggle(s.code)} />
            {s.label}
          </label>
        ))}
      </div>
    </div>
  )
}

// 목록 표시 — "공유 FIN" 같은 작은 표시
export function ShareTags({
  value, // string[]
}) {
  if (!value?.length) return null
  return value.map((code) => (
    <span key={code} className={`${styles.tag} ${styles.shareTag}`} title="이 서비스 서버가 조회할 수 있어요">
      공유 {shareLabel(code)}
    </span>
  ))
}
