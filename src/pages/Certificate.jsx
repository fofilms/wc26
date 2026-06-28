import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { scoreMatch } from '../lib/scoring'
import fixtures from '../data/fixtures.json'
import s from './Page.module.css'
import cs from './Certificate.module.css'

const flag = (t) => fixtures.flags[t] || ''

function outcome(h, a) {
  if (h > a) return 'Home Win'
  if (a > h) return 'Away Win'
  return 'Draw'
}

export default function Certificate({ myPreds, results, leaderboard, user }) {
  const [loading, setLoading] = useState(false)

  const groupMatches = fixtures.groupMatches
  const playedMatches = groupMatches.filter(m => results[m.id]?.h != null)

  // Compute stats
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
  const accuracy = playedMatches.length > 0
    ? Math.round((exact + correctOutcome) / playedMatches.filter(m => myPreds[m.id]?.h != null).length * 100)
    : 0

  const generatePDF = async () => {
    setLoading(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, H = 297
      const margin = 14

      // Header background
      doc.setFillColor(6, 61, 36)
      doc.rect(0, 0, W, 38, 'F')

      // Title
      doc.setTextColor(255, 183, 3)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('2026 FIFA WORLD CUP · PREDICTION LEAGUE', margin, 13)

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.text(user, margin, 25)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(139, 163, 152)
      doc.text('GROUP STAGE REPORT', margin, 32)

      // Stats row
      const statY = 46
      const stats = [
        { label: 'Total Points', value: String(totalPts) },
        { label: 'Rank', value: rank ? `#${rank}` : '–' },
        { label: 'Predicted', value: String(predicted) },
        { label: 'Exact Score', value: String(exact) },
        { label: 'Correct Outcome', value: String(correctOutcome) },
        { label: 'Accuracy', value: `${accuracy}%` },
      ]
      const colW = (W - margin * 2) / stats.length
      stats.forEach((st, i) => {
        const x = margin + i * colW
        doc.setFillColor(240, 244, 248)
        doc.roundedRect(x, statY - 5, colW - 2, 16, 2, 2, 'F')
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(10, 19, 13)
        doc.text(st.value, x + colW / 2 - 1, statY + 4, { align: 'center' })
        doc.setFontSize(6.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(139, 163, 152)
        doc.text(st.label, x + colW / 2 - 1, statY + 9, { align: 'center' })
      })

      // Table
      const tableData = rows.map(({ m, p, r, pts }) => {
        const predStr = p?.h != null ? `${p.h}–${p.a}` : '–'
        const resultStr = r?.h != null ? `${r.h}–${r.a}` : '–'
        const ptsStr = pts === 2 ? '+2 ✓✓' : pts === 1 ? '+1 ✓' : pts === 0 ? '0 ✗' : '–'
        return [
          `${m.home} vs ${m.away}`,
          predStr,
          resultStr,
          ptsStr,
        ]
      })

      autoTable(doc, {
        startY: statY + 16,
        head: [['Match', 'Your Prediction', 'Result', 'Points']],
        body: tableData,
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: [6, 61, 36],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        bodyStyles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 28, halign: 'center' },
          2: { cellWidth: 28, halign: 'center' },
          3: { cellWidth: 22, halign: 'center' },
        },
        alternateRowStyles: { fillColor: [245, 248, 250] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const v = data.cell.raw
            if (v && v.includes('✓✓')) data.cell.styles.textColor = [26, 158, 92]
            else if (v && v.includes('✓')) data.cell.styles.textColor = [232, 160, 32]
            else if (v && v.includes('✗')) data.cell.styles.textColor = [217, 64, 64]
          }
        },
      })

      // Footer
      const finalY = doc.lastAutoTable.finalY + 6
      doc.setFontSize(7)
      doc.setTextColor(139, 163, 152)
      doc.setFont('helvetica', 'normal')
      doc.text('wc.folfilms.com · FOL Films Prediction League 2026', W / 2, finalY, { align: 'center' })

      doc.save(`WC26_${user.replace(/\s+/g, '_')}_GroupStage.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className={s.intro}>
        <h2>My Certificate</h2>
        <p>Download your Group Stage prediction report as a PDF.</p>
      </div>

      <div className={cs.card}>
        <div className={cs.cardTop}>
          <div className={cs.cardName}>{user}</div>
          <div className={cs.cardSub}>Group Stage · {predicted}/72 predictions</div>
        </div>

        <div className={cs.statsRow}>
          <div className={cs.stat}>
            <span className={cs.statVal}>{totalPts}</span>
            <span className={cs.statLabel}>pts</span>
          </div>
          <div className={cs.stat}>
            <span className={cs.statVal}>{rank ? `#${rank}` : '–'}</span>
            <span className={cs.statLabel}>rank</span>
          </div>
          <div className={cs.stat}>
            <span className={cs.statVal}>{exact}</span>
            <span className={cs.statLabel}>exact</span>
          </div>
          <div className={cs.stat}>
            <span className={cs.statVal}>{correctOutcome}</span>
            <span className={cs.statLabel}>correct</span>
          </div>
          <div className={cs.stat}>
            <span className={cs.statVal}>{accuracy}%</span>
            <span className={cs.statLabel}>accuracy</span>
          </div>
        </div>

        <button className={cs.dlBtn} onClick={generatePDF} disabled={loading}>
          {loading ? 'Generating…' : '↓ Download PDF'}
        </button>
      </div>

      {/* Preview table */}
      <div className={cs.tableWrap}>
        <table className={cs.table}>
          <thead>
            <tr>
              <th>Match</th>
              <th>Your Pick</th>
              <th>Result</th>
              <th>Pts</th>
            </tr>
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
