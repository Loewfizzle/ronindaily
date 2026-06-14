import { useState, useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import LandingPage from './components/LandingPage'
import Onboarding from './components/Onboarding'
import PreparationScreen from './components/PreparationScreen'
import Dashboard from './components/Dashboard'
import type { Database } from './types/database.types'
import type { UserProfile, Screen, ProfileRow } from './types'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="font-jp" style={{ fontSize: '2.2rem', color: 'var(--red)', lineHeight: 1, animation: 'kanjiPulse 4s ease-in-out infinite' }}>侍</span>
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
      <div
        className="font-jp"
        style={{
          fontSize: '5rem',
          color: 'var(--red)',
          lineHeight: 1,
          marginBottom: '0.75rem',
          animation: 'kanjiPulse 4s ease-in-out infinite',
        }}
      >
        侍
      </div>
      <div style={{ fontSize: '1.1rem', letterSpacing: '0.44em', color: 'var(--text)', fontWeight: 500, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
        Ronin Daily
      </div>
      <div style={{ width: '100%', maxWidth: '320px', height: '1px', background: 'var(--red)', opacity: 0.35, marginBottom: '1.5rem' }} />

      {connectionError && !sent && (
        <div style={{ fontSize: '0.72rem', color: 'var(--red-bright)', marginBottom: '1.5rem', textAlign: 'center', letterSpacing: '0.04em', maxWidth: '320px' }}>
          Could not reach the server. Check your connection.
        </div>
      )}

      {sent ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', textAlign: 'center', maxWidth: '320px', margin: 0, lineHeight: 1.8 }}>
          Check your email. A sign-in link has been sent.
        </p>
      ) : (
        <>
          <button
            onClick={handleGoogleSignIn}
            className="commit-btn"
            style={{ width: '100%', maxWidth: '320px', padding: '0.85rem 1rem' }}
          >
            Continue with Google
          </button>

          <div style={{ width: '100%', maxWidth: '320px', display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '0.75rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <div style={{ width: '100%', maxWidth: '320px' }}>
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
              <div style={{ fontSize: '0.72rem', color: 'var(--red-bright)', marginTop: '0.45rem', letterSpacing: '0.02em' }}>
                {error}
              </div>
            )}
          </div>

          <button
            onClick={handleEmailSubmit}
            className="commit-btn"
            style={{ width: '100%', maxWidth: '320px', marginTop: '1rem', padding: '0.85rem 1rem' }}
          >
            Continue with Email
          </button>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textAlign: 'center', maxWidth: '320px', margin: '1rem 0 0', lineHeight: 1.7 }}>
            We only use your email to sign you in. No newsletters. No spam. Ever.
          </p>
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
    activities: data.activities ?? undefined,
  }
  if (data.unit === 'metric') {
    profile.heightCm = data.height_cm > 0 ? String(data.height_cm) : ''
  } else if (data.height_cm > 0) {
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
    activities: profile.activities ?? null,
  }
}

// Bump this string whenever the meal-plan prompt changes to force all clients to regenerate.
const PLAN_CACHE_VERSION = '2'
if (localStorage.getItem('ronin_plan_cache_version') !== PLAN_CACHE_VERSION) {
  localStorage.removeItem('ronin_meal_plan')
  localStorage.removeItem('ronin_grocery_list')
  localStorage.removeItem('ronin_grocery_checked')
  localStorage.setItem('ronin_plan_cache_version', PLAN_CACHE_VERSION)
}

function clearLocal() {
  localStorage.removeItem('ronin_committed')
  localStorage.removeItem('ronin_profile')
  localStorage.removeItem('ronin_start')
  localStorage.removeItem('ronin_last_checkin')
  localStorage.removeItem('ronin_streak')
  localStorage.removeItem('ronin_prepared')
  localStorage.removeItem('ronin_meal_plan')
  localStorage.removeItem('ronin_meal_prefs')
  localStorage.removeItem('ronin_grocery_list')
  localStorage.removeItem('ronin_grocery_checked')
  localStorage.removeItem('ronin_best_progress')
  localStorage.removeItem('ronin_goal_reached')
  localStorage.removeItem('ronin_skipped')
  localStorage.removeItem('ronin_plan_cache_version')
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (k?.startsWith('ronin_dismissed_activities_')) localStorage.removeItem(k)
    if (k?.startsWith('ronin_activity_log_')) localStorage.removeItem(k)
    if (k?.startsWith('ronin_cheat_meal_')) localStorage.removeItem(k)
  }
}

function resolveScreen(): 'dashboard' | 'preparation' | 'onboarding' {
  if (!localStorage.getItem('ronin_committed')) return 'onboarding'
  // null (legacy users who pre-date this flag) and 'true' both map to dashboard
  return localStorage.getItem('ronin_prepared') === 'false' ? 'preparation' : 'dashboard'
}

export default function App() {
  const [screen, setScreen]               = useState<Screen>('loading')
  const [user, setUser]                   = useState<User | null>(null)
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(null)
  const [connectionError, setConnectionError] = useState(false)
  const [profileError, setProfileError]   = useState(false)

  // Incremented by handleCommit to cancel any in-flight loadProfile calls.
  // Prevents a stale loadProfile response from overwriting the 'preparation' screen.
  const loadGen = useRef(0)

  useEffect(() => {
    let settled = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      settled = true
      setConnectionError(false)
      if (!session) {
        if (event === 'SIGNED_OUT') {
          clearLocal()
          setUser(null)
          setScreen('login')
          return
        }
        // Transient null session (token refresh failure etc.) — show landing only
        // for brand-new visitors who have never committed to a mission.
        setUser(null)
        setScreen(localStorage.getItem('ronin_committed') || localStorage.getItem('ronin_start') ? 'login' : 'landing')
        return
      }
      setUser(session.user)
      loadProfile(session.user.id)
    })

    const timer = setTimeout(() => {
      if (!settled) {
        const resolvedScreen = resolveScreen()
        if (resolvedScreen === 'onboarding') {
          setConnectionError(true)
          setScreen(localStorage.getItem('ronin_committed') ? 'login' : 'landing')
        } else {
          setScreen(resolvedScreen)
        }
      }
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile(userId: string) {
    const gen = ++loadGen.current
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (loadGen.current !== gen) return

      if (error || !data) {
        setScreen(resolveScreen())
        return
      }

      const profile = profileToLocal(data)
      localStorage.setItem('ronin_profile', JSON.stringify(profile))
      localStorage.setItem('ronin_committed', 'true')
      // ronin_prepared is intentionally NOT set here.
      // Only handleCommit (→ 'false') and handleBegin (→ 'true') own this flag.
      const [sy, sm, sd] = data.start_date.split('-').map(Number)
      localStorage.setItem('ronin_start', new Date(sy, sm - 1, sd).toISOString())

      const { data: checkins } = await supabase
        .from('checkins')
        .select('week_number, weight')
        .eq('user_id', userId)
        .order('week_number', { ascending: false })
        .limit(1)

      if (loadGen.current !== gen) return

      if (checkins && checkins.length > 0) {
        const last = checkins[0]
        localStorage.setItem('ronin_last_checkin', String(last.week_number))
        const withCheckin: UserProfile = { ...profile, currentWeightLbs: String(last.weight) }
        localStorage.setItem('ronin_profile', JSON.stringify(withCheckin))
      }

      setProfileError(false)
      setScreen(resolveScreen())
    } catch {
      if (loadGen.current !== gen) return
      setProfileError(true)
      setScreen(resolveScreen())
    }
  }

  const handleCommit = async (data: UserProfile) => {
    // Cancel any in-flight loadProfile so it cannot override the screen we set here
    loadGen.current++

    // If ronin_start already exists this is a goal adjustment mid-mission — keep start date
    const isGoalAdjustment = !!localStorage.getItem('ronin_start')

    localStorage.setItem('ronin_profile', JSON.stringify(data))
    localStorage.setItem('ronin_committed', 'true')
    localStorage.removeItem('ronin_last_checkin')
    setInitialProfile(null)

    if (isGoalAdjustment) {
      const startDate = new Date(localStorage.getItem('ronin_start')!)
      if (user) {
        try {
          await supabase.from('profiles').upsert(profileToDb(data, user.id, startDate))
        } catch { /* offline */ }
      }
      setScreen('dashboard')
    } else {
      // New mission — enter preparation period; start date is set only when BEGIN is hit
      localStorage.setItem('ronin_prepared', 'false')
      // Clear any cached plan data — calorie target may have changed
      localStorage.removeItem('ronin_meal_plan')
      localStorage.removeItem('ronin_meal_prefs')
      localStorage.removeItem('ronin_grocery_list')
      localStorage.removeItem('ronin_grocery_checked')
      setScreen('preparation')
    }
  }

  const handleBegin = async () => {
    const startDate = new Date()
    localStorage.setItem('ronin_start', startDate.toISOString())
    localStorage.setItem('ronin_prepared', 'true')

    const profileData = (() => {
      try { return JSON.parse(localStorage.getItem('ronin_profile') || 'null') as UserProfile | null }
      catch { return null }
    })()
    if (user && profileData) {
      try {
        await supabase.from('profiles').upsert(profileToDb(profileData, user.id, startDate))
      } catch { /* offline */ }
    }
    setScreen('dashboard')
  }

  const handleAdjustGoal = () => {
    // Cancel any in-flight loadProfile — without this bump, a slow loadProfile response
    // could complete after we navigate to onboarding, restore ronin_committed, and redirect
    // the user away before they finish entering the new goal.
    loadGen.current++
    const stored = localStorage.getItem('ronin_profile')
    let parsed: UserProfile | null = null
    try { parsed = stored ? (JSON.parse(stored) as UserProfile) : null } catch { /* corrupt data — start fresh */ }
    setInitialProfile(parsed)
    localStorage.removeItem('ronin_committed')
    // ronin_start intentionally preserved — handleCommit uses its presence to detect goal adjustment
    setScreen('onboarding')
  }

  const handleReset = async () => {
    if (user) {
      try {
        await supabase.from('activity_logs').delete().eq('user_id', user.id)
        await supabase.from('badges').delete().eq('user_id', user.id)
        await supabase.from('cheat_meals').delete().eq('user_id', user.id)
        await supabase.from('daily_logs').delete().eq('user_id', user.id)
        await supabase.from('checkins').delete().eq('user_id', user.id)
        await supabase.from('profiles').delete().eq('id', user.id)
      } catch { /* offline */ }
    }
    // Preserve physical stats across resets so user doesn't re-enter them
    try {
      const stored = localStorage.getItem('ronin_profile')
      if (stored) {
        const p: UserProfile = JSON.parse(stored)
        localStorage.setItem('ronin_personal_stats', JSON.stringify({
          age: p.age, sex: p.sex,
          heightCm: p.heightCm, heightFt: p.heightFt, heightIn: p.heightIn,
          unit: p.unit,
          activities: p.activities,
        }))
      }
    } catch { /* corrupt */ }
    clearLocal()
    setInitialProfile(null)
    setScreen('onboarding')
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch { /* ignore sign-out errors */ }
    clearLocal()
    localStorage.removeItem('ronin_personal_stats')
    setUser(null)
    setScreen('login')
  }

  if (screen === 'loading') return <LoadingScreen />
  if (screen === 'landing') return <LandingPage onBegin={() => setScreen('login')} />
  if (screen === 'login')   return <LoginScreen connectionError={connectionError} />

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100svh' }}>
      {screen === 'onboarding' && (
        <Onboarding onCommit={handleCommit} initialProfile={initialProfile} />
      )}
      {screen === 'preparation' && (
        <PreparationScreen onBegin={handleBegin} onReset={handleReset} onAdjustGoal={handleAdjustGoal} />
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
