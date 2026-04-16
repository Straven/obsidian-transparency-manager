import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfileManager } from '../profile-manager'
import { DEFAULT_SETTINGS } from '../settings'
import type { Settings } from '../settings'

function makeSettings(overrides?: Partial<Settings>): Settings {
  return { ...structuredClone(DEFAULT_SETTINGS), ...overrides }
}

describe('ProfileManager', () => {
  describe('deleteProfile — last-profile guard (critical)', () => {
    it('auto-creates No Effect profile when the only profile is deleted', () => {
      const settings = makeSettings({
        profiles: [{ id: 'only', name: 'Only', vibrancyType: 'under-window', opacity: 1.0 }],
        activeProfileId: 'only',
      })
      const pm = new ProfileManager(settings, vi.fn())

      pm.deleteProfile('only')

      expect(settings.profiles).toHaveLength(1)
      expect(settings.profiles[0].name).toBe('No Effect')
      expect(settings.profiles[0].vibrancyType).toBeNull()
      expect(settings.profiles[0].opacity).toBe(1.0)
      expect(settings.activeProfileId).toBe(settings.profiles[0].id)
    })

    it('switches activeProfileId to first remaining profile when active is deleted', () => {
      const settings = makeSettings()
      const pm = new ProfileManager(settings, vi.fn())

      pm.deleteProfile('default')

      expect(settings.profiles.find(p => p.id === 'default')).toBeUndefined()
      expect(settings.activeProfileId).toBe(settings.profiles[0].id)
    })

    it('does not change activeProfileId when a non-active profile is deleted', () => {
      const settings = makeSettings()
      const pm = new ProfileManager(settings, vi.fn())

      pm.deleteProfile('focus')

      expect(settings.activeProfileId).toBe('default')
    })

    it('calls onChange after deletion', () => {
      const settings = makeSettings()
      const onChange = vi.fn()
      const pm = new ProfileManager(settings, onChange)

      pm.deleteProfile('focus')

      expect(onChange).toHaveBeenCalled()
    })
  })

  describe('createProfile', () => {
    it('generates a unique id for each profile', () => {
      const settings = makeSettings()
      const pm = new ProfileManager(settings, vi.fn())

      const a = pm.createProfile('A')
      const b = pm.createProfile('B')

      expect(a.id).not.toBe(b.id)
    })

    it('applies base overrides correctly', () => {
      const settings = makeSettings()
      const pm = new ProfileManager(settings, vi.fn())

      const p = pm.createProfile('Custom', { vibrancyType: 'sidebar', opacity: 0.85 })

      expect(p.vibrancyType).toBe('sidebar')
      expect(p.opacity).toBe(0.85)
    })

    it('defaults vibrancyType to null when not specified', () => {
      const settings = makeSettings()
      const pm = new ProfileManager(settings, vi.fn())

      const p = pm.createProfile('Plain')

      expect(p.vibrancyType).toBeNull()
      expect(p.opacity).toBe(1.0)
    })

    it('adds the new profile to settings.profiles', () => {
      const settings = makeSettings()
      const initial = settings.profiles.length
      const pm = new ProfileManager(settings, vi.fn())

      pm.createProfile('New')

      expect(settings.profiles).toHaveLength(initial + 1)
    })
  })

  describe('getActiveProfile — stale id fallback (critical)', () => {
    it('returns first profile when activeProfileId references a deleted profile', () => {
      const settings = makeSettings({ activeProfileId: 'does-not-exist' })
      const pm = new ProfileManager(settings, vi.fn())

      const active = pm.getActiveProfile()

      expect(active.id).toBe(settings.profiles[0].id)
    })

    it('returns the correct profile when activeProfileId is valid', () => {
      const settings = makeSettings({ activeProfileId: 'focus' })
      const pm = new ProfileManager(settings, vi.fn())

      expect(pm.getActiveProfile().id).toBe('focus')
    })
  })

  describe('reorderProfiles', () => {
    it('reorders profiles to match provided id order', () => {
      const settings = makeSettings()
      const pm = new ProfileManager(settings, vi.fn())
      const reversed = settings.profiles.map(p => p.id).reverse()

      pm.reorderProfiles(reversed)

      expect(settings.profiles.map(p => p.id)).toEqual(reversed)
    })

    it('rejects arrays missing an existing id', () => {
      const settings = makeSettings()
      const pm = new ProfileManager(settings, vi.fn())
      const partial = settings.profiles.slice(0, 2).map(p => p.id)

      expect(() => pm.reorderProfiles(partial)).toThrow()
    })

    it('rejects arrays with extra unknown ids', () => {
      const settings = makeSettings()
      const pm = new ProfileManager(settings, vi.fn())
      const withExtra = [...settings.profiles.map(p => p.id), 'ghost']

      expect(() => pm.reorderProfiles(withExtra)).toThrow()
    })
  })

  describe('duplicateProfile', () => {
    it('creates a copy with a different id', () => {
      const settings = makeSettings()
      const pm = new ProfileManager(settings, vi.fn())

      const copy = pm.duplicateProfile('default')

      expect(copy.id).not.toBe('default')
      expect(copy.name).toContain('copy')
      expect(copy.vibrancyType).toBe('under-window')
    })

    it('throws when source id does not exist', () => {
      const settings = makeSettings()
      const pm = new ProfileManager(settings, vi.fn())

      expect(() => pm.duplicateProfile('nonexistent')).toThrow()
    })
  })
})
