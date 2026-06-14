import { useEffect, useRef, useState } from 'react'
import type { BadgeDef } from '../utils/badges'
import { BADGE_KANJI } from '../utils/badges'

interface BadgeBannerProps {
  badge: BadgeDef | null
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 12000

export default function BadgeBanner({ badge, onDismiss }: BadgeBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!badge) return
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [badge, onDismiss])

  if (!badge) return null

  const shareText = `I earned the ${badge.name} rank on Ronin Daily. ${badge.flavor} ronindaily.app`

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Ronin Daily', text: shareText, url: 'https://ronindaily.app' }) }
      catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch { /* unavailable */ }
    }
  }

  return (
    <div className="badge-overlay">
      {/* key=badge.id forces full card remount (and animation restart) for each new badge */}
      <div key={badge.id} className="badge-card">

        <div className="badge-rank-label">Rank Unlocked</div>

        <div className="font-jp badge-kanji">{BADGE_KANJI[badge.id] ?? '侍'}</div>

        <div className="badge-divider" />

        <div className="badge-name">{badge.name}</div>

        <div className="badge-flavor">{badge.flavor}</div>

        <div className="badge-actions">
          <button className="commit-btn badge-dismiss-btn" onClick={onDismiss}>Dismiss</button>
          <button className="badge-share-btn" onClick={handleShare}>
            {copied ? 'Copied.' : 'Share This Rank'}
          </button>
        </div>

        {/* Countdown bar — key matches badge.id so it re-animates for each new badge */}
        <div className="badge-countdown-track">
          <div key={badge.id} className="badge-countdown-bar" />
        </div>

      </div>
    </div>
  )
}
