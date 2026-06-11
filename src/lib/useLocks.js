import { useState, useEffect, useCallback } from 'react'
import { sb } from '../supabaseClient'

const LOCK_KEYS = {
  md_1: 'First Matches',
  md_2: 'Second Matches',
  md_3: 'Third Matches',
  ko_r32: 'Round of 32',
  ko_r16: 'Round of 16',
  ko_qf: 'Quarter-finals',
  ko_sf: 'Semi-finals',
  ko_final: 'Final',
}

export function getLockKey(mode, filter) {
  if (mode === 'group') return `md_${filter}`
  return `ko_${filter}`
}

export { LOCK_KEYS }

export function useLocks() {
  const [locks, setLocks] = useState({}) // key -> boolean

  const load = useCallback(async () => {
    const { data } = await sb.from('wc26_locks').select('*')
    const map = {}
    ;(data || []).forEach(r => { map[r.key] = r.locked })
    setLocks(map)
  }, [])

  useEffect(() => {
    load()
    const channel = sb.channel('wc26_locks_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wc26_locks' }, () => load())
      .subscribe()
    return () => sb.removeChannel(channel)
  }, [load])

  const toggle = useCallback(async (key) => {
    const next = !locks[key]
    await sb.from('wc26_locks').upsert(
      { key, locked: next, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    setLocks(prev => ({ ...prev, [key]: next }))
  }, [locks])

  return { locks, toggle }
}
