import { useState, useEffect, useCallback, useRef } from 'react'
import { sb } from '../supabaseClient'
import { computeTotals } from './scoring'
import fixtures from '../data/fixtures.json'

const allMatches = [...fixtures.groupMatches, ...fixtures.knockout]

export function useWC26(user) {
  const [results, setResults] = useState({})     // matchId → {h,a,adv}
  const [myPreds, setMyPreds] = useState({})     // matchId → {h,a,adv}
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  // ── helpers ──────────────────────────────────────────────────────
  const parseResult = (row) => ({
    h: row.home_score,
    a: row.away_score,
    adv: row.advance ?? undefined,
  })

  const parsePred = (row) => ({
    h: row.home_score,
    a: row.away_score,
    adv: row.advance ?? undefined,
  })

  // ── loaders ──────────────────────────────────────────────────────
  const loadResults = useCallback(async () => {
    const { data } = await sb.from('wc26_results').select('*')
    const map = {}
    ;(data || []).forEach((r) => { map[r.match_id] = parseResult(r) })
    setResults(map)
    return map
  }, [])

  const loadMyPreds = useCallback(async () => {
    if (!user) return {}
    const { data } = await sb.from('wc26_predictions').select('*').eq('username', user)
    const map = {}
    ;(data || []).forEach((r) => { map[r.match_id] = parsePred(r) })
    setMyPreds(map)
    return map
  }, [user])

  const loadLeaderboard = useCallback(async (currentResults, currentMyPreds) => {
    const { data } = await sb.from('wc26_predictions').select('*')
    const byUser = {}
    ;(data || []).forEach((r) => {
      if (!byUser[r.username]) byUser[r.username] = {}
      byUser[r.username][r.match_id] = parsePred(r)
    })
    // Always include current user even with zero preds
    if (user && !byUser[user]) byUser[user] = currentMyPreds || {}

    const rows = Object.entries(byUser).map(([name, preds]) => ({
      name,
      ...computeTotals(allMatches, preds, currentResults || {}),
    }))
    rows.sort((a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name, 'tr'))
    setLeaderboard(rows)
  }, [user])

  // ── boot ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const init = async () => {
      setLoading(true)
      const [res, preds] = await Promise.all([loadResults(), loadMyPreds()])
      if (!cancelled) {
        await loadLeaderboard(res, preds)
        setLoading(false)
      }
    }
    init()

    // Realtime: when any result changes, reload results + leaderboard
    channelRef.current = sb
      .channel('wc26_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wc26_results' }, async () => {
        const res = await loadResults()
        const { data } = await sb.from('wc26_predictions').select('*')
        const byUser = {}
        ;(data || []).forEach((r) => {
          if (!byUser[r.username]) byUser[r.username] = {}
          byUser[r.username][r.match_id] = parsePred(r)
        })
        if (user && !byUser[user]) byUser[user] = {}
        const rows = Object.entries(byUser).map(([name, preds]) => ({
          name,
          ...computeTotals(allMatches, preds, res),
        }))
        rows.sort((a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name, 'tr'))
        if (!cancelled) setLeaderboard(rows)
      })
      .subscribe()

    return () => {
      cancelled = true
      if (channelRef.current) sb.removeChannel(channelRef.current)
    }
  }, [user, loadResults, loadMyPreds, loadLeaderboard])

  // ── writers ──────────────────────────────────────────────────────
  const savePred = useCallback(async (matchId, h, a, adv) => {
    if (!user) return
    const row = {
      username: user, match_id: matchId,
      home_score: h, away_score: a, advance: adv ?? null,
      updated_at: new Date().toISOString(),
    }
    await sb.from('wc26_predictions').upsert(row, { onConflict: 'username,match_id' })
    setMyPreds((prev) => ({ ...prev, [matchId]: { h, a, adv } }))
  }, [user])

  const saveResult = useCallback(async (matchId, h, a, adv) => {
    const row = {
      match_id: matchId,
      home_score: h, away_score: a, advance: adv ?? null,
      updated_at: new Date().toISOString(),
    }
    await sb.from('wc26_results').upsert(row, { onConflict: 'match_id' })
    // optimistic local update (realtime will also fire)
    setResults((prev) => ({ ...prev, [matchId]: { h, a, adv } }))
  }, [])

  const refreshLeaderboard = useCallback(async () => {
    const res = await loadResults()
    const preds = await loadMyPreds()
    await loadLeaderboard(res, preds)
  }, [loadResults, loadMyPreds, loadLeaderboard])

  return { results, myPreds, leaderboard, loading, savePred, saveResult, refreshLeaderboard }
}
