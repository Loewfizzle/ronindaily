import { useState } from 'react'
import BottomSheet from './BottomSheet'
import type { PlanResult } from '../types'

interface ShareSheetProps {
  open: boolean
  onClose: () => void
  streak: number
  plan: PlanResult | null
}

interface ShareAction {
  label: string
  desc: string
  onClick: () => void
}

export default function ShareSheet({ open, onClose, streak, plan }: ShareSheetProps) {
  const [copied, setCopied] = useState(false)

  const handleClose = () => {
    setCopied(false)
    onClose()
  }

  if (!plan) return null

  const { dayNumber, totalDays, startWeight, currentWeight } = plan
  const lostLbs = Math.max(0, Math.round(startWeight - currentWeight))
  const shareText = `Day ${dayNumber}. Down ${lostLbs} lbs. Streak: ${streak} days. ronindaily.app`

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ronin Daily', text: shareText, url: 'https://ronindaily.app' })
      } catch { /* cancelled */ }
    } else {
      await copyToClipboard(shareText)
    }
  }

  const handleCopyLink = () => copyToClipboard('https://ronindaily.app')

  const actions: ShareAction[] = [
    { label: 'Share', desc: 'Send or post via your device', onClick: handleShare },
    { label: 'Copy Link', desc: copied ? 'Copied.' : 'Copy URL to clipboard', onClick: handleCopyLink },
  ]

  return (
    <BottomSheet open={open} onClose={handleClose} title="Share">
      <div>
        {/* Preview card */}
        <div style={{ background: 'var(--elevated)', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="font-jp" style={{ fontSize: '1.4rem', color: 'var(--red)', lineHeight: 1 }}>侍</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '2.6rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>{streak}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', letterSpacing: '0.1em' }}>day streak</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
            Down {lostLbs} lbs. Day {dayNumber} of {totalDays}.
          </div>
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.18em', color: 'var(--text-3)', textTransform: 'uppercase', marginTop: '0.35rem' }}>
            ronindaily.app
          </div>
        </div>

        {/* Actions */}
        {actions.map((opt, i) => (
          <div
            key={opt.label}
            style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', padding: '1.1rem 0' }}
          >
            <div style={{ fontSize: '0.82rem', color: 'var(--text)', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
              {opt.label}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{opt.desc}</span>
              <button
                onClick={opt.onClick}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', padding: 0, flexShrink: 0, lineHeight: 1 }}
              >
                ›
              </button>
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}
