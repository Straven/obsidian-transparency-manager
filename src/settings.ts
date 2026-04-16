export type VibrancyType =
  | 'under-window' | 'under-page' | 'sidebar' | 'header' | 'titlebar'
  | 'hud' | 'fullscreen-ui' | 'tooltip' | 'selection' | 'menu'
  | 'popover' | 'sheet' | 'window' | 'content'

export interface Profile {
  id: string
  name: string
  vibrancyType: VibrancyType | null  // null = vibrancy disabled
  opacity: number                     // 0.0-1.0, only applied when vibrancyType is null
}

export interface ScheduleRule {
  id: string
  profileId: string
  type: 'darkMode' | 'time'
  darkModeValue?: boolean   // true = apply in dark mode, false = apply in light mode
  startTime?: string        // "HH:MM" 24h
  endTime?: string          // "HH:MM" 24h, supports overnight (startTime > endTime)
  days?: number[]           // 0=Sun...6=Sat, undefined or empty = every day
}

export interface Settings {
  profiles: Profile[]
  activeProfileId: string
  perThemeProfiles: Record<string, string>  // themeId -> profileId
  scheduledRules: ScheduleRule[]
}

export const DEFAULT_SETTINGS: Settings = {
  profiles: [
    { id: 'default',      name: 'Default',      vibrancyType: 'under-window', opacity: 1.0 },
    { id: 'focus',        name: 'Focus',         vibrancyType: 'sidebar',      opacity: 1.0 },
    { id: 'minimal',      name: 'Minimal',       vibrancyType: null,           opacity: 0.92 },
  ],
  activeProfileId: 'default',
  perThemeProfiles: {},
  scheduledRules: [],
}

export function applyDefaults(data: Partial<Settings>): Settings {
  return {
    profiles: data.profiles?.length ? data.profiles : DEFAULT_SETTINGS.profiles,
    activeProfileId: data.activeProfileId ?? DEFAULT_SETTINGS.activeProfileId,
    perThemeProfiles: data.perThemeProfiles ?? {},
    scheduledRules: data.scheduledRules ?? [],
  }
}
