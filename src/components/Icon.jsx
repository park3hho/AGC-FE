// 아이콘 패키지 없이 쓰는 인라인 SVG (24px 그리드, 선 아이콘)
const PATHS = {
  search: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M21 21l-6-6" />
    </>
  ),
}

export default function Icon({
  name, // string: PATHS 키
  size = 22, // number?: 픽셀 크기
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
