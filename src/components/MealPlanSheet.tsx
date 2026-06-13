import { useState, useEffect, useCallback, useRef } from 'react'
import BottomSheet from './BottomSheet'
import GroceryListSheet from './GroceryListSheet'
import type { UnitSystem } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface MealPrefs {
  budget: 'budget' | 'standard' | 'flexible'
  restrictions: string[]
  equipment: string[]
  dislikes: string
}

interface MealPlanSheetProps {
  open: boolean
  onClose: () => void
  calorieTarget: number
  unit: UnitSystem
}

type Screen = 'prefs' | 'loading' | 'ready' | 'error'

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const
type MealSlot = typeof MEAL_SLOTS[number]

const RESTRICTION_OPTIONS = [
  { id: 'no_pork',     label: 'No Pork'     },
  { id: 'no_beef',     label: 'No Beef'     },
  { id: 'no_seafood',  label: 'No Seafood'  },
  { id: 'vegetarian',  label: 'Vegetarian'  },
  { id: 'vegan',       label: 'Vegan'       },
  { id: 'gluten_free', label: 'Gluten Free' },
  { id: 'dairy_free',  label: 'Dairy Free'  },
]

const EQUIPMENT_OPTIONS = [
  { id: 'no_grill',       label: 'No Grill'       },
  { id: 'no_oven',        label: 'No Oven'         },
  { id: 'microwave_only', label: 'Microwave Only'  },
]

// ── Storage helpers ───────────────────────────────────────────────────────────

function loadSavedPrefs(): MealPrefs | null {
  try { return JSON.parse(localStorage.getItem('ronin_meal_prefs') || 'null') as MealPrefs | null }
  catch { return null }
}

function loadCachedPlan(): MealPlanData | null {
  try { return JSON.parse(localStorage.getItem('ronin_meal_plan') || 'null') as MealPlanData | null }
  catch { return null }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function RefreshIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 10A9 9 0 1 1 10.5 1.1" />
      <polyline points="14,1 19,1 19,6" />
    </svg>
  )
}

function PrefsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MealPlanSheet({ open, onClose, calorieTarget, unit }: MealPlanSheetProps) {
  const [screen, setScreen] = useState<Screen>('prefs')
  const [mealPlan, setMealPlan] = useState<MealPlanData | null>(null)
  const [openDay, setOpenDay] = useState<number | null>(1)
  const [error, setError] = useState<string | null>(null)
  const [regenDays, setRegenDays] = useState<Set<number>>(new Set())
  const [groceryOpen, setGroceryOpen] = useState(false)

  // Preferences form state
  const [budget, setBudget] = useState<'budget' | 'standard' | 'flexible'>('standard')
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [equipment, setEquipment] = useState<string[]>([])
  const [dislikes, setDislikes] = useState('')

  const calorieTargetRef = useRef(calorieTarget)
  const unitRef = useRef(unit)
  calorieTargetRef.current = calorieTarget
  unitRef.current = unit

  const doGenerate = useCallback(async (prefs: MealPrefs) => {
    setScreen('loading')
    setError(null)
    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calorieTarget: calorieTargetRef.current,
          unit: unitRef.current,
          days: 7,
          prefs,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(d.error || `Server error (${res.status})`)
      }
      const data: MealPlanData = await res.json()
      localStorage.setItem('ronin_meal_plan', JSON.stringify(data))
      setMealPlan(data)
      setOpenDay(1)
      setScreen('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan.')
      setScreen('error')
    }
  }, [])

  const doRegenerateDay = useCallback(async (dayNum: number) => {
    setRegenDays(prev => new Set([...prev, dayNum]))
    try {
      const prefs = loadSavedPrefs()
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calorieTarget: calorieTargetRef.current,
          unit: unitRef.current,
          days: 1,
          dayNumber: dayNum,
          prefs: prefs ?? undefined,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { days: DayPlan[] }
      if (!data.days?.[0]) throw new Error('Empty response')
      const newDay: DayPlan = { ...data.days[0], day: dayNum }
      setMealPlan(prev => {
        if (!prev) return prev
        const updated: MealPlanData = {
          ...prev,
          days: prev.days.map(d => d.day === dayNum ? newDay : d),
        }
        localStorage.setItem('ronin_meal_plan', JSON.stringify(updated))
        return updated
      })
    } catch {
      // Silently fail — existing day is preserved
    } finally {
      setRegenDays(prev => {
        const next = new Set(prev)
        next.delete(dayNum)
        return next
      })
    }
  }, [])

  // Determine initial screen on open
  useEffect(() => {
    if (!open) return
    if (screen === 'loading') return  // generation in progress — don't restart

    const savedPrefs = loadSavedPrefs()
    if (savedPrefs) {
      setBudget(savedPrefs.budget)
      setRestrictions(savedPrefs.restrictions)
      setEquipment(savedPrefs.equipment)
      setDislikes(savedPrefs.dislikes)

      const cached = loadCachedPlan()
      if (cached && cached.calorieTarget === calorieTargetRef.current) {
        setMealPlan(cached)
        setScreen('ready')
      } else {
        doGenerate(savedPrefs)
      }
    } else {
      setScreen('prefs')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSaveAndGenerate = () => {
    const prefs: MealPrefs = { budget, restrictions, equipment, dislikes }
    localStorage.setItem('ronin_meal_prefs', JSON.stringify(prefs))
    doGenerate(prefs)
  }

  const handleRetry = () => {
    const saved = loadSavedPrefs()
    if (saved) doGenerate(saved)
    else setScreen('prefs')
  }

  const toggleRestriction = (id: string) =>
    setRestrictions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleEquipment = (id: string) =>
    setEquipment(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <BottomSheet open={open} onClose={onClose} title="Meal Plan">

      {/* ── PREFS SCREEN ──────────────────────────────────────────────────── */}
      {screen === 'prefs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {mealPlan && (
            <button
              onClick={() => setScreen('ready')}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.72rem', letterSpacing: '0.1em', cursor: 'pointer', padding: 0, textAlign: 'left', alignSelf: 'flex-start' }}
            >
              ← back to plan
            </button>
          )}

          <div>
            <div className="field-label">Budget</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['budget', 'standard', 'flexible'] as const).map(b => (
                <button
                  key={b}
                  className={`toggle-btn${budget === b ? ' active' : ''}`}
                  onClick={() => setBudget(b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="field-label">Dietary Restrictions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {RESTRICTION_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`toggle-btn${restrictions.includes(opt.id) ? ' active' : ''}`}
                  onClick={() => toggleRestriction(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="field-label">Equipment</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {EQUIPMENT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`toggle-btn${equipment.includes(opt.id) ? ' active' : ''}`}
                  onClick={() => toggleEquipment(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="field-label">Dislikes</div>
            <input
              className="input-bare"
              type="text"
              placeholder="e.g. mushrooms, lamb, spicy food"
              value={dislikes}
              onChange={e => setDislikes(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ paddingBottom: '0.5rem' }}>
            <button className="commit-btn" onClick={handleSaveAndGenerate}>
              Generate Plan
            </button>
          </div>
        </div>
      )}

      {/* ── LOADING SCREEN ────────────────────────────────────────────────── */}
      {screen === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0 3rem', gap: '1.5rem' }}>
          <div className="font-jp onboarding-kanji" style={{ fontSize: '2.8rem', color: 'var(--red)', lineHeight: 1 }}>
            侍
          </div>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.24em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Generating your plan...
          </div>
        </div>
      )}

      {/* ── ERROR SCREEN ──────────────────────────────────────────────────── */}
      {screen === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.65, maxWidth: '280px' }}>
            {error || 'Failed to generate plan. Check your connection.'}
          </div>
          <button className="commit-btn" onClick={handleRetry} style={{ maxWidth: '180px' }}>
            Try Again
          </button>
          <button
            onClick={() => setScreen('prefs')}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.72rem', letterSpacing: '0.1em', cursor: 'pointer', padding: 0 }}
          >
            change preferences
          </button>
        </div>
      )}

      {/* ── READY SCREEN ──────────────────────────────────────────────────── */}
      {screen === 'ready' && mealPlan && (
        <div>
          {/* Header: meta + prefs + refresh */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--text-3)' }}>
              7 days · {calorieTarget.toLocaleString()} cal/day
            </div>
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
              <button
                onClick={() => setScreen('prefs')}
                aria-label="Change preferences"
                title="Change preferences"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '0.25rem', display: 'flex', alignItems: 'center', lineHeight: 1 }}
              >
                <PrefsIcon />
              </button>
              <button
                onClick={() => doGenerate({ budget, restrictions, equipment, dislikes })}
                aria-label="Regenerate meal plan"
                title="Generate a new plan"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '0.25rem', display: 'flex', alignItems: 'center', lineHeight: 1 }}
              >
                <RefreshIcon />
              </button>
            </div>
          </div>

          {/* Day accordion */}
          {mealPlan.days.map(day => {
            const isOpen = openDay === day.day
            const isRegening = regenDays.has(day.day)
            return (
              <div key={day.day}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderTop: '1px solid var(--border)' }}>
                  <span
                    onClick={() => setOpenDay(isOpen ? null : day.day)}
                    style={{ fontSize: '0.78rem', letterSpacing: '0.18em', color: isOpen ? 'var(--text)' : 'var(--text-2)', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Day {day.day}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', minWidth: '5.5rem', textAlign: 'right' }}>
                      {isRegening ? '—' : day.totalCalories.toLocaleString() + ' cal'}
                    </span>

                    <button
                      onClick={() => { if (!isRegening) doRegenerateDay(day.day) }}
                      aria-label={`Regenerate day ${day.day}`}
                      disabled={isRegening}
                      style={{ background: 'none', border: 'none', cursor: isRegening ? 'default' : 'pointer', color: 'var(--text-3)', padding: '0.15rem', display: 'flex', alignItems: 'center', opacity: isRegening ? 0.35 : 1, lineHeight: 1 }}
                    >
                      <RefreshIcon size={11} />
                    </button>

                    <span
                      onClick={() => setOpenDay(isOpen ? null : day.day)}
                      style={{ fontSize: '0.85rem', color: 'var(--text-3)', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', cursor: 'pointer', userSelect: 'none' }}
                    >
                      ›
                    </span>
                  </div>
                </div>

                {isOpen && !isRegening && (
                  <div style={{ paddingBottom: '1.25rem' }}>
                    {MEAL_SLOTS.map((slot: MealSlot) => (
                      <div key={slot} style={{ marginBottom: '1.1rem' }}>
                        <div style={{ fontSize: '0.6rem', letterSpacing: '0.26em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                          {slot}
                        </div>
                        {day[slot].map((item, i) => (
                          <div
                            key={i}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.45rem 0', borderBottom: '1px solid var(--border)', gap: '0.75rem' }}
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

                {isOpen && isRegening && (
                  <div style={{ padding: '1rem 0 1.25rem', fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.12em' }}>
                    Regenerating...
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

          <div style={{ marginTop: '1.25rem', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setGroceryOpen(true)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                background: 'transparent',
                border: '1px solid var(--border-mid)',
                color: 'var(--text-2)',
                fontSize: '0.7rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, color 0.15s ease',
              }}
            >
              Grocery List
            </button>
          </div>
        </div>
      )}

      <GroceryListSheet
        open={groceryOpen}
        onClose={() => setGroceryOpen(false)}
        mealPlan={mealPlan}
      />

    </BottomSheet>
  )
}
