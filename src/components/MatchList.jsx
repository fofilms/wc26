import { useState, useEffect } from 'react'
import MatchRow from './MatchRow'
import { fmtDate } from '../lib/dates'
import { STAGE_NAMES_FULL, KO_ORDER, MD_LABELS } from '../lib/constants'
import fixtures from '../data/fixtures.json'
import s from './MatchList.module.css'

// Deadlines in UTC:
// MD1: Jun 10 2026 23:59 UTC (fixed)
// MD2: Jun 18 2026 first match is 12:00 ET = 16:00 UTC → deadline 15:00 UTC (1hr before)
// MD3: Jun 24 2026 first match is 15:00 ET = 19:00 UTC → deadline 18:00 UTC (1hr before)
const DEADLINES = {
  1: new Date('2026-06-10T23:59:00Z'),
  2: new Date('2026-06-18T15:00:00Z'),
  3: new Date('2026-06-24T18:00:00Z'),
}

function useCountdown(deadline) {
  const [remaining, setRemaining] = useState(null)
  useEffect(() => {
    const tick = () => {
      const diff = deadline - Date.now()
      setRemaining(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])
  return remaining
}

function DeadlineBanner({ matchday, isAdmin, locks, onToggleLock }) {
  const lockKey = `md_${matchday}`
  const locked = locks?.[lockKey] ?? false
  const deadline = DEADLINES[matchday]
  const remaining = useCountdown(deadline)

  // Auto-lock when deadline passes (only trigger once)
  useEffect(() => {
    if (remaining !== null && remaining <= 0 && !locked && !isAdmin) {
      // deadline passed — UI treats as locked even without admin action
    }
  }, [remaining, locked, isAdmin])

  const deadlinePassed = remaining !== null && remaining <= 0

  const formatCountdown = (ms) => {
    if (ms <= 0) return null
    const totalSec = Math.floor(ms / 1000)
    const days = Math.floor(totalSec / 86400)
    const hrs = Math.floor((totalSec % 86400) / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    if (days > 0) return `${days}d ${hrs}h ${mins}m`
    return `${hrs}h ${mins}m ${secs}s`
  }

  // Admin explicit state wins; otherwise deadline auto-locks
  const hasExplicitState = locks && lockKey in locks
  const effectiveLocked = hasExplicitState ? locked : (deadlinePassed || locked)

  return (
    <div className={`${s.deadlineBanner} ${effectiveLocked ? s.deadlineLocked : ''}`}>
      <div className={s.deadlineLeft}>
        {effectiveLocked ? (
          <span>🔒 {deadlinePassed && !locked ? 'Deadline passed — predictions closed' : 'Predictions locked'}</span>
        ) : (
          <>
            <span>⏱ Deadline: {remaining !== null && formatCountdown(remaining)}</span>
            {matchday === 1 && <span className={s.deadlineDate}>Jun 10, 2026 · 23:59 UTC</span>}
            {matchday === 2 && <span className={s.deadlineDate}>Jun 18 · 1hr before first kick-off</span>}
            {matchday === 3 && <span className={s.deadlineDate}>Jun 24 · 1hr before first kick-off</span>}
          </>
        )}
      </div>
      {isAdmin && (
        <button className={s.lockBtn} onClick={() => onToggleLock(lockKey)}>
          {locked ? 'Unlock' : 'Lock'}
        </button>
      )}
    </div>
  )
}

function KoLockBar({ stage, isAdmin, locks, onToggleLock }) {
  const lockKey = `ko_${stage}`
  const locked = locks?.[lockKey] ?? false
  if (!isAdmin && !locked) return null
  return (
    <div className={`${s.deadlineBanner} ${locked ? s.deadlineLocked : ''}`}>
      <span>{locked ? '🔒 Predictions locked' : '🔓 Predictions open'}</span>
      {isAdmin && (
        <button className={s.lockBtn} onClick={() => onToggleLock(lockKey)}>
          {locked ? 'Unlock' : 'Lock'}
        </button>
      )}
    </div>
  )
}

export default function MatchList({ mode, results, myPreds, isAdmin, locks, isUserLocked, currentUser, onSavePred, onSaveResult, onToggleLock }) {
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
          {mode === 'predict' && (
            <DeadlineBanner matchday={md} isAdmin={isAdmin} locks={locks} onToggleLock={onToggleLock} />
          )}
          {mode === 'result' && isAdmin && (
            <DeadlineBanner matchday={md} isAdmin={isAdmin} locks={locks} onToggleLock={onToggleLock} />
          )}
          <GroupMatches matchday={md} mode={mode} results={results} myPreds={myPreds}
            isAdmin={isAdmin} locks={locks} isUserLocked={isUserLocked} currentUser={currentUser} onSavePred={onSavePred} onSaveResult={onSaveResult} />
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
          <KoLockBar stage={ko} isAdmin={isAdmin} locks={locks} onToggleLock={onToggleLock} />
          <KoMatches stage={ko} mode={mode} results={results} myPreds={myPreds}
            isAdmin={isAdmin} locks={locks} currentUser={currentUser} onSavePred={onSavePred} onSaveResult={onSaveResult} />
        </>
      )}
    </div>
  )
}

function isEffectiveLocked(matchday, locks) {
  const lockKey = `md_${matchday}`
  // If admin has explicitly set lock state, always respect it (overrides deadline)
  if (locks && lockKey in locks) return locks[lockKey]
  // No explicit admin action yet — auto-lock when deadline passes
  const deadline = DEADLINES[matchday]
  return deadline ? Date.now() > deadline.getTime() : false
}

function GroupMatches({ matchday, mode, results, myPreds, isAdmin, locks, isUserLocked, currentUser, onSavePred, onSaveResult }) {
  const mdLocked = mode === 'predict' ? isEffectiveLocked(matchday, locks) : false
  const locked = mdLocked || (mode === 'predict' && matchday === 1 && !!isUserLocked)
  const ms = fixtures.groupMatches.filter(m => m.matchday === matchday)
  const byDay = {}
  ms.forEach(m => { if (!byDay[m.date]) byDay[m.date] = []; byDay[m.date].push(m) })

  return Object.entries(byDay).map(([date, matches]) => (
    <div key={date}>
      <div className={s.dayDiv}>{fmtDate(date)}</div>
      <div className={s.grid}>
        {matches.map(m => (
          <MatchRow key={m.id} match={m} mode={mode} isAdmin={isAdmin} locked={locked}
            currentUser={currentUser} pred={myPreds[m.id]} result={results[m.id]}
            onSavePred={onSavePred} onSaveResult={onSaveResult} />
        ))}
      </div>
    </div>
  ))
}

function KoMatches({ stage, mode, results, myPreds, isAdmin, locks, currentUser, onSavePred, onSaveResult }) {
  const lockKey = `ko_${stage}`
  const locked = mode === 'predict' ? (locks?.[lockKey] ?? false) : false
  const ms = fixtures.knockout.filter(m => m.stage === stage)
  const byDay = {}
  ms.forEach(m => { if (!byDay[m.date]) byDay[m.date] = []; byDay[m.date].push(m) })

  return Object.entries(byDay).map(([date, matches]) => (
    <div key={date}>
      <div className={s.dayDiv}>{fmtDate(date)}</div>
      <div className={s.grid}>
        {matches.map(m => (
          <MatchRow key={m.id} match={m} mode={mode} isAdmin={isAdmin} locked={locked}
            currentUser={currentUser} pred={myPreds[m.id]} result={results[m.id]}
            onSavePred={onSavePred} onSaveResult={onSaveResult} />
        ))}
      </div>
    </div>
  ))
}
