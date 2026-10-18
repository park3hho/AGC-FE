// 아이콘 패키지 없이 쓰는 인라인 SVG (24px 그리드, 선 아이콘)
const PATHS = {
  search: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M21 21l-6-6" />
    </>
  ),
  package: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </>
  ),
  yuan: <path d="M6 4l6 8 6-8M12 12v8M8 13h8M8 17h8" />,
  photo: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-9 9" />
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
