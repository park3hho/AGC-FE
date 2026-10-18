import { useNavigate } from 'react-router-dom'

import ListItem from '@/components/common/ListItem'
import { MENU } from '@/constants/menuConst'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <main className="page-flat">
      <h1>무엇을 해볼까요?</h1>
      <div>
        {MENU.map((m) => (
          <ListItem
            key={m.key}
            title={m.label}
            sub={m.desc}
            right={m.ready ? '›' : '준비 중'}
            disabled={!m.ready}
            onClick={() => navigate(m.path)}
          />
        ))}
      </div>
    </main>
  )
}
