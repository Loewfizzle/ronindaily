import { useState, useEffect } from 'react'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'

export default function App() {
  const [screen, setScreen] = useState(null)

  useEffect(() => {
    const committed = localStorage.getItem('ronin_committed')
    setScreen(committed ? 'dashboard' : 'onboarding')
  }, [])

  const handleCommit = (data) => {
    localStorage.setItem('ronin_committed', 'true')
    localStorage.setItem('ronin_profile', JSON.stringify(data))
    localStorage.setItem('ronin_start', new Date().toISOString())
    setScreen('dashboard')
  }

  const handleReset = () => {
    localStorage.removeItem('ronin_committed')
    localStorage.removeItem('ronin_profile')
    localStorage.removeItem('ronin_start')
    setScreen('onboarding')
  }

  if (!screen) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh' }}>
      {screen === 'onboarding' && <Onboarding onCommit={handleCommit} />}
      {screen === 'dashboard' && <Dashboard onReset={handleReset} />}
    </div>
  )
}
