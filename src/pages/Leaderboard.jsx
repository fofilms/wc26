import s from './Page.module.css'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ leaderboard, user, onRefresh }) {
  return (
    <div>
      <div className={s.intro}>
        <h2>Leaderboard</h2>
        <p>Public · updates live as results are entered.</p>
      </div>
      <button className={s.refreshBtn} onClick={onRefresh}>↻ Refresh</button>
      {leaderboard.length === 0 ? (
        <div className={s.empty}><div className={s.big}>🏆</div>No players yet.</div>
      ) : (
        leaderboard.map((u, i) => (
          <div key={u.name} className={`${s.lbRow} ${u.name === user ? s.lbMe : ''}`}>
            <div className={s.rank}>{i < 3 ? MEDALS[i] : i + 1}</div>
            <div className={s.lbName}>
              {u.name}
              {u.name === user && <span className={s.lbTag}>YOU</span>}
            </div>
            <div className={s.lbStat}>
              <div className={s.lbPts}>{u.total}<span> pts</span></div>
              <div className={s.lbSub}>{u.count || 0} scored · group {u.group || 0} · ko {u.ko || 0}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
