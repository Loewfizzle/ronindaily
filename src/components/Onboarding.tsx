import { useState, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { UserProfile, UnitSystem, Sex } from '../types'
import { DEFAULT_ACTIVITIES } from '../utils/calculate'

// ── Activity icons ─────────────────────────────────────────────────────────────

const ip = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.5,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

const ACTIVITIES: { id: string; icon: ReactNode; name: string }[] = [
  {
    id: 'walk', name: 'Walking',
    icon: (
      <svg {...ip}>
        <circle cx="12" cy="3.5" r="1.8" />
        <path d="M12 5.3L10 11" />
        <path d="M10 8L14 7" />
        <path d="M10 11L7.5 17" />
        <path d="M10 11L13 16L16.5 17" />
      </svg>
    ),
  },
  {
    id: 'bike', name: 'Cycling',
    icon: (
      <svg {...ip}>
        <circle cx="6" cy="16.5" r="3.5" />
        <circle cx="18" cy="16.5" r="3.5" />
        <path d="M6 16.5L11 8L18 16.5" />
        <path d="M11 8L15.5 5.5" />
        <path d="M9.5 12.5h3.5" />
      </svg>
    ),
  },
  {
    id: 'run', name: 'Running',
    icon: (
      <svg {...ip}>
        <circle cx="15" cy="3.5" r="1.8" />
        <path d="M14 5.3L11 10" />
        <path d="M16.5 7.5L9 9.5" />
        <path d="M11 10L14.5 15.5L18.5 17" />
        <path d="M11 10L8.5 15.5L5 14.5" />
      </svg>
    ),
  },
  {
    id: 'resistance', name: 'Gym / Weights',
    icon: (
      <svg {...ip}>
        <rect x="1" y="10" width="3.5" height="4" rx="0.8" />
        <rect x="19.5" y="10" width="3.5" height="4" rx="0.8" />
        <line x1="4.5" y1="12" x2="19.5" y2="12" />
        <rect x="4" y="9" width="3" height="6" rx="0.5" />
        <rect x="17" y="9" width="3" height="6" rx="0.5" />
      </svg>
    ),
  },
  {
    id: 'bodyweight', name: 'No Equipment',
    icon: (
      <svg {...ip}>
        <circle cx="19.5" cy="6.5" r="1.8" />
        <path d="M18 7.5L13 9.5" />
        <path d="M13 9.5L11 14L7.5 14" />
        <path d="M7.5 14L4.5 10.5" />
        <path d="M13 9.5L12 13.5L10 17.5" />
      </svg>
    ),
  },
  {
    id: 'swim', name: 'Swimming',
    icon: (
      <svg {...ip}>
        <path d="M2 8C4 6 6 10 8 8s4-2 6 0 4 4 6 2" />
        <path d="M2 13C4 11 6 15 8 13s4-2 6 0 4 4 6 2" />
        <path d="M2 18C4 16 6 20 8 18s4-2 6 0 4 4 6 2" />
      </svg>
    ),
  },
  {
    id: 'boxing', name: 'Boxing / HIIT',
    icon: (
      <svg {...ip}>
        <path d="M7 9.5C7 6 9.5 4 12 4s5 2 5 5.5L16.5 15C16.5 17.5 14.5 19 12 19S7.5 17.5 7 15Z" />
        <path d="M7 11.5L17 11.5" />
        <path d="M12 4V11.5" />
        <path d="M6 9.5C4.5 9.5 3.5 8.5 3.5 7S4.5 4.5 6 4.5L7.5 5" />
      </svg>
    ),
  },
  {
    id: 'yoga', name: 'Yoga',
    icon: (
      <svg {...ip}>
        <circle cx="12" cy="3.5" r="1.8" />
        <path d="M12 5.3V9.5" />
        <path d="M12 9C8.5 9 6.5 11 7.5 13.5" />
        <path d="M12 9C15.5 9 17.5 11 16.5 13.5" />
        <path d="M7.5 13.5Q12 16.5 16.5 13.5" />
      </svg>
    ),
  },
]

// ── Styles ─────────────────────────────────────────────────────────────────────

interface OnboardingStyles {
  page: CSSProperties
  fieldRow: CSSProperties
  unitLabel: CSSProperties
  sexRow: CSSProperties
  sexBtn: (active: boolean) => CSSProperties
}

const S: OnboardingStyles = {
  page: {
    minHeight: '100svh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    padding: '0 1.5rem',
    paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
    paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))',
    overflowY: 'auto',
  },
  fieldRow: { display: 'flex', alignItems: 'flex-end', gap: '0.75rem' },
  unitLabel: { fontSize: '0.8rem', color: 'var(--text-2)', paddingBottom: '0.5rem', flexShrink: 0 },
  sexRow: { display: 'flex', gap: '1px' },
  sexBtn: (active: boolean): CSSProperties => ({
    width: '3.5rem',
    padding: '0.6rem 0',
    fontSize: '0.75rem',
    letterSpacing: '0.18em',
    fontFamily: 'Inter, sans-serif',
    background: active ? 'var(--red)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-2)',
    border: '1px solid ' + (active ? 'var(--red)' : 'var(--border-mid)'),
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface OnboardingForm {
  weightLbs: string
  heightFt: string
  heightIn: string
  heightCm: string
  age: string
  sex: string
  goalWeightLbs: string
  targetWeeks: string
}

interface FormErrors {
  weightLbs?: string
  heightFt?: string
  heightCm?: string
  age?: string
  sex?: string
  goalWeightLbs?: string
  targetWeeks?: string
  activities?: string
}

interface OnboardingProps {
  onCommit: (profile: UserProfile) => void
  initialProfile?: UserProfile | null
}

interface PersonalStats {
  age: string; sex: string
  heightCm: string; heightFt: string; heightIn: string
  unit: UnitSystem
  activities?: string[]
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Onboarding({ onCommit, initialProfile = null }: OnboardingProps) {
  const saved: PersonalStats | null = (() => {
    if (initialProfile !== null) return null
    try {
      const s = localStorage.getItem('ronin_personal_stats')
      return s ? (JSON.parse(s) as PersonalStats) : null
    } catch { return null }
  })()

  const [unit, setUnit] = useState<UnitSystem>(initialProfile?.unit ?? saved?.unit ?? 'imperial')
  const [form, setForm] = useState<OnboardingForm>({
    weightLbs:     initialProfile?.weightLbs     ?? '',
    heightFt:      initialProfile?.heightFt      ?? saved?.heightFt ?? '',
    heightIn:      initialProfile?.heightIn      ?? saved?.heightIn ?? '',
    heightCm:      initialProfile?.heightCm      ?? saved?.heightCm ?? '',
    age:           initialProfile?.age           ?? saved?.age      ?? '',
    sex:           initialProfile?.sex           ?? saved?.sex      ?? 'M',
    goalWeightLbs: initialProfile?.goalWeightLbs ?? '',
    targetWeeks:   initialProfile?.targetWeeks   ?? '12',
  })
  const [activities, setActivities] = useState<string[]>(() => {
    if (initialProfile?.activities?.length) return initialProfile.activities
    if (saved?.activities?.length) return saved.activities
    return ['walk']
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const weightRef   = useRef<HTMLInputElement>(null)
  const heightFtRef = useRef<HTMLInputElement>(null)
  const heightInRef = useRef<HTMLInputElement>(null)
  const heightCmRef = useRef<HTMLInputElement>(null)
  const ageRef      = useRef<HTMLInputElement>(null)
  const goalRef     = useRef<HTMLInputElement>(null)
  const timelineRef = useRef<HTMLInputElement>(null)

  const advance = (ref: React.RefObject<HTMLInputElement | null>) => ref.current?.focus()

  const set = (field: keyof OnboardingForm, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field as keyof FormErrors]) setErrors((p) => ({ ...p, [field]: undefined }))
  }

  const toggleActivity = (id: string) => {
    setActivities(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
    if (errors.activities) setErrors(p => ({ ...p, activities: undefined }))
  }

  const validate = (): FormErrors => {
    const e: FormErrors = {}
    const w = parseFloat(form.weightLbs)
    if (!form.weightLbs || isNaN(w) || w < 50 || w > 700) e.weightLbs = 'Enter valid weight'
    if (unit === 'imperial') {
      const ft = parseFloat(form.heightFt)
      if (!form.heightFt || isNaN(ft) || ft < 3 || ft > 8) e.heightFt = 'Required'
    } else {
      const cm = parseFloat(form.heightCm)
      if (!form.heightCm || isNaN(cm) || cm < 100 || cm > 250) e.heightCm = 'Required'
    }
    const age = parseInt(form.age, 10)
    if (!form.age || isNaN(age) || age < 18 || age > 100) e.age = 'Ages 18–100'
    if (!form.sex) e.sex = 'Required'
    const goal = parseFloat(form.goalWeightLbs)
    const minDiff = unit === 'metric' ? 0.5 : 1
    if (!form.goalWeightLbs || isNaN(goal) || goal < 50 || w - goal < minDiff)
      e.goalWeightLbs = unit === 'metric' ? 'Must be ≥ 0.5 kg less' : 'Must be ≥ 1 lb less'
    const weeks = parseInt(form.targetWeeks, 10)
    if (!form.targetWeeks || isNaN(weeks) || weeks < 4 || weeks > 104) e.targetWeeks = '4–104 weeks'
    if (activities.length === 0) e.activities = 'Select at least one activity'
    return e
  }

  const handleCommit = () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    onCommit({ ...form, unit, sex: form.sex as Sex, activities })
  }

  return (
    <div className="onboarding-page" style={S.page}>

      {/* Logo — sits above the form card on desktop */}
      <div className="onboarding-logo">
        <div
          className="font-jp"
          style={{ fontSize: '5rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.75rem', animation: 'kanjiPulse 4s ease-in-out infinite' }}
        >
          侍
        </div>
        <div style={{ fontSize: '1.1rem', letterSpacing: '0.44em', color: 'var(--text)', fontWeight: 500, textTransform: 'uppercase' }}>
          Ronin Daily
        </div>
      </div>

      {/* Form card */}
      <div className="onboarding-inner">

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginBottom: '2.25rem' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', letterSpacing: '0.04em', lineHeight: 1.75, margin: 0 }}>
            There are no shortcuts. You know this.<br />
            Provide your data. The mission follows.
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="onboarding-fields" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Unit system */}
            <div>
              <div className="field-label">Units</div>
              <div style={{ display: 'flex', gap: '1px' }}>
                {(['imperial', 'metric'] as UnitSystem[]).map((u) => (
                  <button key={u} type="button" className={'toggle-btn' + (unit === u ? ' active' : '')} onClick={() => setUnit(u)}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Current weight + Goal weight */}
            <div className="onboarding-weight-pair">
              <div>
                <div className="field-label">Current Weight</div>
                <div style={S.fieldRow}>
                  <input
                    ref={weightRef}
                    className="input-bare"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    enterKeyHint="next"
                    value={form.weightLbs}
                    onChange={(e) => {
                      set('weightLbs', e.target.value)
                      if (e.target.value.length >= 3) advance(goalRef)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advance(goalRef) } }}
                    style={{ width: '5rem' }}
                  />
                  <span className="onboarding-unit-label" style={S.unitLabel}>{unit === 'imperial' ? 'lbs' : 'kg'}</span>
                </div>
                {errors.weightLbs && <div className="field-error">{errors.weightLbs}</div>}
              </div>

              <div>
                <div className="field-label">Goal Weight</div>
                <div style={S.fieldRow}>
                  <input
                    ref={goalRef}
                    className="input-bare"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    enterKeyHint="next"
                    value={form.goalWeightLbs}
                    onChange={(e) => {
                      set('goalWeightLbs', e.target.value)
                      if (e.target.value.length >= 3) advance(unit === 'imperial' ? heightFtRef : heightCmRef)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advance(unit === 'imperial' ? heightFtRef : heightCmRef) } }}
                    style={{ width: '5rem' }}
                  />
                  <span className="onboarding-unit-label" style={S.unitLabel}>{unit === 'imperial' ? 'lbs' : 'kg'}</span>
                </div>
                {errors.goalWeightLbs && <div className="field-error">{errors.goalWeightLbs}</div>}
              </div>
            </div>

            {/* Height */}
            <div>
              <div className="field-label">Height</div>
              {unit === 'imperial' ? (
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
                  <div style={S.fieldRow}>
                    <input
                      ref={heightFtRef}
                      className="input-bare"
                      type="number"
                      inputMode="numeric"
                      placeholder="5"
                      enterKeyHint="next"
                      value={form.heightFt}
                      onChange={(e) => {
                        set('heightFt', e.target.value)
                        if (e.target.value.length >= 1) advance(heightInRef)
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advance(heightInRef) } }}
                      style={{ width: '3rem' }}
                    />
                    <span className="onboarding-unit-label" style={S.unitLabel}>ft</span>
                  </div>
                  <div style={S.fieldRow}>
                    <input
                      ref={heightInRef}
                      className="input-bare"
                      type="number"
                      inputMode="numeric"
                      placeholder="10"
                      enterKeyHint="next"
                      value={form.heightIn}
                      onChange={(e) => {
                        set('heightIn', e.target.value)
                        if (e.target.value.length >= 2 || (e.target.value.length === 1 && e.target.value !== '1')) advance(ageRef)
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advance(ageRef) } }}
                      style={{ width: '3rem' }}
                    />
                    <span className="onboarding-unit-label" style={S.unitLabel}>in</span>
                  </div>
                </div>
              ) : (
                <div style={S.fieldRow}>
                  <input
                    ref={heightCmRef}
                    className="input-bare"
                    type="number"
                    inputMode="decimal"
                    placeholder="178"
                    enterKeyHint="next"
                    value={form.heightCm}
                    onChange={(e) => {
                      set('heightCm', e.target.value)
                      if (e.target.value.length >= 3) advance(ageRef)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advance(ageRef) } }}
                    style={{ width: '5rem' }}
                  />
                  <span className="onboarding-unit-label" style={S.unitLabel}>cm</span>
                </div>
              )}
              {(errors.heightFt || errors.heightCm) && <div className="field-error">Required</div>}
            </div>

            {/* Age + Sex */}
            <div className="onboarding-sex-age-pair">
              <div>
                <div className="field-label">Age</div>
                <div style={S.fieldRow}>
                  <input
                    ref={ageRef}
                    className="input-bare"
                    type="number"
                    inputMode="numeric"
                    placeholder="35"
                    enterKeyHint="next"
                    value={form.age}
                    onChange={(e) => {
                      set('age', e.target.value)
                      if (e.target.value.length >= 2) advance(timelineRef)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); advance(timelineRef) } }}
                    style={{ width: '4rem' }}
                  />
                  <span className="onboarding-unit-label" style={S.unitLabel}>years</span>
                </div>
                {errors.age && <div className="field-error">{errors.age}</div>}
              </div>

              <div>
                <div className="field-label">Sex</div>
                <div style={S.sexRow}>
                  {(['M', 'F'] as Sex[]).map((s) => (
                    <button type="button" key={s} className="onboarding-sex-btn" style={S.sexBtn(form.sex === s)} onClick={() => set('sex', s)}>{s}</button>
                  ))}
                </div>
                {errors.sex && <div className="field-error">{errors.sex}</div>}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <div className="field-label">Timeline</div>
              <div style={S.fieldRow}>
                <input
                  ref={timelineRef}
                  className="input-bare"
                  type="number"
                  inputMode="numeric"
                  placeholder="12"
                  enterKeyHint="done"
                  value={form.targetWeeks}
                  onChange={(e) => set('targetWeeks', e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
                  style={{ width: '4rem' }}
                />
                <span className="onboarding-unit-label" style={S.unitLabel}>weeks</span>
              </div>
              {errors.targetWeeks && <div className="field-error">{errors.targetWeeks}</div>}
              {form.targetWeeks && parseInt(form.targetWeeks, 10) > 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.4rem', letterSpacing: '0.04em' }}>
                  = {parseInt(form.targetWeeks, 10) * 7} days
                </div>
              )}
            </div>

            {/* Preferred Activities */}
            <div>
              <div className="field-label">Preferred Activities</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '1rem', letterSpacing: '0.02em', lineHeight: 1.6 }}>
                Select all you are willing to do.
              </div>
              <div className="activity-grid">
                {ACTIVITIES.map(({ id, icon, name }) => (
                  <button
                    key={id}
                    type="button"
                    className={'toggle-btn activity-btn' + (activities.includes(id) ? ' active' : '')}
                    onClick={() => toggleActivity(id)}
                  >
                    <span style={{ lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
                    <span style={{ fontSize: '0.75rem', letterSpacing: '0.06em', lineHeight: 1.2 }}>{name}</span>
                  </button>
                ))}
              </div>
              {errors.activities && <div className="field-error" style={{ marginTop: '0.5rem' }}>{errors.activities}</div>}
            </div>

            {/* Commit */}
            <div style={{ paddingTop: '0.25rem', paddingBottom: '0.5rem' }}>
              <button type="button" className="commit-btn" onClick={handleCommit}>Commit</button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
