import { useState, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { UserProfile, UnitSystem, Sex } from '../types'
import { DEFAULT_ACTIVITIES } from '../utils/calculate'

const ACTIVITIES = [
  { id: 'walk',       emoji: '🚶', name: 'Walking'             },
  { id: 'bike',       emoji: '🚴', name: 'Cycling'             },
  { id: 'run',        emoji: '🏃', name: 'Running'             },
  { id: 'resistance', emoji: '💪', name: 'Resistance Training' },
  { id: 'bodyweight', emoji: '🤸', name: 'Bodyweight'          },
  { id: 'swim',       emoji: '🏊', name: 'Swimming'            },
  { id: 'boxing',     emoji: '🥊', name: 'Boxing'              },
  { id: 'yoga',       emoji: '🧘', name: 'Yoga'                },
] as const

interface OnboardingStyles {
  page: CSSProperties
  logo: CSSProperties
  kanji: CSSProperties
  wordmark: CSSProperties
  divider: CSSProperties
  tagline: CSSProperties
  fields: CSSProperties
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
    padding: '0 24px',
    paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
    paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
    overflowY: 'auto',
  },
  logo: { textAlign: 'center', paddingBottom: '2.5rem' },
  kanji: { fontSize: '2.2rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.7rem' },
  wordmark: { fontSize: '0.72rem', letterSpacing: '0.38em', color: 'var(--text)', fontWeight: 500, textTransform: 'uppercase' },
  divider: { borderTop: '1px solid var(--border)', paddingTop: '1.4rem', marginBottom: '2rem' },
  tagline: { fontSize: '0.82rem', color: 'var(--text-2)', letterSpacing: '0.06em', lineHeight: 1.7 },
  fields: { flex: 1, display: 'flex', flexDirection: 'column', gap: '1.7rem' },
  fieldRow: { display: 'flex', alignItems: 'flex-end', gap: '0.75rem' },
  unitLabel: { fontSize: '0.7rem', color: 'var(--text-2)', paddingBottom: '0.45rem', flexShrink: 0 },
  sexRow: { display: 'flex', gap: '1px' },
  sexBtn: (active: boolean): CSSProperties => ({
    width: '3.5rem',
    padding: '0.6rem 0',
    fontSize: '0.7rem',
    letterSpacing: '0.18em',
    fontFamily: 'Inter, sans-serif',
    background: active ? 'var(--red)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-2)',
    border: '1px solid ' + (active ? 'var(--red)' : 'var(--border-mid)'),
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),
}

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
    sex:           initialProfile?.sex           ?? saved?.sex      ?? '',
    goalWeightLbs: initialProfile?.goalWeightLbs ?? '',
    targetWeeks:   initialProfile?.targetWeeks   ?? '12',
  })
  const [activities, setActivities] = useState<string[]>(() => {
    if (initialProfile?.activities?.length) return initialProfile.activities
    if (saved?.activities?.length) return saved.activities
    return [...DEFAULT_ACTIVITIES]
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const weightRef    = useRef<HTMLInputElement>(null)
  const heightFtRef  = useRef<HTMLInputElement>(null)
  const heightInRef  = useRef<HTMLInputElement>(null)
  const heightCmRef  = useRef<HTMLInputElement>(null)
  const ageRef       = useRef<HTMLInputElement>(null)
  const goalRef      = useRef<HTMLInputElement>(null)
  const timelineRef  = useRef<HTMLInputElement>(null)

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
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    onCommit({ ...form, unit, sex: form.sex as Sex, activities })
  }

  return (
    <div style={S.page}>
      <div className="onboarding-inner">
        <div style={S.logo}>
          <div className="font-jp onboarding-kanji" style={S.kanji}>侍</div>
          <div className="onboarding-wordmark" style={S.wordmark}>Ronin Daily</div>
        </div>

        <div style={S.divider}>
          <p className="onboarding-tagline" style={S.tagline}>
            There are no shortcuts. You know this.<br />
            Provide your data. The mission follows.
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
        <div className="onboarding-fields" style={S.fields}>
          {/* Unit system */}
          <div>
            <div className="field-label">Units</div>
            <div style={{ display: 'flex', gap: '1px' }}>
              {(['imperial', 'metric'] as UnitSystem[]).map((u) => (
                <button key={u} className={'toggle-btn' + (unit === u ? ' active' : '')} onClick={() => setUnit(u)}>
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
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-end' }}>
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
                  <button key={s} className="onboarding-sex-btn" style={S.sexBtn(form.sex === s)} onClick={() => set('sex', s)}>{s}</button>
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
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.35rem', letterSpacing: '0.04em' }}>
                = {parseInt(form.targetWeeks, 10) * 7} days
              </div>
            )}
          </div>

          {/* Preferred Activities */}
          <div>
            <div className="field-label">Preferred Activities</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '0.85rem', letterSpacing: '0.04em', lineHeight: 1.6 }}>
              Select all you are willing to do. You can always adjust.
            </div>
            <div className="activity-grid">
              {ACTIVITIES.map(({ id, emoji, name }) => (
                <button
                  key={id}
                  type="button"
                  className={'toggle-btn activity-btn' + (activities.includes(id) ? ' active' : '')}
                  onClick={() => toggleActivity(id)}
                >
                  <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{emoji}</span>
                  <span style={{ fontSize: '0.58rem', letterSpacing: '0.08em', lineHeight: 1.2 }}>{name}</span>
                </button>
              ))}
            </div>
            {errors.activities && <div className="field-error" style={{ marginTop: '0.5rem' }}>{errors.activities}</div>}
          </div>

          {/* Commit */}
          <div style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
            <button type="button" className="commit-btn" onClick={handleCommit}>Commit</button>
          </div>
        </div>
        </form>
      </div>
    </div>
  )
}
