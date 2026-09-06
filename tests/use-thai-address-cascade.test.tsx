// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { loadDefaultIndex } from 'thaizip/data'
import { listAmphures, listProvinces, listTambons } from 'thaizip'
import type { AmphureSummary, ProvinceSummary, ResolvedThaiAddress, TambonSummary, TrigramIndex } from 'thaizip'
import { useThaiAddressCascade } from '@/hooks/use-thai-address-cascade'

let index: TrigramIndex
let province: ProvinceSummary
let amphure: AmphureSummary
let tambon: TambonSummary
let expectedAddress: ResolvedThaiAddress

beforeAll(async () => {
  index = await loadDefaultIndex()
  province = listProvinces(index)[0]
  amphure = listAmphures(index, province.id)[0]
  tambon = listTambons(index, amphure.id)[0]
  expectedAddress = {
    tambon: tambon.nameTh,
    tambonEn: tambon.nameEn,
    amphure: amphure.nameTh,
    amphureEn: amphure.nameEn,
    province: province.nameTh,
    provinceEn: province.nameEn,
    zipCode: tambon.zipCode,
    subdistrict: tambon.nameTh,
    subdistrictEn: tambon.nameEn,
    district: amphure.nameTh,
    districtEn: amphure.nameEn,
    postalCode: tambon.zipCode,
  }
})

afterEach(cleanup)

describe('useThaiAddressCascade', () => {
  it('starts empty and exposes every province', () => {
    const { result } = renderHook(() => useThaiAddressCascade({ index }))
    expect(result.current.provinceId).toBeNull()
    expect(result.current.amphures).toEqual([])
    expect(result.current.tambons).toEqual([])
    expect(result.current.resolvedAddress).toBeNull()
    expect(result.current.provinces.length).toBe(listProvinces(index).length)
  })

  it('emits the resolved address once the full chain is picked', () => {
    const onValueChange = vi.fn()
    const { result } = renderHook(() => useThaiAddressCascade({ index, onValueChange }))

    act(() => result.current.setProvince(province.id))
    act(() => result.current.setAmphure(amphure.id))
    expect(onValueChange).not.toHaveBeenCalled()

    act(() => result.current.setTambon(tambon.id))
    expect(onValueChange).toHaveBeenCalledWith(expectedAddress)
    expect(result.current.resolvedAddress).toEqual(expectedAddress)
    expect(result.current.zipCode).toBe(tambon.zipCode)
  })

  it('resets downstream ids and emits null when a parent invalidates a full selection', () => {
    const onValueChange = vi.fn()
    const { result } = renderHook(() => useThaiAddressCascade({ index, onValueChange }))

    act(() => result.current.setProvince(province.id))
    act(() => result.current.setAmphure(amphure.id))
    act(() => result.current.setTambon(tambon.id))
    onValueChange.mockClear()

    act(() => result.current.setProvince(listProvinces(index)[1].id))
    expect(onValueChange).toHaveBeenCalledWith(null)
    expect(result.current.amphureId).toBeNull()
    expect(result.current.tambonId).toBeNull()
    expect(result.current.resolvedAddress).toBeNull()
  })

  it('seeds a full selection from defaultValue by Thai-name match', () => {
    const { result } = renderHook(() => useThaiAddressCascade({ index, defaultValue: expectedAddress }))
    expect(result.current.provinceId).toBe(province.id)
    expect(result.current.amphureId).toBe(amphure.id)
    expect(result.current.tambonId).toBe(tambon.id)
  })

  it('degrades an unmatchable address to an empty selection', () => {
    const { result } = renderHook(() =>
      useThaiAddressCascade({ index, defaultValue: { ...expectedAddress, province: 'ไม่มีจังหวัดนี้' } }),
    )
    expect(result.current.provinceId).toBeNull()
  })

  it('keeps a partial pick when a controlled parent echoes null back', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: ResolvedThaiAddress | null }) => useThaiAddressCascade({ index, value }),
      { initialProps: { value: null as ResolvedThaiAddress | null } },
    )

    act(() => result.current.setProvince(province.id))
    rerender({ value: null })
    expect(result.current.provinceId).toBe(province.id)
  })

  it('sorts options by the locale collator', () => {
    const { result } = renderHook(() => useThaiAddressCascade({ index, locale: 'en' }))
    const names = result.current.provinces.map((entry) => entry.nameEn)
    expect([...names].sort(new Intl.Collator('en').compare)).toEqual(names)
  })
})
