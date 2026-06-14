import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { MealPlanData } from '../types'
import ExportSheet from './ExportSheet'

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

function formatGroceryText(sections: GrocerySection[]): string {
  const parts: string[] = ['GROCERY LIST — RONIN DAILY', '']
  for (const s of sections) {
    if (!s.items.length) continue
    parts.push(s.section.toUpperCase())
    for (const item of s.items) {
      parts.push(`□ ${item.name} — ${item.quantity}`)
    }
    parts.push('')
  }
  return parts.join('\n').trimEnd()
}

function printGroceryList(sections: GrocerySection[]): void {
  const sectionsHtml = sections
    .filter(s => s.items.length > 0)
    .map(s => `
      <h2>${s.section}</h2>
      <ul>${s.items.map(i => `<li><span class="item">${i.name}</span><span class="qty">${i.quantity}</span></li>`).join('')}</ul>
    `).join('')

  const html = `<!DOCTYPE html><html><head>
<title>Grocery List — Ronin Daily</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; color: #000; background: #fff; padding: 2rem; }
h1 { font-size: 1rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; }
.subtitle { font-size: 0.8rem; color: #666; margin-bottom: 2rem; margin-top: 0.2rem; }
h2 { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; margin: 1.5rem 0 0.5rem; padding-bottom: 0.3rem; border-bottom: 1px solid #ddd; }
ul { list-style: none; }
li { display: flex; justify-content: space-between; align-items: baseline; padding: 0.45rem 0; border-bottom: 1px solid #eee; font-size: 0.9rem; gap: 1rem; }
li::before { content: "□"; margin-right: 0.5rem; flex-shrink: 0; }
.item { flex: 1; }
.qty { color: #666; font-size: 0.8rem; white-space: nowrap; }
</style>
</head><body>
<h1>Ronin Daily</h1>
<p class="subtitle">Grocery List</p>
${sectionsHtml}
</body></html>`

  const w = window.open('', '_blank', 'width=600,height=800')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

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

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="1" x2="7" y2="9"/>
      <polyline points="4,4 7,1 10,4"/>
      <polyline points="1,9 1,13 13,13 13,9"/>
    </svg>
  )
}

interface GroceryListViewProps {
  readyFooter?: ReactNode
}

export default function GroceryListView({ readyFooter }: GroceryListViewProps) {
  const [status, setStatus]           = useState<'loading' | 'ready' | 'error'>('loading')
  const [sections, setSections]       = useState<GrocerySection[] | null>(null)
  const [checked, setChecked]         = useState<Set<string>>(new Set())
  const [error, setError]             = useState<string | null>(null)
  const [mealPlan, setMealPlan]       = useState<MealPlanData | null>(null)
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [exportOpen, setExportOpen]   = useState(false)

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
      const firstSection = data.sections.find(s => s.items.length > 0)?.section ?? null
      setSections(data.sections)
      setChecked(new Set())
      setOpenSection(firstSection)
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
      const firstSection = cached.sections.find(s => s.items.length > 0)?.section ?? null
      setSections(cached.sections)
      setChecked(loadChecked())
      setOpenSection(firstSection)
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

  const toggleSection = (name: string) => {
    setOpenSection(prev => prev === name ? null : name)
  }

  const totalChecked = checked.size

  if (status === 'loading') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0 2rem' }}>
      <div className="font-jp" style={{ fontSize: '5rem', color: 'var(--red)', lineHeight: 1, marginBottom: '0.75rem', animation: 'kanjiPulse 4s ease-in-out infinite' }}>侍</div>
      <div style={{ fontSize: '1.1rem', letterSpacing: '0.44em', color: 'var(--text)', fontWeight: 500, textTransform: 'uppercase', marginBottom: '1.25rem' }}>
        Ronin Daily
      </div>
      <div style={{ width: '100%', height: '1px', background: 'var(--red)', opacity: 0.35, marginBottom: '1.5rem' }} />
      <div style={{ fontSize: '1rem', letterSpacing: '0.24em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
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

  const visibleSections = sections.filter(s => s.items.length > 0)

  return (
    <>
      <div>
        {/* Top row: count + export + clear */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>
            {totalChecked > 0
              ? `${totalChecked} item${totalChecked === 1 ? '' : 's'} checked`
              : 'tap sections to expand'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              onClick={() => setExportOpen(true)}
              aria-label="Export grocery list"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-3)', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: '44px', minHeight: '44px',
              }}
            >
              <ExportIcon />
            </button>
            {totalChecked > 0 && (
              <button
                onClick={clearChecks}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', padding: '0 0 0 0.25rem', fontFamily: 'Inter, sans-serif' }}
              >
                Clear Checks
              </button>
            )}
          </div>
        </div>

        {/* Collapsible sections */}
        {visibleSections.map(section => {
          const isOpen = openSection === section.section
          const sectionCheckedCount = section.items.filter(
            item => checked.has(`${section.section}:${item.name}`)
          ).length
          const allChecked = sectionCheckedCount === section.items.length

          return (
            <div key={section.section} style={{ borderTop: '1px solid var(--border)' }}>
              {/* Section header row */}
              <button
                onClick={() => toggleSection(section.section)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.9rem 0', fontFamily: 'Inter, sans-serif',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {allChecked && (
                    <span style={{ color: 'var(--red)', fontSize: '0.8rem', lineHeight: 1 }}>✓</span>
                  )}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text)', letterSpacing: '0.04em' }}>
                    {section.section}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {sectionCheckedCount > 0
                      ? `${sectionCheckedCount} of ${section.items.length} checked`
                      : `${section.items.length} item${section.items.length === 1 ? '' : 's'}`}
                  </span>
                  <span style={{
                    fontSize: '0.85rem', color: 'var(--text-3)', display: 'inline-block',
                    transition: 'transform 0.2s ease',
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}>›</span>
                </div>
              </button>

              {/* Expanded item list */}
              <div style={{ overflow: 'hidden', maxHeight: isOpen ? '1800px' : '0', transition: 'max-height 0.25s ease' }}>
                <div style={{ paddingBottom: '0.5rem' }}>
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
              </div>
            </div>
          )
        })}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', paddingBottom: '0.5rem', marginTop: '0.25rem' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.65, margin: 0 }}>
            Quantities cover the full week. Adjust for what you already have on hand.
          </p>
        </div>

        {readyFooter}
      </div>

      <ExportSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        copyLabel="Copy List"
        shareTitle="My Grocery List — Ronin Daily"
        emailSubject="My Grocery List — Ronin Daily"
        plainText={formatGroceryText(sections)}
        onPrint={() => printGroceryList(sections)}
      />
    </>
  )
}
