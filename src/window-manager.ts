import type { BrowserWindow } from '@electron/remote'
import type { Profile } from './settings'

type Remote = typeof import('@electron/remote')

export class WindowManager {
  private win: BrowserWindow | null = null
  private enabled = false
  private boundReapply: (() => void) | null = null
  private lastApplied: string | null = null
  private currentProfile: Profile | null = null

  constructor(
    private getRemote: () => Remote = () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('@electron/remote') as Remote
    },
  ) {}

  init(): void {
    try {
      const remote = this.getRemote()
      this.win = remote.getCurrentWindow()
      this.enabled = true
    } catch (e) {
      console.error('Transparency Manager: @electron/remote unavailable', e)
      this.enabled = false
      return
    }

    this.boundReapply = this.reapply.bind(this)
    // Only these 4 events reset vibrancy on macOS — blur/focus do not
    this.win.on('enter-full-screen', this.boundReapply)
    this.win.on('leave-full-screen', this.boundReapply)
    this.win.on('maximize', this.boundReapply)
    this.win.on('unmaximize', this.boundReapply)
  }

  applySettings(profile: Profile): void {
    if (process.platform !== 'darwin') return
    if (!this.enabled || !this.win) return

    const hash = JSON.stringify({ vibrancyType: profile.vibrancyType, opacity: profile.opacity })
    if (hash === this.lastApplied) return
    this.lastApplied = hash
    this.currentProfile = profile

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.win.setVibrancy(profile.vibrancyType as any)
    // Only set opacity when vibrancy is disabled — avoid double-dimming
    this.win.setOpacity(profile.vibrancyType ? 1.0 : profile.opacity)
  }

  cleanup(): void {
    if (!this.win || !this.boundReapply) return
    this.win.off('enter-full-screen', this.boundReapply)
    this.win.off('leave-full-screen', this.boundReapply)
    this.win.off('maximize', this.boundReapply)
    this.win.off('unmaximize', this.boundReapply)
    this.win = null
    this.enabled = false
    this.lastApplied = null
    this.currentProfile = null
  }

  private reapply(): void {
    if (!this.currentProfile) return
    // Clear dirty-check so the re-apply actually calls the Electron APIs
    this.lastApplied = null
    this.applySettings(this.currentProfile)
  }
}
