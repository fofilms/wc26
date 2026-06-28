import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { scoreMatch } from '../lib/scoring'
import fixtures from '../data/fixtures.json'
import s from './Page.module.css'
import cs from './Certificate.module.css'

const flag = (t) => fixtures.flags[t] || ''
const GD = [6, 61, 36]
const AMBER = [255, 183, 3]
const MUTED = [139, 163, 152]
const INK = [10, 19, 13]
const GOOD = [26, 158, 92]
const BAD = [217, 64, 64]
const WARN = [232, 160, 32]
const LIGHT = [240, 244, 248]
const WHITE = [255, 255, 255]

function computeTrivia(allPreds, results) {
  const allMatches = fixtures.groupMatches
  const playedMatches = allMatches.filter(m => results[m.id]?.h != null)
  const allEntries = []
  allMatches.forEach(m => {
    Object.entries(allPreds || {}).forEach(([username, preds]) => {
      if (preds[m.id]?.h != null) allEntries.push({ username, matchId: m.id, pred: preds[m.id], match: m })
    })
  })
  if (!allEntries.length) return []

  const items = []

  // Most brave
  let braveEntry = null, braveCount = Infinity
  playedMatches.forEach(m => {
    const scoreMap = {}
    Object.entries(allPreds || {}).forEach(([u, preds]) => {
      if (!preds[m.id] || preds[m.id].h == null) return
      const k = `${preds[m.id].h}-${preds[m.id].a}`
      if (!scoreMap[k]) scoreMap[k] = []
      scoreMap[k].push(u)
    })
    Object.entries(scoreMap).forEach(([score, users]) => {
      if (users.length < braveCount) { braveCount = users.length; braveEntry = { match: m, score, users } }
    })
  })
  if (braveEntry) items.push({ label: 'Most Daring Pick', text: `${braveEntry.users.join(', ')} picked ${braveEntry.score} in ${braveEntry.match.home} vs ${braveEntry.match.away} — the only one${braveEntry.users.length > 1 ? 's' : ''} to go there.` })

  // Most consensus
  let consensusEntry = null, consensusPct = 0
  playedMatches.forEach(m => {
    const scoreMap = {}; let total = 0
    Object.entries(allPreds || {}).forEach(([_, preds]) => {
      if (!preds[m.id] || preds[m.id].h == null) return
      const k = `${preds[m.id].h}-${preds[m.id].a}`
      scoreMap[k] = (scoreMap[k] || 0) + 1; total++
    })
    if (!total) return
    Object.entries(scoreMap).forEach(([score, count]) => {
      const pct = count / total
      if (pct > consensusPct) { consensusPct = pct; consensusEntry = { match: m, score, count, total } }
    })
  })
  if (consensusEntry) items.push({ label: 'Most Agreed-Upon Score', text: `${consensusEntry.count} out of ${consensusEntry.total} players (${Math.round(consensusPct * 100)}%) picked ${consensusEntry.score} in ${consensusEntry.match.home} vs ${consensusEntry.match.away}.` })

  // Top winner
  const winnerCount = {}
  allEntries.forEach(({ pred, match }) => {
    if (pred.h > pred.a) winnerCount[match.home] = (winnerCount[match.home] || 0) + 1
    else if (pred.a > pred.h) winnerCount[match.away] = (winnerCount[match.away] || 0) + 1
  })
  const topWinner = Object.entries(winnerCount).sort((a, b) => b[1] - a[1])[0]
  if (topWinner) items.push({ label: 'Most Predicted Winner', text: `${topWinner[0]} — ${topWinner[1]} predictions across all matches.` })

  // Biggest upset
  let surpriseEntry = null, surpriseGap = 0
  playedMatches.forEach(m => {
    const r = results[m.id]
    const actualO = r.h > r.a ? 'H' : r.a > r.h ? 'A' : 'D'
    let hV = 0, aV = 0, dV = 0, total = 0
    Object.entries(allPreds || {}).forEach(([_, preds]) => {
      const p = preds[m.id]; if (!p || p.h == null) return
      total++
      if (p.h > p.a) hV++; else if (p.a > p.h) aV++; else dV++
    })
    if (!total) return
    const majorityO = hV >= aV && hV >= dV ? 'H' : aV >= dV ? 'A' : 'D'
    if (majorityO !== actualO) {
      const pct = Math.max(hV, aV, dV) / total
      if (pct > surpriseGap) {
        surpriseGap = pct
        const mTeam = majorityO === 'H' ? m.home : majorityO === 'A' ? m.away : 'Draw'
        const aTeam = actualO === 'H' ? m.home : actualO === 'A' ? m.away : 'Draw'
        surpriseEntry = { match: m, mTeam, aTeam, pct: Math.round(pct * 100) }
      }
    }
  })
  if (surpriseEntry) items.push({ label: 'Biggest Upset', text: `${surpriseEntry.pct}% predicted ${surpriseEntry.mTeam} in ${surpriseEntry.match.home} vs ${surpriseEntry.match.away}, but ${surpriseEntry.aTeam} won instead.` })

  // Most contested
  let contestEntry = null, contestScore = 1
  playedMatches.forEach(m => {
    const scoreMap = {}; let total = 0
    Object.entries(allPreds || {}).forEach(([_, preds]) => {
      const p = preds[m.id]; if (!p || p.h == null) return
      const k = `${p.h}-${p.a}`
      scoreMap[k] = (scoreMap[k] || 0) + 1; total++
    })
    if (total < 3) return
    const maxShare = Math.max(...Object.values(scoreMap)) / total
    if (maxShare < contestScore) {
      contestScore = maxShare
      contestEntry = { match: m, unique: Object.keys(scoreMap).length, total, pct: Math.round(maxShare * 100) }
    }
  })
  if (contestEntry) items.push({ label: 'Most Contested Match', text: `${contestEntry.match.home} vs ${contestEntry.match.away} — ${contestEntry.unique} different scores across ${contestEntry.total} players. Most popular pick had only ${contestEntry.pct}% of votes.` })

  // Wildcard
  const wildcardScores = {}
  playedMatches.forEach(m => {
    const scoreMap = {}; let total = 0
    Object.entries(allPreds || {}).forEach(([_, preds]) => {
      const p = preds[m.id]; if (!p || p.h == null) return
      const k = `${p.h}-${p.a}`; scoreMap[k] = (scoreMap[k] || 0) + 1; total++
    })
    if (!total) return
    const popular = Object.entries(scoreMap).sort((a, b) => b[1] - a[1])[0][0]
    Object.entries(allPreds || {}).forEach(([u, preds]) => {
      const p = preds[m.id]; if (!p || p.h == null) return
      if (`${p.h}-${p.a}` !== popular) wildcardScores[u] = (wildcardScores[u] || 0) + 1
    })
  })
  const wildcard = Object.entries(wildcardScores).sort((a, b) => b[1] - a[1])[0]
  if (wildcard) items.push({ label: 'Wildcard', text: `${wildcard[0]} picked against the crowd the most — ${wildcard[1]} times choosing a different score than the majority.` })

  // Draw lover
  const drawCounts = {}
  allEntries.forEach(({ username, pred }) => {
    if (pred.h === pred.a) drawCounts[username] = (drawCounts[username] || 0) + 1
  })
  const drawLover = Object.entries(drawCounts).sort((a, b) => b[1] - a[1])[0]
  if (drawLover) items.push({ label: 'Draw Lover', text: `${drawLover[0]} predicted the most draws — ${drawLover[1]} times.` })

  // Score prophet
  const exactCounts = {}
  playedMatches.forEach(m => {
    const r = results[m.id]
    Object.entries(allPreds || {}).forEach(([u, preds]) => {
      const p = preds[m.id]; if (!p || p.h == null) return
      if (p.h === r.h && p.a === r.a) exactCounts[u] = (exactCounts[u] || 0) + 1
    })
  })
  const prophet = Object.entries(exactCounts).sort((a, b) => b[1] - a[1])[0]
  if (prophet) items.push({ label: 'Score Prophet', text: `${prophet[0]} got the exact score right ${prophet[1]} time${prophet[1] > 1 ? 's' : ''}.` })

  // Sharpest player
  const sharpRight = {}, sharpTotal = {}
  playedMatches.forEach(m => {
    const r = results[m.id]
    const actualO = r.h > r.a ? 'H' : r.a > r.h ? 'A' : 'D'
    Object.entries(allPreds || {}).forEach(([u, preds]) => {
      const p = preds[m.id]; if (!p || p.h == null) return
      const predO = p.h > p.a ? 'H' : p.a > p.h ? 'A' : 'D'
      sharpTotal[u] = (sharpTotal[u] || 0) + 1
      if (predO === actualO) sharpRight[u] = (sharpRight[u] || 0) + 1
    })
  })
  const sharpest = Object.entries(sharpRight)
    .filter(([u]) => sharpTotal[u] >= 5)
    .map(([u, r]) => [u, Math.round(r / sharpTotal[u] * 100), r, sharpTotal[u]])
    .sort((a, b) => b[1] - a[1])[0]
  if (sharpest) items.push({ label: 'Sharpest Player', text: `${sharpest[0]} correctly predicted the outcome in ${sharpest[2]} of ${sharpest[3]} matches (${sharpest[1]}% accuracy).` })

  // Most defensive
  const defCounts = {}
  allEntries.forEach(({ username, pred }) => {
    if ((pred.h + pred.a) <= 1) defCounts[username] = (defCounts[username] || 0) + 1
  })
  const defensive = Object.entries(defCounts).sort((a, b) => b[1] - a[1])[0]
  if (defensive) items.push({ label: 'Most Defensive Player', text: `${defensive[0]} predicted a clean sheet ${defensive[1]} time${defensive[1] > 1 ? 's' : ''} (0-0, 1-0 or 0-1).` })

  // Goal average
  const predGoals = allEntries.filter(e => playedMatches.find(m => m.id === e.matchId)).map(e => e.pred.h + e.pred.a)
  const avgPred = predGoals.length ? (predGoals.reduce((a, b) => a + b, 0) / predGoals.length).toFixed(1) : null
  const actualGoals = playedMatches.map(m => results[m.id]).filter(r => r?.h != null).map(r => r.h + r.a)
  const avgActual = actualGoals.length ? (actualGoals.reduce((a, b) => a + b, 0) / actualGoals.length).toFixed(1) : null
  if (avgPred && avgActual) items.push({ label: 'Goal Average', text: `Players predicted ${avgPred} goals/match on average. Actual: ${avgActual} goals/match.` })

  return items
}

export default function Certificate({ myPreds, results, leaderboard, allPreds, user }) {
  const [loading, setLoading] = useState(false)

  const groupMatches = fixtures.groupMatches
  let totalPts = 0, exact = 0, correctOutcome = 0, wrong = 0, predicted = 0
  const rows = groupMatches.map(m => {
    const p = myPreds[m.id], r = results[m.id]
    const pts = scoreMatch(m, p, r)
    if (p?.h != null) predicted++
    if (pts === 2) exact++
    else if (pts === 1) correctOutcome++
    else if (pts === 0 && r) wrong++
    if (pts != null) totalPts += pts
    return { m, p, r, pts }
  })

  const rank = leaderboard.findIndex(u => u.name === user) + 1
  const scored = rows.filter(r => r.pts != null).length
  const accuracy = scored > 0 ? Math.round((exact + correctOutcome) / scored * 100) : 0

  const generatePDF = async () => {
    setLoading(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, margin = 14

      // ── PAGE 1: Personal predictions ─────────────────────────
      doc.setFillColor(...GD); doc.rect(0, 0, W, 40, 'F')
      doc.setTextColor(...AMBER); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
      doc.text('2026 FIFA WORLD CUP  |  PREDICTION LEAGUE', margin, 12)
      doc.setTextColor(...WHITE); doc.setFontSize(22)
      doc.text(user, margin, 26)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
      doc.text('GROUP STAGE CERTIFICATE', margin, 34)

      const statY = 50
      const stats = [
        { label: 'Total Points', value: String(totalPts) },
        { label: 'Rank', value: rank ? `#${rank}` : '-' },
        { label: 'Predicted', value: `${predicted}/72` },
        { label: 'Exact Score', value: String(exact) },
        { label: 'Correct', value: String(correctOutcome) },
        { label: 'Accuracy', value: `${accuracy}%` },
      ]
      const colW = (W - margin * 2) / stats.length
      stats.forEach((st, i) => {
        const x = margin + i * colW
        doc.setFillColor(...LIGHT); doc.roundedRect(x, statY - 5, colW - 1.5, 17, 2, 2, 'F')
        doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK)
        doc.text(st.value, x + colW / 2 - 0.75, statY + 5, { align: 'center' })
        doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
        doc.text(st.label, x + colW / 2 - 0.75, statY + 10, { align: 'center' })
      })

      autoTable(doc, {
        startY: statY + 18,
        head: [['Match', 'Your Prediction', 'Result', 'Pts']],
        body: rows.map(({ m, p, r, pts }) => [
          `${m.home} vs ${m.away}`,
          p?.h != null ? `${p.h}-${p.a}` : '-',
          r?.h != null ? `${r.h}-${r.a}` : '-',
          pts != null ? `+${pts}` : '-',
        ]),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: GD, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
        bodyStyles: { fontSize: 6.5, cellPadding: 1.8 },
        columnStyles: {
          0: { cellWidth: 82 }, 1: { cellWidth: 28, halign: 'center' },
          2: { cellWidth: 28, halign: 'center' }, 3: { cellWidth: 18, halign: 'center' },
        },
        alternateRowStyles: { fillColor: [246, 249, 251] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const v = data.cell.raw
            if (v === '+2') { data.cell.styles.textColor = GOOD; data.cell.styles.fontStyle = 'bold' }
            else if (v === '+1') { data.cell.styles.textColor = WARN; data.cell.styles.fontStyle = 'bold' }
            else if (v === '+0') data.cell.styles.textColor = BAD
          }
        },
      })
      doc.setFontSize(6.5); doc.setTextColor(...MUTED)
      doc.text('wc.folfilms.com  |  FOL Films Prediction League 2026', W / 2, 290, { align: 'center' })

      // ── PAGE 2: Leaderboard ───────────────────────────────────
      doc.addPage()
      doc.setFillColor(...GD); doc.rect(0, 0, W, 22, 'F')
      doc.setTextColor(...WHITE); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
      doc.text('Group Stage Leaderboard', margin, 14)

      autoTable(doc, {
        startY: 28,
        head: [['#', 'Player', 'Pts', 'Predicted', 'Correct', 'Exact']],
        body: leaderboard.map((u, i) => [
          i + 1,
          u.name === user ? `${u.name} <` : u.name,
          u.group || 0,
          u.predicted || 0,
          u.winner || 0,
          u.exact || 0,
        ]),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: GD, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 72 },
          2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' }, 5: { cellWidth: 18, halign: 'center' },
        },
        alternateRowStyles: { fillColor: [246, 249, 251] },
        didParseCell: (data) => {
          if (data.section === 'body' && String(data.row.raw[1]).includes(' <')) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.textColor = GOOD
          }
          if (data.section === 'body' && data.column.index === 2) {
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
      doc.setFontSize(6.5); doc.setTextColor(...MUTED)
      doc.text('wc.folfilms.com  |  FOL Films Prediction League 2026', W / 2, 290, { align: 'center' })

      // ── PAGE 3: Trivia & Highlights ───────────────────────────
      doc.addPage()
      doc.setFillColor(...GD); doc.rect(0, 0, W, 22, 'F')
      doc.setTextColor(...WHITE); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
      doc.text('Group Stage Highlights', margin, 14)

      const triviaItems = computeTrivia(allPreds || {}, results)
      const totalGoals = Object.values(results).reduce((s, r) => s + (r.h || 0) + (r.a || 0), 0)
      const played = Object.keys(results).filter(id => id.startsWith('G')).length

      // Tournament stats box
      doc.setFillColor(...LIGHT)
      doc.roundedRect(margin, 28, W - margin * 2, 22, 2, 2, 'F')
      const tStats = [
        { l: 'Matches Played', v: String(played) },
        { l: 'Total Goals', v: String(totalGoals) },
        { l: 'Avg Goals/Match', v: played ? (totalGoals / played).toFixed(1) : '-' },
        { l: 'Players', v: String(leaderboard.length) },
      ]
      const bw = (W - margin * 2) / tStats.length
      tStats.forEach((ts, i) => {
        const x = margin + i * bw
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GD)
        doc.text(ts.v, x + bw / 2, 38, { align: 'center' })
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
        doc.text(ts.l, x + bw / 2, 44, { align: 'center' })
      })

      // Trivia items
      let ty = 60
      triviaItems.forEach((item) => {
        if (ty > 275) return
        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GD)
        doc.text(`${item.label}`, margin, ty)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60, 80, 70)
        const lines = doc.splitTextToSize(item.text, W - margin * 2 - 4)
        doc.text(lines, margin + 2, ty + 5)
        ty += 6 + lines.length * 4.5 + 5
        doc.setDrawColor(220, 230, 225)
        doc.line(margin, ty - 2, W - margin, ty - 2)
      })

      doc.setFontSize(6.5); doc.setTextColor(...MUTED)
      doc.text('wc.folfilms.com  |  FOL Films Prediction League 2026', W / 2, 290, { align: 'center' })

      doc.save(`WC26_Certificate_${user.replace(/\s+/g, '_')}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className={s.intro}>
        <h2>Certificate</h2>
        <p>Your complete Group Stage prediction history, leaderboard, and highlights — all in one PDF.</p>
      </div>

      <div className={cs.card}>
        <div className={cs.cardTop}>
          <div className={cs.cardName}>{user}</div>
          <div className={cs.cardSub}>Group Stage · {predicted}/72 predictions made</div>
        </div>
        <div className={cs.statsRow}>
          {[
            { v: totalPts, l: 'pts' }, { v: rank ? `#${rank}` : '-', l: 'rank' },
            { v: exact, l: 'exact score' }, { v: correctOutcome, l: 'correct outcome' },
            { v: `${accuracy}%`, l: 'accuracy' },
          ].map(({ v, l }) => (
            <div key={l} className={cs.stat}>
              <span className={cs.statVal}>{v}</span>
              <span className={cs.statLabel}>{l}</span>
            </div>
          ))}
        </div>
        <button className={cs.dlBtn} onClick={generatePDF} disabled={loading}>
          {loading ? 'Generating PDF…' : 'Download Certificate (3 pages)'}
        </button>
      </div>

      <div className={cs.tableWrap}>
        <table className={cs.table}>
          <thead>
            <tr><th>Match</th><th>Your Pick</th><th>Result</th><th>Pts</th></tr>
          </thead>
          <tbody>
            {rows.map(({ m, p, r, pts }) => (
              <tr key={m.id} className={pts === 2 ? cs.exact : pts === 1 ? cs.correct : pts === 0 ? cs.wrong : ''}>
                <td>{flag(m.home)} {m.home} vs {m.away} {flag(m.away)}</td>
                <td className={cs.center}>{p?.h != null ? `${p.h}-${p.a}` : '-'}</td>
                <td className={cs.center}>{r?.h != null ? `${r.h}-${r.a}` : '-'}</td>
                <td className={cs.center}>{pts != null ? `+${pts}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
