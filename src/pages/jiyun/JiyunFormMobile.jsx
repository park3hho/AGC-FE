import { ChoiceRow, Fold, PasteInput } from '@/components/common/MobileBits'
import {
  CHARGED_STATUS,
  JIYUN_STATUS,
  KR_COURIERS,
  MARKETS,
  PAY_CURRENCY,
  PAY_METHOD,
  TRANSPORTS,
} from '@/constants/orderConst'
import m from '../orders/FormMobile.module.css'

// 집운 기록 추가 · 수정 — 모바일 본문 (플레이북 'AGC 모바일 화면 설계' §4.5)
//   한 줄 한 칸: 주문 요약 → 집운 번호(붙여넣기) → 묶인 소포(줄마다) → 무게 · 배송비 → 운송 → 요청 시각 → 접는 칸 셋.
//   상태 · 저장은 JiyunFormPage 가 갖는다. 데스크탑은 JiyunFormPage 의 원래 칸.
export default function JiyunFormMobile({ form, setForm, set, setStatus, nowLocal, order, editing }) {
  const field = (id, label, input, hint) => (
    <div className={m.field}>
      <label htmlFor={id}>{label}</label>
      {input}
      {hint && <span className={m.hint}>{hint}</span>}
    </div>
  )
  const paste = (key) => (v) => setForm({ ...form, [key]: v })
  const pkgs = form.packages.length ? form.packages : ['']
  const setPkg = (i, v) => setForm({ ...form, packages: pkgs.map((p, j) => (j === i ? v : p)) })

  return (
    <div className={m.body}>
      <div className={m.summary}>
        {order ? (
          <>
            <b>{order.code || '코드 없음'}</b> · {MARKETS[order.market].label} {order.orderNo}
            <br />
            {order.productName}
            {order.optionName ? ` (${order.optionName})` : ''} × {order.quantity}
          </>
        ) : (
          '불러오는 중…'
        )}
      </div>

      {field(
        'm-jiyunNo',
        '집운 번호 (배송 요청 번호) · 필수',
        <PasteInput
          id="m-jiyunNo"
          className="form-input"
          autoComplete="off"
          value={form.jiyunNo}
          onChange={set('jiyunNo')}
          onValue={paste('jiyunNo')}
        />,
      )}

      <div className={m.field}>
        <span className={m.label}>묶인 소포 (중국 운송장)</span>
        {pkgs.map((p, i) => (
          <div key={i} className={m.pkg}>
            <PasteInput
              className="form-input"
              autoComplete="off"
              aria-label={`소포 ${i + 1}`}
              placeholder="예: SF5145503342072"
              value={p}
              onChange={(e) => setPkg(i, e.target.value)}
              onValue={(v) => setPkg(i, v)}
            />
            {pkgs.length > 1 && (
              <button
                type="button"
                className="btn-ghost btn-md"
                aria-label="이 소포 빼기"
                onClick={() => setForm({ ...form, packages: pkgs.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary btn-md"
          onClick={() => setForm({ ...form, packages: [...pkgs, ''] })}
        >
          + 소포
        </button>
      </div>

      {field(
        'm-weightKg',
        '무게 (kg, 집운이 잰 요금 무게)',
        <span className={m.unit}>
          <input
            id="m-weightKg"
            className="form-input"
            inputMode="decimal"
            placeholder="예: 2.5"
            value={form.weightKg}
            onChange={set('weightKg')}
          />
          <span>kg</span>
        </span>,
      )}
      {field(
        'm-feeCny',
        '배송비 (집운 표시 금액)',
        <span className={m.unit}>
          <input
            id="m-feeCny"
            className="form-input"
            inputMode="decimal"
            placeholder="예: 39.00"
            value={form.feeCny}
            onChange={set('feeCny')}
          />
          <span>위안</span>
        </span>,
      )}

      <div className={m.field}>
        <span className={m.label}>운송</span>
        <ChoiceRow
          ariaLabel="운송"
          options={Object.entries(TRANSPORTS).map(([value, label]) => ({ value, label }))}
          value={form.transport}
          onChange={(v) => setForm({ ...form, transport: v })}
        />
      </div>

      {field(
        'm-requestedAt',
        '배송 요청 시각',
        <span className={m.now}>
          <input
            id="m-requestedAt"
            className="form-input"
            type="datetime-local"
            value={form.requestedAt}
            onChange={set('requestedAt')}
          />
          <button
            type="button"
            className="btn-secondary btn-md"
            onClick={() => setForm({ ...form, requestedAt: nowLocal() })}
          >
            지금
          </button>
        </span>,
      )}

      <Fold title="배송비 결제" sub={CHARGED_STATUS[form.chargedStatus]?.label}>
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
          'm-chargedKrw',
          '실제 청구 원화',
          <input
            id="m-chargedKrw"
            className="form-input"
            inputMode="numeric"
            placeholder="예: 7650"
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

      <Fold title="출고 · 국제 운송" sub={JIYUN_STATUS[form.status]?.label} defaultOpen={editing}>
        <ChoiceRow
          ariaLabel="집운 상태"
          options={Object.entries(JIYUN_STATUS).map(([value, v]) => ({
            value,
            label: value === 'dispatched' ? '출고' : value === 'requested' ? '요청' : v.label,
          }))}
          value={form.status}
          onChange={setStatus}
        />
        {field(
          'm-dispatchedAt',
          '집운 출고 시각',
          <input
            id="m-dispatchedAt"
            className="form-input"
            type="datetime-local"
            value={form.dispatchedAt}
            onChange={set('dispatchedAt')}
          />,
        )}
        {field(
          'm-hbl',
          '국제 운송장 (H B/L)',
          <PasteInput
            id="m-hbl"
            className="form-input"
            autoComplete="off"
            value={form.hbl}
            onChange={set('hbl')}
            onValue={paste('hbl')}
          />,
          '통관 조회는 30분마다 자동',
        )}
      </Fold>

      <Fold title="국내 배송" sub={form.krTrackingNo ? '송장 있음' : '송장 없음'} defaultOpen={editing}>
        {field(
          'm-krCourier',
          '국내 택배사',
          <select
            id="m-krCourier"
            className="form-input"
            value={form.krCourier}
            onChange={set('krCourier')}
          >
            <option value="">모름</option>
            {Object.entries(KR_COURIERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>,
        )}
        {field(
          'm-krTrackingNo',
          '국내 송장 (마켓 발송처리에 씀)',
          <PasteInput
            id="m-krTrackingNo"
            className="form-input"
            autoComplete="off"
            inputMode="numeric"
            value={form.krTrackingNo}
            onChange={set('krTrackingNo')}
            onValue={paste('krTrackingNo')}
          />,
        )}
        {field(
          'm-memo',
          '메모',
          <input id="m-memo" className="form-input" value={form.memo} onChange={set('memo')} />,
        )}
      </Fold>
    </div>
  )
}
