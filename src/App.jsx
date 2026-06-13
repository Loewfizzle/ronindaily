import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="font-jp" style={{ fontSize: '2.2rem', color: 'var(--red)', lineHeight: 1 }}>侍</span>
    </div>
  )
}

function LoginScreen({ onSignIn }) {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState(null)

  const handleEmailSubmit = async () => {
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email.')
      return
    }
    setError(null)
    try {
      await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: 'https://ronindaily.app' },
      })
    } catch { /* network error — fall through to sent state */ }
    setSent(true)
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div className="font-jp" style={{ fontSize: '2.2rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.7rem' }}>
        侍
      </div>
      <div style={{ fontSize: '0.63rem', letterSpacing: '0.38em', color: 'var(--text)', fontWeight: 500, textTransform: 'uppercase', marginBottom: '3rem' }}>
        Ronin Daily
      </div>

      {sent ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', textAlign: 'center', maxWidth: '280px', margin: 0, lineHeight: 1.7 }}>
          Check your email. A sign-in link has been sent.
        </p>
      ) : (
        <>
          <button onClick={onSignIn} className="commit-btn" style={{ width: '100%', maxWidth: '280px' }}>
            Continue with Google
          </button>

          <div style={{ width: '100%', maxWidth: '280px', borderTop: '1px solid var(--border)', margin: '1.75rem 0' }} />

          <div style={{ width: '100%', maxWidth: '280px' }}>
            <input
              className="input-bare"
              type="email"
              inputMode="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              style={{ width: '100%' }}
            />
            {error && (
              <div style={{ fontSize: '0.7rem', color: 'var(--red-bright)', marginTop: '0.4rem' }}>
                {error}
              </div>
            )}
          </div>

          <button
            onClick={handleEmailSubmit}
            className="commit-btn"
            style={{ width: '100%', maxWidth: '280px', marginTop: '1rem' }}
          >
            Continue with Email
          </button>
        </>
      )}
    </div>
  )
}

function profileToLocal(data) {
  const profile = {
    unit: data.unit,
    sex: data.sex,
    age: String(data.age),
    targetWeeks: String(data.target_weeks),
    weightLbs: String(data.start_weight),
    goalWeightLbs: String(data.goal_weight),
    heightCm: '',
    heightFt: '',
    heightIn: '',
  }
  if (data.unit === 'metric') {
    profile.heightCm = String(data.height_cm)
  } else {
    const totalIn = data.height_cm / 2.54
    profile.heightFt = String(Math.floor(totalIn / 12))
    profile.heightIn = String(Math.round(totalIn % 12))
  }
  return profile
}

function profileToDb(profile, userId, startDate) {
  let height_cm
  if (profile.unit === 'imperial') {
    const totalIn = parseFloat(profile.heightFt) * 12 + parseFloat(profile.heightIn || 0)
    height_cm = Math.round(totalIn * 2.54 * 10) / 10
  } else {
    height_cm = parseFloat(profile.heightCm)
  }
  return {
    id: userId,
    sex: profile.sex,
    unit: profile.unit,
    start_weight: parseFloat(profile.weightLbs),
    goal_weight: parseFloat(profile.goalWeightLbs),
    height_cm,
    age: parseInt(profile.age, 10),
    target_weeks: parseInt(profile.targetWeeks, 10),
    start_date: startDate.toISOString().split('T')[0],
  }
}

function clearLocal() {
  localStorage.removeItem('ronin_committed')
  localStorage.removeItem('ronin_profile')
  localStorage.removeItem('ronin_start')
  localStorage.removeItem('ronin_last_checkin')
}

export default function App() {
  const [screen, setScreen] = useState('loading')
  const [user, setUser] = useState(null)
  const [initialProfile, setInitialProfile] = useState(null)

  useEffect(() => {
    let settled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      settled = true
      if (!session) {
        clearLocal()
        setUser(null)
        setScreen('login')
        return
      }
      setUser(session.user)
      loadProfile(session.user.id)
    })

    // Fallback: if Supabase doesn't respond in 4s, use localStorage cache
    const timer = setTimeout(() => {
      if (!settled) {
        setScreen(localStorage.getItem('ronin_committed') ? 'dashboard' : 'login')
      }
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        setScreen(localStorage.getItem('ronin_committed') ? 'dashboard' : 'onboarding')
        return
      }

      const profile = profileToLocal(data)
      localStorage.setItem('ronin_profile', JSON.stringify(profile))
      localStorage.setItem('ronin_committed', 'true')
      localStorage.setItem('ronin_start', new Date(data.start_date).toISOString())

      const { data: checkins } = await supabase
        .from('checkins')
        .select('week_number, weight')
        .eq('user_id', userId)
        .order('week_number', { ascending: false })
        .limit(1)

      if (checkins?.length > 0) {
        const last = checkins[0]
        localStorage.setItem('ronin_last_checkin', String(last.week_number))
        const withCheckin = { ...profile, currentWeightLbs: String(last.weight) }
        localStorage.setItem('ronin_profile', JSON.stringify(withCheckin))
      }

      setScreen('dashboard')
    } catch {
      setScreen(localStorage.getItem('ronin_committed') ? 'dashboard' : 'onboarding')
    }
  }

  const handleCommit = async (data) => {
    const startDate = new Date()
    localStorage.setItem('ronin_profile', JSON.stringify(data))
    localStorage.setItem('ronin_committed', 'true')
    localStorage.setItem('ronin_start', startDate.toISOString())
    localStorage.removeItem('ronin_last_checkin')
    setInitialProfile(null)

    if (user) {
      try {
        await supabase.from('profiles').upsert(profileToDb(data, user.id, startDate))
      } catch { /* offline — localStorage cache is set */ }
    }

    setScreen('dashboard')
  }

  const handleAdjustGoal = () => {
    const stored = localStorage.getItem('ronin_profile')
    setInitialProfile(stored ? JSON.parse(stored) : null)
    localStorage.removeItem('ronin_committed')
    localStorage.removeItem('ronin_start')
    setScreen('onboarding')
  }

  const handleReset = async () => {
    if (user) {
      try {
        await supabase.from('checkins').delete().eq('user_id', user.id)
        await supabase.from('profiles').delete().eq('id', user.id)
      } catch { /* offline */ }
    }
    clearLocal()
    setInitialProfile(null)
    setScreen('onboarding')
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      // onAuthStateChange will fire with null session → clearLocal + login screen
    } catch {
      clearLocal()
      setUser(null)
      setScreen('login')
    }
  }

  const signInWithGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  if (screen === 'loading') return <LoadingScreen />
  if (screen === 'login') return <LoginScreen onSignIn={signInWithGoogle} />

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh' }}>
      {screen === 'onboarding' && (
        <Onboarding onCommit={handleCommit} initialProfile={initialProfile} />
      )}
      {screen === 'dashboard' && (
        <Dashboard onReset={handleReset} onAdjustGoal={handleAdjustGoal} onSignOut={handleSignOut} />
      )}
    </div>
  )
}
