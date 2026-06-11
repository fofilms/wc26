import MatchList from '../components/MatchList'
import s from './Page.module.css'

export default function Predict({ results, myPreds, isAdmin, onSavePred, onSaveResult }) {
  return (
    <div>
      <div className={s.intro}>
        <h2>Predictions</h2>
        <p>Enter a score for each match — saved automatically. Points update as results come in.</p>
      </div>
      <div className={s.scoringHelp}>
        <b>Scoring.</b>{' '}
        Group stage: <span className={s.pill}>2</span> exact score · <span className={s.pill}>1</span> correct outcome · 0 wrong.{' '}
        Knockout: same system; if you predict a <b>draw</b> in normal time and pick the team that advances, you earn <b>+1</b> extra (even if decided by penalties).
      </div>
      <MatchList
        mode="predict"
        results={results}
        myPreds={myPreds}
        isAdmin={isAdmin}
        onSavePred={onSavePred}
        onSaveResult={onSaveResult}
        notice="Knockout matchups depend on group results — slots are placeholders until confirmed."
      />
    </div>
  )
}
