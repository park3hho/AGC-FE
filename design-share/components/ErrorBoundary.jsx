import { Component } from 'react'

import styles from './ErrorBoundary.module.css'

// 새 배포 뒤 옛 화면 코드 파일을 못 받는 오류 (Vite 동적 import 실패)
const isChunkError = (err) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    String(err?.message || err),
  )

const RELOAD_KEY = 'agc.chunkReloadAt'

// 화면 하나가 깨져도 앱 전체가 하얗게 되지 않게 막는다 — 틀(메뉴·위쪽 바)은 그대로 두고 이 자리에만 안내.
// AppLayout 이 key={pathname} 으로 감싸서 다른 화면으로 가면 다시 시도한다.
// ※ 오류 경계는 React 에 함수형 API 가 없어 이 파일만 클래스 컴포넌트로 둔다 (DESIGN.md §3.4 예외)
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('화면 렌더링 오류', error)
    // 새 배포로 화면 코드가 바뀐 경우 — 한 번만 자동 새로고침 (무한 반복 방지: 30초 안에 또 나면 멈춤)
    if (isChunkError(error)) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
      if (Date.now() - last > 30000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
        window.location.reload()
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="page-flat">
        <div className={styles.box}>
          <b>화면을 그리다 문제가 생겼어요</b>
          <p>새로고침하면 대부분 해결돼요. 계속 나오면 이 문구를 알려 주세요.</p>
          <code>{String(this.state.error?.message || this.state.error)}</code>
          <button className="btn-primary btn-md" onClick={() => window.location.reload()}>
            새로고침
          </button>
        </div>
      </main>
    )
  }
}
