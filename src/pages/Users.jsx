import { useState, useEffect } from 'react'
import { sb } from '../supabaseClient'
import s from './Page.module.css'
import u from './Users.module.css'

const SUPERADMIN = 'cevik'

function PredCount({ username, allPreds }) {
  const preds = allPreds?.[username] || {}
  const count = Object.keys(preds).filter(id => id.startsWith('G')).length
  if (count === 0) return null
  return (
    <span style={{
      fontSize: '9px', fontWeight: 700,
      padding: '1px 6px', borderRadius: '4px',
      background: count === 24 ? 'rgba(61,220,132,.15)' : 'rgba(0,0,0,.05)',
      color: count === 24 ? 'var(--good)' : 'var(--muted)',
      border: count === 24 ? '1px solid rgba(61,220,132,.3)' : '1px solid transparent',
    }}>
      {count}/24
    </span>
  )
}

export default function Users({ currentUser, userLocks, onToggleUserLock, allPreds }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState('')

  const canSeePasswords = currentUser?.toLowerCase() === SUPERADMIN
  const canDelete = currentUser?.toLowerCase() === SUPERADMIN

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
    setEditing(null); setToast('Saved ✓'); load()
    setTimeout(() => setToast(''), 2000)
  }

  const rename = async () => {
    if (!editing) return
    const trimmed = editing.newUsername?.trim()
    if (!trimmed || trimmed.length < 2) { setToast('Name too short.'); return }
    await sb.from('wc26_users').insert({ username: trimmed, password: editing.password })
    await sb.from('wc26_users').delete().eq('username', editing.username)
    setEditing(null); setToast('Renamed ✓'); load()
    setTimeout(() => setToast(''), 2000)
  }

  const deleteUser = async (username) => {
    await Promise.all([
      sb.from('wc26_users').delete().eq('username', username),
      sb.from('wc26_predictions').delete().eq('username', username),
    ])
    setConfirmDelete(null); setToast(`${username} deleted.`); load()
    setTimeout(() => setToast(''), 2000)
  }

  if (loading) return <div className={s.empty}><div className={s.big}>👤</div>Loading…</div>

  return (
    <div>
      <div className={s.intro}>
        <h2>Users</h2>
        <p>Manage players. Lock a user to prevent them from editing predictions.</p>
      </div>

      {toast && <div className={u.toast}>{toast}</div>}

      <div className={u.list}>
        {users.map(usr => {
          const isLocked = userLocks?.[usr.username] ?? false
          return (
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
                  {canSeePasswords && (
                    <div className={u.editRow}>
                      <label>Password</label>
                      <input
                        type="text"
                        value={editing.password}
                        onChange={e => setEditing(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className={u.editActions}>
                    <button className={u.saveBtn} onClick={save}>Save</button>
                    {editing.newUsername && editing.newUsername !== editing.username && (
                      <button className={u.renameBtn} onClick={rename}>Rename</button>
                    )}
                    <button className={u.cancelBtn} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : confirmDelete === usr.username ? (
                <div className={u.editBlock}>
                  <div className={u.confirmText}>Delete <b>{usr.username}</b>? This cannot be undone.</div>
                  <div className={u.editActions}>
                    <button className={u.deleteConfirmBtn} onClick={() => deleteUser(usr.username)}>Yes, delete</button>
                    <button className={u.cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={u.userInfo}>
                    <span className={u.uname}>{usr.username}</span>
                    {isLocked && <span className={u.lockTag}>🔒 locked</span>}
                    {canSeePasswords && (
                      <span className={u.upw}>{'•'.repeat(Math.min(usr.password.length, 8))}</span>
                    )}
                  </div>
                  <div className={u.actions}>
                    <button
                      className={isLocked ? u.unlockBtn : u.lockBtn2}
                      onClick={() => onToggleUserLock(usr.username)}
                    >
                      {isLocked ? 'Unlock' : 'Lock'}
                    </button>
                    <button className={u.editBtn} onClick={() => setEditing({ username: usr.username, password: usr.password })}>
                      Edit
                    </button>
                    {canDelete && usr.username.toLowerCase() !== SUPERADMIN && (
                      <button className={u.deleteBtn} onClick={() => setConfirmDelete(usr.username)}>
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
