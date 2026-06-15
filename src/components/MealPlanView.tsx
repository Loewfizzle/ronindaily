import { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react'
import type { ReactNode } from 'react'
import type { UnitSystem, MealItem, DayPlan, MealPlanData, MealPrefs, MealSlot } from '../types'
import { MEAL_SLOTS } from '../types'
import ExportSheet from './ExportSheet'
import { awardBadge } from '../utils/badges'
import type { BadgeDef } from '../utils/badges'
import { supabase } from '../lib/supabase'

function ChevronIcon({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 18 18"
      fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{
        color: 'var(--text-3)', flexShrink: 0,
        transition: 'transform 0.2s ease',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      }}
    >
      <polyline points="6 4 12 9 6 14" />
    </svg>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BUDGET_OPTIONS: { id: MealPrefs['budget']; label: string }[] = [
  { id: 'raw_materials', label: 'Bare Bones'      },
  { id: 'budget',        label: 'Budget Friendly' },
  { id: 'standard',      label: 'Standard'        },
  { id: 'flexible',      label: 'No Limits'       },
  { id: 'fast_food',     label: 'Fast Food'       },
]

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
  { id: 'stovetop',      label: 'Stovetop'     },
  { id: 'oven',          label: 'Oven'         },
  { id: 'air_fryer',     label: 'Air Fryer'    },
  { id: 'blender',       label: 'Blender'      },
  { id: 'microwave',     label: 'Microwave'    },
  { id: 'no_equipment',  label: 'No Equipment' },
]

const MEAL_OPTIONS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch',     label: 'Lunch'     },
  { id: 'dinner',    label: 'Dinner'    },
  { id: 'snacks',    label: 'Snacks'    },
]

const BASE_PCT: Record<string, number> = {
  breakfast: 25,
  lunch:     33,
  dinner:    33,
  snacks:    9,
}

function calcMealAllocations(meals: string[], target: number): Record<string, number> {
  const totalPct = meals.reduce((s, m) => s + (BASE_PCT[m] ?? 0), 0)
  const raws     = meals.map(m => (BASE_PCT[m] / totalPct) * target)
  const floors   = raws.map(Math.floor)
  let rem        = target - floors.reduce((a, b) => a + b, 0)
  const fracs    = raws.map((r, i) => ({ i, frac: r - floors[i] }))
  fracs.sort((a, b) => b.frac - a.frac)
  fracs.slice(0, rem).forEach(f => floors[f.i]++)
  const result: Record<string, number> = {}
  meals.forEach((m, i) => { result[m] = floors[i] })
  return result
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadSavedPrefs(): MealPrefs | null {
  try { return JSON.parse(localStorage.getItem('ronin_meal_prefs') || 'null') as MealPrefs | null }
  catch { return null }
}

function loadCachedPlan(): MealPlanData | null {
  try { return JSON.parse(localStorage.getItem('ronin_meal_plan') || 'null') as MealPlanData | null }
  catch { return null }
}

function calcDayTotal(day: DayPlan): number {
  return MEAL_SLOTS.flatMap(s => day[s] ?? []).reduce((sum, it) => sum + it.calories, 0)
}

// ── Export helpers ────────────────────────────────────────────────────────────

function formatMealPlanText(mealPlan: MealPlanData, calorieTarget: number): string {
  const parts: string[] = [
    'WEEKLY MEAL PLAN — RONIN DAILY',
    `Daily Target: ${calorieTarget.toLocaleString()} calories`,
    '',
  ]
  for (const day of mealPlan.days) {
    parts.push(`DAY ${day.day}`)
    for (const slot of MEAL_SLOTS) {
      const items = day[slot] ?? []
      if (!items.length) continue
      const label = slot.charAt(0).toUpperCase() + slot.slice(1)
      const text = items.map((i: MealItem) => `${i.name} (${i.portion}) — ${i.calories} cal`).join(', ')
      parts.push(`${label}: ${text}`)
    }
    parts.push(`Total: ${day.totalCalories.toLocaleString()} cal`)
    parts.push('')
  }
  return parts.join('\n').trimEnd()
}

function printMealPlan(mealPlan: MealPlanData, calorieTarget: number): void {
  const daysHtml = mealPlan.days.map(day => {
    const slotsHtml = MEAL_SLOTS.map(slot => {
      const items = day[slot] ?? []
      if (!items.length) return ''
      const label = slot.charAt(0).toUpperCase() + slot.slice(1)
      const text = items.map((i: MealItem) =>
        `${i.name} <span class="portion">(${i.portion})</span> <span class="cal">— ${i.calories} cal</span>`
      ).join(', ')
      return `<p><strong>${label}:</strong> ${text}</p>`
    }).filter(Boolean).join('\n')

    return `<div class="day"><h2>Day ${day.day}</h2>${slotsHtml}<p class="total">Total: ${day.totalCalories.toLocaleString()} cal</p></div>`
  }).join('\n')

  const html = `<!DOCTYPE html><html><head>
<title>Weekly Meal Plan — Ronin Daily</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; color: #000; background: #fff; padding: 2rem; }
h1 { font-size: 1rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; }
.target { font-size: 0.85rem; color: #555; margin: 0.2rem 0 2rem; }
.day { margin-bottom: 1.25rem; padding-bottom: 1.25rem; border-bottom: 1px solid #ddd; }
h2 { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 0.6rem; }
p { font-size: 0.88rem; line-height: 1.6; margin-bottom: 0.3rem; }
.portion { color: #555; }
.cal { color: #666; }
.total { font-weight: 600; color: #333; margin-top: 0.5rem; border-top: 1px solid #eee; padding-top: 0.4rem; }
</style>
</head><body>
<h1>Ronin Daily</h1>
<p class="target">Weekly Meal Plan · ${calorieTarget.toLocaleString()} calories/day</p>
${daysHtml}
</body></html>`

  const w = window.open('', '_blank', 'width=700,height=900')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="1" x2="7" y2="9"/>
      <polyline points="4,4 7,1 10,4"/>
      <polyline points="1,9 1,13 13,13 13,9"/>
    </svg>
  )
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

// ── Props & handle ────────────────────────────────────────────────────────────

interface MealPlanViewProps {
  calorieTarget: number
  unit: UnitSystem
  readyFooter?: ReactNode
  onBadgesEarned?: (badges: BadgeDef[]) => void
}

export interface MealPlanViewHandle {
  goToPrefs: () => void
  refresh: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

const MealPlanView = forwardRef<MealPlanViewHandle, MealPlanViewProps>(function MealPlanView(
  { calorieTarget, unit, readyFooter, onBadgesEarned },
  ref,
) {
  type Screen = 'prefs' | 'loading' | 'ready' | 'error'

  const [screen, setScreen]         = useState<Screen>('prefs')
  const [mealPlan, setMealPlan]     = useState<MealPlanData | null>(null)
  const [openDay, setOpenDay]       = useState<number | null>(1)
  const [error, setError]           = useState<string | null>(null)
  const [regenSlots, setRegenSlots]   = useState<Set<string>>(new Set())
  const [regenErrors, setRegenErrors] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen]   = useState(false)
  const [regenConfirmOpen, setRegenConfirmOpen] = useState(false)
  const [slotToast, setSlotToast]     = useState<{ dayNum: number; slot: MealSlot; fading: boolean } | null>(null)
  const slotToastTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slotToastFadeTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [budget, setBudget]             = useState<MealPrefs['budget']>('standard')
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [equipment, setEquipment]       = useState<string[]>(['stovetop', 'microwave'])
  const [activeMeals, setActiveMeals]   = useState<string[]>(['breakfast', 'lunch', 'dinner', 'snacks'])
  const [mealSelectError, setMealSelectError] = useState(false)
  const [dislikes, setDislikes]         = useState('')
  const [description, setDescription]   = useState('')

  const calorieTargetRef    = useRef(calorieTarget)
  const unitRef             = useRef(unit)
  const mealPlanRef         = useRef<MealPlanData | null>(null)
  const onBadgesEarnedRef   = useRef(onBadgesEarned)
  calorieTargetRef.current  = calorieTarget
  unitRef.current           = unit
  mealPlanRef.current       = mealPlan
  onBadgesEarnedRef.current = onBadgesEarned

  const doGenerate = useCallback(async (prefs: MealPrefs) => {
    setScreen('loading')
    setError(null)
    try {
      let userId: string | undefined
      try {
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id
      } catch { /* offline */ }

      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calorieTarget: calorieTargetRef.current, unit: unitRef.current, days: 7, prefs, userId }),
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
      if (prefs.budget === 'raw_materials' && userId) {
        try {
          const newBadge = await awardBadge(userId, 'minimalist')
          if (newBadge) onBadgesEarnedRef.current?.([newBadge])
        } catch { /* offline */ }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan.')
      setScreen('error')
    }
  }, [])

  const doRegenerateSlot = useCallback(async (dayNum: number, slot: MealSlot) => {
    const key = `${dayNum}-${slot}`
    setRegenSlots(prev => new Set([...prev, key]))
    try {
      const prefs = loadSavedPrefs()
      const dayData = mealPlanRef.current?.days.find(d => d.day === dayNum)
      if (!dayData) throw new Error('Day not found')

      let slotUserId: string | undefined
      try {
        const { data: { user } } = await supabase.auth.getUser()
        slotUserId = user?.id
      } catch { /* offline */ }

      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calorieTarget: calorieTargetRef.current,
          unit: unitRef.current,
          slotName: slot,
          dayContext: dayData,
          prefs: prefs ?? undefined,
          userId: slotUserId,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { slot: MealItem[] }
      if (!data.slot?.length) throw new Error('Empty response')

      setMealPlan(prev => {
        if (!prev) return prev
        const updatedDays = prev.days.map(d => {
          if (d.day !== dayNum) return d
          const updatedDay: DayPlan = { ...d, [slot]: data.slot }
          updatedDay.totalCalories = calcDayTotal(updatedDay)
          return updatedDay
        })
        const updated: MealPlanData = { ...prev, days: updatedDays, generatedAt: new Date().toISOString() }
        localStorage.setItem('ronin_meal_plan', JSON.stringify(updated))
        return updated
      })
    } catch {
      setRegenErrors(prev => new Set([...prev, key]))
      setTimeout(() => setRegenErrors(prev => { const n = new Set(prev); n.delete(key); return n }), 3000)
    } finally {
      setRegenSlots(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }, [])

  const handleSlotRegenClick = useCallback((dayNum: number, slot: MealSlot) => {
    if (slotToastTimerRef.current) clearTimeout(slotToastTimerRef.current)
    if (slotToastFadeTimerRef.current) clearTimeout(slotToastFadeTimerRef.current)
    setSlotToast({ dayNum, slot, fading: false })
    slotToastFadeTimerRef.current = setTimeout(() => {
      setSlotToast(t => t ? { ...t, fading: true } : null)
    }, 1700)
    slotToastTimerRef.current = setTimeout(() => {
      setSlotToast(null)
      slotToastTimerRef.current = null
      doRegenerateSlot(dayNum, slot)
    }, 2000)
  }, [doRegenerateSlot])

  const handleUndoSlotRegen = useCallback(() => {
    if (slotToastTimerRef.current) { clearTimeout(slotToastTimerRef.current); slotToastTimerRef.current = null }
    if (slotToastFadeTimerRef.current) { clearTimeout(slotToastFadeTimerRef.current); slotToastFadeTimerRef.current = null }
    setSlotToast(null)
  }, [])

  useEffect(() => () => {
    if (slotToastTimerRef.current) clearTimeout(slotToastTimerRef.current)
    if (slotToastFadeTimerRef.current) clearTimeout(slotToastFadeTimerRef.current)
  }, [])

  useEffect(() => {
    const savedPrefs = loadSavedPrefs()
    if (savedPrefs) {
      setBudget(savedPrefs.budget)
      setRestrictions(savedPrefs.restrictions)
      setEquipment(savedPrefs.equipment)
      setActiveMeals(savedPrefs.activeMeals ?? ['breakfast', 'lunch', 'dinner', 'snacks'])
      setDislikes(savedPrefs.dislikes ?? '')
      setDescription(savedPrefs.description ?? '')

      const cached = loadCachedPlan()
      if (cached && cached.calorieTarget === calorieTargetRef.current && cached.days?.length > 0) {
        setMealPlan(cached)
        setScreen('ready')
      } else {
        doGenerate(savedPrefs)
      }
    } else {
      setScreen('prefs')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveAndGenerate = () => {
    const mealAllocations = calcMealAllocations(activeMeals, calorieTarget)
    const prefs: MealPrefs = { budget, restrictions, equipment, activeMeals, mealAllocations, dislikes, description }
    localStorage.setItem('ronin_meal_prefs', JSON.stringify(prefs))
    doGenerate(prefs)
  }

  const handleRetry = () => {
    const saved = loadSavedPrefs()
    if (saved) doGenerate(saved)
    else setScreen('prefs')
  }

  useImperativeHandle(ref, () => ({
    goToPrefs: () => setScreen('prefs'),
    refresh: () => {
      const p = loadSavedPrefs()
      if (!p) { setScreen('prefs'); return }
      if (mealPlanRef.current) setRegenConfirmOpen(true)
      else doGenerate(p)
    },
  }), [doGenerate])

  const toggleRestriction = (id: string) =>
    setRestrictions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleEquipment = (id: string) =>
    setEquipment(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (id === 'no_equipment') return ['no_equipment']
      return [...prev.filter(x => x !== 'no_equipment'), id]
    })

  const toggleMeal = (id: string) => {
    setActiveMeals(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          setMealSelectError(true)
          setTimeout(() => setMealSelectError(false), 2500)
          return prev
        }
        return prev.filter(x => x !== id)
      }
      return [...prev, id]
    })
  }

  const dayRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const budgetLabel = useMemo(
    () => BUDGET_OPTIONS.find(b => b.id === budget)?.label ?? budget,
    [budget]
  )

  // ── Prefs screen ──────────────────────────────────────────────────────────────

  if (screen === 'prefs') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {mealPlan && (
        <button
          onClick={() => setScreen('ready')}
          style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.8rem', letterSpacing: '0.1em', cursor: 'pointer', padding: '0 0.5rem', textAlign: 'left', alignSelf: 'flex-start', minHeight: '44px', display: 'flex', alignItems: 'center' }}
        >
          ← back to plan
        </button>
      )}

      <div>
        <div className="field-label">Budget</div>
        <div style={{ display: 'flex' }}>
          {BUDGET_OPTIONS.map((b, i) => {
            const isSelected = budget === b.id
            const isFirst = i === 0
            const isLast = i === BUDGET_OPTIONS.length - 1
            return (
              <button
                key={b.id}
                onClick={() => setBudget(b.id)}
                style={{
                  flex: 1,
                  padding: '0.55rem 0.2rem',
                  minHeight: '44px',
                  fontSize: '0.75rem',
                  lineHeight: 1.25,
                  letterSpacing: '0.02em',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  background: isSelected ? 'var(--red)' : 'transparent',
                  color: isSelected ? 'var(--text)' : 'var(--text-2)',
                  border: `1px solid ${isSelected ? 'var(--red)' : 'var(--border-mid)'}`,
                  marginLeft: i > 0 ? -1 : 0,
                  position: 'relative',
                  zIndex: isSelected ? 1 : 0,
                  borderRadius: isFirst ? '3px 0 0 3px' : isLast ? '0 3px 3px 0' : 0,
                  transition: 'background 0.12s ease, color 0.12s ease',
                }}
              >
                {b.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="field-label">Meals You Eat</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
          Deselect meals you skip. Calories redistribute automatically.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {MEAL_OPTIONS.map(opt => {
            const isSelected = activeMeals.includes(opt.id)
            return (
              <button
                key={opt.id}
                onClick={() => toggleMeal(opt.id)}
                style={{
                  borderRadius: '999px',
                  padding: '0.4rem 1rem',
                  minHeight: '44px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  background: isSelected ? 'var(--red)' : 'transparent',
                  color: isSelected ? 'var(--text)' : 'var(--text-2)',
                  border: isSelected ? '1px solid transparent' : '1px solid var(--border-mid)',
                  transition: 'background 0.12s ease, color 0.12s ease',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        {mealSelectError && (
          <div style={{ fontSize: '0.78rem', color: 'var(--red-bright)', marginTop: '0.5rem' }}>
            Select at least one meal.
          </div>
        )}
      </div>

      <div>
        <div className="field-label">Dietary Restrictions</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {RESTRICTION_OPTIONS.map(opt => {
            const isSelected = restrictions.includes(opt.id)
            return (
              <button
                key={opt.id}
                onClick={() => toggleRestriction(opt.id)}
                style={{
                  borderRadius: '999px',
                  padding: '0.4rem 1rem',
                  minHeight: '44px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  background: isSelected ? 'var(--red)' : 'transparent',
                  color: isSelected ? 'var(--text)' : 'var(--text-2)',
                  border: isSelected ? '1px solid transparent' : '1px solid var(--border-mid)',
                  transition: 'background 0.12s ease, color 0.12s ease',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="field-label">Available Equipment</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {EQUIPMENT_OPTIONS.map(opt => {
            const isSelected = equipment.includes(opt.id)
            return (
              <button
                key={opt.id}
                onClick={() => toggleEquipment(opt.id)}
                style={{
                  borderRadius: '999px',
                  padding: '0.4rem 1rem',
                  minHeight: '44px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  background: isSelected ? 'var(--red)' : 'transparent',
                  color: isSelected ? 'var(--text)' : 'var(--text-2)',
                  border: isSelected ? '1px solid transparent' : '1px solid var(--border-mid)',
                  transition: 'background 0.12s ease, color 0.12s ease',
                }}
              >
                {opt.label}
              </button>
            )
          })}
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

      <div>
        <div className="field-label">Describe Your Ideal Meals</div>
        <textarea
          className="input-bare"
          placeholder="e.g. I love Mexican food, I meal prep on Sundays, I skip breakfast most days, I want high protein..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          style={{ width: '100%', resize: 'vertical', lineHeight: 1.7, display: 'block', paddingTop: '0.5rem' }}
        />
      </div>

      <div style={{ paddingBottom: '0.5rem' }}>
        <button className="commit-btn" onClick={handleSaveAndGenerate}>Generate Plan</button>
      </div>
    </div>
  )

  // ── Loading screen ────────────────────────────────────────────────────────────

  if (screen === 'loading') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0 2rem' }}>
      <div className="font-jp" style={{ fontSize: '5rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.75rem', animation: 'kanjiPulse 4s ease-in-out infinite' }}>侍</div>
      <div style={{ fontSize: '1.1rem', letterSpacing: '0.44em', color: 'var(--text)', fontWeight: 500, textTransform: 'uppercase', marginBottom: '1.25rem' }}>
        Ronin Daily
      </div>
      <div style={{ width: '100%', height: '1px', background: 'var(--red)', opacity: 0.35, marginBottom: '1.5rem' }} />
      <div style={{ fontSize: '1rem', letterSpacing: '0.24em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
        Generating your plan...
      </div>
    </div>
  )

  // ── Error screen ──────────────────────────────────────────────────────────────

  if (screen === 'error') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '1.25rem' }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.65, maxWidth: '280px' }}>
        {error || 'Failed to generate plan. Check your connection.'}
      </div>
      <button className="commit-btn" onClick={handleRetry} style={{ maxWidth: '180px' }}>Try Again</button>
      <button onClick={() => setScreen('prefs')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.8rem', letterSpacing: '0.1em', cursor: 'pointer', padding: 0 }}>
        change preferences
      </button>
    </div>
  )

  // ── Ready screen ──────────────────────────────────────────────────────────────

  if (!mealPlan) return null

  const handleDayClick = (dayNum: number) => {
    const willOpen = openDay !== dayNum
    setOpenDay(willOpen ? dayNum : null)
    if (willOpen) {
      requestAnimationFrame(() => {
        dayRefs.current[dayNum]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  return (
    <>
    <div>
      {/* Hero stat block */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>
          {calorieTarget.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginTop: '0.35rem' }}>
          cal / day
        </div>
        <div style={{ height: '1px', background: 'var(--red)', margin: '1.25rem 0 1.25rem' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Duration</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>7 days</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Budget</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{budgetLabel}</div>
          </div>
        </div>
        <button onClick={() => setExportOpen(true)} className="ghost-btn">
          Export Plan
        </button>
      </div>

      {/* Day accordion */}
      {mealPlan.days.map(day => {
        const isOpen       = openDay === day.day
        const anySlotRegen = Array.from(regenSlots).some(k => k.startsWith(`${day.day}-`))

        return (
          <div key={day.day} ref={el => { dayRefs.current[day.day] = el }}>
            {/* Day header row — full row is clickable */}
            <div
              onClick={() => handleDayClick(day.day)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.1rem 0', borderTop: '1px solid var(--border)',
                cursor: 'pointer', userSelect: 'none',
              }}
            >
              <span style={{
                fontSize: '0.88rem', letterSpacing: '0.18em', textTransform: 'uppercase',
                color: isOpen ? 'var(--text)' : 'var(--text-2)',
                fontWeight: isOpen ? 500 : 300,
              }}>
                Day {day.day}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', minWidth: '5.5rem', textAlign: 'right' }}>
                  {day.totalCalories.toLocaleString()} cal
                </span>
                <ChevronIcon open={isOpen} />
              </div>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{
                borderLeft: '2px solid var(--red)',
                paddingLeft: '1rem',
                paddingBottom: '1.5rem',
                marginBottom: '0.25rem',
              }}>
                <>
                  {(() => {
                    const visibleSlots = MEAL_SLOTS.filter(s => (day[s] ?? []).length > 0 || regenSlots.has(`${day.day}-${s}`))
                    return visibleSlots.map((slot: MealSlot, slotIdx: number) => {
                    const slotKey      = `${day.day}-${slot}`
                    const isSlotRegen  = regenSlots.has(slotKey)
                    const isSlotError  = regenErrors.has(slotKey)
                    const items        = day[slot] ?? []

                    return (
                      <div
                        key={slot}
                        style={{
                          paddingTop: slotIdx > 0 ? '0.7rem' : '0.5rem',
                          borderTop: slotIdx > 0 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        {/* Slot header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <div style={{
                            fontSize: '0.75rem', letterSpacing: '0.28em', textTransform: 'uppercase',
                            color: isSlotError ? 'var(--red-bright)' : 'var(--text)',
                            animation: isSlotRegen ? 'slotPulse 1.2s ease-in-out infinite' : 'none',
                          }}>
                            {slot}{isSlotError ? ' — failed' : ''}
                          </div>
                          {!isSlotRegen && (
                            <button
                              onClick={(e) => { e.stopPropagation(); if (!anySlotRegen) handleSlotRegenClick(day.day, slot) }}
                              aria-label={`Regenerate ${slot} for day ${day.day}`}
                              disabled={anySlotRegen}
                              style={{
                                background: 'none', border: 'none',
                                cursor: anySlotRegen ? 'default' : 'pointer',
                                color: 'var(--text-3)', padding: '0.2rem',
                                display: 'flex', alignItems: 'center', lineHeight: 1,
                                opacity: anySlotRegen ? 0.2 : 0.75,
                              }}
                            >
                              <RefreshIcon size={11} />
                            </button>
                          )}
                        </div>

                          {/* Slot items */}
                          {!isSlotRegen && items.map((item, i) => (
                            <div
                              key={i}
                              style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                padding: '0.4rem 0',
                                borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                                gap: '1rem',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.3 }}>{item.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.05rem', lineHeight: 1.3 }}>{item.portion}</div>
                              </div>
                              <span style={{ fontSize: '0.9rem', color: 'var(--text-2)', flexShrink: 0, paddingTop: '0.1rem' }}>
                                {item.calories}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    })})()}

                    {/* Day total */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      paddingTop: '0.85rem', marginTop: '0.85rem', borderTop: '1px solid var(--border-mid)',
                    }}>
                      <span style={{ fontSize: '0.75rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                        Daily Total
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 400 }}>
                        {day.totalCalories.toLocaleString()} cal
                      </span>
                    </div>
                  </>
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

      {readyFooter}
    </div>

    <ExportSheet
      open={exportOpen}
      onClose={() => setExportOpen(false)}
      copyLabel="Copy Plan"
      shareTitle="My Weekly Meal Plan — Ronin Daily"
      emailSubject="My Weekly Meal Plan — Ronin Daily"
      plainText={formatMealPlanText(mealPlan, calorieTarget)}
      onPrint={() => printMealPlan(mealPlan, calorieTarget)}
    />

    {/* Full-plan regen confirmation dialog */}
    {regenConfirmOpen && (
      <div
        onClick={() => setRegenConfirmOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '360px',
            background: 'var(--surface)',
            border: '1px solid var(--border-mid)',
            overflow: 'hidden',
          }}
        >
          <div style={{ height: '2px', background: 'var(--red)', width: '100%' }} />
          <div style={{ padding: '2rem' }}>
            <div
              className="font-jp"
              style={{ fontSize: '3rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.75rem', animation: 'kanjiPulse 4s ease-in-out infinite' }}
            >
              侍
            </div>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.28em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Regenerate Meal Plan
            </div>
            <div style={{ height: '1px', background: 'var(--red)', opacity: 0.35, marginBottom: '1.25rem' }} />
            <div style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.8, marginBottom: '2rem' }}>
              <div>This will replace your entire 7-day meal plan.</div>
              <div>Your grocery list will need to be regenerated.</div>
              <div>This cannot be undone.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="commit-btn"
                style={{ width: '100%' }}
                onClick={() => {
                  setRegenConfirmOpen(false)
                  const p = loadSavedPrefs()
                  if (p) doGenerate(p); else setScreen('prefs')
                }}
              >
                Regenerate
              </button>
              <button
                onClick={() => setRegenConfirmOpen(false)}
                style={{
                  width: '100%', minHeight: '44px', padding: '0.75rem',
                  background: 'none', border: '1px solid var(--border-mid)',
                  color: 'var(--text-2)', fontSize: '0.78rem',
                  letterSpacing: '0.28em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Keep Current Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Slot regen undo toast */}
    {slotToast && (
      <div
        style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 10001,
          background: 'var(--elevated)',
          border: '1px solid var(--border-mid)',
          padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          whiteSpace: 'nowrap',
          animation: slotToast.fading ? 'toastFadeOut 0.3s ease forwards' : 'toastFadeIn 0.2s ease forwards',
        }}
      >
        <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
          Regenerating {slotToast.slot.charAt(0).toUpperCase() + slotToast.slot.slice(1)}...
        </span>
        <button
          onClick={handleUndoSlotRegen}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--red)', fontSize: '0.82rem',
            padding: 0, fontFamily: 'Inter, sans-serif',
          }}
        >
          Undo
        </button>
      </div>
    )}
    </>
  )
})

export default MealPlanView
