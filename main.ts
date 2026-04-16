import { Plugin } from 'obsidian'
import { WindowManager } from './src/window-manager'
import { applyDefaults } from './src/settings'
import { ProfileManager } from './src/profile-manager'
import { SettingsTab } from './src/settings-tab'
import { StatusBar } from './src/status-bar'
import { Scheduler } from './src/scheduler'
import type { Settings } from './src/settings'

export default class TransparencyManagerPlugin extends Plugin {
  settings!: Settings
  windowManager!: WindowManager
  profileManager!: ProfileManager
  scheduler!: Scheduler
  statusBar!: StatusBar

  async onload() {
    await this.loadSettings()

    this.windowManager = new WindowManager()
    this.profileManager = new ProfileManager(this.settings, () => this.onSettingsChange())

    this.app.workspace.onLayoutReady(() => {
      this.windowManager.init()
      this.windowManager.applySettings(this.profileManager.getActiveProfile())

      this.scheduler = new Scheduler(this.settings, (profileId) => {
        this.profileManager.setActiveProfile(profileId)
        this.windowManager.applySettings(this.profileManager.getActiveProfile())
        this.statusBar.render()
      })
      this.scheduler.start()
    })

    this.addSettingTab(new SettingsTab(this.app, this, this.windowManager, this.profileManager))

    this.statusBar = new StatusBar(
      this.addStatusBarItem(),
      this.profileManager,
      () => this.windowManager.applySettings(this.profileManager.getActiveProfile()),
    )

    this.addCommand({
      id: 'transparency-manager:next-profile',
      name: 'Cycle to next profile',
      callback: () => {
        const profiles = this.profileManager.getProfiles()
        const current = this.profileManager.getActiveProfile()
        const idx = profiles.findIndex(p => p.id === current.id)
        const next = profiles[(idx + 1) % profiles.length]
        this.profileManager.setActiveProfile(next.id)
        this.windowManager.applySettings(next)
        this.statusBar.render()
      },
    })

    this.addCommand({
      id: 'transparency-manager:toggle-vibrancy',
      name: 'Toggle vibrancy on/off',
      callback: () => {
        const profile = this.profileManager.getActiveProfile()
        const toggled = { ...profile, vibrancyType: profile.vibrancyType ? null : ('under-window' as const) }
        this.windowManager.applySettings(toggled)
      },
    })
  }

  onunload() {
    this.scheduler?.stop()
    this.windowManager?.cleanup()
  }

  async loadSettings() {
    this.settings = applyDefaults(await this.loadData() ?? {})
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  private onSettingsChange() {
    this.saveSettings()
  }
}
