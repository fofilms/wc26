import { useState, useCallback } from 'react'
import Login from './components/Login'
import Header from './components/Header'
import Toast from './components/Toast'
import Predict from './pages/Predict'
import Standings from './pages/Standings'
import Leaderboard from './pages/Leaderboard'
import Results from './pages/Results'
import { useWC26 } from './lib/useWC26'
import { ADMIN } from './lib/constants'

function getSavedUser() {
  try { return localStorage.getItem('wc26user') } catch { return null }
}

export default function App() {
  const [user, setUser] = useState(getSavedUser)
  const [tab, setTab] = useState('predict')
  const [toast, setToast] = useState(null)

  const isAdmin = user?.toLowerCase() === ADMIN

  const { results, myPreds, leaderboard, locks, loading, savePred, saveResult, toggleLock, refreshLeaderboard } = useWC26(user)

  const handleSavePred = useCallback(async (...args) => {
    await savePred(...args)
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

  const pageProps = {
    results, myPreds, isAdmin, locks,
    onSavePred: handleSavePred,
    onSaveResult: handleSaveResult,
    onToggleLock: handleToggleLock,
  }

  return (
    <>
      <Header user={user} isAdmin={isAdmin} activeTab={tab} onTab={setTab} onLogout={handleLogout} />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 14px 60px' }}>
        {tab === 'predict'     && <Predict {...pageProps} />}
        {tab === 'standings'   && <Standings results={results} />}
        {tab === 'leaderboard' && <Leaderboard leaderboard={leaderboard} user={user} onRefresh={refreshLeaderboard} />}
        {tab === 'results' && isAdmin && <Results {...pageProps} />}
      </div>
      <footer style={{ textAlign:'center', color:'#7a8a99', fontSize:'9px', padding:'20px 0 8px', fontWeight:500 }}>
        Predictions are private · Leaderboard is public · Times in Berlin CEST
      </footer>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  )
}
