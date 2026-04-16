import { randomUUID } from 'crypto'
import type { Profile, Settings } from './settings'

export class ProfileManager {
  constructor(
    private settings: Settings,
    private onChange: () => void,
  ) {}

  getProfiles(): Profile[] {
    return this.settings.profiles
  }

  getActiveProfile(): Profile {
    return (
      this.settings.profiles.find(p => p.id === this.settings.activeProfileId)
      ?? this.settings.profiles[0]
    )
  }

  setActiveProfile(id: string): void {
    this.settings.activeProfileId = id
    this.onChange()
  }

  createProfile(name: string, base?: Partial<Profile>): Profile {
    const profile: Profile = {
      id: randomUUID(),
      name,
      vibrancyType: base?.vibrancyType ?? null,
      opacity: base?.opacity ?? 1.0,
    }
    this.settings.profiles.push(profile)
    this.onChange()
    return profile
  }

  deleteProfile(id: string): void {
    this.settings.profiles = this.settings.profiles.filter(p => p.id !== id)

    if (this.settings.profiles.length === 0) {
      const fallback: Profile = { id: randomUUID(), name: 'No Effect', vibrancyType: null, opacity: 1.0 }
      this.settings.profiles.push(fallback)
      this.settings.activeProfileId = fallback.id
    } else if (this.settings.activeProfileId === id) {
      this.settings.activeProfileId = this.settings.profiles[0].id
    }

    this.onChange()
  }

  renameProfile(id: string, name: string): void {
    const profile = this.settings.profiles.find(p => p.id === id)
    if (profile) { profile.name = name; this.onChange() }
  }

  duplicateProfile(id: string): Profile {
    const source = this.settings.profiles.find(p => p.id === id)
    if (!source) throw new Error(`Profile ${id} not found`)
    return this.createProfile(`${source.name} (copy)`, source)
  }

  updateProfile(id: string, updates: Partial<Omit<Profile, 'id'>>): void {
    const profile = this.settings.profiles.find(p => p.id === id)
    if (!profile) return
    Object.assign(profile, updates)
    this.onChange()
  }

  reorderProfiles(ids: string[]): void {
    const existing = new Set(this.settings.profiles.map(p => p.id))
    if (ids.length !== existing.size || ids.some(id => !existing.has(id))) {
      throw new Error('reorderProfiles: ids must match existing profile ids exactly')
    }
    this.settings.profiles = ids.map(id => this.settings.profiles.find(p => p.id === id)!)
    this.onChange()
  }
}
