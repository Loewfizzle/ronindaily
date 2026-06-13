import { useEffect, type ReactNode } from 'react'

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
            <button onClick={onClose} className="fullsheet-close" aria-label="Close">×</button>
          </div>
        </div>
        <div className="fullsheet-content">
          {children}
        </div>
      </div>
    </div>
  )
}
