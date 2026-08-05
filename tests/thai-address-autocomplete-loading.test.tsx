// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { ThaiAddressAutocomplete } from '../templates/react/ts/thai-address-autocomplete'

// Module-wide mock: this file exercises the loading and error branches only,
// so it must NOT share a module graph with the real-index tests.
const loadDefaultIndex = vi.hoisted(() => vi.fn())
vi.mock('thaizip/data', () => ({ loadDefaultIndex }))

afterEach(() => {
  cleanup()
  loadDefaultIndex.mockReset()
})

describe('ThaiAddressAutocomplete — index loading states', () => {
  it('renders a disabled aria-busy input while the index loads', async () => {
    loadDefaultIndex.mockReturnValue(new Promise(() => {})) // never settles
    render(<ThaiAddressAutocomplete />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect(input.getAttribute('aria-busy')).toBe('true')
  })

  it('shows the error alert, fires onError, and retry reloads', async () => {
    const onError = vi.fn()
    loadDefaultIndex.mockRejectedValueOnce(new Error('offline'))
    render(<ThaiAddressAutocomplete onError={onError} />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('โหลดข้อมูลที่อยู่ไม่สำเร็จ')
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))

    loadDefaultIndex.mockReturnValue(new Promise(() => {}))
    const { default: userEvent } = await import('@testing-library/user-event')
    await userEvent.setup().click(screen.getByRole('button', { name: 'ลองใหม่' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true)
  })
})
