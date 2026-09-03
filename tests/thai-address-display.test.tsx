// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ResolvedThaiAddress } from 'thaizip'
import { ThaiAddressDisplay, type ThaiAddressDisplayValue } from '../templates/react/ts/thai-address-display'

afterEach(() => {
  cleanup()
})

const baseAddress: ResolvedThaiAddress = {
  tambon: 'บางรัก',
  tambonEn: 'Bang Rak',
  amphure: 'บางรัก',
  amphureEn: 'Bang Rak',
  province: 'กรุงเทพมหานคร',
  provinceEn: 'Bangkok',
  zipCode: '10500',
  subdistrict: 'บางรัก',
  subdistrictEn: 'Bang Rak',
  district: 'บางรัก',
  districtEn: 'Bang Rak',
  postalCode: '10500',
}

describe('ThaiAddressDisplay', () => {
  it('renders the TH single-line locality label', () => {
    render(<ThaiAddressDisplay value={baseAddress} />)
    expect(screen.getByText('บางรัก > บางรัก > กรุงเทพมหานคร 10500')).toBeTruthy()
  })

  it("renders the EN locality label using *En fields + zipCode when locale='en'", () => {
    render(<ThaiAddressDisplay value={baseAddress} locale="en" />)
    expect(screen.getByText('Bang Rak > Bang Rak > Bangkok 10500')).toBeTruthy()
  })

  it('prepends the street portion when houseNo/moo/soi/street are present', () => {
    const value: ThaiAddressDisplayValue = {
      ...baseAddress,
      houseNo: '99/1',
      moo: '5',
      soi: 'สุขุมวิท 1',
      street: 'ถนนสุขุมวิท',
    }
    render(<ThaiAddressDisplay value={value} />)
    expect(
      screen.getByText('99/1 หมู่ 5 ซอยสุขุมวิท 1 ถนนสุขุมวิท, บางรัก > บางรัก > กรุงเทพมหานคร 10500'),
    ).toBeTruthy()
  })

  it('romanizes the street-portion label words to "Moo"/"Soi" under locale="en" — no Thai text leaks in', () => {
    const value: ThaiAddressDisplayValue = {
      ...baseAddress,
      houseNo: '99/1',
      moo: '5',
      soi: '1',
      street: 'Sukhumvit Road',
    }
    const { container } = render(<ThaiAddressDisplay value={value} locale="en" />)
    expect(
      screen.getByText('99/1 Moo 5 Soi 1 Sukhumvit Road, Bang Rak > Bang Rak > Bangkok 10500'),
    ).toBeTruthy()
    // No Thai script anywhere in the rendered output (Thai Unicode block U+0E00–U+0E7F).
    expect(container.textContent ?? '').not.toMatch(/[฀-๿]/)
  })

  it('omits the street portion entirely when no house-level fields are present (no stray punctuation)', () => {
    const { container } = render(<ThaiAddressDisplay value={baseAddress} />)
    expect(container.querySelector('address')?.textContent).toBe('บางรัก > บางรัก > กรุงเทพมหานคร 10500')
  })

  it('renders 2 separate row elements in multi-line mode', () => {
    const value: ThaiAddressDisplayValue = { ...baseAddress, houseNo: '99/1' }
    const { container } = render(<ThaiAddressDisplay value={value} mode="multi-line" />)
    const rows = container.querySelectorAll('address > *')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toBe('99/1')
    expect(rows[1].textContent).toBe('บางรัก > บางรัก > กรุงเทพมหานคร 10500')
  })

  it('renders only the locality row in multi-line mode when no street-portion fields are present', () => {
    const { container } = render(<ThaiAddressDisplay value={baseAddress} mode="multi-line" />)
    expect(container.querySelectorAll('address > *')).toHaveLength(1)
  })

  it('renders the default empty text for value={null}', () => {
    render(<ThaiAddressDisplay value={null} />)
    expect(screen.getByText('ไม่มีที่อยู่')).toBeTruthy()
  })

  it('renders a custom emptyText override', () => {
    render(<ThaiAddressDisplay value={null} emptyText="custom" />)
    expect(screen.getByText('custom')).toBeTruthy()
  })

  it('renders the root element as an <address> tag', () => {
    const { container } = render(<ThaiAddressDisplay value={baseAddress} />)
    expect(container.querySelector('address')).not.toBeNull()
  })

  it('applies className to the root element', () => {
    const { container } = render(<ThaiAddressDisplay value={baseAddress} className="my-class" />)
    expect(container.querySelector('address')?.classList.contains('my-class')).toBe(true)
  })

  it('applies lineClassName to each row in multi-line mode', () => {
    const value: ThaiAddressDisplayValue = { ...baseAddress, houseNo: '99/1' }
    const { container } = render(<ThaiAddressDisplay value={value} mode="multi-line" lineClassName="my-line" />)
    const rows = container.querySelectorAll('address > span')
    expect(rows.length).toBe(2)
    for (const row of rows) {
      expect(row.classList.contains('my-line')).toBe(true)
    }
  })
})
