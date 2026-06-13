import { useState } from 'react'
import { calculatePlan } from '../utils/calculate'
import type { UserProfile } from '../types'

interface PreparationScreenProps {
  onBegin: () => void
  onReset: () => void
}

function KoiFish() {
  return (
    <svg
      viewBox="0 0 400 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ color: 'var(--red)', width: '82vw', maxWidth: '600px', display: 'block' }}
    >
      {/* Body */}
      <path fill="currentColor" d="M 42,120 C 36,104 36,86 48,76 C 60,66 76,64 96,64 C 116,58 148,50 185,48 C 218,46 254,54 280,72 C 295,84 304,96 306,108 L 306,132 C 304,144 295,156 280,168 C 254,186 218,194 185,192 C 148,190 116,182 96,176 C 76,176 60,174 48,164 C 36,154 36,136 42,120 Z" />

      {/* Upper tail lobe */}
      <path fill="currentColor" d="M 306,112 C 320,98 338,78 354,56 C 362,44 368,36 372,28 C 366,44 356,66 348,84 C 340,100 338,110 340,118 C 338,116 328,114 306,112 Z" />

      {/* Lower tail lobe */}
      <path fill="currentColor" d="M 306,128 C 320,142 338,162 354,184 C 362,196 368,204 372,212 C 366,196 356,174 348,156 C 340,140 338,130 340,122 C 338,124 328,126 306,128 Z" />

      {/* Dorsal fin */}
      <path fill="currentColor" d="M 100,64 C 112,48 132,32 162,22 C 188,14 218,16 244,28 C 264,38 280,52 288,64 C 274,58 256,54 236,56 C 212,58 186,60 162,62 C 140,64 120,64 100,64 Z" />

      {/* Pectoral fin */}
      <path fill="currentColor" d="M 94,120 C 102,134 116,152 122,168 C 126,176 124,182 118,182 C 110,178 96,162 88,144 C 84,134 86,124 94,120 Z" />

      {/* Ventral fin */}
      <path fill="currentColor" d="M 252,188 C 258,198 260,210 254,216 C 246,220 236,214 230,204 C 226,196 228,188 234,187 C 240,186 246,187 252,188 Z" />

      {/* Tail fin rays */}
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.45">
        <path d="M 316,108 C 332,90 350,68 368,42" />
        <path d="M 323,110 C 338,94 356,74 372,50" />
        <path d="M 329,113 C 342,100 358,82 372,60" />
        <path d="M 316,132 C 332,150 350,172 368,198" />
        <path d="M 323,130 C 338,146 356,166 372,190" />
        <path d="M 329,127 C 342,140 358,158 372,180" />
      </g>

      {/* Dorsal fin rays */}
      <g stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.35">
        <path d="M 122,64 C 128,50 140,34 160,24" />
        <path d="M 144,62 C 150,46 162,30 182,22" />
        <path d="M 166,60 C 172,46 182,32 200,24" />
        <path d="M 188,58 C 194,46 202,34 218,28" />
        <path d="M 210,58 C 214,48 220,38 234,32" />
        <path d="M 232,58 C 236,50 242,42 254,38" />
        <path d="M 252,60 C 256,52 262,46 270,42" />
      </g>

      {/* Scale arcs — 6 rows */}
      <g stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.55">
        {/* Row 1 y≈80 */}
        <path d="M 116,80 Q 124,72 132,80" /><path d="M 132,80 Q 140,72 148,80" />
        <path d="M 148,80 Q 156,72 164,80" /><path d="M 164,80 Q 172,72 180,80" />
        <path d="M 180,80 Q 188,72 196,80" /><path d="M 196,80 Q 204,72 212,80" />
        <path d="M 212,80 Q 220,72 228,80" /><path d="M 228,80 Q 236,72 244,80" />
        <path d="M 244,80 Q 252,72 260,80" /><path d="M 260,80 Q 268,72 276,80" />
        {/* Row 2 y≈96 offset */}
        <path d="M 108,96 Q 116,88 124,96" /><path d="M 124,96 Q 132,88 140,96" />
        <path d="M 140,96 Q 148,88 156,96" /><path d="M 156,96 Q 164,88 172,96" />
        <path d="M 172,96 Q 180,88 188,96" /><path d="M 188,96 Q 196,88 204,96" />
        <path d="M 204,96 Q 212,88 220,96" /><path d="M 220,96 Q 228,88 236,96" />
        <path d="M 236,96 Q 244,88 252,96" /><path d="M 252,96 Q 260,88 268,96" />
        <path d="M 268,96 Q 276,88 284,96" />
        {/* Row 3 y≈112 */}
        <path d="M 108,112 Q 116,104 124,112" /><path d="M 124,112 Q 132,104 140,112" />
        <path d="M 140,112 Q 148,104 156,112" /><path d="M 156,112 Q 164,104 172,112" />
        <path d="M 172,112 Q 180,104 188,112" /><path d="M 188,112 Q 196,104 204,112" />
        <path d="M 204,112 Q 212,104 220,112" /><path d="M 220,112 Q 228,104 236,112" />
        <path d="M 236,112 Q 244,104 252,112" /><path d="M 252,112 Q 260,104 268,112" />
        <path d="M 268,112 Q 276,104 284,112" />
        {/* Row 4 y≈128 offset */}
        <path d="M 108,128 Q 116,120 124,128" /><path d="M 124,128 Q 132,120 140,128" />
        <path d="M 140,128 Q 148,120 156,128" /><path d="M 156,128 Q 164,120 172,128" />
        <path d="M 172,128 Q 180,120 188,128" /><path d="M 188,128 Q 196,120 204,128" />
        <path d="M 204,128 Q 212,120 220,128" /><path d="M 220,128 Q 228,120 236,128" />
        <path d="M 236,128 Q 244,120 252,128" /><path d="M 252,128 Q 260,120 268,128" />
        <path d="M 268,128 Q 276,120 284,128" />
        {/* Row 5 y≈144 */}
        <path d="M 116,144 Q 124,136 132,144" /><path d="M 132,144 Q 140,136 148,144" />
        <path d="M 148,144 Q 156,136 164,144" /><path d="M 164,144 Q 172,136 180,144" />
        <path d="M 180,144 Q 188,136 196,144" /><path d="M 196,144 Q 204,136 212,144" />
        <path d="M 212,144 Q 220,136 228,144" /><path d="M 228,144 Q 236,136 244,144" />
        <path d="M 244,144 Q 252,136 260,144" /><path d="M 260,144 Q 268,136 276,144" />
        {/* Row 6 y≈160 */}
        <path d="M 116,160 Q 124,152 132,160" /><path d="M 132,160 Q 140,152 148,160" />
        <path d="M 148,160 Q 156,152 164,160" /><path d="M 164,160 Q 172,152 180,160" />
        <path d="M 180,160 Q 188,152 196,160" /><path d="M 196,160 Q 204,152 212,160" />
        <path d="M 212,160 Q 220,152 228,160" /><path d="M 228,160 Q 236,152 244,160" />
        <path d="M 244,160 Q 252,152 260,160" />
      </g>

      {/* Lateral line */}
      <path d="M 96,120 C 140,118 185,116 230,118 C 260,119 280,120 298,120" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.3" strokeDasharray="4,3" />

      {/* Eye */}
      <circle cx="60" cy="112" r="6" fill="currentColor" />
      <circle cx="59" cy="110" r="2" fill="currentColor" opacity="0.3" />

      {/* Barbels */}
      <path d="M 42,116 C 28,108 16,102 8,96" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 42,124 C 30,128 18,132 10,134" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function PreparationScreen({ onBegin, onReset }: PreparationScreenProps) {
  const [beginning, setBeginning] = useState(false)

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

  const handleBeginClick = () => {
    setBeginning(true)
    setTimeout(onBegin, 1000)
  }

  const { unit, poundsToLose, calorieTarget } = plan
  const targetWeeks = parseInt(profile!.targetWeeks, 10)

  const loseDisplay = unit === 'metric'
    ? `${(poundsToLose / 2.20462).toFixed(1)} kg`
    : `${Math.round(poundsToLose)} lbs`

  const statBlocks = [
    { label: 'Daily Target', value: `${calorieTarget.toLocaleString()} cal` },
    { label: 'Duration',     value: `${targetWeeks} weeks` },
    { label: 'Start',        value: 'When you are ready' },
  ]

  return (
    <div style={{
      position: 'relative',
      minHeight: '100svh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 1.5rem',
      paddingTop: 'max(4rem, env(safe-area-inset-top))',
      paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
    }}>

      {/* Koi ghost — positioned behind all content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: beginning ? 0 : 1,
          transition: beginning ? 'opacity 1s ease' : 'none',
          animation: 'koiPulse 8s ease-in-out infinite',
        }}
      >
        <div style={{ animation: 'koiSway 8s ease-in-out infinite' }}>
          <KoiFish />
        </div>
      </div>

      {/* Content layer above koi */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>

        {/* Kanji — 備 means "prepare / ready" */}
        <div className="font-jp" style={{ fontSize: '4rem', color: 'var(--red)', lineHeight: 1, marginBottom: '1.5rem' }}>
          備
        </div>

        {/* Status label */}
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.32em', color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: '2rem' }}>
          Your Mission Is Set
        </div>

        {/* Goal — cold and factual */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.9, letterSpacing: '0.02em' }}>
            Lose {loseDisplay}.<br />
            {targetWeeks} weeks.&nbsp; {calorieTarget.toLocaleString()} cal/day.
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', maxWidth: '320px', borderTop: '1px solid var(--border)', marginBottom: '2rem' }} />

        {/* Brand statement */}
        <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', textAlign: 'center', maxWidth: '300px', lineHeight: 1.75, marginBottom: '1.5rem', letterSpacing: '0.02em' }}>
          A warrior prepares before battle, not during it.
        </div>

        {/* Instruction */}
        <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center', maxWidth: '280px', lineHeight: 1.85, marginBottom: '2.5rem' }}>
          Your mission begins when you are ready. Review your plan. Gather what you need. Return when prepared.
        </div>

        {/* Stat blocks */}
        <div style={{ display: 'flex', gap: '1px', width: '100%', maxWidth: '400px', marginBottom: '3.5rem' }}>
          {statBlocks.map(({ label, value }) => (
            <div key={label} style={{ flex: 1, background: 'var(--elevated)', padding: '1rem 0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                {label}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 300, color: 'var(--text)', letterSpacing: '0.01em' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Spacer pushes button to bottom */}
        <div style={{ flex: 1 }} />

        {/* Begin */}
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <button className="commit-btn" onClick={handleBeginClick} disabled={beginning}>
            I am prepared. Begin.
          </button>
        </div>

      </div>
    </div>
  )
}
