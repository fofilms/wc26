import s from './Header.module.css'

const TABS = [
  { id: 'predict', label: 'Predictions' },
  { id: 'standings', label: 'Standings' },
  { id: 'leaderboard', label: 'Leaderboard' },
]

export default function Header({ user, isAdmin, activeTab, onTab, onLogout }) {
  const tabs = isAdmin ? [...TABS, { id: 'results', label: 'Enter Results' }] : TABS

  return (
    <header className={s.header}>
      <div className={s.inner}>
        <div className={s.crest}>⚽️</div>
        <div className={s.title}>
          <h1>WC26 Prediction League</h1>
          <p>FOL Films · 2026 FIFA World Cup</p>
        </div>
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
            className={activeTab === t.id ? s.active : ''}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
