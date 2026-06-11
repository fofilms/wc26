import fixtures from '../data/fixtures.json'
import s from './Page.module.css'

function computeTable(group, results) {
  const teams = {}
  fixtures.groups[group].forEach(t => { teams[t] = { t, P:0,W:0,D:0,L:0,GF:0,GA:0,Pts:0 } })
  fixtures.groupMatches.filter(m => m.group === group).forEach(m => {
    const r = results[m.id]
    if (!r || r.h == null || r.a == null) return
    const H = teams[m.home], A = teams[m.away]
    H.P++; A.P++; H.GF += r.h; H.GA += r.a; A.GF += r.a; A.GA += r.h
    if (r.h > r.a)      { H.W++; A.L++; H.Pts += 3 }
    else if (r.a > r.h) { A.W++; H.L++; A.Pts += 3 }
    else                { H.D++; A.D++; H.Pts++; A.Pts++ }
  })
  return Object.values(teams).sort((a, b) =>
    b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF || a.t.localeCompare(b.t)
  )
}

export default function Standings({ results }) {
  const hasAny = Object.keys(results).length > 0

  return (
    <div>
      <div className={s.intro}>
        <h2>Group Standings</h2>
        <p>Live tables based on official results. Top 2 advance automatically.</p>
      </div>
      {!hasAny ? (
        <div className={s.empty}><div className={s.big}>📊</div>No official results yet.</div>
      ) : (
        <div className={s.standingsGrid}>
          {Object.keys(fixtures.groups).map(g => {
            const rows = computeTable(g, results)
            return (
              <div key={g} className={s.tableCard}>
                <h3><span className={s.grpBadge}>{g}</span> Group {g}</h3>
                <table>
                  <thead>
                    <tr>
                      <th style={{width:16}}></th>
                      <th className={s.tm}>Team</th>
                      <th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const gd = r.GF - r.GA
                      return (
                        <tr key={r.t} className={i < 2 ? s.advRow : ''}>
                          <td><span className={s.pos}>{i + 1}</span></td>
                          <td className={s.tm}>
                            <span className={s.flag13}>{fixtures.flags[r.t] || ''}</span>{r.t}
                          </td>
                          <td>{r.P}</td><td>{r.W}</td><td>{r.D}</td><td>{r.L}</td>
                          <td>{gd > 0 ? '+' + gd : gd}</td>
                          <td className={s.ptsCol}>{r.Pts}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
