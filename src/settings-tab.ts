import { App, Plugin, PluginSettingTab } from 'obsidian'
import type { WindowManager } from './window-manager'
import type { ProfileManager } from './profile-manager'
import type { Profile } from './settings'

interface PluginWithSave extends Plugin {
  saveSettings(): Promise<void>
}

export class SettingsTab extends PluginSettingTab {
  private previewSnapshot: Profile | null = null

  constructor(
    app: App,
    private plugin: PluginWithSave,
    private windowManager: WindowManager,
    private profileManager: ProfileManager,
  ) {
    super(app, plugin)
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()
    containerEl.createEl('h2', { text: 'Transparency Manager' })
    containerEl.createEl('p', { text: 'Full settings UI coming soon. Active profile: ' + this.profileManager.getActiveProfile().name })
    // TODO: profile list, live-preview sliders, schedule rules UI
  }

  hide(): void {
    // Revert live preview if user closed without saving
    if (this.previewSnapshot) {
      this.windowManager.applySettings(this.previewSnapshot)
      this.previewSnapshot = null
    }
  }

  // Called by live-preview sliders (debounced at 100ms in the full UI)
  previewProfile(profile: Profile): void {
    if (!this.previewSnapshot) {
      this.previewSnapshot = this.profileManager.getActiveProfile()
    }
    this.windowManager.applySettings(profile)
  }

  // Called when user explicitly saves a profile change
  commitPreview(): void {
    this.previewSnapshot = null
    this.plugin.saveSettings()
  }

  // Inlined theme color suggestion (v1: suggestion only, not auto-applied)
  extractThemeColor(): string {
    return getComputedStyle(document.body).getPropertyValue('--background-primary').trim()
  }
}
