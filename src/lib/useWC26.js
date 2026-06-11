import { useState, useEffect, useCallback, useRef } from 'react'
import { sb } from '../supabaseClient'
import { computeTotals } from './scoring'
import fixtures from '../data/fixtures.json'

const allMatches = [...fixtures.groupMatches, ...fixtures.knockout]

export function useWC26(user) {
  const [results, setResults]       = useState({})
  const [myPreds, setMyPreds]       = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [locks, setLocks]           = useState({}) // { md_1: true, md_2: false, ... }
  const [loading, setLoading]       = useState(true)
  const [allPreds, setAllPreds]      = useState({}) // { username: { matchId: {h,a,adv} } }
  const [userLocks, setUserLocks]    = useState({}) // { username: true/false }
  const channelRef = useRef(null)

  const parseResult = (row) => ({ h: row.home_score, a: row.away_score, adv: row.advance ?? undefined })
  const parsePred   = (row) => ({ h: row.home_score, a: row.away_score, adv: row.advance ?? undefined })

  // ── loaders ──────────────────────────────────────────────────────
  const loadResults = useCallback(async () => {
    const { data } = await sb.from('wc26_results').select('*')
    const map = {}
    ;(data || []).forEach(r => { map[r.match_id] = parseResult(r) })
    setResults(map)
    return map
  }, [])

  const loadMyPreds = useCallback(async () => {
    if (!user) return {}
    const { data } = await sb.from('wc26_predictions').select('*').eq('username', user)
    const map = {}
    ;(data || []).forEach(r => { map[r.match_id] = parsePred(r) })
    setMyPreds(map)
    return map
  }, [user])

  const loadUserLocks = useCallback(async () => {
    const { data } = await sb.from('wc26_users').select('username,locked')
    const map = {}
    ;(data || []).forEach(r => { map[r.username] = r.locked ?? false })
    setUserLocks(map)
    return map
  }, [])

  const loadLocks = useCallback(async () => {
    const { data } = await sb.from('wc26_locks').select('*')
    const map = {}
    ;(data || []).forEach(r => { map[r.key] = r.locked })
    setLocks(map)
    return map
  }, [])

  const loadLeaderboard = useCallback(async (currentResults) => {
    const { data } = await sb.from('wc26_predictions').select('*')
    const byUser = {}
    ;(data || []).forEach(r => {
      if (!byUser[r.username]) byUser[r.username] = {}
      byUser[r.username][r.match_id] = parsePred(r)
    })
    if (user && !byUser[user]) byUser[user] = {}
    setAllPreds(byUser)
    const rows = Object.entries(byUser).map(([name, preds]) => ({
      name, ...computeTotals(allMatches, preds, currentResults || {}),
    }))
    rows.sort((a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name))
    setLeaderboard(rows)
  }, [user])

  // ── boot ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const init = async () => {
      setLoading(true)
      const [res] = await Promise.all([loadResults(), loadMyPreds(), loadLocks(), loadUserLocks()])
      if (!cancelled) {
        await loadLeaderboard(res)
        setLoading(false)
      }
    }
    init()

    channelRef.current = sb.channel('wc26_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wc26_results' }, async () => {
        const res = await loadResults()
        await loadLeaderboard(res)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wc26_locks' }, async () => {
        await loadLocks()
      })
      .subscribe()

    return () => {
      cancelled = true
      if (channelRef.current) sb.removeChannel(channelRef.current)
    }
  }, [user, loadResults, loadMyPreds, loadLocks, loadLeaderboard])

  // ── writers ──────────────────────────────────────────────────────
  const savePred = useCallback(async (matchId, h, a, adv) => {
    if (!user) return
    const row = {
      username: user, match_id: matchId,
      home_score: h, away_score: a, advance: adv ?? null,
      updated_at: new Date().toISOString(),
    }
    await sb.from('wc26_predictions').upsert(row, { onConflict: 'username,match_id' })
    setMyPreds(prev => ({ ...prev, [matchId]: { h, a, adv } }))
  }, [user])

  const saveResult = useCallback(async (matchId, h, a, adv) => {
    const row = {
      match_id: matchId, home_score: h, away_score: a,
      advance: adv ?? null, updated_at: new Date().toISOString(),
    }
    await sb.from('wc26_results').upsert(row, { onConflict: 'match_id' })
    const newResults = await loadResults()
    await loadLeaderboard(newResults)
  }, [loadResults, loadLeaderboard])

  const toggleLock = useCallback(async (key) => {
    const current = locks[key] ?? false
    const row = { key, locked: !current, updated_at: new Date().toISOString() }
    await sb.from('wc26_locks').upsert(row, { onConflict: 'key' })
    setLocks(prev => ({ ...prev, [key]: !current }))
  }, [locks])

  const toggleUserLock = useCallback(async (username) => {
    const current = userLocks[username] ?? false
    await sb.from('wc26_users').update({ locked: !current }).eq('username', username)
    setUserLocks(prev => ({ ...prev, [username]: !current }))
  }, [userLocks])

  const refreshLeaderboard = useCallback(async () => {
    const res = await loadResults()
    await loadLeaderboard(res)
  }, [loadResults, loadLeaderboard])

  return { results, myPreds, leaderboard, allPreds, locks, userLocks, loading, savePred, saveResult, toggleLock, toggleUserLock, refreshLeaderboard }
}
