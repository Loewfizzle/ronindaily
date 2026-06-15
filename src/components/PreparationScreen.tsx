import { useState, useEffect, useRef } from 'react'
import { calculatePlan } from '../utils/calculate'
import type { UserProfile, MealPrefs } from '../types'
import MealPlanView from './MealPlanView'
import GroceryListView from './GroceryListView'

// ── KoiFish ───────────────────────────────────────────────────────────────────

function KoiFish() {
  return (
    <svg
      viewBox="0 0 580 370"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ color: 'var(--red)', width: '92vw', maxWidth: '700px', display: 'block' }}
    >
      <path fill="currentColor" d="
        M 52,185
        C 52,160 62,130 86,112
        C 110,94 148,88 188,88
        C 228,88 270,100 306,120
        C 334,136 352,158 356,172
        L 356,198
        C 352,212 334,234 306,250
        C 270,270 228,282 188,282
        C 148,282 110,276 86,258
        C 62,240 52,210 52,185
        Z
      " />
      <path fill="currentColor" d="
        M 356,172
        C 382,144 418,110 454,82
        C 480,60 508,40 534,24
        C 518,58 498,88 472,118
        C 444,150 416,170 386,180
        C 374,182 362,180 356,178
        Z
      " />
      <path fill="currentColor" d="
        M 356,198
        C 382,226 418,260 454,288
        C 480,310 508,330 534,346
        C 518,312 498,282 472,252
        C 444,220 416,200 386,190
        C 374,188 362,190 356,192
        Z
      " />
      <path fill="currentColor" d="
        M 88,112
        C 104,78 132,48 170,32
        C 204,18 246,16 282,30
        C 314,44 338,68 354,98
        C 332,78 304,64 272,62
        C 238,60 200,68 166,80
        C 134,92 110,104 88,112
        Z
      " />
      <path fill="currentColor" d="
        M 110,196
        C 122,224 128,256 124,280
        C 120,298 110,308 98,302
        C 82,294 70,264 68,236
        C 64,216 72,196 88,190
        Z
      " />
      <path fill="currentColor" d="
        M 268,274
        C 278,296 280,318 270,326
        C 260,330 246,318 240,298
        C 236,284 240,274 252,272
        Z
      " />
      <g stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5">
        <path d="M 362,168 C 386,142 416,108 452,78" />
        <path d="M 372,164 C 394,140 422,108 456,82" />
        <path d="M 382,164 C 402,142 426,116 456,90" />
        <path d="M 392,166 C 410,148 428,128 452,106" />
        <path d="M 400,170 C 414,154 428,136 446,116" />
      </g>
      <g stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5">
        <path d="M 362,202 C 386,228 416,262 452,292" />
        <path d="M 372,206 C 394,230 422,262 456,288" />
        <path d="M 382,206 C 402,228 426,254 456,280" />
        <path d="M 392,204 C 410,222 428,242 452,264" />
        <path d="M 400,200 C 414,216 428,234 446,254" />
      </g>
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4">
        <path d="M 118,108 C 128,80 148,52 176,36" />
        <path d="M 148,96 C 158,70 176,46 202,34" />
        <path d="M 178,88 C 186,64 200,44 224,32" />
        <path d="M 208,84 C 214,62 226,46 250,36" />
        <path d="M 238,82 C 244,62 254,48 274,40" />
        <path d="M 264,84 C 270,66 280,54 298,48" />
        <path d="M 290,92 C 296,76 306,66 322,62" />
        <path d="M 314,102 C 320,88 330,78 346,76" />
      </g>
      <g stroke="currentColor" strokeWidth="1.1" fill="none" opacity="0.7">
        <path d="M 118,116 Q 130,100 142,116" /><path d="M 142,116 Q 154,100 166,116" />
        <path d="M 166,116 Q 178,100 190,116" /><path d="M 190,116 Q 202,100 214,116" />
        <path d="M 214,116 Q 226,100 238,116" /><path d="M 238,116 Q 250,100 262,116" />
        <path d="M 262,116 Q 274,100 286,116" /><path d="M 286,116 Q 298,100 310,116" />
        <path d="M 104,140 Q 116,124 128,140" /><path d="M 128,140 Q 140,124 152,140" />
        <path d="M 152,140 Q 164,124 176,140" /><path d="M 176,140 Q 188,124 200,140" />
        <path d="M 200,140 Q 212,124 224,140" /><path d="M 224,140 Q 236,124 248,140" />
        <path d="M 248,140 Q 260,124 272,140" /><path d="M 272,140 Q 284,124 296,140" />
        <path d="M 296,140 Q 308,124 320,140" /><path d="M 320,140 Q 332,124 344,140" />
        <path d="M 92,164 Q 104,148 116,164" /><path d="M 116,164 Q 128,148 140,164" />
        <path d="M 140,164 Q 152,148 164,164" /><path d="M 164,164 Q 176,148 188,164" />
        <path d="M 188,164 Q 200,148 212,164" /><path d="M 212,164 Q 224,148 236,164" />
        <path d="M 236,164 Q 248,148 260,164" /><path d="M 260,164 Q 272,148 284,164" />
        <path d="M 284,164 Q 296,148 308,164" /><path d="M 308,164 Q 320,148 332,164" />
        <path d="M 332,164 Q 344,148 356,164" />
        <path d="M 92,188 Q 104,172 116,188" /><path d="M 116,188 Q 128,172 140,188" />
        <path d="M 140,188 Q 152,172 164,188" /><path d="M 164,188 Q 176,172 188,188" />
        <path d="M 188,188 Q 200,172 212,188" /><path d="M 212,188 Q 224,172 236,188" />
        <path d="M 236,188 Q 248,172 260,188" /><path d="M 260,188 Q 272,172 284,188" />
        <path d="M 284,188 Q 296,172 308,188" /><path d="M 308,188 Q 320,172 332,188" />
        <path d="M 332,188 Q 344,172 356,188" />
        <path d="M 92,212 Q 104,196 116,212" /><path d="M 116,212 Q 128,196 140,212" />
        <path d="M 140,212 Q 152,196 164,212" /><path d="M 164,212 Q 176,196 188,212" />
        <path d="M 188,212 Q 200,196 212,212" /><path d="M 212,212 Q 224,196 236,212" />
        <path d="M 236,212 Q 248,196 260,212" /><path d="M 260,212 Q 272,196 284,212" />
        <path d="M 284,212 Q 296,196 308,212" /><path d="M 308,212 Q 320,196 332,212" />
        <path d="M 332,212 Q 344,196 356,212" />
        <path d="M 100,236 Q 112,220 124,236" /><path d="M 124,236 Q 136,220 148,236" />
        <path d="M 148,236 Q 160,220 172,236" /><path d="M 172,236 Q 184,220 196,236" />
        <path d="M 196,236 Q 208,220 220,236" /><path d="M 220,236 Q 232,220 244,236" />
        <path d="M 244,236 Q 256,220 268,236" /><path d="M 268,236 Q 280,220 292,236" />
        <path d="M 292,236 Q 304,220 316,236" /><path d="M 316,236 Q 328,220 340,236" />
        <path d="M 110,258 Q 122,242 134,258" /><path d="M 134,258 Q 146,242 158,258" />
        <path d="M 158,258 Q 170,242 182,258" /><path d="M 182,258 Q 194,242 206,258" />
        <path d="M 206,258 Q 218,242 230,258" /><path d="M 230,258 Q 242,242 254,258" />
        <path d="M 254,258 Q 266,242 278,258" /><path d="M 278,258 Q 290,242 302,258" />
        <path d="M 302,258 Q 314,242 326,258" />
      </g>
      <path d="M 90,185 C 142,183 198,180 254,179 C 300,178 334,181 356,185"
            stroke="currentColor" strokeWidth="1" fill="none" opacity="0.35" strokeDasharray="5,3" />
      <circle cx="76" cy="175" r="10" fill="currentColor" />
      <circle cx="73" cy="172" r="4" fill="currentColor" opacity="0.25" />
      <path d="M 52,179 C 32,164 16,150 6,140" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 52,191 C 36,202 22,212 8,218" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PreparationScreenProps {
  onBegin: () => void
  onReset: () => void
  onAdjustGoal: () => void
}

// ── Shared page style (mobile base — desktop overrides via .prep-page class) ──

const pageBase = {
  minHeight: '100svh',
  background: 'var(--bg)',
  display: 'flex',
  flexDirection: 'column' as const,
  padding: '0 1.5rem',
  paddingTop: 'max(3rem, env(safe-area-inset-top))',
  paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PreparationScreen({ onBegin, onReset, onAdjustGoal }: PreparationScreenProps) {
  const [step, setStep]           = useState<1|2|3|4>(() => { const s = parseInt(sessionStorage.getItem('prep_step') || '1', 10); return (s >= 1 && s <= 4 ? s : 1) as 1|2|3|4 })
  const [direction, setDirection] = useState<'forward'|'back'>('forward')
  const [beginning, setBeginning] = useState(false)
  const [dishonorPhase, setDishonorPhase] = useState<'hidden' | 'showing' | 'hiding'>('hidden')
  const [extremeAccepted, setExtremeAccepted] = useState(() => !!localStorage.getItem('ronin_extreme_accepted'))
  const [mealBudget, setMealBudget] = useState<MealPrefs['budget']>(() => {
    try {
      const p = JSON.parse(localStorage.getItem('ronin_meal_prefs') || 'null') as MealPrefs | null
      return p?.budget ?? 'standard'
    } catch { return 'standard' }
  })
  const dishonorTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => {
    dishonorTimers.current.forEach(clearTimeout)
  }, [])

  const profile = (() => {
    try { return JSON.parse(localStorage.getItem('ronin_profile') || 'null') as UserProfile | null }
    catch { return null }
  })()

  const plan = profile ? calculatePlan(profile, new Date()) : null

  if (!plan) {
    return (
      <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1.5rem' }}>
        <div className="font-jp" style={{ fontSize: '3rem', color: 'var(--red)', lineHeight: 1 }}>備</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.75, maxWidth: '260px' }}>
          Mission data could not be loaded. Start over to reconfigure.
        </div>
        <button className="commit-btn" style={{ maxWidth: '200px' }} onClick={onReset}>
          Start Over
        </button>
      </div>
    )
  }

  const { unit, poundsToLose, calorieTarget, extremeMission, pacePerWeek } = plan

  const handleExtremeAccept = () => {
    const next = !extremeAccepted
    setExtremeAccepted(next)
    if (next) localStorage.setItem('ronin_extreme_accepted', '1')
    else localStorage.removeItem('ronin_extreme_accepted')
  }
  const targetWeeks = parseInt(profile!.targetWeeks, 10)

  const loseDisplay = unit === 'metric'
    ? `${(poundsToLose / 2.20462).toFixed(1)} kg`
    : `${Math.round(poundsToLose)} lbs`

  const paceDisplay = unit === 'metric'
    ? `${(pacePerWeek / 2.20462).toFixed(1)} kg`
    : `${pacePerWeek.toFixed(1)} lbs`

  const statBlocks = [
    { label: 'Daily Target', value: `${calorieTarget.toLocaleString()} cal` },
    { label: 'Duration',     value: `${targetWeeks} weeks` },
    { label: 'Start',        value: 'Your call.' },
  ]

  const go = (n: 1|2|3|4, dir: 'forward'|'back') => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setDirection(dir)
    setStep(n)
    sessionStorage.setItem('prep_step', String(n))
  }

  const triggerDishonor = () => {
    if (dishonorPhase === 'hiding') return
    dishonorTimers.current.forEach(clearTimeout)
    dishonorTimers.current = []
    localStorage.setItem('ronin_hesitated', 'true')
    setDishonorPhase('showing')
    dishonorTimers.current.push(
      setTimeout(() => setDishonorPhase('hiding'), 2500)
    )
  }

  const handleBeginClick = () => {
    if (beginning) return
    setBeginning(true)
    dishonorTimers.current.forEach(clearTimeout)
    dishonorTimers.current = []
    setDishonorPhase('hidden')
    sessionStorage.removeItem('prep_step')
    setTimeout(onBegin, 1000)
  }

  const stepAnim = direction === 'forward'
    ? 'stepEnterRight 0.3s ease'
    : 'stepEnterLeft 0.3s ease'

  return (
    <div style={{ position: 'relative', background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* Dishonor overlay */}
      {dishonorPhase !== 'hidden' && (
        <div
          onAnimationEnd={(e) => {
            if (e.animationName === 'dishonorBgOut') {
              setDishonorPhase('hidden')
              go(1, 'back')
            }
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#000000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: dishonorPhase === 'showing'
              ? 'dishonorBgIn 0.3s ease forwards'
              : 'dishonorBgOut 0.5s ease forwards',
          }}
        >
          {/* Ghost kanji watermark */}
          <div
            className="font-jp"
            style={{
              position: 'absolute', fontSize: '6rem', color: 'var(--red)',
              opacity: 0.08, lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
            }}
          >
            侍
          </div>

          {/* Text content */}
          <div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textAlign: 'center', padding: '0 2.5rem',
              animation: dishonorPhase === 'showing'
                ? 'dishonorTextIn 0.35s ease both 0.2s'
                : 'none',
            }}
          >
            <div style={{
              fontSize: '1.4rem', fontWeight: 300, letterSpacing: '0.2em',
              color: 'var(--text)', textTransform: 'uppercase', marginBottom: '1.25rem',
              whiteSpace: 'nowrap',
            }}>
              You were never a ronin.
            </div>

            {/* Animated red line */}
            <div style={{
              height: '1px', background: 'var(--red)', width: '100%',
              transformOrigin: 'left center', marginBottom: '1.25rem',
              animation: dishonorPhase === 'showing'
                ? 'dishonorLineExpand 0.4s ease both 0.2s'
                : 'none',
            }} />

            <div style={{
              fontSize: '2.5rem', fontWeight: 600, letterSpacing: '0.4em',
              color: 'var(--red-bright)', textTransform: 'uppercase',
            }}>
              Dishonor.
            </div>
          </div>
        </div>
      )}

      {/* Animated step wrapper */}
      <div key={step} style={{ animation: stepAnim }}>

        {/* ── STEP 1 — MISSION PARAMETERS ───────────────────────────────── */}
        {step === 1 && (
          <div
            className="prep-page"
            style={{
              ...pageBase,
              position: 'relative',
              paddingTop: 'max(4rem, env(safe-area-inset-top))',
            }}
          >
            {/* Koi ghost */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
              opacity: beginning ? 0 : 1,
              transition: beginning ? 'opacity 1s ease' : 'none',
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'koiPulse 8s ease-in-out infinite',
              }}>
                <div style={{ animation: 'koiSway 8s ease-in-out infinite' }}>
                  <KoiFish />
                </div>
              </div>
            </div>

            {/* Logo — above the card */}
            <div
              className="prep-logo"
              style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '2rem' }}
            >
              <div
                className="font-jp"
                style={{
                  fontSize: '5rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.75rem',
                  animation: 'kanjiPulse 4s ease-in-out infinite',
                }}
              >
                備
              </div>
              <div style={{
                fontSize: '1.1rem', letterSpacing: '0.44em', color: 'var(--text)',
                fontWeight: 500, textTransform: 'uppercase', marginBottom: '1.5rem',
              }}>
                Ronin Daily
              </div>
              <div style={{ width: '100%', height: '1px', background: 'var(--red)', opacity: 0.35 }} />
            </div>

            {/* Card */}
            <div
              className="prep-card"
              style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div style={{
                fontSize: '0.85rem', letterSpacing: '0.22em', color: 'var(--text-2)',
                textTransform: 'uppercase', marginTop: '1.5rem', marginBottom: '1.5rem',
              }}>
                Your Mission Is Set
              </div>

              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.9, letterSpacing: '0.02em' }}>
                  Lose {loseDisplay}.<br />
                  {targetWeeks} weeks.&nbsp; {calorieTarget.toLocaleString()} cal/day.
                </div>
              </div>

              <div style={{ width: '100%', maxWidth: '320px', borderTop: '1px solid var(--border)', marginBottom: '2rem' }} />

              <div style={{
                fontSize: '1rem', color: 'var(--text-2)', textAlign: 'center',
                maxWidth: '300px', lineHeight: 1.75, marginBottom: '1.5rem',
                letterSpacing: '0.02em', fontStyle: 'italic',
              }}>
                A warrior prepares before battle, not during it.
              </div>

              <div style={{
                fontSize: '0.9rem', color: 'var(--text-2)', textAlign: 'center',
                maxWidth: '280px', lineHeight: 1.85, marginBottom: '2.5rem',
              }}>
                Your mission begins when you are ready. Review your plan. Gather what you need. Return when prepared.
              </div>

              <div style={{ display: 'flex', gap: '1px', width: '100%', maxWidth: '400px', marginBottom: '1.25rem' }}>
                {statBlocks.map(({ label, value }) => (
                  <div key={label} style={{ flex: 1, background: 'var(--elevated)', padding: '1rem 0.75rem', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '0.75rem', letterSpacing: '0.22em', color: 'var(--text)',
                      textTransform: 'uppercase', marginBottom: '0.45rem',
                    }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 300, color: 'var(--text)', letterSpacing: '0.01em' }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <button
                  type="button"
                  onClick={onAdjustGoal}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-3)',
                    fontSize: '0.8rem', letterSpacing: '0.04em', cursor: 'pointer',
                    padding: 0, fontFamily: 'Inter, sans-serif',
                    minHeight: '44px', display: 'inline-flex', alignItems: 'center',
                  }}
                >
                  Edit goal →
                </button>
              </div>

              {extremeMission && (
                <div style={{ width: '100%', maxWidth: '400px', borderLeft: '2px solid var(--red)', background: 'var(--elevated)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.72rem', letterSpacing: '0.22em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    Extreme Mission
                  </div>
                  <div style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                    You are attempting to lose {loseDisplay} in {targetWeeks} weeks. That is {paceDisplay} per week — an aggressive pace that demands everything.
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.85, marginBottom: '1rem' }}>
                    Hunger will be present.<br />
                    Discomfort is the mission.<br />
                    Most will quit. You are not most people.
                  </div>
                  <button
                    type="button"
                    onClick={handleExtremeAccept}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%', fontFamily: 'Inter, sans-serif' }}
                  >
                    <div style={{
                      width: '15px', height: '15px', flexShrink: 0,
                      border: `1px solid ${extremeAccepted ? 'var(--red)' : 'var(--border-mid)'}`,
                      background: extremeAccepted ? 'var(--red)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.12s ease',
                    }}>
                      {extremeAccepted && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <polyline points="1.5,4.5 3.5,6.5 7.5,2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                      I understand the suffering required. I accept this mission.
                    </span>
                  </button>
                </div>
              )}

              <div style={{ width: '100%', maxWidth: '480px', paddingBottom: '0.5rem' }}>
                <button
                  type="button"
                  className="commit-btn"
                  onClick={() => go(2, 'forward')}
                  disabled={beginning || (extremeMission && !extremeAccepted)}
                  style={{ opacity: extremeMission && !extremeAccepted ? 0.4 : 1 }}
                >
                  Review Meal Plan →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 — MEAL PLAN ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="prep-page" style={pageBase}>
            <div className="prep-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => go(1, 'back')}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-3)',
                    fontSize: '0.8rem', letterSpacing: '0.04em', cursor: 'pointer',
                    padding: 0, fontFamily: 'Inter, sans-serif',
                    minHeight: '44px', display: 'inline-flex', alignItems: 'center',
                  }}
                >
                  ← Back
                </button>
              </div>
              <div style={{
                fontSize: '0.72rem', letterSpacing: '0.36em', color: 'var(--text)',
                textTransform: 'uppercase', marginBottom: '1.75rem',
              }}>
                Mission Rations
              </div>
              <MealPlanView
                calorieTarget={calorieTarget}
                unit={unit}
                onBudgetChange={setMealBudget}
                readyFooter={
                  <div style={{ marginTop: '1.5rem' }}>
                    {mealBudget === 'fast_food' ? (
                      <button type="button" className="commit-btn" onClick={() => go(4, 'forward')}>
                        I Am Ready. Continue →
                      </button>
                    ) : (
                      <button type="button" className="commit-btn" onClick={() => go(3, 'forward')}>
                        Build Grocery List →
                      </button>
                    )}
                  </div>
                }
              />
            </div>
          </div>
        )}

        {/* ── STEP 3 — GROCERY LIST ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="prep-page" style={pageBase}>
            <div className="prep-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => go(2, 'back')}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-3)',
                    fontSize: '0.8rem', letterSpacing: '0.04em', cursor: 'pointer',
                    padding: 0, fontFamily: 'Inter, sans-serif',
                    minHeight: '44px', display: 'inline-flex', alignItems: 'center',
                  }}
                >
                  ← Back
                </button>
              </div>
              <div style={{
                fontSize: '0.72rem', letterSpacing: '0.36em', color: 'var(--text)',
                textTransform: 'uppercase', marginBottom: '1.75rem',
              }}>
                Supply Run
              </div>
              <GroceryListView
                readyFooter={
                  <div style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="commit-btn" onClick={() => go(4, 'forward')} style={{ lineHeight: 1.65 }}>
                      I Have Everything.<br />I Am Ready. →
                    </button>
                  </div>
                }
              />
            </div>
          </div>
        )}

        {/* ── STEP 4 — FINAL COMMITMENT ─────────────────────────────────── */}
        {step === 4 && (() => {
          const hasMealPlan   = Boolean(localStorage.getItem('ronin_meal_plan'))
          const hasGrocery    = Boolean(localStorage.getItem('ronin_grocery_list'))
          return (
            <div
              className="prep-page"
              style={{
                ...pageBase,
                paddingTop: 'max(4rem, env(safe-area-inset-top))',
                paddingBottom: 'max(3rem, env(safe-area-inset-bottom))',
                opacity: beginning ? 0 : 1,
                transition: beginning ? 'opacity 0.8s ease' : 'none',
              }}
            >
              {/* Logo — above card */}
              <div className="prep-logo" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div
                  className="font-jp"
                  style={{
                    fontSize: '5rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.75rem',
                    animation: 'kanjiPulse 4s ease-in-out infinite',
                  }}
                >
                  侍
                </div>
                <div style={{
                  fontSize: '1.1rem', letterSpacing: '0.44em', color: 'var(--text)',
                  fontWeight: 500, textTransform: 'uppercase', marginBottom: '1.5rem',
                }}>
                  Ronin Daily
                </div>
                <div style={{ width: '100%', height: '1px', background: 'var(--red)', opacity: 0.35 }} />
              </div>

              {/* Card */}
              <div className="prep-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* YOUR MISSION recap block */}
                <div style={{ width: '100%', marginBottom: '2.25rem' }}>
                  <div style={{
                    fontSize: '0.9rem', letterSpacing: '0.3em', color: 'var(--text)',
                    textTransform: 'uppercase', marginBottom: '1.1rem',
                  }}>
                    Your Mission
                  </div>
                  <div style={{
                    border: '1px solid var(--border-mid)', background: 'var(--surface)',
                    padding: '1.75rem', display: 'flex', flexDirection: 'column',
                  }}>
                    {/* Goal */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--text-2)', textTransform: 'uppercase', flexShrink: 0 }}>Goal</span>
                      <span style={{ fontSize: '1rem', color: 'var(--text)', textAlign: 'right', lineHeight: 1.5 }}>Lose {loseDisplay} in {targetWeeks} weeks</span>
                    </div>
                    {/* Daily Target */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', paddingTop: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--text-2)', textTransform: 'uppercase', flexShrink: 0 }}>Daily Target</span>
                      <span style={{ fontSize: '1rem', color: 'var(--text)', textAlign: 'right', lineHeight: 1.5 }}>{calorieTarget.toLocaleString()} calories per day</span>
                    </div>
                    {/* Movement */}
                    {plan.movement.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', paddingTop: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--text-2)', textTransform: 'uppercase', flexShrink: 0, paddingTop: '0.15rem' }}>Movement</span>
                        <div style={{ textAlign: 'right' }}>
                          {plan.movement.map((m, i) => (
                            <div key={i} style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.7 }}>{m.text}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Meal Plan */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', paddingTop: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--text-2)', textTransform: 'uppercase', flexShrink: 0 }}>Meal Plan</span>
                      <span style={{ fontSize: '0.95rem', color: hasMealPlan ? 'var(--red)' : 'var(--text-3)', textAlign: 'right' }}>
                        {hasMealPlan ? 'Ready' : 'Not generated'}
                      </span>
                    </div>
                    {/* Grocery List — hidden for fast food (no grocery step) */}
                    {mealBudget !== 'fast_food' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', paddingTop: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--text-2)', textTransform: 'uppercase', flexShrink: 0 }}>Grocery List</span>
                        <span style={{ fontSize: '0.95rem', color: hasGrocery ? 'var(--red)' : 'var(--text-3)', textAlign: 'right' }}>
                          {hasGrocery ? 'Ready' : 'Not generated'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quote */}
                <div style={{
                  textAlign: 'center', padding: '2.5rem 0',
                  display: 'flex', flexDirection: 'column', gap: '0',
                }}>
                  {[
                    'Your mission begins now.',
                    'There is no pause. There is no mercy.',
                    'Only the work.',
                  ].map((line, i) => (
                    <div key={i} style={{
                      fontSize: '1.2rem', color: 'var(--text)',
                      lineHeight: 2.2, letterSpacing: '0.02em',
                    }}>
                      {line}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ width: '100%', maxWidth: '480px' }}>
                  <button
                    type="button"
                    className="commit-btn"
                    onClick={handleBeginClick}
                    disabled={beginning}
                  >
                    I Am Prepared. Begin.
                  </button>
                </div>

                {/* Dishonor link */}
                <div style={{ marginTop: '2rem', paddingBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={triggerDishonor}
                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.72rem', letterSpacing: '0.12em', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}
                  >
                    ← I am not ready.
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
