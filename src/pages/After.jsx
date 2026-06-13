import { useState } from 'react'
import { STAGE_NAMES, KO_ORDER, MD_LABELS } from '../lib/constants'
import { scoreMatch } from '../lib/scoring'
import { fmtDate } from '../lib/dates'
import fixtures from '../data/fixtures.json'
import s from './After.module.css'

const flag = (t) => fixtures.flags[t] || ''

// Only show predictions for matches that have an official result
export default function After({ results, allPreds, currentUser, isSpectator }) {
  const [view, setView] = useState('group')
  const [md, setMd] = useState(1)
  const [ko, setKo] = useState('r32')
  const [selected, setSelected] = useState(null) // matchId

  // Debug: log what we have
  // console.log('results keys:', Object.keys(results).slice(0,5), 'allPreds users:', Object.keys(allPreds).length)

  const matches = view === 'group'
    ? fixtures.groupMatches.filter(m => m.matchday === md)
    : fixtures.knockout.filter(m => m.stage === ko)

  // spectators see all matches; others only see matches with official result
  const played = isSpectator ? matches : matches.filter(m => results[m.id]?.h != null)

  return (
    <div className={s.wrap}>
      <div className={s.intro}>
        <h2>After the Match</h2>
        <p>Predictions are revealed once an official result is entered. Click a match to see everyone's pick.</p>
      </div>

      <div className={s.seg}>
        <button className={view === 'group' ? s.active : ''} onClick={() => { setView('group'); setSelected(null) }}>Group Stage</button>
        <button className={view === 'ko' ? s.active : ''} onClick={() => { setView('ko'); setSelected(null) }}>Knockout</button>
      </div>

      <div className={s.chips}>
        {view === 'group'
          ? [1,2,3].map(n => (
              <button key={n} className={`${s.chip} ${md===n?s.chipActive:''}`}
                onClick={() => { setMd(n); setSelected(null) }}>{MD_LABELS[n]}</button>
            ))
          : KO_ORDER.map(st => (
              <button key={st} className={`${s.chip} ${ko===st?s.chipActive:''}`}
                onClick={() => { setKo(st); setSelected(null) }}>{STAGE_NAMES[st]}</button>
            ))
        }
      </div>

      {played.length === 0 ? (
        <div className={s.empty}>{isSpectator ? 'No matches in this stage.' : 'No results entered yet for this stage.'}</div>
      ) : (
        <div className={s.cols}>
          {/* Left: match list */}
          <div className={s.matchList}>
            {played.map(m => {
              const r = results[m.id]
              const isSelected = selected === m.id
              return (
                <div
                  key={m.id}
                  className={`${s.matchItem} ${isSelected ? s.matchSelected : ''}`}
                  onClick={() => setSelected(isSelected ? null : m.id)}
                >
                  <div className={s.matchDate}>{fmtDate(m.date)}</div>
                  <div className={s.matchTeams}>
                    <span>{flag(m.home)} {m.home}</span>
                    <span className={s.matchScore}>{r ? `${r.h}–${r.a}` : '?–?'}</span>
                    <span>{m.away} {flag(m.away)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right: predictions panel */}
          <div className={s.predsPanel}>
            {selected ? (
              <PredsPanel matchId={selected} results={results} allPreds={allPreds} currentUser={currentUser} isSpectator={isSpectator} />
            ) : (
              <div className={s.panelEmpty}>← Select a match to see predictions</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PredsPanel({ matchId, results, allPreds, currentUser, isSpectator }) {
  const m = [...fixtures.groupMatches, ...fixtures.knockout].find(x => x.id === matchId)
  if (!m) return null
  const r = results[matchId]

  // collect all user predictions for this match
  const entries = Object.entries(allPreds)
    .map(([username, preds]) => ({ username, pred: preds[matchId] }))
    .filter(e => e.pred?.h != null)
    .sort((a, b) => {
      const sa = scoreMatch(m, a.pred, r) ?? -1
      const sb = scoreMatch(m, b.pred, r) ?? -1
      return sb - sa || a.username.localeCompare(b.username)
    })

  if (entries.length === 0) return (
    <div className={s.panelEmpty}>No predictions for this match.</div>
  )

  return (
    <div className={s.panel}>
      <div className={s.panelTitle}>
        {flag(m.home)} {m.home} vs {m.away} {flag(m.away)}
        {r ? <span className={s.panelResult}>Result: {r.h}–{r.a}{r.adv ? ` · ${r.adv} advances` : ''}</span> : isSpectator ? <span className={s.panelResult}>Result not yet entered</span> : null}
      </div>
      <div className={s.predList}>
        {entries.map(({ username, pred }) => {
          const pts = r ? scoreMatch(m, pred, r) : null
          const isMe = username === currentUser
          return (
            <div key={username} className={`${s.predRow} ${isMe ? s.predMe : ''}`}>
              <span className={s.predUser}>{username}{isMe ? ' (you)' : ''}</span>
              <span className={s.predScore}>{pred.h}–{pred.a}{m.knockout && pred.h === pred.a && pred.adv ? ` · ${pred.adv}` : ''}</span>
              <span className={`${s.predPts} ${pts === 0 ? s.pts0 : pts === 1 ? s.pts1 : pts >= 2 ? s.pts2 : ''}`}>
                {pts != null ? `+${pts}` : '–'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
