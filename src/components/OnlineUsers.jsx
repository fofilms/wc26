import s from './OnlineUsers.module.css'

export default function OnlineUsers({ users, currentUser }) {
  if (!users || users.length === 0) return null

  return (
    <div className={s.wrap}>
      <span className={s.dot} />
      <span className={s.count}>{users.length} online</span>
      <span className={s.names}>
        {users.map((u, i) => (
          <span key={u} className={u === currentUser ? s.me : s.name}>
            {u === currentUser ? 'you' : u}{i < users.length - 1 ? ', ' : ''}
          </span>
        ))}
      </span>
    </div>
  )
}
