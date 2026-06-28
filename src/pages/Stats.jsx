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
        <span>{homeWins} players: {home} wins</span>
        <span>{draws} players: draw</span>
        <span>{awayWins} players: {away} wins</span>
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

function Trivia({ allPreds, results, view }) {
  const allMatches = view === "ko" ? fixtures.knockout : fixtures.groupMatches
  const playedMatches = allMatches.filter(m => results[m.id]?.h != null)

  // collect all predictions across all matches
  const allEntries = [] // {username, matchId, pred, match}
  allMatches.forEach(m => {
    Object.entries(allPreds).forEach(([username, preds]) => {
      if (preds[m.id]?.h != null) allEntries.push({ username, matchId: m.id, pred: preds[m.id], match: m })
    })
  })

  if (allEntries.length === 0) return null

  // 1. Most brave: rarest score pick (lowest count, only from played matches)
  let braveEntry = null
  let braveCount = Infinity
  playedMatches.forEach(m => {
    const scoreMap = {}
    Object.entries(allPreds).forEach(([username, preds]) => {
      if (preds[m.id]?.h == null) return
      const key = `${preds[m.id].h}-${preds[m.id].a}`
      if (!scoreMap[key]) scoreMap[key] = []
      scoreMap[key].push(username)
    })
    Object.entries(scoreMap).forEach(([score, users]) => {
      if (users.length < braveCount) {
        braveCount = users.length
        braveEntry = { match: m, score, users }
      }
    })
  })

  // 2. Most consensus: highest % agreeing on one score (played matches)
  let consensusEntry = null
  let consensusPct = 0
  playedMatches.forEach(m => {
    const scoreMap = {}
    let total = 0
    Object.entries(allPreds).forEach(([username, preds]) => {
      if (preds[m.id]?.h == null) return
      const key = `${preds[m.id].h}-${preds[m.id].a}`
      scoreMap[key] = (scoreMap[key] || 0) + 1
      total++
    })
    if (!total) return
    Object.entries(scoreMap).forEach(([score, count]) => {
      const pct = count / total
      if (pct > consensusPct) {
        consensusPct = pct
        consensusEntry = { match: m, score, count, total }
      }
    })
  })

  // 3. Most predicted winner (across all predictions)
  const winnerCount = {}
  allEntries.forEach(({ pred, match }) => {
    if (pred.h > pred.a) winnerCount[match.home] = (winnerCount[match.home] || 0) + 1
    else if (pred.a > pred.h) winnerCount[match.away] = (winnerCount[match.away] || 0) + 1
  })
  const topWinner = Object.entries(winnerCount).sort((a,b) => b[1]-a[1])[0]

  // 4. Most surprising match: majority predicted one outcome, opposite happened (played only)
  let surpriseEntry = null
  let surpriseGap = 0
  playedMatches.forEach(m => {
    const r = results[m.id]
    const actualOutcome = r.h > r.a ? 'H' : r.a > r.h ? 'A' : 'D'
    let homeV=0, awayV=0, drawV=0, total=0
    Object.entries(allPreds).forEach(([_, preds]) => {
      const p = preds[m.id]; if (!p || p.h == null) return
      total++
      if (p.h > p.a) homeV++; else if (p.a > p.h) awayV++; else drawV++
    })
    if (!total) return
    const majorityOutcome = homeV >= awayV && homeV >= drawV ? 'H' : awayV >= drawV ? 'A' : 'D'
    if (majorityOutcome !== actualOutcome) {
      const majorityPct = Math.max(homeV, awayV, drawV) / total
      if (majorityPct > surpriseGap) {
        surpriseGap = majorityPct
        const majorityTeam = majorityOutcome === 'H' ? m.home : majorityOutcome === 'A' ? m.away : 'Draw'
        const actualTeam = actualOutcome === 'H' ? m.home : actualOutcome === 'A' ? m.away : 'Draw'
        surpriseEntry = { match: m, majorityTeam, actualTeam, majorityPct: Math.round(majorityPct*100) }
      }
    }
  })

  // 5. Most contested: lowest max-score-share (least consensus, played only)
  let contestEntry = null
  let contestScore = 1
  playedMatches.forEach(m => {
    const scoreMap = {}; let total = 0
    Object.entries(allPreds).forEach(([_, preds]) => {
      const p = preds[m.id]; if (!p || p.h == null) return
      const key = `${p.h}-${p.a}`
      scoreMap[key] = (scoreMap[key] || 0) + 1; total++
    })
    if (total < 3) return
    const maxShare = Math.max(...Object.values(scoreMap)) / total
    if (maxShare < contestScore) {
      contestScore = maxShare
      const uniqueScores = Object.keys(scoreMap).length
      contestEntry = { match: m, uniqueScores, total, maxSharePct: Math.round(maxShare*100) }
    }
  })

  const items = [
    braveEntry && {
      icon: '🦁',
      label: 'Most daring pick',
      text: `${braveEntry.users.join(', ')} picked ${braveEntry.score} in ${braveEntry.match.home} vs ${braveEntry.match.away} — the only one${braveEntry.users.length > 1 ? 's' : ''} to go there.`
    },
    consensusEntry && {
      icon: '🤝',
      label: 'Most agreed-upon score',
      text: `${consensusEntry.count} out of ${consensusEntry.total} players (${Math.round(consensusPct*100)}%) picked ${consensusEntry.score} in ${consensusEntry.match.home} vs ${consensusEntry.match.away}.`
    },
    topWinner && {
      icon: '👑',
      label: 'Most predicted winner',
      text: `${flag(topWinner[0])} ${topWinner[0]} — ${topWinner[1]} predictions across all matches.`
    },
    surpriseEntry && {
      icon: '😲',
      label: 'Biggest upset',
      text: `${surpriseEntry.majorityPct}% predicted ${surpriseEntry.majorityTeam} in ${surpriseEntry.match.home} vs ${surpriseEntry.match.away}. ${surpriseEntry.actualTeam} won instead.`
    },
    contestEntry && {
      icon: '⚡',
      label: 'Most contested match',
      text: `${contestEntry.match.home} vs ${contestEntry.match.away} — ${contestEntry.uniqueScores} different scores across ${contestEntry.total} players. No consensus, the most popular pick had only ${contestEntry.maxSharePct}% of votes.`
    },
  ].filter(Boolean)

  // 6. Wildcard: most divergent from popular picks (played matches)
  const wildcardScores = {}
  playedMatches.forEach(m => {
    const scoreMap = {}; let total = 0
    Object.entries(allPreds).forEach(([_, preds]) => {
      const p = preds[m.id]; if (!p||p.h==null) return
      const k=`${p.h}-${p.a}`; scoreMap[k]=(scoreMap[k]||0)+1; total++
    })
    if (!total) return
    const popular = Object.entries(scoreMap).sort((a,b)=>b[1]-a[1])[0][0]
    Object.entries(allPreds).forEach(([username, preds]) => {
      const p = preds[m.id]; if (!p||p.h==null) return
      const k=`${p.h}-${p.a}`
      if (k !== popular) wildcardScores[username] = (wildcardScores[username]||0)+1
    })
  })
  const wildcard = Object.entries(wildcardScores).sort((a,b)=>b[1]-a[1])[0]

  // 7. Draw lovers: most draw predictions
  const drawCounts = {}
  allEntries.forEach(({username, pred}) => {
    if (pred.h === pred.a) drawCounts[username] = (drawCounts[username]||0)+1
  })
  const drawLover = Object.entries(drawCounts).sort((a,b)=>b[1]-a[1])[0]

  // 8. Score prophet: most exact scores (played matches)
  const exactCounts = {}
  playedMatches.forEach(m => {
    const r = results[m.id]
    Object.entries(allPreds).forEach(([username, preds]) => {
      const p = preds[m.id]; if (!p||p.h==null) return
      if (p.h===r.h && p.a===r.a) exactCounts[username]=(exactCounts[username]||0)+1
    })
  })
  const prophet = Object.entries(exactCounts).sort((a,b)=>b[1]-a[1])[0]

  // 9. Sharpest: highest outcome accuracy (played matches)
  const sharpRight = {}, sharpTotal = {}
  playedMatches.forEach(m => {
    const r = results[m.id]
    const actualO = r.h>r.a?'H':r.a>r.h?'A':'D'
    Object.entries(allPreds).forEach(([username, preds]) => {
      const p = preds[m.id]; if (!p||p.h==null) return
      const predO = p.h>p.a?'H':p.a>p.h?'A':'D'
      sharpTotal[username]=(sharpTotal[username]||0)+1
      if (predO===actualO) sharpRight[username]=(sharpRight[username]||0)+1
    })
  })
  const sharpest = Object.entries(sharpRight)
    .filter(([u]) => sharpTotal[u] >= 3)
    .map(([u,r]) => [u, Math.round(r/sharpTotal[u]*100), r, sharpTotal[u]])
    .sort((a,b)=>b[1]-a[1])[0]

  // 10. Most defensive: 0-0 or 1-0 or 0-1 predictions
  const defensiveCount = allEntries.filter(({pred}) =>
    (pred.h+pred.a) <= 1
  ).length

  // 11. Closest to reality: avg predicted score vs actual
  let closestMatch = null, closestDiff = Infinity
  playedMatches.forEach(m => {
    const r = results[m.id]
    const preds = Object.values(allPreds).map(p=>p[m.id]).filter(p=>p?.h!=null)
    if (!preds.length) return
    const avgH = preds.reduce((s,p)=>s+p.h,0)/preds.length
    const avgA = preds.reduce((s,p)=>s+p.a,0)/preds.length
    const diff = Math.abs(avgH-r.h)+Math.abs(avgA-r.a)
    if (diff < closestDiff) {
      closestDiff = diff
      closestMatch = { match: m, avgH: avgH.toFixed(1), avgA: avgA.toFixed(1), r }
    }
  })

  // 12. Goal average: predicted vs actual
  const predGoals = allEntries.filter(e=>playedMatches.find(m=>m.id===e.matchId))
    .map(e=>e.pred.h+e.pred.a)
  const avgPredGoals = predGoals.length ? (predGoals.reduce((a,b)=>a+b,0)/predGoals.length).toFixed(1) : null
  const actualGoals = playedMatches.map(m=>results[m.id]).filter(r=>r?.h!=null).map(r=>r.h+r.a)
  const avgActualGoals = actualGoals.length ? (actualGoals.reduce((a,b)=>a+b,0)/actualGoals.length).toFixed(1) : null

  const newItems = [
    wildcard && { icon:'🎲', label:'Wildcard', text:`${wildcard[0]} picked against the crowd the most — ${wildcard[1]} times choosing a different score than the majority.` },
    drawLover && { icon:'🤝', label:'Draw lover', text:`${drawLover[0]} predicted the most draws — ${drawLover[1]} times.` },
    prophet && { icon:'🤓', label:'Score prophet', text:`${prophet[0]} got the exact score right ${prophet[1]} time${prophet[1]>1?'s':''}.` },
    sharpest && { icon:'🎯', label:'Sharpest player', text:`${sharpest[0]} correctly predicted the outcome in ${sharpest[2]} of ${sharpest[3]} played matches (${sharpest[1]}%).` },
    (() => {
      const defCounts = {}
      allEntries.forEach(({username, pred}) => {
        if ((pred.h+pred.a) <= 1) defCounts[username]=(defCounts[username]||0)+1
      })
      const top = Object.entries(defCounts).sort((a,b)=>b[1]-a[1])[0]
      return top ? { icon:'🔒', label:'Most defensive player', text:`${top[0]} predicted a clean sheet ${top[1]} time${top[1]>1?'s':''} (0-0, 1-0 or 0-1).` } : null
    })(),
    closestMatch && { icon:'📊', label:'Closest to reality', text:`${closestMatch.match.home} vs ${closestMatch.match.away} — avg prediction was ${closestMatch.avgH}-${closestMatch.avgA}, actual was ${closestMatch.r.h}-${closestMatch.r.a}.` },
    avgPredGoals && avgActualGoals && { icon:'📈', label:'Goal average', text:`Players predicted ${avgPredGoals} goals/match on average. Actual average: ${avgActualGoals} goals/match.` },
  ].filter(Boolean)

  const allItems = [...items, ...newItems]
  if (!allItems.length) return null

  return (
    <div className={s.trivia}>
      <div className={s.triviaTitle}>So far…</div>
      <div className={s.triviaGrid}>
        {allItems.map((item, i) => (
          <div key={i} className={s.triviaItem}>
            <span className={s.triviaIcon}>{item.icon}</span>
            <div>
              <span className={s.triviaLabel}>{item.label}: </span>
              <span className={s.triviaText}>{item.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Stats({ allPreds, results }) {
  const [view, setView] = useState('ko')
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

      <Trivia allPreds={allPreds} results={results} view={view} />
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
