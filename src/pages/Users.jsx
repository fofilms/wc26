import { useState, useEffect } from 'react'
import { sb } from '../supabaseClient'
import s from './Page.module.css'
import u from './Users.module.css'

export default function Users({ currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // { username, password }
  const [toast, setToast] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await sb.from('wc26_users').select('*').order('created_at')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editing) return
    if (editing.password.length < 3) { setToast('Password too short.'); return }
    await sb.from('wc26_users').upsert(
      { username: editing.username, password: editing.password, updated_at: new Date().toISOString() },
      { onConflict: 'username' }
    )
    setEditing(null)
    setToast('Saved ✓')
    load()
    setTimeout(() => setToast(''), 2000)
  }

  const rename = async () => {
    if (!editing) return
    const trimmed = editing.newUsername?.trim()
    if (!trimmed || trimmed.length < 2) { setToast('Name too short.'); return }
    // insert new, delete old
    await sb.from('wc26_users').insert({ username: trimmed, password: editing.password })
    await sb.from('wc26_users').delete().eq('username', editing.username)
    setEditing(null)
    setToast('Renamed ✓')
    load()
    setTimeout(() => setToast(''), 2000)
  }

  if (loading) return <div className={s.empty}><div className={s.big}>👤</div>Loading…</div>

  return (
    <div>
      <div className={s.intro}>
        <h2>Users</h2>
        <p>All registered players. You can edit usernames and passwords.</p>
      </div>

      {toast && <div className={u.toast}>{toast}</div>}

      <div className={u.list}>
        {users.map(usr => (
          <div key={usr.username} className={u.row}>
            {editing?.username === usr.username ? (
              <div className={u.editBlock}>
                <div className={u.editRow}>
                  <label>Username</label>
                  <input
                    type="text"
                    value={editing.newUsername ?? editing.username}
                    onChange={e => setEditing(prev => ({ ...prev, newUsername: e.target.value }))}
                  />
                </div>
                <div className={u.editRow}>
                  <label>Password</label>
                  <input
                    type="text"
                    value={editing.password}
                    onChange={e => setEditing(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div className={u.editActions}>
                  <button className={u.saveBtn} onClick={save}>Save password</button>
                  {editing.newUsername && editing.newUsername !== editing.username && (
                    <button className={u.renameBtn} onClick={rename}>Rename user</button>
                  )}
                  <button className={u.cancelBtn} onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className={u.userInfo}>
                  <span className={u.uname}>{usr.username}</span>
                  <span className={u.upw}>{'•'.repeat(Math.min(usr.password.length, 8))}</span>
                </div>
                <button className={u.editBtn} onClick={() => setEditing({ username: usr.username, password: usr.password })}>
                  Edit
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
