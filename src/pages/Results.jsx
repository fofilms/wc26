import MatchList from '../components/MatchList'
import s from './Page.module.css'

export default function Results({ results, myPreds, isAdmin, onSavePred, onSaveResult }) {
  return (
    <div>
      <div className={s.intro}>
        <h2>Enter Results</h2>
        <p>Official match scores. Applied instantly to all players' points.</p>
      </div>
      <div className={s.notice}>
        ⚠️ Admin only (Cevik). Writes directly to Supabase and affects everyone.
      </div>
      <MatchList
        mode="result"
        results={results}
        myPreds={myPreds}
        isAdmin={isAdmin}
        onSavePred={onSavePred}
        onSaveResult={onSaveResult}
        notice="Knockout slots are placeholders — update team names as matchups are confirmed."
      />
    </div>
  )
}
