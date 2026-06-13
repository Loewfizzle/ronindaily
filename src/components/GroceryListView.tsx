import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { MealPlanData } from '../types'

interface GroceryItem {
  name: string
  quantity: string
}

interface GrocerySection {
  section: string
  items: GroceryItem[]
}

interface GroceryListData {
  sections: GrocerySection[]
  mealPlanTimestamp: string
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function loadCachedMealPlan(): MealPlanData | null {
  try { return JSON.parse(localStorage.getItem('ronin_meal_plan') || 'null') as MealPlanData | null }
  catch { return null }
}

function loadCachedList(): GroceryListData | null {
  try { return JSON.parse(localStorage.getItem('ronin_grocery_list') || 'null') as GroceryListData | null }
  catch { return null }
}

function loadChecked(): Set<string> {
  try {
    const stored = JSON.parse(localStorage.getItem('ronin_grocery_checked') || '[]') as string[]
    return new Set(stored)
  } catch { return new Set() }
}

function saveChecked(set: Set<string>): void {
  localStorage.setItem('ronin_grocery_checked', JSON.stringify([...set]))
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div style={{
      width: '15px', height: '15px', flexShrink: 0,
      border: `1px solid ${checked ? 'var(--red)' : 'var(--border-mid)'}`,
      background: checked ? 'var(--red)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.12s ease',
    }}>
      {checked && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <polyline points="1.5,4.5 3.5,6.5 7.5,2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface GroceryListViewProps {
  readyFooter?: ReactNode
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroceryListView({ readyFooter }: GroceryListViewProps) {
  const [status, setStatus]   = useState<'loading' | 'ready' | 'error'>('loading')
  const [sections, setSections] = useState<GrocerySection[] | null>(null)
  const [checked, setChecked]  = useState<Set<string>>(new Set())
  const [error, setError]      = useState<string | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlanData | null>(null)

  const firedRef = useRef(false)

  const generate = useCallback(async (plan: MealPlanData) => {
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/grocery-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealPlan: plan }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(d.error || `Server error (${res.status})`)
      }
      const data: GroceryListData = await res.json()
      if (!data.sections?.length) {
        throw new Error('AI returned an empty grocery list. Try regenerating the meal plan.')
      }
      localStorage.setItem('ronin_grocery_list', JSON.stringify(data))
      localStorage.removeItem('ronin_grocery_checked')
      setSections(data.sections)
      setChecked(new Set())
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate grocery list.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    const plan = loadCachedMealPlan()
    setMealPlan(plan)

    if (!plan) {
      setError('No meal plan available. Generate a meal plan first.')
      setStatus('error')
      return
    }

    const cached = loadCachedList()
    if (cached && cached.mealPlanTimestamp === plan.generatedAt) {
      setSections(cached.sections)
      setChecked(loadChecked())
      setStatus('ready')
      return
    }

    generate(plan)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleItem = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      saveChecked(next)
      return next
    })
  }

  const clearChecks = () => {
    setChecked(new Set())
    localStorage.removeItem('ronin_grocery_checked')
  }

  const checkedCount = checked.size

  if (status === 'loading') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0 3rem', gap: '1.5rem' }}>
      <div className="font-jp onboarding-kanji" style={{ fontSize: '2.8rem', color: 'var(--red)', lineHeight: 1 }}>侍</div>
      <div style={{ fontSize: '0.8rem', letterSpacing: '0.24em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
        Building your list...
      </div>
    </div>
  )

  if (status === 'error') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '1.25rem' }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.65, maxWidth: '280px' }}>
        {error || 'Failed to build grocery list. Check your connection.'}
      </div>
      {mealPlan && (
        <button className="commit-btn" onClick={() => generate(mealPlan)} style={{ maxWidth: '180px' }}>
          Try Again
        </button>
      )}
    </div>
  )

  if (!sections) return null

  return (
    <div>
      {/* Clear checks row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>
          {checkedCount > 0 ? `${checkedCount} item${checkedCount === 1 ? '' : 's'} checked` : 'tap items to check off'}
        </div>
        {checkedCount > 0 && (
          <button
            onClick={clearChecks}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}
          >
            Clear Checks
          </button>
        )}
      </div>

      {/* Sections */}
      {sections.map(section => (
        <div key={section.section} style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.28em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            {section.section}
          </div>
          {section.items.map(item => {
            const key = `${section.section}:${item.name}`
            const isChecked = checked.has(key)
            return (
              <div
                key={key}
                onClick={() => toggleItem(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', userSelect: 'none',
                  opacity: isChecked ? 0.38 : 1, transition: 'opacity 0.15s ease',
                }}
              >
                <Checkbox checked={isChecked} />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text)', textDecoration: isChecked ? 'line-through' : 'none', lineHeight: 1.35 }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', flexShrink: 0 }}>
                    {item.quantity}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', paddingBottom: '0.5rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.65, margin: 0 }}>
          Quantities cover the full week. Adjust for what you already have on hand.
        </p>
      </div>

      {readyFooter}
    </div>
  )
}
