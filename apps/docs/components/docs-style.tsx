'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { cn } from '~/lib/cn'

export const DOCS_STYLES = ['vanilla', 'base', 'radix', 'aria'] as const
export type DocsStyle = (typeof DOCS_STYLES)[number]

export const DOCS_STYLE_LABELS: Record<DocsStyle, string> = {
  vanilla: 'Vanilla',
  base: 'Base UI',
  radix: 'Radix UI',
  aria: 'React Aria',
}

const STORAGE_KEY = 'react-thaizip-docs-style'

const DocsStyleContext = createContext<{ style: DocsStyle; setStyle: (style: DocsStyle) => void }>({
  style: 'vanilla',
  setStyle: () => {},
})

function isDocsStyle(value: unknown): value is DocsStyle {
  return DOCS_STYLES.includes(value as DocsStyle)
}

/**
 * The component style chosen on the site (vanilla, or one of the shadcn/ui
 * bases). Live previews and the manual install steps follow it, like the
 * Base UI / Radix UI switcher on ui.shadcn.com. Remembered per browser.
 */
export function DocsStyleProvider({ children }: { children: ReactNode }) {
  const [style, setStyleState] = useState<DocsStyle>('vanilla')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (isDocsStyle(stored)) setStyleState(stored)
    } catch {
      // Storage can be unavailable (private mode, blocked site data); keep the default.
    }
  }, [])

  const setStyle = useCallback((next: DocsStyle) => {
    setStyleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Ignore: the choice just won't survive a reload.
    }
  }, [])

  return <DocsStyleContext.Provider value={{ style, setStyle }}>{children}</DocsStyleContext.Provider>
}

export function useDocsStyle() {
  return useContext(DocsStyleContext)
}

/**
 * The style picker under a component page's title. `styles` lists the styles
 * the component ships in; a component with only one renders no picker.
 */
export function StyleSwitcher({ styles, label }: { styles: readonly DocsStyle[]; label: string }) {
  const { style, setStyle } = useDocsStyle()
  if (styles.length < 2) return null
  const active = styles.includes(style) ? style : styles[0]

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-1 border-b">
      {styles.map((item) => (
        <button
          key={item}
          type="button"
          role="radio"
          aria-checked={item === active}
          onClick={() => setStyle(item)}
          className={cn(
            '-mb-px border-b-2 px-2 pb-2 text-sm font-medium transition-colors',
            item === active
              ? 'border-fd-primary text-fd-foreground'
              : 'border-transparent text-fd-muted-foreground hover:text-fd-foreground',
          )}
        >
          {DOCS_STYLE_LABELS[item]}
        </button>
      ))}
    </div>
  )
}

/**
 * Shows the child for the chosen style, falling back to `vanilla` for a
 * component that doesn't ship the chosen style.
 */
export function StyleView({ views }: { views: Partial<Record<DocsStyle, ReactNode>> & { vanilla: ReactNode } }) {
  const { style } = useDocsStyle()
  return <>{views[style] ?? views.vanilla}</>
}
