import { useState } from 'react'
import BottomSheet from './BottomSheet'
import MealPlanView from './MealPlanView'
import GroceryListSheet from './GroceryListSheet'
import type { UnitSystem } from '../types'

interface MealPlanSheetProps {
  open: boolean
  onClose: () => void
  calorieTarget: number
  unit: UnitSystem
}

export default function MealPlanSheet({ open, onClose, calorieTarget, unit }: MealPlanSheetProps) {
  const [groceryOpen, setGroceryOpen] = useState(false)

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Meal Plan">
        <MealPlanView
          calorieTarget={calorieTarget}
          unit={unit}
          readyFooter={
            <div style={{ marginTop: '1.25rem', paddingBottom: '0.5rem' }}>
              <button
                onClick={() => setGroceryOpen(true)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'transparent',
                  border: '1px solid var(--border-mid)',
                  color: 'var(--text-2)',
                  fontSize: '0.8rem',
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
          }
        />
      </BottomSheet>
      <GroceryListSheet open={groceryOpen} onClose={() => setGroceryOpen(false)} />
    </>
  )
}
