import { useState } from 'react'

import { fileUrl } from '@/api/client'
import Pager from '@/components/common/Pager'
import { EDITOR_GROUPS, HOW_ICONS, LIMITS } from '@/constants/designConst'
import styles from './Design.module.css'

// 디자인(제품) › 편집 — S1~S6 묶음을 하나씩. 칸을 바꾸면 onChange(path, value) 로 위에 알린다.
// 칸 높이를 낮게 잡아 묶음 하나가 섹션 안에 다 들어가게 한다 (스크롤은 미리보기 하나만, DESIGN.md §4.4)

function Row({
  label, // string: 칸 이름
  children,
}) {
  return (
    <label className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowCtrl}>{children}</span>
    </label>
  )
}

function Text({
  value, // string: 값
  onChange, // function(string)
  multi, // boolean?: 여러 줄 (줄바꿈 = 줄)
  placeholder, // string?
  disabled, // boolean?
}) {
  return multi ? (
    <textarea
      className={styles.ta}
      rows={2}
      value={value || ''}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <input
      className={styles.in}
      value={value || ''}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function PhotoPick({
  photos, // Array<{ url, label }>: 고를 수 있는 사진
  value, // string?: 지금 사진
  onChange, // function(url | null)
}) {
  return (
    <div className={styles.photos}>
      {photos.map((p) => (
        <button
          key={p.url}
          type="button"
          title={p.label}
          className={`${styles.photo} ${p.url === value ? styles.photoOn : ''}`}
          onClick={() => onChange(p.url)}
        >
          <img src={fileUrl(p.url)} alt={p.label} />
        </button>
      ))}
      <button
        type="button"
        className={`${styles.photo} ${styles.photoNone} ${!value ? styles.photoOn : ''}`}
        onClick={() => onChange(null)}
      >
        없음
      </button>
    </div>
  )
}

function HeroFields({ c, set, photos }) {
  return (
    <>
      <Row label="한 줄 소개">
        <Text value={c.eyebrow} onChange={(v) => set(['eyebrow'], v)} />
      </Row>
      <Row label="헤드라인">
        <Text
          multi
          value={c.headline}
          onChange={(v) => set(['headline'], v)}
          placeholder="줄바꿈 = 줄 · *글자* = 파란 강조"
        />
      </Row>
      <Row label="제품명">
        <Text value={c.name} onChange={(v) => set(['name'], v)} />
      </Row>
      <Row label="아래 줄">
        <Text value={c.name_sub} onChange={(v) => set(['name_sub'], v)} />
      </Row>
      {(c.badges || []).map((b, i) => (
        <Row key={i} label={`배지 ${i + 1}`}>
          <span className={styles.pair}>
            <Text
              value={b.value}
              onChange={(v) => set(['badges', i, 'value'], v)}
              placeholder="0kcal"
            />
            <Text
              value={b.label}
              onChange={(v) => set(['badges', i, 'label'], v)}
              placeholder="설명"
            />
          </span>
        </Row>
      ))}
      <Row label="대표 사진">
        <PhotoPick photos={photos} value={c.photo_url} onChange={(v) => set(['photo_url'], v)} />
      </Row>
    </>
  )
}

function PointsFields({ c, set }) {
  return (
    <>
      <Row label="제목">
        <Text value={c.title} onChange={(v) => set(['title'], v)} />
      </Row>
      <Row label="한 줄 설명">
        <Text value={c.lead} onChange={(v) => set(['lead'], v)} />
      </Row>
      {(c.items || []).map((p, i) => (
        <div key={i} className={styles.block}>
          <Row label={`포인트 ${i + 1}`}>
            <span className={styles.pair3}>
              <Text
                value={p.title}
                onChange={(v) => set(['items', i, 'title'], v)}
                placeholder="제목"
              />
              <Text
                value={p.big}
                onChange={(v) => set(['items', i, 'big'], v)}
                placeholder="큰 숫자"
              />
              <Text
                value={p.big_unit}
                onChange={(v) => set(['items', i, 'big_unit'], v)}
                placeholder="단위"
              />
            </span>
          </Row>
          <Row label="설명">
            <Text multi value={p.desc} onChange={(v) => set(['items', i, 'desc'], v)} />
          </Row>
        </div>
      ))}
    </>
  )
}

function FlavorsFields({ c, set, photos }) {
  const [page, setPage] = useState(1)
  const items = c.items || []
  const i = Math.min(page, items.length) - 1
  const f = items[i]
  return (
    <>
      <Row label="제목">
        <Text value={c.title} onChange={(v) => set(['title'], v)} />
      </Row>
      <Row label="한 줄 설명">
        <Text value={c.lead} onChange={(v) => set(['lead'], v)} />
      </Row>
      <Row label="안내 (※)">
        <Text
          multi
          value={(c.notes || []).join('\n')}
          onChange={(v) => set(['notes'], v.split('\n').slice(0, LIMITS.notes))}
          placeholder="한 줄에 하나"
        />
      </Row>
      {f ? (
        <div className={styles.block}>
          <div className={styles.blockHead}>
            <b>옵션 {i + 1}</b>
            <Pager page={i + 1} pageCount={items.length} onChange={setPage} />
          </div>
          <Row label="맛 이름">
            <span className={styles.pair}>
              <Text value={f.name} onChange={(v) => set(['items', i, 'name'], v)} />
              <Text
                value={f.name_cn}
                onChange={(v) => set(['items', i, 'name_cn'], v)}
                placeholder="중국어 (선택)"
              />
            </span>
          </Row>
          <Row label="설명">
            <Text multi value={f.desc} onChange={(v) => set(['items', i, 'desc'], v)} />
          </Row>
          <Row label="칩">
            <Text
              value={(f.chips || []).join(', ')}
              onChange={(v) =>
                set(
                  ['items', i, 'chips'],
                  v
                    .split(',')
                    .map((s) => s.trimStart())
                    .slice(0, LIMITS.chips),
                )
              }
              placeholder="쉼표로 나눠요 (최대 4개)"
            />
          </Row>
          <Row label="사진">
            <PhotoPick
              photos={photos}
              value={f.photo_url}
              onChange={(v) => set(['items', i, 'photo_url'], v)}
            />
          </Row>
        </div>
      ) : (
        <p className={styles.hint}>가격조사 옵션이 없어 맛 카드가 없어요</p>
      )}
    </>
  )
}

function InfoFields({ c, set }) {
  const rows = c.rows || []
  const nutrition = c.nutrition || []
  return (
    <>
      <Row label="제목">
        <Text value={c.title} onChange={(v) => set(['title'], v)} />
      </Row>
      {rows.map((r, i) => (
        <div key={i} className={styles.rowWithX}>
          <span className={styles.pairWide}>
            <Text
              value={r.label}
              onChange={(v) => set(['rows', i, 'label'], v)}
              placeholder="항목"
            />
            <Text
              value={r.value}
              onChange={(v) => set(['rows', i, 'value'], v)}
              placeholder="내용"
            />
          </span>
          <button
            type="button"
            className={styles.x}
            aria-label="줄 빼기"
            onClick={() =>
              set(
                ['rows'],
                rows.filter((_, j) => j !== i),
              )
            }
          >
            ×
          </button>
        </div>
      ))}
      {rows.length < LIMITS.infoRows && (
        <button
          type="button"
          className="btn-text"
          onClick={() => set(['rows'], [...rows, { label: '', value: '' }])}
        >
          + 줄 추가
        </button>
      )}
      <Row label="영양 숫자">
        <span className={styles.nutri}>
          {nutrition.map((n, i) => (
            <span key={i} className={styles.nutriItem}>
              <Text
                value={n.value}
                onChange={(v) => set(['nutrition', i, 'value'], v)}
                placeholder="0g"
              />
              <Text
                value={n.label}
                onChange={(v) => set(['nutrition', i, 'label'], v)}
                placeholder="당류"
              />
              <button
                type="button"
                className={styles.x}
                aria-label="빼기"
                onClick={() =>
                  set(
                    ['nutrition'],
                    nutrition.filter((_, j) => j !== i),
                  )
                }
              >
                ×
              </button>
            </span>
          ))}
          {nutrition.length < LIMITS.nutrition && (
            <button
              type="button"
              className="btn-text"
              onClick={() => set(['nutrition'], [...nutrition, { value: '', label: '' }])}
            >
              + 추가
            </button>
          )}
        </span>
      </Row>
      <Row label="아래 안내 (※)">
        <Text value={c.note} onChange={(v) => set(['note'], v)} />
      </Row>
    </>
  )
}

function HowToFields({ c, set }) {
  return (
    <>
      <Row label="제목">
        <Text value={c.title} onChange={(v) => set(['title'], v)} />
      </Row>
      {(c.items || []).map((h, i) => (
        <div key={i} className={styles.block}>
          <Row label={`카드 ${i + 1}`}>
            <span className={styles.pair}>
              <select
                className={styles.in}
                value={h.icon}
                onChange={(e) => set(['items', i, 'icon'], e.target.value)}
              >
                {HOW_ICONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Text
                value={h.title}
                onChange={(v) => set(['items', i, 'title'], v)}
                placeholder="제목"
              />
            </span>
          </Row>
          <Row label="설명">
            <Text multi value={h.desc} onChange={(v) => set(['items', i, 'desc'], v)} />
          </Row>
        </div>
      ))}
    </>
  )
}

function CommonFields({ common, setCommon, canEdit, dirty, saving, onSave }) {
  const notice = common.notice || []
  const setItem = (i, key, v) =>
    setCommon({ ...common, notice: notice.map((n, j) => (j === i ? { ...n, [key]: v } : n)) })
  return (
    <>
      <p className={styles.warn}>
        모든 상세페이지가 같이 써요. 바꾸면 <b>승인된 페이지도 전부 다시 검수 대기</b>가 돼요.
      </p>
      <Row label="등록번호">
        <Text
          value={common.reg_no}
          disabled={!canEdit}
          onChange={(v) => setCommon({ ...common, reg_no: v })}
          placeholder="수입식품등 인터넷 구매대행업 등록번호 (발급 후 입력)"
        />
      </Row>
      <Row label="판매자">
        <Text
          value={common.seller}
          disabled={!canEdit}
          onChange={(v) => setCommon({ ...common, seller: v })}
        />
      </Row>
      <Row label="제목">
        <Text
          value={common.notice_title}
          disabled={!canEdit}
          onChange={(v) => setCommon({ ...common, notice_title: v })}
        />
      </Row>
      {notice.map((n, i) => (
        <span key={i} className={styles.pairWide}>
          <Text value={n.title} disabled={!canEdit} onChange={(v) => setItem(i, 'title', v)} />
          <Text value={n.body} disabled={!canEdit} onChange={(v) => setItem(i, 'body', v)} />
        </span>
      ))}
      <div className={styles.commonSave}>
        <span className={styles.hint}>
          {canEdit ? '[[가안]] 을 지우면 확정이에요' : '검수 권한이 있어야 바꿀 수 있어요'}
        </span>
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={!canEdit || !dirty || saving}
          onClick={onSave}
        >
          {saving ? '저장 중…' : '공통 안내 저장'}
        </button>
      </div>
    </>
  )
}

export default function DetailEditor({
  content, // object: DetailContent (편집 중)
  onChange, // function(path: Array, value): 칸 바꿈
  photos, // Array<{ url, label }>: 고를 수 있는 사진
  common, // object: 공통 안내 (편집 중)
  setCommon, // function(common)
  commonProps, // object: { canEdit, dirty, saving, onSave }
}) {
  const [group, setGroup] = useState(EDITOR_GROUPS[0].key)
  const sub = (key) => (path, value) => onChange([key, ...path], value)
  const c = content || {}

  return (
    <>
      <div className={styles.groups} role="tablist" aria-label="편집 묶음">
        {EDITOR_GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={group === g.key}
            className={`${styles.group} ${group === g.key ? styles.groupOn : ''}`}
            onClick={() => setGroup(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className={styles.fields}>
        {group === 'hero' && <HeroFields c={c.hero || {}} set={sub('hero')} photos={photos} />}
        {group === 'points' && <PointsFields c={c.points || {}} set={sub('points')} />}
        {group === 'flavors' && (
          <FlavorsFields c={c.flavors || {}} set={sub('flavors')} photos={photos} />
        )}
        {group === 'info' && <InfoFields c={c.info || {}} set={sub('info')} />}
        {group === 'howto' && <HowToFields c={c.howto || {}} set={sub('howto')} />}
        {group === 'common' && (
          <CommonFields common={common} setCommon={setCommon} {...commonProps} />
        )}
      </div>
    </>
  )
}
