'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadDefaultIndex } from 'thaizip/data'
import type { TrigramIndex } from 'thaizip'

/**
 * Loads the bundled Thai address index once and exposes loading/error state.
 * `retry()` re-attempts a failed load.
 */
export function useThaiAddressIndex(): {
  index: TrigramIndex | null
  error: Error | null
  isLoading: boolean
  retry: () => void
} {
  const [index, setIndex] = useState<TrigramIndex | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
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
  }, [generation])

  const retry = useCallback(() => {
    setGeneration((current) => current + 1)
  }, [])

  return { index, error, isLoading: index === null && error === null, retry }
}
