import fixtures from './data/fixtures.json'
import OnlineUsers from './components/OnlineUsers'
import { useState, useCallback, useRef, useEffect } from 'react'
import Login from './components/Login'
import Header from './components/Header'
import Toast from './components/Toast'
import Predict from './pages/Predict'
import Standings from './pages/Standings'
import Leaderboard from './pages/Leaderboard'
import Results from './pages/Results'
import After from './pages/After'
import Stats from './pages/Stats'
import Certificate from './pages/Certificate'
import Users from './pages/Users'
import { useWC26 } from './lib/useWC26'
import { ADMINS, HIDDEN_USERS } from './lib/constants'

function getSavedUser() {
  try { return localStorage.getItem('wc26user') } catch { return null }
}

export default function App() {
  const [user, setUser] = useState(getSavedUser)
  const [tab, setTab] = useState('predict')
  const [toast, setToast] = useState(null)

  const isAdmin = ADMINS.includes(user?.toLowerCase())
  const isUserLockedRef = useRef(false)

  const { results, myPreds, leaderboard, allPreds, locks, userLocks, isUserLocked, isSpectator, onlineUsers, loading, savePred, saveResult, toggleLock, toggleUserLock, toggleSpectator, refreshLeaderboard } = useWC26(user)
  isUserLockedRef.current = isUserLocked

  const handleSavePred = useCallback(async (matchId, ...rest) => {
    const isFirstMatch = fixtures.groupMatches.find(m => m.id === matchId)?.matchday === 1
    if (isFirstMatch && isUserLockedRef.current) return
    await savePred(matchId, ...rest)
  }, [savePred])

  const handleSaveResult = useCallback(async (...args) => {
    await saveResult(...args)
    setToast('Result saved ✓')
  }, [saveResult])

  const handleToggleLock = useCallback(async (key) => {
    await toggleLock(key)
    const isNowLocked = !locks[key]
    setToast(isNowLocked ? 'Predictions locked 🔒' : 'Predictions unlocked 🔓')
  }, [toggleLock, locks])

  const handleLogout = () => {
    try { localStorage.removeItem('wc26user') } catch {}
    setUser(null)
    setTab('predict')
  }

  if (!user) return <Login onLogin={setUser} />

  if (loading) return (
    <div style={{ display:'grid', placeItems:'center', minHeight:'60vh', fontSize:12, color:'#7a8a99' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:28, marginBottom:10 }}>⚽️</div>
        Loading…
      </div>
    </div>
  )

  const visibleLeaderboard = leaderboard.filter(u => !HIDDEN_USERS.includes(u.name.toLowerCase()))

  const pageProps = {
    results, myPreds, isAdmin, locks,
    onSavePred: handleSavePred,
    onSaveResult: handleSaveResult,
    onToggleLock: handleToggleLock,
  }

  return (
    <>
      <Header user={user} isAdmin={isAdmin} activeTab={tab} onTab={setTab} onLogout={handleLogout} />
      <OnlineUsers users={onlineUsers} currentUser={user} />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 14px 60px' }}>
        {tab === 'predict'     && <Predict {...pageProps} isUserLocked={isUserLocked} currentUser={user} />}
        {tab === 'standings'   && <Standings results={results} />}
        {tab === 'leaderboard' && <Leaderboard leaderboard={visibleLeaderboard} user={user} onRefresh={refreshLeaderboard} />}
        {tab === 'results'  && isAdmin && <Results {...pageProps} />}
        {tab === 'users'    && isAdmin && <Users currentUser={user} userLocks={userLocks} onToggleUserLock={toggleUserLock} onToggleSpectator={toggleSpectator} />}
        {tab === 'after' && <After results={results} allPreds={allPreds} currentUser={user} isSpectator={isSpectator} />}
        {tab === 'stats' && <Stats allPreds={allPreds} results={results} />}
        {tab === 'certificate' && <Certificate myPreds={myPreds} results={results} leaderboard={leaderboard} allPreds={allPreds} user={user} />}
      </div>
      <footer style={{ textAlign:'center', color:'#7a8a99', fontSize:'9px', padding:'20px 0 8px', fontWeight:500 }}>
        Predictions are private until the matches are over · Leaderboard is public · Match times are shown in local venue time · Having trouble? <a href="https://wa.me/4917659550028" target="_blank" style="color:inherit;opacity:.7;text-decoration:underline">Contact admin on WhatsApp</a>
      </footer>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  )
}
