import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { supabase } from '../lib/supabase'
import { awardBadge } from '../utils/badges'
import type { BadgeDef } from '../utils/badges'
import type { PlanResult } from '../types'

interface CheckinSheetProps {
  open: boolean
  onClose: () => void
  plan: PlanResult | null
  onCheckin?: () => void
  onBadgesEarned?: (badges: BadgeDef[]) => void
}

export default function CheckinSheet({ open, onClose, plan, onCheckin, onBadgesEarned }: CheckinSheetProps) {
  const [weight, setWeight] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!plan) return null

  const profile = (() => {
    try { return JSON.parse(localStorage.getItem('ronin_profile') || '{}') as Record<string, string> }
    catch { return {} as Record<string, string> }
  })()
  const unit       = profile.unit || 'imperial'
  const unitLabel  = unit === 'metric' ? 'kg' : 'lbs'

  // Original pace for comparison
  const origStart  = parseFloat(profile.weightLbs    || '')
  const origGoal   = parseFloat(profile.goalWeightLbs || '')
  const totalWeeks = parseInt(profile.targetWeeks    || '0', 10)
  const weeklyPace = (!isNaN(origStart) && !isNaN(origGoal) && totalWeeks > 0)
    ? (origStart - origGoal) / totalWeeks
    : NaN
  const expectedNow = !isNaN(weeklyPace) ? origStart - weeklyPace * plan.weekNumber : NaN

  // Last logged weight in user's unit
  const lastLogged = unit === 'metric'
    ? parseFloat((plan.currentWeight / 2.20462).toFixed(1))
    : Math.round(plan.currentWeight)

  const parsedW = parseFloat(weight)

  const getPaceLine = (w: number): string => {
    const diff = w - expectedNow
    if (diff < -0.5) return 'Ahead of pace.'
    if (diff > 0.5)  return 'Behind pace. Adjust or accept the cost.'
    return 'On pace. Continue.'
  }

  const paceLine = weight !== '' && !isNaN(parsedW) && !isNaN(expectedNow) ? getPaceLine(parsedW) : null

  const handleClose = () => {
    setWeight('')
    setError(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (submitting) return
    if (!weight || isNaN(parsedW) || parsedW <= 0) {
      setError('Enter a valid weight')
      return
    }
    setSubmitting(true)
    let storedProfile: Record<string, string> = {}
    try { storedProfile = JSON.parse(localStorage.getItem('ronin_profile') || '{}') as Record<string, string> }
    catch { /* corrupt — still proceed with weight update */ }
    storedProfile.currentWeightLbs = String(parsedW)
    localStorage.setItem('ronin_profile', JSON.stringify(storedProfile))
    localStorage.setItem('ronin_last_checkin', String(plan.weekNumber))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('checkins').upsert(
          {
            user_id: user.id,
            week_number: plan.weekNumber,
            weight: parsedW,
            checked_in_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,week_number', ignoreDuplicates: false },
        )
        if (paceLine === 'Ahead of pace.') {
          const newBadge = await awardBadge(user.id, 'overcomer')
          if (newBadge) onBadgesEarned?.([newBadge])
        }
      }
    } catch { /* offline — localStorage cache is set */ }

    setSubmitting(false)
    setWeight('')
    setError(null)
    onCheckin?.()
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Check-In">
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="field-label">Current Weight</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
            <input
              className="input-bare"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={weight}
              onChange={(e) => { setWeight(e.target.value); setError(null) }}
              style={{ width: '6rem' }}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', paddingBottom: '0.45rem', flexShrink: 0 }}>
              {unitLabel}
            </span>
          </div>
          {error && <div className="field-error">{error}</div>}
          {paceLine && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
              {paceLine}
            </p>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            {parseInt(localStorage.getItem('ronin_last_checkin') || '0', 10) > 0 ? 'Last logged' : 'Starting weight'}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>
            {lastLogged} {unitLabel}
          </div>
        </div>

        <button className="commit-btn" onClick={handleConfirm} disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Saving...' : 'Confirm'}
        </button>
      </div>
    </BottomSheet>
  )
}
