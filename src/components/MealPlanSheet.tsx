import { useState, useRef, useEffect } from 'react'
import FullSheet from './FullSheet'
import MealPlanView, { type MealPlanViewHandle } from './MealPlanView'
import GroceryListSheet from './GroceryListSheet'
import type { UnitSystem } from '../types'
import type { BadgeDef } from '../utils/badges'

interface MealPlanSheetProps {
  open: boolean
  onClose: () => void
  calorieTarget: number
  unit: UnitSystem
  onBadgesEarned?: (badges: BadgeDef[]) => void
}

function PrefsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 10A9 9 0 1 1 10.5 1.1" />
      <polyline points="14,1 19,1 19,6" />
    </svg>
  )
}

export default function MealPlanSheet({ open, onClose, calorieTarget, unit, onBadgesEarned }: MealPlanSheetProps) {
  const [groceryOpen, setGroceryOpen] = useState(false)
  const mealPlanRef = useRef<MealPlanViewHandle>(null)

  useEffect(() => {
    if (!open) setGroceryOpen(false)
  }, [open])

  const headerActions = (
    <>
      <button
        onClick={() => mealPlanRef.current?.goToPrefs()}
        aria-label="Change preferences"
        className="fullsheet-icon-btn"
      >
        <PrefsIcon />
      </button>
      <button
        onClick={() => mealPlanRef.current?.refresh()}
        aria-label="Regenerate meal plan"
        className="fullsheet-icon-btn"
      >
        <RefreshIcon />
      </button>
    </>
  )

  return (
    <>
      <FullSheet open={open} onClose={onClose} title="Meal Plan" headerActions={headerActions}>
        <MealPlanView
          ref={mealPlanRef}
          calorieTarget={calorieTarget}
          unit={unit}
          onBadgesEarned={onBadgesEarned}
          readyFooter={
            <div style={{ marginTop: '1.25rem', paddingBottom: '0.5rem' }}>
              <button
                onClick={() => setGroceryOpen(true)}
                className="ghost-btn"
              >
                Grocery List
              </button>
            </div>
          }
        />
      </FullSheet>
      <GroceryListSheet open={groceryOpen} onClose={() => setGroceryOpen(false)} />
    </>
  )
}
