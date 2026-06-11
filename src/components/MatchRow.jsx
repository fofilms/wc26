import { useState, useCallback } from 'react'
import { scoreMatch } from '../lib/scoring'
import { STAGE_NAMES } from '../lib/constants'
import fixtures from '../data/fixtures.json'
import s from './MatchRow.module.css'

const flag = (t) => fixtures.flags[t] || ''

function PtsBadge({ pts }) {
  if (pts == null) return null
  const cls = pts >= 3 ? s.s3 : pts === 2 ? s.s2 : pts === 1 ? s.s1 : s.s0
  return <span className={`${s.ptsBadge} ${cls}`}>+{pts}</span>
}

export default function MatchRow({ match: m, mode, pred: initPred, result: initResult, isAdmin, onSavePred, onSaveResult }) {
  const editable = mode === 'result' ? isAdmin : true
  const initSrc = mode === 'predict' ? initPred : initResult
  const [src, setSrc] = useState({ h: initSrc?.h ?? '', a: initSrc?.a ?? '', adv: initSrc?.adv })

  const curPred = mode === 'predict'
    ? { h: src.h === '' ? null : src.h, a: src.a === '' ? null : src.a, adv: src.adv }
    : initPred
  const pts = mode === 'predict' ? scoreMatch(m, curPred, initResult) : null

  const hNum = src.h === '' ? null : Number(src.h)
  const aNum = src.a === '' ? null : Number(src.a)
  const showAdv = m.knockout && hNum != null && aNum != null && hNum === aNum

  const commit = useCallback(async (next) => {
    const h = next.h === '' ? null : Number(next.h)
    const a = next.a === '' ? null : Number(next.a)
    const adv = (m.knockout && h != null && h === a) ? next.adv : undefined
    if (mode === 'predict') {
      await onSavePred(m.id, h, a, adv ?? null)
    } else {
      if (h != null && a != null) await onSaveResult(m.id, h, a, adv ?? null)
    }
  }, [m, mode, onSavePred, onSaveResult])

  const onScore = (side) => async (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
    const next = { ...src, [side]: raw }
    if (raw !== '') next[side] = String(Math.min(99, parseInt(raw) || 0))
    const h = next.h === '' ? null : Number(next.h)
    const a = next.a === '' ? null : Number(next.a)
    if (!(h != null && h === a)) next.adv = undefined
    setSrc(next)
    await commit(next)
  }

  const toggleAdv = async (team) => {
    const next = { ...src, adv: src.adv === team ? undefined : team }
    setSrc(next)
    await commit(next)
  }

  const scored = mode === 'predict' && pts != null
  const isKO = !!m.knockout

  return (
    <div className={`${s.match} ${scored ? s.scored : ''}`}>
      {/* time + badge */}
      <div className={s.head}>
        <span className={s.badge}>{isKO ? STAGE_NAMES[m.stage] : `Grp ${m.group}`}</span>
        <span className={s.time}>{m.time}<span className={s.et}> · {m.etTime} ET</span></span>
        {mode === 'predict' && <PtsBadge pts={pts} />}
      </div>

      {/* teams + score */}
      <div className={s.row}>
        <div className={s.home}>
          <span className={s.flag}>{flag(m.home)}</span>
          <span className={s.tname}>{m.home}</span>
        </div>

        {editable ? (
          <div className={s.scoreIn}>
            <input type="text" inputMode="numeric" value={src.h} onChange={onScore('h')} onFocus={e => e.target.select()} />
            <span>:</span>
            <input type="text" inputMode="numeric" value={src.a} onChange={onScore('a')} onFocus={e => e.target.select()} />
          </div>
        ) : (
          <div className={s.scoreStatic}>
            {initResult?.h != null
              ? <>{initResult.h}<span className={s.dash}>:</span>{initResult.a}</>
              : <span className={s.q}>–</span>}
          </div>
        )}

        <div className={s.away}>
          <span className={s.tname}>{m.away}</span>
          <span className={s.flag}>{flag(m.away)}</span>
        </div>
      </div>

      {/* KO advance */}
      {isKO && showAdv && (
        <div className={s.advance}>
          <div className={s.advLabel}>Draw — who advances? <span className={s.advBonus}>+1</span></div>
          <div className={s.advOpts}>
            {[m.home, m.away].map(team => (
              <button
                key={team}
                className={src.adv === team ? s.advSel : ''}
                onClick={() => editable && toggleAdv(team)}
                disabled={!editable}
              >
                <span>{flag(team)}</span>{team}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* official result (predict mode) */}
      {mode === 'predict' && initResult?.h != null && (
        <div className={s.resultLine}>
          Result: <b>{initResult.h}–{initResult.a}</b>
          {isKO && initResult.adv && <> · Advances: <b>{flag(initResult.adv)} {initResult.adv}</b></>}
        </div>
      )}
    </div>
  )
}
