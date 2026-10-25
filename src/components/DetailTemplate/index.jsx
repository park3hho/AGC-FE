import { forwardRef } from 'react'

import { fileUrl } from '@/api/client'
import RichText from './RichText'
import { TEMPLATE_CSS } from './templateCss'

// 상세페이지 템플릿 (S1~S6, 폭 860px) — 편집 미리보기와 이미지 내보내기가 같은 그림을 쓴다 (DESIGN.md §4.7)
//   content: 제품별 칸 값 (docs/api-contract.md DetailContent, snake_case 그대로)
//   common: S6 공통 안내 + 등록번호 (모든 상세페이지가 같이 씀)
// 칸이 비면 그 줄·블록은 그리지 않는다. [[글자]] 는 노란 확인 표시로 보인다.

// S5 아이콘 — 키는 constants/designConst.HOW_ICONS · BE HOW_ICONS 와 같다
const HOW_ICON_PATHS = {
  cold: 'M12 2v20M4.9 6.5l14.2 11M19.1 6.5L4.9 17.5',
  run: 'M13 4a2 2 0 100 .1M8 21l3-6 3 2v4M7 12l3-4 4 1 3 3M6 8l3-1',
  bottle: 'M9 2h6M10 2v3L7 8v12a2 2 0 002 2h6a2 2 0 002-2V8l-3-3V2M7 11h10',
  cup: 'M5 4h14l-2 16a2 2 0 01-2 2H9a2 2 0 01-2-2L5 4zM6 9h12',
  clock: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
}

const has = (v) => (typeof v === 'string' ? v.trim() !== '' : !!v)

function HowIcon({
  name, // string: HOW_ICON_PATHS 키
}) {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1d6fe0"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={HOW_ICON_PATHS[name] || HOW_ICON_PATHS.cup} />
    </svg>
  )
}

function RegNo({
  common, // object: 공통 안내
}) {
  return (
    <>
      수입식품등 인터넷 구매대행업 등록번호{' '}
      {has(common.reg_no) ? (
        <b>{common.reg_no}</b>
      ) : (
        <span className="dp-mark">등록번호 입력 전</span>
      )}
    </>
  )
}

const DetailTemplate = forwardRef(function DetailTemplate(
  {
    content, // object: DetailContent
    common, // object: { reg_no, seller, notice_title, notice }
  },
  ref,
) {
  const { hero = {}, points = {}, flavors = {}, info = {}, howto = {} } = content || {}
  const badges = (hero.badges || []).filter((b) => has(b.value) || has(b.label))
  const pointItems = (points.items || []).filter((p) => has(p.title) || has(p.desc))
  const flavorItems = (flavors.items || []).filter((f) => has(f.name))
  const rows = (info.rows || []).filter((r) => has(r.label) || has(r.value))
  const nutrition = (info.nutrition || []).filter((n) => has(n.value) || has(n.label))
  const howItems = (howto.items || []).filter((h) => has(h.title) || has(h.desc))
  const notes = (flavors.notes || []).filter(has)
  const gallery = flavors.gallery || {}
  const galleryItems = (gallery.items || []).filter((g) => has(g.photo_url))
  const notice = (common?.notice || []).filter((n) => has(n.title) || has(n.body))

  return (
    <div className="dp" ref={ref}>
      <style>{TEMPLATE_CSS}</style>

      <div className="dp-regno">
        <RegNo common={common || {}} />
      </div>

      {/* S1 대표 사진 */}
      <div className="dp-hero">
        {has(hero.eyebrow) && (
          <span className="dp-eyebrow">
            <RichText text={hero.eyebrow} />
          </span>
        )}
        {has(hero.headline) && (
          <h1>
            <RichText text={hero.headline} emphasis />
          </h1>
        )}
        {(has(hero.name) || has(hero.name_sub)) && (
          <p className="dp-name">
            <RichText text={hero.name} />
            {has(hero.name_sub) && (
              <small>
                <RichText text={hero.name_sub} />
              </small>
            )}
          </p>
        )}
        {badges.length > 0 && (
          <div className="dp-badges">
            {badges.map((b, i) => (
              <div key={i} className="dp-badge">
                <b>
                  <RichText text={b.value} />
                </b>
                <span>
                  <RichText text={b.label} />
                </span>
              </div>
            ))}
          </div>
        )}
        {hero.photo_url ? (
          <div className="dp-hero-img">
            {/* 원래 비율 그대로 860 폭 — 1100px 를 넘는 세로 사진만 위 기준으로 자른다 */}
            <img src={fileUrl(hero.photo_url)} alt="" />
          </div>
        ) : (
          <div className="dp-hero-pad" />
        )}
      </div>

      {/* S2 포인트 */}
      {pointItems.length > 0 && (
        <section className="dp-sec">
          <div className="dp-label">POINT</div>
          <h2>
            <RichText text={points.title} />
          </h2>
          {has(points.lead) && (
            <p className="dp-lead">
              <RichText text={points.lead} />
            </p>
          )}
          <div className="dp-points">
            {pointItems.map((p, i) => (
              <div key={i} className={p.photo_url ? 'dp-point dp-point-photo' : 'dp-point'}>
                {/* 사진이 있으면 사진 카드 — 사진 위, 번호·글 아래 */}
                {p.photo_url && (
                  <div className="dp-point-img">
                    <img src={fileUrl(p.photo_url)} alt="" />
                  </div>
                )}
                <div className="dp-point-row">
                  <div className="dp-num">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <h3>
                      <RichText text={p.title} />
                    </h3>
                    {has(p.desc) && (
                      <p>
                        <RichText text={p.desc} />
                      </p>
                    )}
                  </div>
                  {has(p.big) && (
                    <div className="dp-big">
                      <RichText text={p.big} />
                      {has(p.big_unit) && (
                        <small>
                          <RichText text={p.big_unit} />
                        </small>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* S3 맛 선택 */}
      {(flavorItems.length > 0 || galleryItems.length > 0) && (
        <section className="dp-sec dp-s3">
          <div className="dp-label">FLAVOR</div>
          <h2>
            <RichText text={flavors.title} />
          </h2>
          {has(flavors.lead) && (
            <p className="dp-lead">
              <RichText text={flavors.lead} />
            </p>
          )}
          <div className="dp-flavors">
            {flavorItems.map((f, i) => (
              <div key={i} className={f.photo_url ? 'dp-flavor' : 'dp-flavor dp-flavor-text'}>
                {/* 사진 없는 맛은 글만 있는 카드 — 고객 이미지에 '사진 없음' 을 절대 넣지 않는다 (DESIGN §4.7) */}
                {f.photo_url && (
                  <div className="dp-ph">
                    <img src={fileUrl(f.photo_url)} alt="" />
                  </div>
                )}
                <div className="dp-tx">
                  <div className="dp-opt">옵션 {i + 1}</div>
                  <h3>
                    <RichText text={f.name} />
                  </h3>
                  {has(f.name_cn) && <div className="dp-cn">{f.name_cn}</div>}
                  {has(f.desc) && (
                    <p>
                      <RichText text={f.desc} />
                    </p>
                  )}
                  {(f.chips || []).filter(has).length > 0 && (
                    <div className="dp-chips">
                      {f.chips.filter(has).map((c, j) => (
                        <span key={j} className="dp-chip">
                          <RichText text={c} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {galleryItems.length > 0 && (
            <div className="dp-gallery">
              {has(gallery.title) && (
                <h3 className="dp-gallery-title">
                  <RichText text={gallery.title} />
                </h3>
              )}
              <div className={galleryItems.length === 1 ? 'dp-gal dp-gal-1' : 'dp-gal'}>
                {galleryItems.map((g, i) => (
                  <figure key={i} className="dp-gal-item">
                    <div className="dp-gal-img">
                      <img src={fileUrl(g.photo_url)} alt="" />
                    </div>
                    {has(g.caption) && (
                      <figcaption>
                        <RichText text={g.caption} />
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          )}
          {notes.length > 0 && (
            <p className="dp-note">
              {notes.map((n, i) => (
                <span key={i}>
                  {i > 0 && <br />}※ <RichText text={n} />
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      {/* S4 제품 정보 */}
      {(rows.length > 0 || nutrition.length > 0 || has(info.label_photo_url)) && (
        <section className="dp-sec">
          <div className="dp-label">INFO</div>
          <h2>
            <RichText text={info.title} />
          </h2>
          {has(info.label_photo_url) && (
            <figure className="dp-label-photo">
              <span className="dp-label-tag">현지 라벨 원본</span>
              <div className="dp-label-img">
                <img src={fileUrl(info.label_photo_url)} alt="" />
              </div>
              {has(info.label_caption) && (
                <figcaption>
                  <RichText text={info.label_caption} />
                </figcaption>
              )}
            </figure>
          )}
          {rows.length > 0 && (
            <table className="dp-info">
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <th>
                      <RichText text={r.label} />
                    </th>
                    <td>
                      <RichText text={r.value} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {nutrition.length > 0 && (
            <div className="dp-nutri">
              {nutrition.map((n, i) => (
                <div key={i}>
                  <b>
                    <RichText text={n.value} />
                  </b>
                  <span>
                    <RichText text={n.label} />
                  </span>
                </div>
              ))}
            </div>
          )}
          {has(info.note) && (
            <p className="dp-note">
              ※ <RichText text={info.note} />
            </p>
          )}
        </section>
      )}

      {/* S5 마시는 법 · 보관 */}
      {howItems.length > 0 && (
        <section className="dp-sec dp-s5">
          <div className="dp-label">HOW TO</div>
          <h2>
            <RichText text={howto.title} />
          </h2>
          <div className="dp-how">
            {howItems.map((h, i) => (
              <div key={i} className="dp-card">
                <div className="dp-ico">
                  <HowIcon name={h.icon} />
                </div>
                <h3>
                  <RichText text={h.title} />
                </h3>
                {has(h.desc) && (
                  <p>
                    <RichText text={h.desc} />
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* S6 해외구매대행 안내 (공통) */}
      <div className="dp-s6">
        <div className="dp-label">NOTICE</div>
        <h2>
          <RichText text={common?.notice_title} />
        </h2>
        {notice.length > 0 && (
          <ul>
            {notice.map((n, i) => (
              <li key={i}>
                <b>
                  <RichText text={n.title} />
                </b>
                <span>
                  <RichText text={n.body} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="dp-foot">
        <RegNo common={common || {}} />
        {has(common?.seller) && ` · ${common.seller}`}
      </div>
    </div>
  )
})

export default DetailTemplate
