import { describe, it, expect, vi } from 'vitest'
import { isInTimeRange, Scheduler } from '../scheduler'
import { DEFAULT_SETTINGS } from '../settings'
import type { ScheduleRule } from '../settings'

// Jan 4 2026 = Sunday (day 0), Jan 5 2026 = Monday (day 1)
const SUNDAY = new Date(2026, 0, 4, 12, 0, 0)
const MONDAY = new Date(2026, 0, 5, 12, 0, 0)

function makeScheduler(): Scheduler {
  return new Scheduler(structuredClone(DEFAULT_SETTINGS), vi.fn())
}

function makeTimeRule(overrides: Partial<ScheduleRule> = {}): ScheduleRule {
  return { id: 'r1', profileId: 'p1', type: 'time', startTime: '09:00', endTime: '18:00', ...overrides }
}

describe('isInTimeRange (critical)', () => {
  describe('normal range (start ≤ end)', () => {
    it('matches time inside range', () => {
      expect(isInTimeRange('12:00', '09:00', '18:00')).toBe(true)
    })

    it('does not match time before range', () => {
      expect(isInTimeRange('08:59', '09:00', '18:00')).toBe(false)
    })

    it('does not match time after range', () => {
      expect(isInTimeRange('18:30', '09:00', '18:00')).toBe(false)
    })

    it('matches at start (inclusive)', () => {
      expect(isInTimeRange('09:00', '09:00', '18:00')).toBe(true)
    })

    it('does not match at end (exclusive)', () => {
      expect(isInTimeRange('18:00', '09:00', '18:00')).toBe(false)
    })
  })

  describe('overnight range (start > end)', () => {
    it('matches at 23:30 — after start', () => {
      expect(isInTimeRange('23:30', '22:00', '06:00')).toBe(true)
    })

    it('matches at 03:00 — before end', () => {
      expect(isInTimeRange('03:00', '22:00', '06:00')).toBe(true)
    })

    it('does not match at 12:00 — midday outside overnight range', () => {
      expect(isInTimeRange('12:00', '22:00', '06:00')).toBe(false)
    })

    it('does not match at end (exclusive)', () => {
      expect(isInTimeRange('06:00', '22:00', '06:00')).toBe(false)
    })

    it('matches at start (inclusive)', () => {
      expect(isInTimeRange('22:00', '22:00', '06:00')).toBe(true)
    })
  })
})

describe('Scheduler.ruleMatches (critical)', () => {
  it('darkMode rule matches when isDark equals darkModeValue=true', () => {
    const rule: ScheduleRule = { id: 'r1', profileId: 'p1', type: 'darkMode', darkModeValue: true }
    const s = makeScheduler()
    expect(s.ruleMatches(rule, MONDAY, true)).toBe(true)
    expect(s.ruleMatches(rule, MONDAY, false)).toBe(false)
  })

  it('darkMode rule matches when isDark equals darkModeValue=false', () => {
    const rule: ScheduleRule = { id: 'r1', profileId: 'p1', type: 'darkMode', darkModeValue: false }
    const s = makeScheduler()
    expect(s.ruleMatches(rule, MONDAY, false)).toBe(true)
    expect(s.ruleMatches(rule, MONDAY, true)).toBe(false)
  })

  it('time rule matches inside normal range', () => {
    const rule = makeTimeRule({ startTime: '09:00', endTime: '18:00' })
    const noon = new Date(2026, 0, 5, 12, 0, 0)
    expect(makeScheduler().ruleMatches(rule, noon, false)).toBe(true)
  })

  it('time rule does not match outside normal range', () => {
    const rule = makeTimeRule({ startTime: '09:00', endTime: '18:00' })
    const evening = new Date(2026, 0, 5, 20, 0, 0)
    expect(makeScheduler().ruleMatches(rule, evening, false)).toBe(false)
  })

  it('day filter excludes Sunday when days=[1,2,3] (critical)', () => {
    const rule = makeTimeRule({ days: [1, 2, 3] })
    expect(makeScheduler().ruleMatches(rule, SUNDAY, false)).toBe(false)
  })

  it('day filter includes Monday when days=[1,2,3]', () => {
    const rule = makeTimeRule({ days: [1, 2, 3] })
    expect(makeScheduler().ruleMatches(rule, MONDAY, false)).toBe(true)
  })

  it('empty days array matches every day', () => {
    const rule = makeTimeRule({ days: [] })
    expect(makeScheduler().ruleMatches(rule, SUNDAY, false)).toBe(true)
    expect(makeScheduler().ruleMatches(rule, MONDAY, false)).toBe(true)
  })

  it('undefined days matches every day', () => {
    const rule = makeTimeRule({ days: undefined })
    expect(makeScheduler().ruleMatches(rule, SUNDAY, false)).toBe(true)
  })

  it('returns false for time rule missing startTime or endTime', () => {
    const rule = makeTimeRule({ startTime: undefined })
    expect(makeScheduler().ruleMatches(rule, MONDAY, false)).toBe(false)
  })
})

describe('Scheduler.resolveRule (critical)', () => {
  it('returns first matching rule', () => {
    const settings = {
      ...structuredClone(DEFAULT_SETTINGS),
      scheduledRules: [
        { id: 'r1', profileId: 'focus', type: 'darkMode' as const, darkModeValue: true },
        { id: 'r2', profileId: 'minimal', type: 'darkMode' as const, darkModeValue: true },
      ],
    }
    const s = new Scheduler(settings, vi.fn())
    const result = s.resolveRule(MONDAY, true)
    expect(result?.id).toBe('r1')
  })

  it('returns null when no rule matches', () => {
    const settings = {
      ...structuredClone(DEFAULT_SETTINGS),
      scheduledRules: [
        { id: 'r1', profileId: 'focus', type: 'darkMode' as const, darkModeValue: true },
      ],
    }
    const s = new Scheduler(settings, vi.fn())
    expect(s.resolveRule(MONDAY, false)).toBeNull()
  })

  it('returns null when scheduledRules is empty', () => {
    const s = makeScheduler()
    expect(s.resolveRule(MONDAY, false)).toBeNull()
  })
})
