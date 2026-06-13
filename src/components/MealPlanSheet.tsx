import { useState, useEffect, useCallback, useRef } from 'react'
import BottomSheet from './BottomSheet'
import type { UnitSystem } from '../types'

interface MealItem {
  name: string
  portion: string
  calories: number
}

interface DayPlan {
  day: number
  breakfast: MealItem[]
  lunch: MealItem[]
  dinner: MealItem[]
  snacks: MealItem[]
  totalCalories: number
}

interface MealPlanData {
  days: DayPlan[]
  calorieTarget: number
  generatedAt: string
}

interface MealPlanSheetProps {
  open: boolean
  onClose: () => void
  calorieTarget: number
  unit: UnitSystem
}

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const
type MealSlot = typeof MEAL_SLOTS[number]

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 10A9 9 0 1 1 10.5 1.1" />
      <polyline points="14,1 19,1 19,6" />
    </svg>
  )
}

export default function MealPlanSheet({ open, onClose, calorieTarget, unit }: MealPlanSheetProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [mealPlan, setMealPlan] = useState<MealPlanData | null>(null)
  const [openDay, setOpenDay] = useState<number | null>(1)
  const [error, setError] = useState<string | null>(null)

  const calorieTargetRef = useRef(calorieTarget)
  const unitRef = useRef(unit)
  calorieTargetRef.current = calorieTarget
  unitRef.current = unit

  const generate = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calorieTarget: calorieTargetRef.current,
          unit: unitRef.current,
          days: 7,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || `Server error (${res.status})`)
      }
      const data: MealPlanData = await res.json()
      localStorage.setItem('ronin_meal_plan', JSON.stringify(data))
      setMealPlan(data)
      setOpenDay(1)
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!open) return
    try {
      const cached = JSON.parse(localStorage.getItem('ronin_meal_plan') || 'null') as MealPlanData | null
      if (cached && cached.calorieTarget === calorieTargetRef.current) {
        setMealPlan(cached)
        setStatus('ready')
        return
      }
    } catch { /* corrupt cache — fall through to generate */ }
    generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <BottomSheet open={open} onClose={onClose} title="Meal Plan">
      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0 3rem', gap: '1.5rem' }}>
          <div
            className="font-jp onboarding-kanji"
            style={{ fontSize: '2.8rem', color: 'var(--red)', lineHeight: 1 }}
          >
            侍
          </div>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.24em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Generating your plan...
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.65, maxWidth: '280px' }}>
            {error || 'Failed to generate plan. Check your connection.'}
          </div>
          <button
            className="commit-btn"
            onClick={generate}
            style={{ maxWidth: '180px' }}
          >
            Try Again
          </button>
        </div>
      )}

      {status === 'ready' && mealPlan && (
        <div>
          {/* Header row: meta + refresh */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--text-3)' }}>
              7 days · {calorieTarget.toLocaleString()} cal/day
            </div>
            <button
              onClick={generate}
              aria-label="Regenerate meal plan"
              title="Generate a new plan"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-3)',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
              }}
            >
              <RefreshIcon />
            </button>
          </div>

          {/* Day accordion */}
          {mealPlan.days.map((day) => {
            const isOpen = openDay === day.day
            return (
              <div key={day.day}>
                <div
                  onClick={() => setOpenDay(isOpen ? null : day.day)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 0',
                    borderTop: '1px solid var(--border)',
                    cursor: 'pointer',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', letterSpacing: '0.18em', color: isOpen ? 'var(--text)' : 'var(--text-2)', textTransform: 'uppercase' }}>
                    Day {day.day}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      {day.totalCalories.toLocaleString()} cal
                    </span>
                    <span style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-3)',
                      display: 'inline-block',
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.15s ease',
                    }}>›</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ paddingBottom: '1.25rem' }}>
                    {MEAL_SLOTS.map((slot: MealSlot) => (
                      <div key={slot} style={{ marginBottom: '1.1rem' }}>
                        <div style={{
                          fontSize: '0.6rem',
                          letterSpacing: '0.26em',
                          color: 'var(--text-3)',
                          textTransform: 'uppercase',
                          marginBottom: '0.5rem',
                        }}>
                          {slot}
                        </div>
                        {day[slot].map((item, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              padding: '0.45rem 0',
                              borderBottom: '1px solid var(--border)',
                              gap: '0.75rem',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.35 }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>
                                {item.portion}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', flexShrink: 0, paddingTop: '0.1rem' }}>
                              {item.calories}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.65, margin: 0 }}>
              Actual portions may vary. Hit your daily calorie number — that is what matters.
            </p>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
