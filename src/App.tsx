import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'
import type { Database } from './types/database.types'
import type { UserProfile, Screen, ProfileRow } from './types'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="font-jp" style={{ fontSize: '2.2rem', color: 'var(--red)', lineHeight: 1 }}>侍</span>
    </div>
  )
}

interface LoginScreenProps {
  connectionError: boolean
}

function LoginScreen({ connectionError }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [sent, setSent]   = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError('Sign-in failed. Try again.')
  }

  const handleEmailSubmit = async () => {
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email.')
      return
    }
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: 'https://ronindaily.app' },
    })
    if (error) {
      setError('Sign-in failed. Try again.')
      return
    }
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

      {connectionError && !sent && (
        <div style={{ fontSize: '0.7rem', color: 'var(--red-bright)', marginBottom: '1.5rem', textAlign: 'center', letterSpacing: '0.04em' }}>
          Could not reach the server. Check your connection.
        </div>
      )}

      {sent ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', textAlign: 'center', maxWidth: '280px', margin: 0, lineHeight: 1.7 }}>
          Check your email. A sign-in link has been sent.
        </p>
      ) : (
        <>
          <button onClick={handleGoogleSignIn} className="commit-btn" style={{ width: '100%', maxWidth: '280px' }}>
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

function profileToLocal(data: ProfileRow): UserProfile {
  const profile: UserProfile = {
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
    const totalIn = Math.round(data.height_cm / 2.54)
    profile.heightFt = String(Math.floor(totalIn / 12))
    profile.heightIn = String(totalIn % 12)
  }
  return profile
}

function profileToDb(profile: UserProfile, userId: string, startDate: Date): ProfileInsert {
  let height_cm: number
  if (profile.unit === 'imperial') {
    const totalIn = parseFloat(profile.heightFt) * 12 + parseFloat(profile.heightIn || '0')
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
  localStorage.removeItem('ronin_streak')
}

export default function App() {
  const [screen, setScreen]               = useState<Screen>('loading')
  const [user, setUser]                   = useState<User | null>(null)
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(null)
  const [connectionError, setConnectionError] = useState(false)
  const [profileError, setProfileError]   = useState(false)

  useEffect(() => {
    let settled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      settled = true
      setConnectionError(false)
      if (!session) {
        clearLocal()
        setUser(null)
        setScreen('login')
        return
      }
      setUser(session.user)
      loadProfile(session.user.id)
    })

    const timer = setTimeout(() => {
      if (!settled) {
        const hasCache = !!localStorage.getItem('ronin_committed')
        if (!hasCache) setConnectionError(true)
        setScreen(hasCache ? 'dashboard' : 'login')
      }
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile(userId: string) {
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
      const [sy, sm, sd] = data.start_date.split('-').map(Number)
      localStorage.setItem('ronin_start', new Date(sy, sm - 1, sd).toISOString())

      const { data: checkins } = await supabase
        .from('checkins')
        .select('week_number, weight')
        .eq('user_id', userId)
        .order('week_number', { ascending: false })
        .limit(1)

      if (checkins && checkins.length > 0) {
        const last = checkins[0]
        localStorage.setItem('ronin_last_checkin', String(last.week_number))
        const withCheckin: UserProfile = { ...profile, currentWeightLbs: String(last.weight) }
        localStorage.setItem('ronin_profile', JSON.stringify(withCheckin))
      }

      setProfileError(false)
      setScreen('dashboard')
    } catch {
      setProfileError(true)
      setScreen(localStorage.getItem('ronin_committed') ? 'dashboard' : 'onboarding')
    }
  }

  const handleCommit = async (data: UserProfile) => {
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
    setInitialProfile(stored ? (JSON.parse(stored) as UserProfile) : null)
    localStorage.removeItem('ronin_committed')
    localStorage.removeItem('ronin_start')
    setScreen('onboarding')
  }

  const handleReset = async () => {
    if (user) {
      try {
        await supabase.from('daily_logs').delete().eq('user_id', user.id)
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
    } catch {
      clearLocal()
      setUser(null)
      setScreen('login')
    }
  }

  if (screen === 'loading') return <LoadingScreen />
  if (screen === 'login')   return <LoginScreen connectionError={connectionError} />

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh' }}>
      {screen === 'onboarding' && (
        <Onboarding onCommit={handleCommit} initialProfile={initialProfile} />
      )}
      {screen === 'dashboard' && (
        <Dashboard
          onReset={handleReset}
          onAdjustGoal={handleAdjustGoal}
          onSignOut={handleSignOut}
          connectionWarning={profileError ? 'Could not reach the server. Showing saved data.' : null}
        />
      )}
    </div>
  )
}
