import MatchList from '../components/MatchList'
import s from './Page.module.css'

export default function Predict({ results, myPreds, isAdmin, locks, isUserLocked, onSavePred, onSaveResult, onToggleLock }) {
  return (
    <div>
      <div className={s.intro}>
        <h2>Predictions</h2>
        <p>Enter a score for each match — saved automatically. Points update as results come in.</p>
      </div>
      {isUserLocked && (
        <div className={s.notice}>🔒 Your First Matches predictions have been locked by the admin.</div>
      )}
      <div className={s.scoringHelp}>
        <b>Scoring.</b>{' '}
        Group stage: <span className={s.pill}>2</span> exact score · <span className={s.pill}>1</span> correct outcome · 0 wrong.{' '}
        Knockout: same system; predict a <b>draw</b> in normal time and pick who advances for <b>+1</b> extra (even if decided by penalties).
      </div>
      <MatchList
        mode="predict"
        results={results} myPreds={myPreds}
        isAdmin={isAdmin} locks={locks} isUserLocked={isUserLocked}
        onSavePred={onSavePred} onSaveResult={onSaveResult} onToggleLock={onToggleLock}
      />
    </div>
  )
}
