import { useState } from 'react'
import { BADGE_DEFS, BADGE_KANJI } from '../utils/badges'

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="3" x2="13" y2="13" />
      <line x1="13" y1="3" x2="3" y2="13" />
    </svg>
  )
}

interface EarnedBadge {
  badge_id: string
  earned_at: string
}

interface BadgeDetailSheetProps {
  badge: EarnedBadge | null
  onClose: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${d.getFullYear()}`
}

export default function BadgeDetailSheet({ badge, onClose }: BadgeDetailSheetProps) {
  const [copied, setCopied] = useState(false)

  if (!badge) return null

  const def   = BADGE_DEFS.find(b => b.id === badge.badge_id)
  const kanji = BADGE_KANJI[badge.badge_id] ?? '侍'

  if (!def) return null

  const shareText = `I earned the ${def.name} rank on Ronin Daily. ${def.flavor} ronindaily.app`

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
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '380px',
          background: 'var(--surface)',
          border: '1px solid var(--border-mid)',
          padding: '2.5rem',
          position: 'relative',
          animation: 'badgeCardIn 0.3s ease-out',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="close-btn"
          style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
        >
          <CloseIcon />
        </button>

        {/* Kanji */}
        <div
          className="font-jp"
          style={{
            fontSize: '5rem', lineHeight: 1, color: 'var(--red)',
            animation: 'kanjiGlowPulse 3s ease-in-out infinite',
          }}
        >
          {kanji}
        </div>

        {/* Rank name */}
        <div style={{
          fontSize: '1.8rem', fontWeight: 700, color: 'var(--gold)',
          letterSpacing: '0.3em', textTransform: 'uppercase',
          marginTop: '1rem',
        }}>
          {def.name}
        </div>

        {/* Date */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginTop: '0.5rem' }}>
          {formatDate(badge.earned_at)}
        </div>

        {/* Divider */}
        <div style={{
          height: '1px', background: 'var(--red)', opacity: 0.35,
          marginTop: '1rem',
        }} />

        {/* Flavor text */}
        <div style={{
          fontSize: '0.95rem', color: 'var(--text-2)',
          lineHeight: 1.8, fontStyle: 'italic',
          marginTop: '1rem',
        }}>
          {def.flavor}
        </div>

        {/* How you earned this */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{
            fontSize: '0.72rem', color: 'var(--text-3)',
            letterSpacing: '0.22em', textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}>
            How You Earned This
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
            {def.explanation}
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          style={{
            marginTop: '1.5rem',
            width: '100%',
            minHeight: '44px',
            padding: '1rem',
            background: 'none',
            border: '1px solid var(--border-mid)',
            color: 'var(--text)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.78rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {copied ? 'Copied.' : 'Share This Rank'}
        </button>
      </div>
    </div>
  )
}
