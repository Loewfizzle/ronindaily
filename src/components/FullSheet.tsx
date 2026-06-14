import { useEffect, type ReactNode } from 'react'

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="3" x2="13" y2="13" />
      <line x1="13" y1="3" x2="3" y2="13" />
    </svg>
  )
}

interface FullSheetProps {
  open: boolean
  onClose: () => void
  title: string
  headerActions?: ReactNode
  children: ReactNode
}

let openFullSheetCount = 0

export default function FullSheet({ open, onClose, title, headerActions, children }: FullSheetProps) {
  useEffect(() => {
    if (!open) return
    openFullSheetCount++
    document.body.style.overflow = 'hidden'
    return () => {
      openFullSheetCount = Math.max(0, openFullSheetCount - 1)
      if (openFullSheetCount === 0) document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fullsheet-backdrop"
      onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="fullsheet-panel">
        <div className="fullsheet-header">
          <span className="fullsheet-title">{title}</span>
          <div className="fullsheet-header-actions">
            {headerActions}
            <button onClick={onClose} className="fullsheet-close" aria-label="Close"><CloseIcon /></button>
          </div>
        </div>
        <div className="fullsheet-content">
          {children}
        </div>
      </div>
    </div>
  )
}
