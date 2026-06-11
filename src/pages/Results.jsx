import MatchList from '../components/MatchList'
import s from './Page.module.css'

export default function Results({ results, myPreds, isAdmin, locks, onSavePred, onSaveResult, onToggleLock }) {
  return (
    <div>
      <div className={s.intro}>
        <h2>Enter Results</h2>
        <p>Official match scores. Applied instantly to all players' points.</p>
      </div>
      <div className={s.notice}>
        ⚠️ Admin only. Use the Lock/Unlock button to control whether players can still edit their predictions.
      </div>
      <MatchList
        mode="result"
        results={results} myPreds={myPreds}
        isAdmin={isAdmin} locks={locks}
        onSavePred={onSavePred} onSaveResult={onSaveResult} onToggleLock={onToggleLock}
      />
    </div>
  )
}
