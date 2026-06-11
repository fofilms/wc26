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
      <div className={s.logo}>
        <img src="/emblem.jpg" alt="FIFA World Cup 26" />
      </div>
      <div className={s.inputWrap}>
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
        <button onClick={go} disabled={loading}>
          {loading ? '…' : '→'}
        </button>
      </div>
      {err && <div className={s.err}>{err}</div>}
    </div>
  )
}
