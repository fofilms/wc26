import { useState } from 'react'
import MatchRow from './MatchRow'
import { fmtDate } from '../lib/dates'
import { STAGE_NAMES_FULL, KO_ORDER, MD_LABELS } from '../lib/constants'
import fixtures from '../data/fixtures.json'
import s from './MatchList.module.css'

export default function MatchList({ mode, results, myPreds, isAdmin, locks, onSavePred, onSaveResult, onToggleLock }) {
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
          <GroupMatches
            matchday={md} mode={mode} results={results} myPreds={myPreds}
            isAdmin={isAdmin} locks={locks}
            onSavePred={onSavePred} onSaveResult={onSaveResult} onToggleLock={onToggleLock}
          />
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
          <KoMatches
            stage={ko} mode={mode} results={results} myPreds={myPreds}
            isAdmin={isAdmin} locks={locks}
            onSavePred={onSavePred} onSaveResult={onSaveResult} onToggleLock={onToggleLock}
          />
        </>
      )}
    </div>
  )
}

function LockBar({ lockKey, isAdmin, locks, onToggleLock }) {
  const locked = locks?.[lockKey] ?? false
  if (!isAdmin && !locked) return null
  return (
    <div className={`${s.lockBar} ${locked ? s.lockBarLocked : ''}`}>
      <span>{locked ? '🔒 Predictions locked' : '🔓 Predictions open'}</span>
      {isAdmin && (
        <button className={s.lockBtn} onClick={() => onToggleLock(lockKey)}>
          {locked ? 'Unlock' : 'Lock'}
        </button>
      )}
    </div>
  )
}

function GroupMatches({ matchday, mode, results, myPreds, isAdmin, locks, onSavePred, onSaveResult, onToggleLock }) {
  const lockKey = `md_${matchday}`
  const locked = locks?.[lockKey] ?? false
  const ms = fixtures.groupMatches.filter(m => m.matchday === matchday)

  const byDay = {}
  ms.forEach(m => { if (!byDay[m.date]) byDay[m.date] = []; byDay[m.date].push(m) })

  return (
    <>
      <LockBar lockKey={lockKey} isAdmin={isAdmin} locks={locks} onToggleLock={onToggleLock} />
      {Object.entries(byDay).map(([date, matches]) => (
        <div key={date}>
          <div className={s.dayDiv}>{fmtDate(date)}</div>
          <div className={s.grid}>
            {matches.map(m => (
              <MatchRow
                key={m.id} match={m} mode={mode} isAdmin={isAdmin}
                locked={mode === 'predict' ? locked : false}
                pred={myPreds[m.id]} result={results[m.id]}
                onSavePred={onSavePred} onSaveResult={onSaveResult}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function KoMatches({ stage, mode, results, myPreds, isAdmin, locks, onSavePred, onSaveResult, onToggleLock }) {
  const lockKey = `ko_${stage}`
  const locked = locks?.[lockKey] ?? false
  const ms = fixtures.knockout.filter(m => m.stage === stage)

  const byDay = {}
  ms.forEach(m => { if (!byDay[m.date]) byDay[m.date] = []; byDay[m.date].push(m) })

  return (
    <>
      <LockBar lockKey={lockKey} isAdmin={isAdmin} locks={locks} onToggleLock={onToggleLock} />
      {Object.entries(byDay).map(([date, matches]) => (
        <div key={date}>
          <div className={s.dayDiv}>{fmtDate(date)}</div>
          <div className={s.grid}>
            {matches.map(m => (
              <MatchRow
                key={m.id} match={m} mode={mode} isAdmin={isAdmin}
                locked={mode === 'predict' ? locked : false}
                pred={myPreds[m.id]} result={results[m.id]}
                onSavePred={onSavePred} onSaveResult={onSaveResult}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
