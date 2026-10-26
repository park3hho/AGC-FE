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
  book: (
    <>
      <path d="M4 4.5A1.5 1.5 0 015.5 3H20v15H5.5A1.5 1.5 0 004 19.5v-15z" />
      <path d="M4 19.5A1.5 1.5 0 005.5 21H20M8 7h8M8 11h6" />
    </>
  ),
  yuan: <path d="M6 4l6 8 6-8M12 12v8M8 13h8M8 17h8" />,
  building: (
    <>
      <path d="M4 21V5l8-2v18M12 7l8 2v12M2 21h20" />
      <path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4a1 1 0 011-1h8l9 9-9 9-9-9z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 010 7M18 14c1.8.6 3 2.7 3 6" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  exchange: <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  store: (
    <path d="M4 9l1.5-5h13L20 9M4 9h16M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9M5 11v9h14v-9M10 20v-5h4v5" />
  ),
  home: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  layout: <path d="M4 4h16v16H4zM4 9h16M9 9v11" />,
  pen: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
  bag: <path d="M6 3L3 7v13a1 1 0 001 1h16a1 1 0 001-1V7l-3-4zM3 7h18M16 11a4 4 0 01-8 0" />,
  sections: (
    <>
      <rect x="3" y="3" width="18" height="7" rx="2" strokeDasharray="3 2" />
      <rect x="3" y="14" width="18" height="7" rx="2" strokeDasharray="3 2" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
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
