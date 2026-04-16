import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WindowManager } from '../window-manager'
import type { Profile } from '../settings'

// Provide a minimal document stub — not available in the Node.js test environment
beforeEach(() => {
  vi.stubGlobal('document', {
    body: { classList: { toggle: vi.fn(), remove: vi.fn() } },
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

// --- Mock BrowserWindow factory ---

function makeMockWin() {
  const listeners: Record<string, Set<() => void>> = {}
  return {
    on: vi.fn((event: string, handler: () => void) => {
      if (!listeners[event]) listeners[event] = new Set()
      listeners[event].add(handler)
    }),
    off: vi.fn((event: string, handler: () => void) => {
      listeners[event]?.delete(handler)
    }),
    setVibrancy: vi.fn(),
    setOpacity: vi.fn(),
    _listeners: listeners,
  }
}

type MockWin = ReturnType<typeof makeMockWin>

function makeWM(win: MockWin): WindowManager {
  return new WindowManager(() => ({ getCurrentWindow: () => win }) as never)
}

function makeWMUnvailable(): WindowManager {
  return new WindowManager(() => { throw new Error('not available') })
}

const PROFILE_VIBRANCY: Profile = { id: 'a', name: 'A', vibrancyType: 'under-window', opacity: 1.0 }
const PROFILE_OPACITY: Profile = { id: 'b', name: 'B', vibrancyType: null, opacity: 0.85 }

// ---

describe('WindowManager — init()', () => {
  it('binds exactly 4 window event listeners', () => {
    const win = makeMockWin()
    const wm = makeWM(win)
    wm.init()

    expect(win.on).toHaveBeenCalledTimes(4)
    const events = win.on.mock.calls.map((c) => c[0])
    expect(events).toContain('enter-full-screen')
    expect(events).toContain('leave-full-screen')
    expect(events).toContain('maximize')
    expect(events).toContain('unmaximize')
  })
})

describe('WindowManager — cleanup()', () => {
  it('removes all 4 bound listeners', () => {
    const win = makeMockWin()
    const wm = makeWM(win)
    wm.init()
    wm.cleanup()

    expect(win.off).toHaveBeenCalledTimes(4)
    const totalRemaining = Object.values(win._listeners).reduce((n, s) => n + s.size, 0)
    expect(totalRemaining).toBe(0)
  })

  it('is safe to call when init() was never called', () => {
    const win = makeMockWin()
    const wm = makeWM(win)
    expect(() => wm.cleanup()).not.toThrow()
  })
})

describe('WindowManager — applySettings()', () => {
  it('calls setVibrancy(null) and sets opacity when vibrancyType is null (critical)', () => {
    const win = makeMockWin()
    const wm = makeWM(win)
    wm.init()

    wm.applySettings(PROFILE_OPACITY)

    expect(win.setVibrancy).toHaveBeenCalledWith(null)
    expect(win.setOpacity).toHaveBeenCalledWith(0.85)
  })

  it('sets vibrancy and forces opacity=1.0 to avoid double-dimming', () => {
    const win = makeMockWin()
    const wm = makeWM(win)
    wm.init()

    wm.applySettings(PROFILE_VIBRANCY)

    expect(win.setVibrancy).toHaveBeenCalledWith('under-window')
    expect(win.setOpacity).toHaveBeenCalledWith(1.0)
  })

  it('dirty-check: skips redundant calls with identical settings', () => {
    const win = makeMockWin()
    const wm = makeWM(win)
    wm.init()

    wm.applySettings(PROFILE_VIBRANCY)
    wm.applySettings(PROFILE_VIBRANCY)

    expect(win.setVibrancy).toHaveBeenCalledTimes(1)
  })

  it('re-applies after profile change (dirty-check passes)', () => {
    const win = makeMockWin()
    const wm = makeWM(win)
    wm.init()

    wm.applySettings(PROFILE_VIBRANCY)
    wm.applySettings(PROFILE_OPACITY)

    expect(win.setVibrancy).toHaveBeenCalledTimes(2)
  })

  it('platform guard: no-op on non-darwin (critical)', () => {
    const win = makeMockWin()
    const wm = makeWM(win)
    wm.init()

    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
    wm.applySettings(PROFILE_VIBRANCY)
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })

    expect(win.setVibrancy).not.toHaveBeenCalled()
  })
})

describe('WindowManager — @electron/remote unavailable (critical)', () => {
  it('init() catches the error and does not throw', () => {
    const wm = makeWMUnvailable()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => wm.init()).not.toThrow()
    spy.mockRestore()
  })

  it('logs an error message', () => {
    const wm = makeWMUnvailable()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    wm.init()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('applySettings() is a silent no-op after failed init (critical)', () => {
    const win = makeMockWin()
    const wm = makeWMUnvailable()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    wm.init()

    // Should not throw and should not call any Electron APIs
    expect(() => wm.applySettings(PROFILE_VIBRANCY)).not.toThrow()
    expect(win.setVibrancy).not.toHaveBeenCalled()
  })
})
