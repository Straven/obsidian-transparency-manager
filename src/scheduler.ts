import type { Settings, ScheduleRule } from './settings'

export class Scheduler {
  private intervalId: number | null = null
  private darkModeQuery: MediaQueryList | null = null
  private darkModeListener: ((e: MediaQueryListEvent) => void) | null = null
  private powerMonitorCleanup: (() => void) | null = null

  constructor(
    private settings: Settings,
    private onProfileMatch: (profileId: string) => void,
  ) {}

  start(): void {
    this.evaluate()

    // Time-based: check every minute
    this.intervalId = window.setInterval(() => this.evaluate(), 60_000)

    // Dark mode
    this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    this.darkModeListener = () => this.evaluate()
    this.darkModeQuery.addEventListener('change', this.darkModeListener)

    // Wake-from-sleep: re-evaluate immediately after system resume
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const remote = require('@electron/remote') as typeof import('@electron/remote')
      const handler = () => this.evaluate()
      remote.powerMonitor.on('resume', handler)
      this.powerMonitorCleanup = () => remote.powerMonitor.off('resume', handler)
    } catch {
      // powerMonitor unavailable — time rules won't fire on wake but plugin still works
    }
  }

  stop(): void {
    if (this.intervalId !== null) window.clearInterval(this.intervalId)
    if (this.darkModeQuery && this.darkModeListener) {
      this.darkModeQuery.removeEventListener('change', this.darkModeListener)
    }
    this.powerMonitorCleanup?.()
  }

  private evaluate(): void {
    const now = new Date()
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const matched = this.resolveRule(now, isDark)
    if (matched) this.onProfileMatch(matched.profileId)
  }

  resolveRule(now: Date, isDark: boolean): ScheduleRule | null {
    let matched: ScheduleRule | null = null
    for (const rule of this.settings.scheduledRules) {
      if (this.ruleMatches(rule, now, isDark)) matched = rule
    }
    return matched
  }

  ruleMatches(rule: ScheduleRule, now: Date, isDark: boolean): boolean {
    if (rule.type === 'darkMode') {
      return rule.darkModeValue === isDark
    }

    if (rule.type === 'time') {
      if (rule.days?.length && !rule.days.includes(now.getDay())) return false
      if (!rule.startTime || !rule.endTime) return false
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      return isInTimeRange(current, rule.startTime, rule.endTime)
    }

    return false
  }
}

// Exported for unit testing
export function isInTimeRange(current: string, start: string, end: string): boolean {
  if (start <= end) {
    // Normal range: e.g. 09:00-18:00
    return current >= start && current < end
  } else {
    // Overnight range: e.g. 22:00-06:00
    return current >= start || current < end
  }
}
