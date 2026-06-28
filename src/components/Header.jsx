import s from './Header.module.css'

const TABS = [
  { id: 'predict', label: 'Predictions' },
  { id: 'standings', label: 'Group Standings', muted: true },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'after', label: 'After' },
  { id: 'stats', label: 'Stats' },
  { id: 'certificate', label: 'Certificate' },
]

export default function Header({ user, isAdmin, activeTab, onTab, onLogout }) {
  const tabs = isAdmin
    ? [...TABS, { id: 'results', label: 'Enter Results' }, { id: 'users', label: 'Users' }]
    : TABS

  return (
    <header className={s.header}>
      <div className={s.inner}>
        <div className={s.crest}>⚽️</div>
        <h1 className={s.title}>2026 FIFA World Cup</h1>
        <div className={s.whoami}>
          <b>{user}</b>
          <div className={s.meta}>
            {isAdmin && <span className={s.adm}>ADMIN</span>}
            <a onClick={onLogout}>logout</a>
          </div>
        </div>
      </div>
      <nav className={s.tabs}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={[activeTab === t.id ? s.active : '', t.muted ? s.muted : ''].filter(Boolean).join(' ')}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
