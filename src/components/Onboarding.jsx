import { useState } from 'react'

const S = {
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
  logo: {
    textAlign: 'center',
    paddingBottom: '2.5rem',
  },
  kanji: {
    fontSize: '2.2rem',
    color: 'var(--red)',
    lineHeight: 1,
    marginBottom: '0.7rem',
  },
  wordmark: {
    fontSize: '0.63rem',
    letterSpacing: '0.38em',
    color: 'var(--text)',
    fontWeight: 500,
    textTransform: 'uppercase',
  },
  divider: {
    borderTop: '1px solid var(--border)',
    paddingTop: '1.4rem',
    marginBottom: '2rem',
  },
  tagline: {
    fontSize: '0.7rem',
    color: 'var(--text-2)',
    letterSpacing: '0.06em',
    lineHeight: 1.7,
  },
  fields: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.7rem',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.75rem',
  },
  unitLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-2)',
    paddingBottom: '0.45rem',
    flexShrink: 0,
  },
  sexRow: {
    display: 'flex',
    gap: '1px',
  },
  sexBtn: (active) => ({
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

export default function Onboarding({ onCommit, initialProfile = null }) {
  const [unit, setUnit] = useState(initialProfile?.unit || 'imperial')
  const [form, setForm] = useState({
    weightLbs:     initialProfile?.weightLbs     ?? '',
    heightFt:      initialProfile?.heightFt      ?? '',
    heightIn:      initialProfile?.heightIn      ?? '',
    heightCm:      initialProfile?.heightCm      ?? '',
    age:           initialProfile?.age           ?? '',
    sex:           initialProfile?.sex           ?? '',
    goalWeightLbs: initialProfile?.goalWeightLbs ?? '',
    targetWeeks:   initialProfile?.targetWeeks   ?? '12',
  })
  const [errors, setErrors] = useState({})

  const set = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => ({ ...p, [field]: null }))
  }

  const validate = () => {
    const e = {}
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
    if (!form.goalWeightLbs || isNaN(goal) || goal < 50 || goal >= w) e.goalWeightLbs = 'Must be below current weight'
    const weeks = parseInt(form.targetWeeks, 10)
    if (!form.targetWeeks || isNaN(weeks) || weeks < 4) e.targetWeeks = 'Minimum 4 weeks'
    return e
  }

  const handleCommit = () => {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    onCommit({ ...form, unit })
  }

  return (
    <div style={S.page}>
      {/* Logo */}
      <div style={S.logo}>
        <div className="font-jp" style={S.kanji}>侍</div>
        <div style={S.wordmark}>Ronin Daily</div>
      </div>

      {/* Header statement */}
      <div style={S.divider}>
        <p style={S.tagline}>
          There are no shortcuts. You know this.<br />
          Provide your data. The mission follows.
        </p>
      </div>

      {/* Form */}
      <div style={S.fields}>

        {/* Unit system */}
        <div>
          <div className="field-label">Units</div>
          <div style={{ display: 'flex', gap: '1px' }}>
            {['imperial', 'metric'].map((u) => (
              <button
                key={u}
                className={'toggle-btn' + (unit === u ? ' active' : '')}
                onClick={() => setUnit(u)}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Current weight */}
        <div>
          <div className="field-label">Current Weight</div>
          <div style={S.fieldRow}>
            <input
              className="input-bare"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={form.weightLbs}
              onChange={(e) => set('weightLbs', e.target.value)}
              style={{ width: '5rem' }}
            />
            <span style={S.unitLabel}>{unit === 'imperial' ? 'lbs' : 'kg'}</span>
          </div>
          {errors.weightLbs && <div className="field-error">{errors.weightLbs}</div>}
        </div>

        {/* Height */}
        <div>
          <div className="field-label">Height</div>
          {unit === 'imperial' ? (
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-end' }}>
              <div style={S.fieldRow}>
                <input
                  className="input-bare"
                  type="number"
                  inputMode="numeric"
                  placeholder="5"
                  value={form.heightFt}
                  onChange={(e) => set('heightFt', e.target.value)}
                  style={{ width: '3rem' }}
                />
                <span style={S.unitLabel}>ft</span>
              </div>
              <div style={S.fieldRow}>
                <input
                  className="input-bare"
                  type="number"
                  inputMode="numeric"
                  placeholder="10"
                  value={form.heightIn}
                  onChange={(e) => set('heightIn', e.target.value)}
                  style={{ width: '3rem' }}
                />
                <span style={S.unitLabel}>in</span>
              </div>
            </div>
          ) : (
            <div style={S.fieldRow}>
              <input
                className="input-bare"
                type="number"
                inputMode="decimal"
                placeholder="178"
                value={form.heightCm}
                onChange={(e) => set('heightCm', e.target.value)}
                style={{ width: '5rem' }}
              />
              <span style={S.unitLabel}>cm</span>
            </div>
          )}
          {(errors.heightFt || errors.heightCm) && (
            <div className="field-error">Required</div>
          )}
        </div>

        {/* Age */}
        <div>
          <div className="field-label">Age</div>
          <div style={S.fieldRow}>
            <input
              className="input-bare"
              type="number"
              inputMode="numeric"
              placeholder="35"
              value={form.age}
              onChange={(e) => set('age', e.target.value)}
              style={{ width: '4rem' }}
            />
            <span style={S.unitLabel}>years</span>
          </div>
          {errors.age && <div className="field-error">{errors.age}</div>}
        </div>

        {/* Sex */}
        <div>
          <div className="field-label">Sex</div>
          <div style={S.sexRow}>
            {['M', 'F'].map((s) => (
              <button key={s} style={S.sexBtn(form.sex === s)} onClick={() => set('sex', s)}>
                {s}
              </button>
            ))}
          </div>
          {errors.sex && <div className="field-error">{errors.sex}</div>}
        </div>

        {/* Goal weight */}
        <div>
          <div className="field-label">Goal Weight</div>
          <div style={S.fieldRow}>
            <input
              className="input-bare"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={form.goalWeightLbs}
              onChange={(e) => set('goalWeightLbs', e.target.value)}
              style={{ width: '5rem' }}
            />
            <span style={S.unitLabel}>{unit === 'imperial' ? 'lbs' : 'kg'}</span>
          </div>
          {errors.goalWeightLbs && <div className="field-error">{errors.goalWeightLbs}</div>}
        </div>

        {/* Timeline */}
        <div>
          <div className="field-label">Timeline</div>
          <div style={S.fieldRow}>
            <input
              className="input-bare"
              type="number"
              inputMode="numeric"
              placeholder="12"
              value={form.targetWeeks}
              onChange={(e) => set('targetWeeks', e.target.value)}
              style={{ width: '4rem' }}
            />
            <span style={S.unitLabel}>weeks</span>
          </div>
          {errors.targetWeeks && <div className="field-error">{errors.targetWeeks}</div>}
        </div>

        {/* Commit */}
        <div style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
          <button className="commit-btn" onClick={handleCommit}>
            Commit
          </button>
        </div>
      </div>
    </div>
  )
}
