'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getDefaultIndexIfLoaded, loadDefaultIndex } from 'thaizip/data'
import type { TrigramIndex } from 'thaizip'

/**
 * Loads the bundled Thai address index once and exposes loading/error state.
 * `retry()` re-attempts a failed load.
 */
export type ThaiAddressIndexLoad = 'mount' | 'visible'

export function useThaiAddressIndex(loadOn: ThaiAddressIndexLoad = 'mount'): {
  index: TrigramIndex | null
  error: Error | null
  isLoading: boolean
  retry: () => void
  observe: (node: HTMLElement | null) => void
} {
  // Seed from the cache synchronously: loadDefaultIndex() is async even on a hit,
  // so without this every remount of an already-warm page renders one frame of
  // loading skeleton before settling. Null on a cold start, so the effect below
  // still does the real work.
  const [index, setIndex] = useState<TrigramIndex | null>(() => getDefaultIndexIfLoaded())
  const [error, setError] = useState<Error | null>(null)
  const [generation, setGeneration] = useState(0)
  const [enabled, setEnabled] = useState(loadOn === 'mount')
  const observer = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (loadOn === 'mount') setEnabled(true)
  }, [loadOn])

  const observe = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node || enabled || loadOn !== 'visible') return
    if (typeof IntersectionObserver === 'undefined') {
      setEnabled(true)
      return
    }
    observer.current = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        observer.current?.disconnect()
        observer.current = null
        setEnabled(true)
      }
    })
    observer.current.observe(node)
  }, [enabled, loadOn])

  useEffect(() => () => observer.current?.disconnect(), [])

  useEffect(() => {
    if (!enabled) return
    let active = true
    setError(null)

    loadDefaultIndex()
      .then((loaded) => {
        if (active) setIndex(loaded)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause : new Error(String(cause)))
      })

    return () => {
      active = false
    }
  }, [enabled, generation])

  const retry = useCallback(() => {
    setEnabled(true)
    setGeneration((current) => current + 1)
  }, [])

  return { index, error, isLoading: index === null && error === null, retry, observe }
}
