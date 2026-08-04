import { compareVersions, extractVersionAnchor, isVersionAtLeast } from '../src/utils/semver.js'

describe('extractVersionAnchor', () => {
  it.each([
    ['^0.4.0', '0.4.0'],
    ['~0.6.2', '0.6.2'],
    ['>=0.6.0', '0.6.0'],
    ['0.6.0', '0.6.0'],
  ])('extracts %s -> %s', (input, expected) => {
    expect(extractVersionAnchor(input)).toBe(expected)
  })

  it('returns null when no version token is present', () => {
    expect(extractVersionAnchor('latest')).toBeNull()
    expect(extractVersionAnchor('workspace:*')).toBeNull()
  })
})

describe('compareVersions', () => {
  it('orders by major, then minor, then patch', () => {
    expect(compareVersions('0.4.0', '0.6.0')).toBeLessThan(0)
    expect(compareVersions('0.6.0', '0.4.0')).toBeGreaterThan(0)
    expect(compareVersions('0.6.0', '0.6.0')).toBe(0)
    expect(compareVersions('2.0.0', '0.6.0')).toBeGreaterThan(0)
    expect(compareVersions('0.6.1', '0.6.0')).toBeGreaterThan(0)
  })

  it('ignores pre-release/build metadata', () => {
    expect(compareVersions('0.6.0-beta.1', '0.6.0')).toBe(0)
  })
})

describe('isVersionAtLeast', () => {
  it('returns true when version meets or exceeds the minimum', () => {
    expect(isVersionAtLeast('0.6.0', '0.6.0')).toBe(true)
    expect(isVersionAtLeast('2.0.0', '0.6.0')).toBe(true)
  })

  it('returns false when version is below the minimum', () => {
    expect(isVersionAtLeast('0.4.2', '0.6.0')).toBe(false)
  })
})
