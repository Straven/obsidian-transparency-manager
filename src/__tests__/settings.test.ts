import { describe, it, expect } from 'vitest'
import { applyDefaults, DEFAULT_SETTINGS } from '../settings'

describe('applyDefaults', () => {
  it('fills all missing fields with defaults on empty object', () => {
    const result = applyDefaults({})
    expect(result).toEqual(DEFAULT_SETTINGS)
  })

  it('preserves provided activeProfileId', () => {
    const result = applyDefaults({ activeProfileId: 'focus' })
    expect(result.activeProfileId).toBe('focus')
    expect(result.profiles).toEqual(DEFAULT_SETTINGS.profiles)
  })

  it('does not crash on completely unknown shape', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyDefaults({ unknownField: 'x' } as any)
    expect(result.profiles).toBeDefined()
    expect(result.activeProfileId).toBeDefined()
    expect(result.scheduledRules).toEqual([])
  })

  it('uses default profiles when provided profiles is empty array', () => {
    const result = applyDefaults({ profiles: [] })
    expect(result.profiles).toEqual(DEFAULT_SETTINGS.profiles)
  })

  it('preserves provided profiles when non-empty', () => {
    const custom = [{ id: 'x', name: 'X', vibrancyType: null as null, opacity: 1.0 }]
    const result = applyDefaults({ profiles: custom })
    expect(result.profiles).toEqual(custom)
  })

  it('defaults scheduledRules to empty array', () => {
    const result = applyDefaults({})
    expect(result.scheduledRules).toEqual([])
  })
})
