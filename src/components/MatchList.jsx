import { useState } from 'react'
import MatchRow from './MatchRow'
import { fmtDate } from '../lib/dates'
import { STAGE_NAMES_FULL, KO_ORDER, MD_LABELS } from '../lib/constants'
import fixtures from '../data/fixtures.json'
import s from './MatchList.module.css'

export default function MatchList({ mode, results, myPreds, isAdmin, onSavePred, onSaveResult, notice }) {
  const [view, setView] = useState('group')
  const [md, setMd] = useState(1)
  const [ko, setKo] = useState('r32')

  return (
    <div>
      <div className={s.seg}>
        <button className={view === 'group' ? s.active : ''} onClick={() => setView('group')}>Group Stage</button>
        <button className={view === 'ko' ? s.active : ''} onClick={() => setView('ko')}>Knockout</button>
      </div>

      {view === 'group' ? (
        <>
          <div className={s.chips}>
            {[1, 2, 3].map(n => (
              <button key={n} className={`${s.chip} ${md === n ? s.chipActive : ''}`} onClick={() => setMd(n)}>
                {MD_LABELS[n]}
              </button>
            ))}
          </div>
          <GroupMatches matchday={md} mode={mode} results={results} myPreds={myPreds} isAdmin={isAdmin} onSavePred={onSavePred} onSaveResult={onSaveResult} />
        </>
      ) : (
        <>
          <div className={s.chips}>
            {KO_ORDER.map(st => (
              <button key={st} className={`${s.chip} ${ko === st ? s.chipActive : ''}`} onClick={() => setKo(st)}>
                {STAGE_NAMES_FULL[st]}
              </button>
            ))}
          </div>
          {notice && <div className={s.notice}>{notice}</div>}
          <KoMatches stage={ko} mode={mode} results={results} myPreds={myPreds} isAdmin={isAdmin} onSavePred={onSavePred} onSaveResult={onSaveResult} />
        </>
      )}
    </div>
  )
}

function GroupMatches({ matchday, mode, results, myPreds, isAdmin, onSavePred, onSaveResult }) {
  const ms = fixtures.groupMatches.filter(m => m.matchday === matchday)

  // group by date
  const byDay = {}
  ms.forEach(m => {
    if (!byDay[m.date]) byDay[m.date] = []
    byDay[m.date].push(m)
  })

  return Object.entries(byDay).map(([date, matches]) => (
    <div key={date}>
      <div className={s.dayDiv}>{fmtDate(date)}</div>
      <div className={s.grid}>
        {matches.map(m => (
          <MatchRow
            key={m.id}
            match={m} mode={mode} isAdmin={isAdmin}
            pred={myPreds[m.id]} result={results[m.id]}
            onSavePred={onSavePred} onSaveResult={onSaveResult}
          />
        ))}
      </div>
    </div>
  ))
}

function KoMatches({ stage, mode, results, myPreds, isAdmin, onSavePred, onSaveResult }) {
  const ms = fixtures.knockout.filter(m => m.stage === stage)

  const byDay = {}
  ms.forEach(m => {
    if (!byDay[m.date]) byDay[m.date] = []
    byDay[m.date].push(m)
  })

  return Object.entries(byDay).map(([date, matches]) => (
    <div key={date}>
      <div className={s.dayDiv}>{fmtDate(date)}</div>
      <div className={s.grid}>
        {matches.map(m => (
          <MatchRow
            key={m.id}
            match={m} mode={mode} isAdmin={isAdmin}
            pred={myPreds[m.id]} result={results[m.id]}
            onSavePred={onSavePred} onSaveResult={onSaveResult}
          />
        ))}
      </div>
    </div>
  ))
}
