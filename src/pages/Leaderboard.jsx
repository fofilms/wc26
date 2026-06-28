import { useState } from 'react'
import s from './Page.module.css'
import ls from './Leaderboard.module.css'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard({ leaderboard, user, onRefresh }) {
  const [tab, setTab] = useState('ko')

  const sorted = [...leaderboard]
    .map(u => ({ ...u, pts: tab === 'ko' ? (u.ko || 0) : (u.group || 0) }))
    .sort((a, b) => b.pts - a.pts || b.count - a.count || a.name.localeCompare(b.name))

  return (
    <div>
      <div className={s.intro}>
        <h2>Leaderboard</h2>
        <p>Public · updates live as results are entered.</p>
      </div>

      <div className={s.potLine}>
        Pot: ~5300 MXN (300 USD) · to whoever finishes 1st
      </div>

      <div className={ls.seg}>
        <button className={tab === 'ko' ? ls.active : ''} onClick={() => setTab('ko')}>
          Knockout Stage
        </button>
        <button className={tab === 'group' ? ls.active : ''} onClick={() => setTab('group')}>
          Group Stage
        </button>
      </div>

      <button className={s.refreshBtn} onClick={onRefresh}>↻ Refresh</button>

      {sorted.length === 0 ? (
        <div className={s.empty}><div className={s.big}>🏆</div>No players yet.</div>
      ) : (
        sorted.map((u, i) => (
          <div key={u.name} className={`${s.lbRow} ${u.name === user ? s.lbMe : ''}`}>
            <div className={s.rank}>{i < 3 ? MEDALS[i] : i + 1}</div>
            <div className={s.lbName}>
              {u.name}
              {u.name === user && <span className={s.lbTag}>YOU</span>}
            </div>
            <div className={s.lbStat}>
              <div className={s.lbPts}>{u.pts}<span> pts</span></div>
              <div className={s.lbSub}>{u.predicted || 0} predicted · {u.winner || 0} correct · {u.exact || 0} exact</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
