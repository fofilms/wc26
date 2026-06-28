import { useState } from 'react'
import { sb } from '../supabaseClient'
import s from './Login.module.css'

export default function Login({ onLogin }) {
  const [name, setName] = useState('')
  const [pass, setPass] = useState('')
  const [step, setStep] = useState('name') // 'name' | 'password' | 'newpass'
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingUser, setExistingUser] = useState(null)

  const checkName = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) { setErr('Enter at least 2 characters.'); return }
    if (/[:\/\\'"]/.test(trimmed)) { setErr('Name cannot contain : / \\ \' "'); return }
    setLoading(true); setErr('')
    const { data } = await sb.from('wc26_users').select('username,password').ilike('username', trimmed).single()
    setLoading(false)
    if (data) {
      setName(data.username) // use exact casing from DB
      setExistingUser(data)
      setStep('password')
    } else {
      setStep('newpass')
    }
  }

  const submitPassword = async () => {
    if (pass.length < 3) { setErr('Password must be at least 3 characters.'); return }
    setLoading(true); setErr('')
    if (step === 'newpass') {
      // first time — save password
      await sb.from('wc26_users').insert({ username: name.trim(), password: pass })
      try { localStorage.setItem('wc26user', name.trim()) } catch {}
      onLogin(name.trim())
    } else {
      // returning user — check password
      if (pass === existingUser.password) {
        try { localStorage.setItem('wc26user', name.trim()) } catch {}
        onLogin(name.trim())
      } else {
        setLoading(false)
        setErr('Wrong password. If you cannot log in, please contact Mati.')
      }
    }
  }

  return (
    <div className={s.screen}>
      <div className={s.logo}>
        <img src="/emblem.jpg" alt="FIFA World Cup 26" />
      </div>

      {step === 'name' && (
        <>
          <div className={s.inputWrap}>
            <input
              type="text" placeholder="Your name" maxLength={24}
              autoComplete="off" autoFocus
              value={name}
              onChange={e => { setName(e.target.value); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && checkName()}
            />
            <button onClick={checkName} disabled={loading}>{loading ? '…' : '→'}</button>
          </div>
          {err && <div className={s.err}>{err}</div>}
        </>
      )}

      {(step === 'password' || step === 'newpass') && (
        <>
          <div className={s.nameTag}>{name.trim()}</div>
          <div className={s.inputWrap}>
            <input
              type="password"
              placeholder={step === 'newpass' ? 'Choose a password' : 'Enter your password'}
              autoComplete="off" autoFocus
              value={pass}
              onChange={e => { setPass(e.target.value); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && submitPassword()}
            />
            <button onClick={submitPassword} disabled={loading}>{loading ? '…' : '→'}</button>
          </div>
          {step === 'newpass' && <div className={s.hint}>First time here — set a password to secure your predictions.</div>}
          {err && <div className={s.err}>{err}</div>}
          <button className={s.back} onClick={() => { setStep('name'); setPass(''); setErr('') }}>← Back</button>
        </>
      )}
    </div>
  )
}
