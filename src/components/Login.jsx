import { useState } from 'react'
import s from './Login.module.css'

export default function Login({ onLogin }) {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const go = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) { setErr('Enter at least 2 characters.'); return }
    if (/[:\/\\'"]/.test(trimmed)) { setErr('Name cannot contain : / \\ \' "'); return }
    setLoading(true)
    try { localStorage.setItem('wc26user', trimmed) } catch {}
    onLogin(trimmed)
  }

  return (
    <div className={s.screen}>
      <div className={s.card}>
        <div className={s.ball}>⚽️</div>
        <h2>WC26 Prediction League</h2>
        <p>2026 FIFA World Cup · 104 matches.<br />Enter your name, make predictions, compete on the public leaderboard.</p>
        <input
          type="text"
          placeholder="Your name"
          maxLength={24}
          autoComplete="off"
          autoFocus
          value={name}
          onChange={e => { setName(e.target.value); setErr('') }}
          onKeyDown={e => e.key === 'Enter' && go()}
        />
        <button className={s.btn} onClick={go} disabled={loading}>
          {loading ? <><span className="spinner" />Loading…</> : 'Join the League'}
        </button>
        {err && <div className={s.err}>{err}</div>}
      </div>
    </div>
  )
}
