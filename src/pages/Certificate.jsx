import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { scoreMatch, computeTotals } from '../lib/scoring'
import fixtures from '../data/fixtures.json'
import s from './Page.module.css'
import cs from './Certificate.module.css'

const flag = (t) => fixtures.flags[t] || ''
const GREEN_DARK = [6, 61, 36]
const GREEN = [10, 92, 54]
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
    Object.entries(allPreds).forEach(([username, preds]) => {
      if (preds[m.id]?.h != null) allEntries.push({ username, matchId: m.id, pred: preds[m.id], match: m })
    })
  })
  if (!allEntries.length) return []

  const items = []

  // Most brave
  let braveEntry = null, braveCount = Infinity
  playedMatches.forEach(m => {
    const scoreMap = {}
    Object.entries(allPreds).forEach(([u, preds]) => {
      if (!preds[m.id] || preds[m.id].h == null) return
      const k = `${preds[m.id].h}-${preds[m.id].a}`
      if (!scoreMap[k]) scoreMap[k] = []
      scoreMap[k].push(u)
    })
    Object.entries(scoreMap).forEach(([score, users]) => {
      if (users.length < braveCount) { braveCount = users.length; braveEntry = { match: m, score, users } }
    })
  })
  if (braveEntry) items.push(`🦁 Most daring: ${braveEntry.users.join(', ')} picked ${braveEntry.score} in ${braveEntry.match.home} vs ${braveEntry.match.away}`)

  // Most consensus
  let consensusEntry = null, consensusPct = 0
  playedMatches.forEach(m => {
    const scoreMap = {}; let total = 0
    Object.entries(allPreds).forEach(([_, preds]) => {
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
  if (consensusEntry) items.push(`🤝 Most agreed: ${consensusEntry.count}/${consensusEntry.total} players picked ${consensusEntry.score} in ${consensusEntry.match.home} vs ${consensusEntry.match.away}`)

  // Top winner
  const winnerCount = {}
  allEntries.forEach(({ pred, match }) => {
    if (pred.h > pred.a) winnerCount[match.home] = (winnerCount[match.home] || 0) + 1
    else if (pred.a > pred.h) winnerCount[match.away] = (winnerCount[match.away] || 0) + 1
  })
  const topWinner = Object.entries(winnerCount).sort((a, b) => b[1] - a[1])[0]
  if (topWinner) items.push(`👑 Most predicted winner: ${topWinner[0]} (${topWinner[1]} predictions)`)

  // Biggest upset
  let surpriseEntry = null, surpriseGap = 0
  playedMatches.forEach(m => {
    const r = results[m.id]
    const actualO = r.h > r.a ? 'H' : r.a > r.h ? 'A' : 'D'
    let hV = 0, aV = 0, dV = 0, total = 0
    Object.entries(allPreds).forEach(([_, preds]) => {
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
  if (surpriseEntry) items.push(`😲 Biggest upset: ${surpriseEntry.pct}% picked ${surpriseEntry.mTeam} in ${surpriseEntry.match.home} vs ${surpriseEntry.match.away}, but ${surpriseEntry.aTeam} won`)

  // Score prophet
  const exactCounts = {}
  playedMatches.forEach(m => {
    const r = results[m.id]
    Object.entries(allPreds).forEach(([u, preds]) => {
      const p = preds[m.id]; if (!p || p.h == null) return
      if (p.h === r.h && p.a === r.a) exactCounts[u] = (exactCounts[u] || 0) + 1
    })
  })
  const prophet = Object.entries(exactCounts).sort((a, b) => b[1] - a[1])[0]
  if (prophet) items.push(`🤓 Score prophet: ${prophet[0]} got the exact score right ${prophet[1]} time${prophet[1] > 1 ? 's' : ''}`)

  // Goal average
  const predGoals = allEntries.filter(e => playedMatches.find(m => m.id === e.matchId)).map(e => e.pred.h + e.pred.a)
  const avgPred = predGoals.length ? (predGoals.reduce((a, b) => a + b, 0) / predGoals.length).toFixed(1) : null
  const actualGoals = playedMatches.map(m => results[m.id]).filter(r => r?.h != null).map(r => r.h + r.a)
  const avgActual = actualGoals.length ? (actualGoals.reduce((a, b) => a + b, 0) / actualGoals.length).toFixed(1) : null
  if (avgPred && avgActual) items.push(`📈 Goal average: players predicted ${avgPred} goals/match · actual was ${avgActual} goals/match`)

  return items
}

export default function Certificate({ myPreds, results, leaderboard, allPreds, user }) {
  const [loading, setLoading] = useState(false)

  const groupMatches = fixtures.groupMatches
  const playedMatches = groupMatches.filter(m => results[m.id]?.h != null)

  let totalPts = 0, exact = 0, correctOutcome = 0, wrong = 0, predicted = 0
  const rows = groupMatches.map(m => {
    const p = myPreds[m.id]
    const r = results[m.id]
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
      const W = 210
      const margin = 14

      // ── PAGE 1: Personal Report ──────────────────────────────
      doc.setFillColor(...GREEN_DARK)
      doc.rect(0, 0, W, 40, 'F')

      doc.setTextColor(...AMBER)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('2026 FIFA WORLD CUP · PREDICTION LEAGUE', margin, 12)

      doc.setTextColor(...WHITE)
      doc.setFontSize(22)
      doc.text(user, margin, 25)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MUTED)
      doc.text('GROUP STAGE PERSONAL REPORT', margin, 33)

      // Stats
      const statY = 50
      const stats = [
        { label: 'Total Points', value: String(totalPts) },
        { label: 'Rank', value: rank ? `#${rank}` : '–' },
        { label: 'Predicted', value: `${predicted}/72` },
        { label: 'Exact Score', value: String(exact) },
        { label: 'Correct Outcome', value: String(correctOutcome) },
        { label: 'Accuracy', value: `${accuracy}%` },
      ]
      const colW = (W - margin * 2) / stats.length
      stats.forEach((st, i) => {
        const x = margin + i * colW
        doc.setFillColor(...LIGHT)
        doc.roundedRect(x, statY - 5, colW - 1.5, 17, 2, 2, 'F')
        doc.setFontSize(15)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...INK)
        doc.text(st.value, x + colW / 2 - 0.75, statY + 5, { align: 'center' })
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...MUTED)
        doc.text(st.label, x + colW / 2 - 0.75, statY + 10, { align: 'center' })
      })

      // Predictions table
      autoTable(doc, {
        startY: statY + 16,
        head: [['Match', 'Your Prediction', 'Result', 'Pts']],
        body: rows.map(({ m, p, r, pts }) => [
          `${m.home} vs ${m.away}`,
          p?.h != null ? `${p.h}–${p.a}` : '–',
          r?.h != null ? `${r.h}–${r.a}` : '–',
          pts != null ? `+${pts}` : '–',
        ]),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: GREEN_DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
        bodyStyles: { fontSize: 6.5, cellPadding: 1.8 },
        columnStyles: {
          0: { cellWidth: 82 },
          1: { cellWidth: 28, halign: 'center' },
          2: { cellWidth: 28, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
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

      // Footer p1
      doc.setFontSize(6.5)
      doc.setTextColor(...MUTED)
      doc.text('wc.folfilms.com · FOL Films Prediction League 2026', W / 2, 290, { align: 'center' })

      // ── PAGE 2: Leaderboard ──────────────────────────────────
      doc.addPage()

      doc.setFillColor(...GREEN_DARK)
      doc.rect(0, 0, W, 22, 'F')
      doc.setTextColor(...WHITE)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Group Stage Leaderboard', margin, 14)

      autoTable(doc, {
        startY: 28,
        head: [['#', 'Player', 'Pts', 'Predicted', 'Correct', 'Exact']],
        body: leaderboard.map((u, i) => [
          i + 1,
          u.name === user ? `${u.name} ◀` : u.name,
          u.group || 0,
          u.predicted || 0,
          u.winner || 0,
          u.exact || 0,
        ]),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: GREEN_DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
        },
        alternateRowStyles: { fillColor: [246, 249, 251] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.raw[1]?.includes('◀')) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.textColor = GREEN
          }
        },
      })

      doc.setFontSize(6.5)
      doc.setTextColor(...MUTED)
      doc.text('wc.folfilms.com · FOL Films Prediction League 2026', W / 2, 290, { align: 'center' })

      // ── PAGE 3: Trivia ───────────────────────────────────────
      doc.addPage()

      doc.setFillColor(...GREEN_DARK)
      doc.rect(0, 0, W, 22, 'F')
      doc.setTextColor(...WHITE)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Group Stage Highlights', margin, 14)

      const triviaItems = computeTrivia(allPreds || {}, results)

      let ty = 34
      triviaItems.forEach((item) => {
        doc.setFontSize(9.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...INK)
        // icon + label
        const label = item.split(':')[0]
        const rest = item.split(':').slice(1).join(':')
        doc.text(label + ':', margin, ty)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...MUTED)
        const lines = doc.splitTextToSize(rest.trim(), W - margin * 2 - 5)
        doc.text(lines, margin + 4, ty + 5)
        ty += 6 + lines.length * 5 + 4
        doc.setDrawColor(...LIGHT)
        doc.line(margin, ty - 2, W - margin, ty - 2)
      })

      // Total goals & fun stats
      const totalGoals = Object.values(results).reduce((s, r) => s + (r.h || 0) + (r.a || 0), 0)
      const played = Object.keys(results).filter(id => id.startsWith('G')).length
      ty += 4
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...INK)
      doc.text('⚽ Tournament Stats', margin, ty)
      ty += 7
      const funStats = [
        `Total goals scored: ${totalGoals}`,
        `Average goals per match: ${played ? (totalGoals / played).toFixed(1) : '–'}`,
        `Matches played: ${played}`,
      ]
      funStats.forEach(fs => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...MUTED)
        doc.text(`• ${fs}`, margin + 4, ty)
        ty += 6
      })

      doc.setFontSize(6.5)
      doc.setTextColor(...MUTED)
      doc.text('wc.folfilms.com · FOL Films Prediction League 2026', W / 2, 290, { align: 'center' })

      doc.save(`WC26_${user.replace(/\s+/g, '_')}_GroupStage.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className={s.intro}>
        <h2>My Report</h2>
        <p>Your complete Group Stage prediction history, leaderboard, and highlights — all in one PDF.</p>
      </div>

      <div className={cs.card}>
        <div className={cs.cardTop}>
          <div className={cs.cardName}>{user}</div>
          <div className={cs.cardSub}>Group Stage · {predicted}/72 predictions made</div>
        </div>
        <div className={cs.statsRow}>
          {[
            { v: totalPts, l: 'pts' },
            { v: rank ? `#${rank}` : '–', l: 'rank' },
            { v: exact, l: 'exact' },
            { v: correctOutcome, l: 'correct' },
            { v: `${accuracy}%`, l: 'accuracy' },
          ].map(({ v, l }) => (
            <div key={l} className={cs.stat}>
              <span className={cs.statVal}>{v}</span>
              <span className={cs.statLabel}>{l}</span>
            </div>
          ))}
        </div>
        <button className={cs.dlBtn} onClick={generatePDF} disabled={loading}>
          {loading ? 'Generating PDF…' : '↓ Download 3-page PDF Report'}
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
                <td className={cs.center}>{p?.h != null ? `${p.h}–${p.a}` : '–'}</td>
                <td className={cs.center}>{r?.h != null ? `${r.h}–${r.a}` : '–'}</td>
                <td className={cs.center}>{pts != null ? `+${pts}` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
