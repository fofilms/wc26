import { useState, useEffect } from 'react'
import { sb } from '../supabaseClient'
import s from './Page.module.css'
import u from './Users.module.css'

const SUPERADMIN = 'cevik'



export default function Users({ currentUser, userLocks, onToggleUserLock, onToggleSpectator }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState('')

  const canSeePasswords = currentUser?.toLowerCase() === SUPERADMIN
  const canDelete = currentUser?.toLowerCase() === SUPERADMIN

  const [predCounts, setPredCounts] = useState({})
  const [spectators, setSpectators] = useState({})

  const load = async () => {
    setLoading(true)
    const usersRes = await sb.from('wc26_users').select('*').order('created_at')
    setUsers(usersRes.data || [])
    const specMap = {}
    ;(usersRes.data || []).forEach(r => { specMap[r.username] = r.is_spectator ?? false })
    setSpectators(specMap)

    // Paginate predictions query (Supabase caps at 1000 rows per request)
    const pageSize = 1000
    let from = 0
    let allPreds = []
    while (true) {
      const { data, error } = await sb.from('wc26_predictions').select('username, match_id').range(from, from + pageSize - 1)
      if (error || !data) break
      allPreds = allPreds.concat(data)
      if (data.length < pageSize) break
      from += pageSize
    }

    const counts = {}
    allPreds.forEach(r => {
      if (r.match_id && !r.match_id.startsWith('G')) {
        counts[r.username] = (counts[r.username] || 0) + 1
      }
    })
    setPredCounts(counts)
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

  const handleToggleSpectator = async (username) => {
    const current = spectators[username] ?? false
    await onToggleSpectator(username, current)
    setSpectators(prev => ({ ...prev, [username]: !current }))
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
