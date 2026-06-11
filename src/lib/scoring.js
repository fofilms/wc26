export function outcome(h, a) {
  return h > a ? 'H' : a > h ? 'A' : 'D'
}

/**
 * Bir maç için puan hesapla.
 * Grup: tam skor=2, doğru sonuç=1, yanlış=0
 * Eleme: aynı; beraberlik tahmin edip tur atlayanı doğru seçersen +1
 * @returns {number|null} null = sonuç henüz yok
 */
export function scoreMatch(match, pred, result) {
  if (!pred || !result) return null
  if (pred.h == null || pred.a == null || result.h == null || result.a == null) return null

  let pts = 0
  const exact = pred.h === result.h && pred.a === result.a
  const sameOutcome = outcome(pred.h, pred.a) === outcome(result.h, result.a)

  if (exact) pts = 2
  else if (sameOutcome) pts = 1

  // Eleme bonusu: normal sürede beraberlik + doğru tur atlayan
  if (match.knockout && pred.h === pred.a && pred.adv && result.adv && pred.adv === result.adv) {
    pts += 1
  }

  return pts
}

export function computeTotals(allMatches, preds, results) {
  let group = 0, ko = 0, count = 0, exact = 0, winner = 0, predicted = 0
  for (const m of allMatches) {
    const p = preds[m.id]
    if (p?.h != null) predicted++
    const s = scoreMatch(m, p, results[m.id])
    if (s != null) {
      count++
      if (m.knockout) ko += s; else group += s
      if (s >= 2) exact++
      else if (s === 1) winner++
    }
  }
  return { group, ko, total: group + ko, count, exact, winner, predicted }
}
