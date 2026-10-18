import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { createCandidate } from '@/api/research'
import PageHeader from '@/components/common/PageHeader'

const EMPTY = { taobaoUrl: '', name: '', costCny: '', category: '', competitorPrice: '', memo: '' }

export default function ResearchNewPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('상품 이름을 알려주세요')
    if (!(Number(form.costCny) > 0)) return setError('타오바오 가격을 알려주세요')

    setSaving(true)
    const item = await createCandidate({
      ...form,
      name: form.name.trim(),
      costCny: Number(form.costCny),
      competitorPrice: Number(form.competitorPrice) || 0,
    })
    navigate(`/research/${item.id}`, { replace: true })
  }

  return (
    <form className="page-flat" onSubmit={submit}>
      <PageHeader title="어떤 상품을 찾았나요?" back />

      <div className="form-group">
        <label className="form-label" htmlFor="taobaoUrl">
          타오바오 링크
        </label>
        <input id="taobaoUrl" className="form-input" type="url" value={form.taobaoUrl} onChange={set('taobaoUrl')} placeholder="https://item.taobao.com/..." />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="name">
          상품 이름
        </label>
        <input id="name" className="form-input" value={form.name} onChange={set('name')} placeholder="한국어로 적어주세요" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="costCny">
          타오바오 가격 (위안)
        </label>
        <input id="costCny" className="form-input" inputMode="decimal" value={form.costCny} onChange={set('costCny')} placeholder="58" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="competitorPrice">
          네이버·쿠팡 최저가 (원)
        </label>
        <input id="competitorPrice" className="form-input" inputMode="numeric" value={form.competitorPrice} onChange={set('competitorPrice')} placeholder="39900" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="category">
          카테고리
        </label>
        <input id="category" className="form-input" value={form.category} onChange={set('category')} placeholder="캠핑, 주방 ..." />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="memo">
          메모
        </label>
        <input id="memo" className="form-input" value={form.memo} onChange={set('memo')} placeholder="눈여겨본 이유" />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="sticky-cta">
        <button className="btn-primary btn-lg btn-full" type="submit" disabled={saving}>
          후보에 담기
        </button>
      </div>
    </form>
  )
}
