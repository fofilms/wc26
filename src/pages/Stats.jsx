import { useState, useEffect, useRef } from 'react'
import { fmtDate } from '../lib/dates'
import { STAGE_NAMES, KO_ORDER, MD_LABELS } from '../lib/constants'
import fixtures from '../data/fixtures.json'
import s from './Stats.module.css'

const flag = (t) => fixtures.flags[t] || ''

function computeMatchStats(matchId, allPreds, results) {
  const entries = Object.entries(allPreds)
    .map(([username, preds]) => ({ username, pred: preds[matchId] }))
    .filter(e => e.pred?.h != null)

  if (!entries.length) return null

  const total = entries.length
  const homeWins = entries.filter(e => e.pred.h > e.pred.a)
  const awayWins = entries.filter(e => e.pred.a > e.pred.h)
  const draws    = entries.filter(e => e.pred.h === e.pred.a)

  // score frequency
  const scoreMap = {}
  entries.forEach(e => {
    const key = `${e.pred.h}-${e.pred.a}`
    if (!scoreMap[key]) scoreMap[key] = []
    scoreMap[key].push(e.username)
  })
  const scores = Object.entries(scoreMap)
    .map(([score, users]) => ({ score, count: users.length, users }))
    .sort((a, b) => b.count - a.count)

  return {
    total,
    homeWins: homeWins.length,
    awayWins: awayWins.length,
    draws: draws.length,
    scores,
    result: results[matchId],
  }
}

function OutcomeBar({ homeWins, awayWins, draws, total, home, away }) {
  const hp = Math.round(homeWins / total * 100)
  const dp = Math.round(draws / total * 100)
  const ap = 100 - hp - dp
  return (
    <div className={s.outcomeWrap}>
      <div className={s.outcomeLabels}>
        <span>{flag(home)} {home}</span>
        <span>Draw</span>
        <span>{away} {flag(away)}</span>
      </div>
      <div className={s.bar}>
        {hp > 0 && <div className={s.barHome} style={{ width: hp + '%' }}>{hp}%</div>}
        {dp > 0 && <div className={s.barDraw} style={{ width: dp + '%' }}>{dp}%</div>}
        {ap > 0 && <div className={s.barAway} style={{ width: ap + '%' }}>{ap}%</div>}
      </div>
      <div className={s.outcomeNums}>
        <span>{homeWins} players</span>
        <span>{draws} players</span>
        <span>{awayWins} players</span>
      </div>
    </div>
  )
}

function ScoreGrid({ scores, total }) {
  const top = scores.slice(0, 3)
  const rest = scores.slice(3)
  return (
    <div className={s.scoreSection}>
      <div className={s.topScores}>
        {top.map((s2, i) => (
          <div key={s2.score} className={`${s.scoreCard} ${i === 0 ? s.scoreTop : ''}`}>
            <div className={s.scoreVal}>{s2.score}</div>
            <div className={s.scoreCount}>{s2.count} player{s2.count !== 1 ? 's' : ''} · {Math.round(s2.count / total * 100)}%</div>
            <div className={s.scoreUsers}>{s2.users.join(', ')}</div>
          </div>
        ))}
      </div>
      {rest.length > 0 && (
        <div className={s.rareScores}>
          <div className={s.rareTitle}>Rare picks (1 player each)</div>
          <div className={s.rareGrid}>
            {rest.map(s2 => (
              <div key={s2.score} className={s.rareItem}>
                <span className={s.rareScore}>{s2.score}</span>
                <span className={s.rareUser}>{s2.users[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MatchStats({ match: m, allPreds, results }) {
  const stats = computeMatchStats(m.id, allPreds, results)

  return (
    <div className={s.matchCard}>
      <div className={s.matchHead}>
        <div className={s.matchMeta}>
          <span className={s.matchBadge}>{m.group ? `Grp ${m.group}` : STAGE_NAMES[m.stage]}</span>
          <span className={s.matchDate}>{fmtDate(m.date)} · {m.localTime} {m.localTz}</span>
        </div>
        <div className={s.matchTeams}>
          <span className={s.teamName}>{flag(m.home)} {m.home}</span>
          <span className={s.vs}>vs</span>
          <span className={s.teamName}>{m.away} {flag(m.away)}</span>
        </div>
        {results[m.id]?.h != null && (
          <div className={s.officialResult}>
            Result: {results[m.id].h}–{results[m.id].a}
          </div>
        )}
      </div>

      {!stats ? (
        <div className={s.noPreds}>No predictions yet</div>
      ) : (
        <div className={s.statsBody}>
          <div className={s.totalBadge}>{stats.total} predictions</div>
          <OutcomeBar
            homeWins={stats.homeWins} awayWins={stats.awayWins}
            draws={stats.draws} total={stats.total}
            home={m.home} away={m.away}
          />
          <ScoreGrid scores={stats.scores} total={stats.total} />
        </div>
      )}
    </div>
  )
}

export default function Stats({ allPreds, results }) {
  const [view, setView] = useState('group')
  const [md, setMd] = useState(1)
  const [ko, setKo] = useState('r32')

  const matches = view === 'group'
    ? fixtures.groupMatches.filter(m => m.matchday === md)
    : fixtures.knockout.filter(m => m.stage === ko)

  return (
    <div>
      <div className={s.intro}>
        <h2>Statistics</h2>
        <p>Prediction breakdown for every match — outcomes, score distribution, who picked what.</p>
      </div>

      <div className={s.seg}>
        <button className={view === 'group' ? s.active : ''} onClick={() => setView('group')}>Group Stage</button>
        <button className={view === 'ko' ? s.active : ''} onClick={() => setView('ko')}>Knockout</button>
      </div>

      <div className={s.chips}>
        {view === 'group'
          ? [1,2,3].map(n => (
              <button key={n} className={`${s.chip} ${md===n?s.chipActive:''}`} onClick={() => setMd(n)}>{MD_LABELS[n]}</button>
            ))
          : KO_ORDER.map(st => (
              <button key={st} className={`${s.chip} ${ko===st?s.chipActive:''}`} onClick={() => setKo(st)}>{STAGE_NAMES[st]}</button>
            ))
        }
      </div>

      {matches.filter(m => results[m.id]?.h != null).length === 0 ? (
        <div className={s.empty}>No results entered yet for this stage.</div>
      ) : (
        <div className={s.grid}>
          {matches.filter(m => results[m.id]?.h != null).map(m => (
            <MatchStats key={m.id} match={m} allPreds={allPreds} results={results} />
          ))}
        </div>
      )}
    </div>
  )
}
