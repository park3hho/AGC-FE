import { ChoiceRow, Fold, PasteInput } from '@/components/common/MobileBits'
import {
  CHARGED_STATUS,
  CN_COURIERS,
  CN_STATUS,
  MARKETS,
  PAY_CURRENCY,
  PAY_METHOD,
  PCCC_STATUS,
} from '@/constants/orderConst'
import m from './FormMobile.module.css'

// 타오바오 구매 추가 · 수정 — 모바일 본문 (플레이북 'AGC 모바일 화면 설계' §4.4 · 목업 M4)
//   한 줄 한 칸: 주문 요약 → 주문번호(붙여넣기) → 결제 위안(≈원) → 결제수단 → 구매 시각 → 접는 칸 셋.
//   상태 · 저장은 PurchaseFormPage 가 갖고, 여기는 그리기만 한다. 데스크탑은 PurchaseFormPage 의 원래 칸.
export default function PurchaseFormMobile({
  form,
  setForm,
  set, // (key) => onChange
  setItem, // (i, key, v)
  setStatus, // (cnStatus) — 단계 시각 자동 채움
  nowLocal, // () => datetime-local 지금
  order,
  sourcing,
  receiver,
  editing,
  needsConfirm,
  confirm,
  confirming,
  confirmError,
  fx, // 1위안 = 원 (없으면 null)
}) {
  const krw =
    fx && Number(form.paidCny) > 0
      ? Math.round(Number(form.paidCny) * fx).toLocaleString('ko-KR')
      : null
  const field = (id, label, input) => (
    <div className={m.field}>
      <label htmlFor={id}>{label}</label>
      {input}
    </div>
  )
  const paste = (key) => (v) => setForm({ ...form, [key]: v })

  return (
    <div className={m.body}>
      <div className={m.summary}>
        {order ? (
          <>
            <b>{order.code || '코드 없음'}</b> · {MARKETS[order.market].label}
            {receiver?.name ? ` · ${receiver.name}` : ''}
            <br />
            살 것:{' '}
            {sourcing?.optionId
              ? `${[sourcing.option1, sourcing.option2].filter(Boolean).join(' ')} × ${sourcing.taobaoQty}`
              : `${order.optionName || order.productName} × ${order.quantity}`}
            {form.shopName ? ` · ${form.shopName}` : ''}
          </>
        ) : (
          '불러오는 중…'
        )}
      </div>

      {order && !editing && (
        <p className={order.confirmed ? m.ok : m.wait}>
          {order.confirmed
            ? '● 발주확인됨 — 고객 화면 상품준비중'
            : '● 발주확인 전 — 먼저 발주확인을 보내야 저장돼요'}
        </p>
      )}

      {needsConfirm && (
        <div className={m.summary}>
          받는 분 {receiver?.name || '-'} · {receiver?.customsPhone || '-'}
          <br />
          {receiver?.zip && `(${receiver.zip}) `}
          {receiver?.address || '-'}
          <br />
          통관부호 {receiver?.pccc || '-'} ·{' '}
          {PCCC_STATUS[order.pcccStatus]?.label || order.pcccStatus}
          {confirmError && <p className="form-error">{confirmError}</p>}
          <button
            type="button"
            className={`btn-primary btn-md btn-full ${m.confirmBtn}`}
            onClick={confirm}
            disabled={confirming}
          >
            {confirming ? '보내는 중…' : `${MARKETS[order.market].label}에 발주확인 보내기`}
          </button>
        </div>
      )}

      {field(
        'm-taobaoOrderNo',
        '타오바오 주문번호 · 필수',
        <PasteInput
          id="m-taobaoOrderNo"
          className="form-input"
          inputMode="numeric"
          autoComplete="off"
          value={form.taobaoOrderNo}
          onChange={set('taobaoOrderNo')}
          onValue={paste('taobaoOrderNo')}
        />,
      )}

      {field(
        'm-paidCny',
        '결제 위안 (타오바오 표시 금액)',
        <span className={m.unit}>
          <input
            id="m-paidCny"
            className="form-input"
            inputMode="decimal"
            placeholder="예: 35.50"
            value={form.paidCny}
            onChange={set('paidCny')}
          />
          <span>위안{krw ? ` ≈ ${krw}원` : ''}</span>
        </span>,
      )}

      <div className={m.field}>
        <span className={m.label}>결제수단</span>
        <ChoiceRow
          ariaLabel="결제수단"
          options={Object.entries(PAY_METHOD).map(([value, label]) => ({ value, label }))}
          value={form.payMethod}
          onChange={(v) => setForm({ ...form, payMethod: form.payMethod === v ? '' : v })}
        />
      </div>

      {field(
        'm-purchasedAt',
        '구매 시각',
        <span className={m.now}>
          <input
            id="m-purchasedAt"
            className="form-input"
            type="datetime-local"
            value={form.purchasedAt}
            onChange={set('purchasedAt')}
          />
          <button
            type="button"
            className="btn-secondary btn-md"
            onClick={() => setForm({ ...form, purchasedAt: nowLocal() })}
          >
            지금
          </button>
        </span>,
      )}

      <Fold title="상품 링크 · 판매처 · 산 옵션" sub={`옵션 ${form.items.length}줄`}>
        {field(
          'm-itemUrl',
          '상품 링크',
          <PasteInput
            id="m-itemUrl"
            className="form-input"
            inputMode="url"
            value={form.itemUrl}
            onChange={set('itemUrl')}
            onValue={paste('itemUrl')}
          />,
        )}
        {field(
          'm-shopName',
          '판매처 (가게)',
          <input
            id="m-shopName"
            className="form-input"
            placeholder="예: 元气森林旗舰店"
            value={form.shopName}
            onChange={set('shopName')}
          />,
        )}
        <span className={m.label}>산 옵션 · 수량 · 단가(위안)</span>
        {form.items.map((it, i) => (
          <div key={i} className={m.item}>
            <input
              className="form-input"
              placeholder="옵션"
              aria-label="옵션"
              value={it.name}
              onChange={(e) => setItem(i, 'name', e.target.value)}
            />
            <input
              className="form-input"
              type="number"
              min={1}
              inputMode="numeric"
              aria-label="수량"
              value={it.qty}
              onChange={(e) => setItem(i, 'qty', e.target.value)}
            />
            <input
              className="form-input"
              inputMode="decimal"
              placeholder="단가"
              aria-label="단가 위안"
              value={it.priceCny}
              onChange={(e) => setItem(i, 'priceCny', e.target.value)}
            />
            <button
              type="button"
              className="btn-ghost btn-md"
              aria-label="이 줄 삭제"
              onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary btn-md"
          onClick={() =>
            setForm({ ...form, items: [...form.items, { name: '', qty: 1, priceCny: '' }] })
          }
        >
          + 옵션 줄
        </button>
      </Fold>

      <Fold title="실제 청구 원화" sub={CHARGED_STATUS[form.chargedStatus]?.label}>
        {field(
          'm-chargedKrw',
          '실제 청구 원화 (카드사·카카오페이 기준)',
          <input
            id="m-chargedKrw"
            className="form-input"
            inputMode="numeric"
            placeholder="예: 5650"
            value={form.chargedKrw}
            onChange={set('chargedKrw')}
          />,
        )}
        <div className={m.field}>
          <span className={m.label}>청구 확인</span>
          <ChoiceRow
            ariaLabel="청구 확인"
            options={Object.entries(CHARGED_STATUS).map(([value, v]) => ({ value, label: v.label }))}
            value={form.chargedStatus}
            onChange={(v) => setForm({ ...form, chargedStatus: v })}
          />
        </div>
        {field(
          'm-payAmount',
          '결제창 금액 (결제 수수료 포함)',
          <span className={m.now}>
            <select
              className={`form-input ${m.currency}`}
              aria-label="결제 통화"
              value={form.payCurrency}
              onChange={set('payCurrency')}
            >
              <option value="">통화</option>
              {PAY_CURRENCY.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              id="m-payAmount"
              className="form-input"
              inputMode="decimal"
              value={form.payAmount}
              onChange={set('payAmount')}
            />
          </span>,
        )}
        {field(
          'm-chargedAt',
          '결제 일시',
          <input
            id="m-chargedAt"
            className="form-input"
            type="datetime-local"
            value={form.chargedAt}
            onChange={set('chargedAt')}
          />,
        )}
        {field(
          'm-chargedSource',
          '확인한 곳',
          <input
            id="m-chargedSource"
            className="form-input"
            placeholder="예: 현대카드 앱 승인내역"
            value={form.chargedSource}
            onChange={set('chargedSource')}
          />,
        )}
      </Fold>

      <Fold title="중국 내 배송" sub={CN_STATUS[form.cnStatus]?.label} defaultOpen={editing}>
        <ChoiceRow
          ariaLabel="중국 배송 상태"
          options={[
            { value: 'ordered', label: '주문함' },
            { value: 'shipped', label: '발송' },
            { value: 'arrived', label: '입고' },
            { value: 'problem', label: '문제' },
          ]}
          value={form.cnStatus}
          onChange={setStatus}
        />
        {form.cnStatus === 'cancelled' && <p className={m.hint}>지금 상태: 취소·환불</p>}
        {field(
          'm-cnCourier',
          '중국 택배사',
          <>
            <input
              id="m-cnCourier"
              className="form-input"
              list="m-cn-couriers"
              autoComplete="off"
              value={form.cnCourier}
              onChange={set('cnCourier')}
            />
            <datalist id="m-cn-couriers">
              {CN_COURIERS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>,
        )}
        {field(
          'm-cnTrackingNo',
          '중국 운송장 번호',
          <PasteInput
            id="m-cnTrackingNo"
            className="form-input"
            autoComplete="off"
            value={form.cnTrackingNo}
            onChange={set('cnTrackingNo')}
            onValue={paste('cnTrackingNo')}
          />,
        )}
        {field(
          'm-shippedAt',
          '판매처 발송 일시',
          <input
            id="m-shippedAt"
            className="form-input"
            type="datetime-local"
            value={form.shippedAt}
            onChange={set('shippedAt')}
          />,
        )}
        {field(
          'm-arrivedAt',
          '집운 창고 입고 일시',
          <input
            id="m-arrivedAt"
            className="form-input"
            type="datetime-local"
            value={form.arrivedAt}
            onChange={set('arrivedAt')}
          />,
        )}
        {field(
          'm-memo',
          '메모',
          <input id="m-memo" className="form-input" value={form.memo} onChange={set('memo')} />,
        )}
        {form.cnStatus !== 'cancelled' && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setStatus('cancelled')}>
            취소·환불로 표시
          </button>
        )}
      </Fold>
    </div>
  )
}
