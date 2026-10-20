'use client'

import { useId, useState, type ReactNode } from 'react'
import { cn } from '~/lib/cn'

/**
 * Shows the first few lines of a code block under a fade, with a button to
 * reveal the rest — the "View Code" / "Expand" pattern from ui.shadcn.com.
 */
export function CollapsibleCode({
  children,
  expandLabel,
  collapseLabel,
  className,
}: {
  children: ReactNode
  expandLabel: string
  collapseLabel: string
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()

  return (
    <div className={cn('relative', className)}>
      <div id={id} className={cn(!expanded && 'max-h-36 overflow-hidden')}>
        {children}
      </div>
      {expanded ? (
        <div className="flex justify-center border-t border-fd-border bg-fd-card py-2">
          <button
            type="button"
            aria-controls={id}
            aria-expanded
            onClick={() => setExpanded(false)}
            className="rounded-md px-3 py-1 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            {collapseLabel}
          </button>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-transparent via-fd-card/70 to-fd-card pb-4">
          <button
            type="button"
            aria-controls={id}
            aria-expanded={false}
            onClick={() => setExpanded(true)}
            className="rounded-lg border border-fd-border bg-fd-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            {expandLabel}
          </button>
        </div>
      )}
    </div>
  )
}
