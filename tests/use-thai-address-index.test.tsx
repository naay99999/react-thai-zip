// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useThaiAddressIndex } from '../templates/react/ts/hooks/use-thai-address-index'

const loadDefaultIndex = vi.hoisted(() => vi.fn())
const getDefaultIndexIfLoaded = vi.hoisted(() => vi.fn(() => null))
vi.mock('thaizip/data', () => ({ loadDefaultIndex, getDefaultIndexIfLoaded }))

afterEach(() => {
  loadDefaultIndex.mockReset()
  vi.unstubAllGlobals()
})

describe('useThaiAddressIndex loading policy', () => {
  it('defers loading until the observed field becomes visible', async () => {
    let notify: IntersectionObserverCallback | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { notify = callback }
      observe = observe
      disconnect = disconnect
    })
    loadDefaultIndex.mockResolvedValue({})

    const { result } = renderHook(() => useThaiAddressIndex('visible'))
    expect(loadDefaultIndex).not.toHaveBeenCalled()
    const node = document.createElement('div')
    act(() => result.current.observe(node))
    expect(observe).toHaveBeenCalledWith(node)
    expect(loadDefaultIndex).not.toHaveBeenCalled()

    act(() => notify?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    await waitFor(() => expect(loadDefaultIndex).toHaveBeenCalledTimes(1))
    expect(disconnect).toHaveBeenCalled()
  })

  it('loads immediately in the default mount mode', async () => {
    loadDefaultIndex.mockResolvedValue({})
    renderHook(() => useThaiAddressIndex())
    await waitFor(() => expect(loadDefaultIndex).toHaveBeenCalledTimes(1))
  })
})
