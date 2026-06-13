import { useEffect, useRef } from 'react'
import type { BadgeDef } from '../utils/badges'

interface BadgeBannerProps {
  badge: BadgeDef | null
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 6000

export default function BadgeBanner({ badge, onDismiss }: BadgeBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!badge) return
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [badge, onDismiss])

  if (!badge) return null

  const shareText = `Rank unlocked: ${badge.name}. ${badge.flavor} ronindaily.app`

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Ronin Daily', text: shareText, url: 'https://ronindaily.app' }) }
      catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(shareText) } catch { /* unavailable */ }
    }
  }

  return (
    <div className="badge-overlay">
      {/* key=badge.id forces full card remount (and animation restart) for each new badge */}
      <div key={badge.id} className="badge-card">

        <div className="badge-rank-label">Rank Unlocked</div>

        <div className="font-jp badge-kanji">侍</div>

        <div className="badge-divider" />

        <div className="badge-name">{badge.name}</div>

        <div className="badge-flavor">{badge.flavor}</div>

        <div className="badge-actions">
          <button className="badge-share-btn" onClick={handleShare}>Share</button>
          <button className="commit-btn badge-dismiss-btn" onClick={onDismiss}>Dismiss</button>
        </div>

        {/* Countdown bar — key matches badge.id so it re-animates for each new badge */}
        <div className="badge-countdown-track">
          <div key={badge.id} className="badge-countdown-bar" />
        </div>

      </div>
    </div>
  )
}
