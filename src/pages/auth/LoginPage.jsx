export default function LoginPage() {
  return (
    <main className="page-flat">
      <h1>로그인</h1>
      <div className="form-group">
        <label className="form-label" htmlFor="login-id">
          아이디를 알려주세요
        </label>
        <input id="login-id" className="form-input" autoComplete="username" />
      </div>
      <button className="btn-primary btn-lg btn-full">다음</button>
    </main>
  )
}
