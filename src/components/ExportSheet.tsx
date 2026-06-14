import { useState, useEffect } from 'react'

interface ExportSheetProps {
  open: boolean
  onClose: () => void
  copyLabel: string
  shareTitle: string
  emailSubject: string
  plainText: string
  onPrint: () => void
}

const ROW: React.CSSProperties = {
  width: '100%', background: 'none', border: 'none',
  display: 'flex', alignItems: 'center', gap: '1rem',
  padding: '0.85rem 1.5rem',
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  color: 'var(--text)',
  fontSize: '0.88rem',
  letterSpacing: '0.06em',
  minHeight: '52px',
  textAlign: 'left',
}

function ClipboardIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 17" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3.5" width="9" height="12" rx="1"/>
      <path d="M6 3.5V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"/>
      <line x1="6.5" y1="8.5" x2="11" y2="8.5"/>
      <line x1="6.5" y1="11" x2="11" y2="11"/>
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="17" viewBox="0 0 16 17" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="1" x2="8" y2="10"/>
      <polyline points="4.5,4.5 8,1 11.5,4.5"/>
      <polyline points="2,11 2,16 14,16 14,11"/>
    </svg>
  )
}

function EnvelopeIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="16" height="12" rx="1"/>
      <polyline points="1,1 9,8 17,1"/>
    </svg>
  )
}

function PrinterIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="9" height="6" rx="0.5"/>
      <path d="M4 10V4h9v6"/>
      <path d="M4 12H1.5V7h14v5H13"/>
      <line x1="6" y1="13" x2="11" y2="13"/>
      <line x1="6" y1="15" x2="11" y2="15"/>
    </svg>
  )
}

export default function ExportSheet({
  open, onClose, copyLabel, shareTitle, emailSubject, plainText, onPrint,
}: ExportSheetProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (!open) setCopied(false) }, [open])

  if (!open) return null

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const handleCopy = async () => {
    let success = false
    try {
      await navigator.clipboard.writeText(plainText)
      success = true
    } catch {
      const ta = document.createElement('textarea')
      ta.value = plainText
      Object.assign(ta.style, { position: 'fixed', opacity: '0', top: '0', left: '0' })
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      try { document.execCommand('copy'); success = true } catch { /* silent */ }
      document.body.removeChild(ta)
    }
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async () => {
    if (hasNativeShare) {
      try {
        await navigator.share({ title: shareTitle, text: plainText })
        onClose()
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        handleCopy()
      }
    } else {
      handleCopy()
    }
  }

  const handleEmail = () => {
    onClose()
    const MAX_BODY = 1600
    const body = plainText.length > MAX_BODY
      ? plainText.slice(0, MAX_BODY) + '\n\n[Truncated — copy full text for complete list]'
      : plainText
    window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`
  }

  const handlePrint = () => {
    onClose()
    setTimeout(onPrint, 150)
  }

  return (
    <div className="sheet-backdrop" style={{ zIndex: 100 }} onClick={onClose}>
      <div className="sheet-panel" onClick={e => e.stopPropagation()} style={{ padding: 0 }}>
        <div style={{ width: '32px', height: '3px', background: 'var(--border-mid)', margin: '1.25rem auto 0.5rem', borderRadius: '2px' }} />

        <button onClick={handleCopy} style={ROW}>
          <ClipboardIcon />
          <span>{copied ? 'Copied.' : copyLabel}</span>
        </button>

        <button onClick={handleShare} style={ROW}>
          <ShareIcon />
          <span>{hasNativeShare ? 'Share' : 'Share (Copy)'}</span>
        </button>

        <button onClick={handleEmail} style={ROW}>
          <EnvelopeIcon />
          <span>Email</span>
        </button>

        <button onClick={handlePrint} style={ROW}>
          <PrinterIcon />
          <span>Print</span>
        </button>

        <div style={{ borderTop: '1px solid var(--border)', margin: '0.5rem 0 0', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={onClose}
            style={{ ...ROW, color: 'var(--text-3)', justifyContent: 'center', letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '0.75rem' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
