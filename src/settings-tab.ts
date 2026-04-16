import { App, Plugin, PluginSettingTab, Setting } from 'obsidian'
import { randomUUID } from 'crypto'
import type { WindowManager } from './window-manager'
import type { ProfileManager } from './profile-manager'
import type { Profile, ScheduleRule, Settings, VibrancyType } from './settings'

interface PluginWithSettings extends Plugin {
  settings: Settings
  saveSettings(): Promise<void>
}

const VIBRANCY_OPTIONS: [string, string][] = [
  ['', 'Disabled'],
  ['under-window', 'Under Window'],
  ['under-page', 'Under Page'],
  ['sidebar', 'Sidebar'],
  ['header', 'Header'],
  ['titlebar', 'Titlebar'],
  ['hud', 'HUD'],
  ['fullscreen-ui', 'Fullscreen UI'],
  ['tooltip', 'Tooltip'],
  ['selection', 'Selection'],
  ['menu', 'Menu'],
  ['popover', 'Popover'],
  ['sheet', 'Sheet'],
  ['window', 'Window'],
  ['content', 'Content'],
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export class SettingsTab extends PluginSettingTab {
  private previewSnapshot: Profile | null = null
  private editingProfileId: string | null = null
  private pendingEdits: Partial<Omit<Profile, 'id'>> = {}
  private addingRule = false
  private pendingRule: Partial<ScheduleRule> = {}
  private previewTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    app: App,
    private plugin: PluginWithSettings,
    private windowManager: WindowManager,
    private profileManager: ProfileManager,
  ) {
    super(app, plugin)
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()
    this.renderProfileList(containerEl)
    this.renderScheduleRules(containerEl)
  }

  hide(): void {
    if (this.previewSnapshot) {
      this.windowManager.applySettings(this.previewSnapshot)
      this.previewSnapshot = null
    }
    if (this.previewTimer) { clearTimeout(this.previewTimer); this.previewTimer = null }
    this.editingProfileId = null
    this.pendingEdits = {}
    this.addingRule = false
    this.pendingRule = {}
  }

  private renderProfileList(container: HTMLElement): void {
    container.createEl('h3', { text: 'Profiles' })

    const profiles = this.profileManager.getProfiles()
    const activeId = this.profileManager.getActiveProfile().id

    for (const profile of profiles) {
      const isActive = profile.id === activeId
      const isEditing = this.editingProfileId === profile.id

      const setting = new Setting(container)
        .setName(profile.name + (isActive ? ' ✓' : ''))
        .setDesc(this.profileDesc(profile))

      if (!isActive) {
        setting.addButton(btn =>
          btn.setButtonText('Activate').onClick(() => {
            this.profileManager.setActiveProfile(profile.id)
            this.display()
          })
        )
      }

      setting.addButton(btn =>
        btn.setButtonText(isEditing ? 'Close' : 'Edit').onClick(() => {
          if (isEditing) { this.discardEdit() } else { this.startEdit(profile) }
          this.display()
        })
      )

      setting.addButton(btn =>
        btn.setButtonText('Duplicate').onClick(() => {
          this.profileManager.duplicateProfile(profile.id)
          this.display()
        })
      )

      if (profiles.length > 1) {
        setting.addButton(btn =>
          btn.setButtonText('Delete').setWarning().onClick(() => {
            if (this.editingProfileId === profile.id) this.discardEdit()
            this.profileManager.deleteProfile(profile.id)
            this.display()
          })
        )
      }

      if (isEditing) this.renderProfileEditor(container, profile)
    }

    new Setting(container).addButton(btn =>
      btn.setButtonText('+ Add Profile').onClick(() => {
        const p = this.profileManager.createProfile('New Profile')
        this.startEdit(p)
        this.display()
      })
    )
  }

  private renderProfileEditor(container: HTMLElement, profile: Profile): void {
    const current: Profile = { ...profile, ...this.pendingEdits }
    const editorEl = container.createDiv()
    editorEl.style.cssText = 'padding-left:1.5rem;border-left:3px solid var(--interactive-accent);margin-bottom:0.75rem'

    new Setting(editorEl)
      .setName('Name')
      .addText(text =>
        text.setValue(current.name).onChange(v => { this.pendingEdits.name = v })
      )

    new Setting(editorEl)
      .setName('Vibrancy')
      .setDesc('Visual blur effect. Set to Disabled to use opacity instead.')
      .addDropdown(dd => {
        for (const [val, label] of VIBRANCY_OPTIONS) dd.addOption(val, label)
        dd.setValue(current.vibrancyType ?? '')
        dd.onChange(v => {
          this.pendingEdits.vibrancyType = v === '' ? null : v as VibrancyType
          this.triggerPreview(profile)
          this.display()
        })
      })

    if (current.vibrancyType === null) {
      const opacitySetting = new Setting(editorEl)
        .setName('Opacity')
        .setDesc(`${Math.round((current.opacity ?? 1.0) * 100)}%`)
      opacitySetting.addSlider(sl => {
        sl.setLimits(10, 100, 1)
        sl.setValue(Math.round((current.opacity ?? 1.0) * 100))
        sl.onChange(v => {
          this.pendingEdits.opacity = v / 100
          opacitySetting.setDesc(`${v}%`)
          this.triggerPreview(profile)
        })
      })
    }

    new Setting(editorEl)
      .addButton(btn =>
        btn.setButtonText('Save').setCta().onClick(async () => {
          this.profileManager.updateProfile(profile.id, this.pendingEdits)
          await this.plugin.saveSettings()
          this.previewSnapshot = null
          this.editingProfileId = null
          this.pendingEdits = {}
          this.display()
        })
      )
      .addButton(btn =>
        btn.setButtonText('Discard').onClick(() => { this.discardEdit(); this.display() })
      )
  }

  private startEdit(profile: Profile): void {
    if (this.editingProfileId && this.editingProfileId !== profile.id) this.discardEdit()
    this.editingProfileId = profile.id
    this.pendingEdits = {}
    if (!this.previewSnapshot) this.previewSnapshot = this.profileManager.getActiveProfile()
  }

  private discardEdit(): void {
    if (this.previewSnapshot) {
      this.windowManager.applySettings(this.previewSnapshot)
      this.previewSnapshot = null
    }
    this.editingProfileId = null
    this.pendingEdits = {}
  }

  private triggerPreview(base: Profile): void {
    if (this.previewTimer) clearTimeout(this.previewTimer)
    const merged: Profile = { ...base, ...this.pendingEdits }
    this.previewTimer = setTimeout(() => { this.windowManager.applySettings(merged) }, 100)
  }

  private profileDesc(profile: Profile): string {
    if (profile.vibrancyType) return `Vibrancy: ${profile.vibrancyType}`
    return `Opacity: ${Math.round(profile.opacity * 100)}%`
  }

  private renderScheduleRules(container: HTMLElement): void {
    container.createEl('h3', { text: 'Schedule Rules' })
    container.createEl('p', {
      text: 'Rules are evaluated in order. The last matching rule wins.',
      cls: 'setting-item-description',
    })

    const { scheduledRules } = this.plugin.settings
    const profiles = this.profileManager.getProfiles()

    if (scheduledRules.length === 0) {
      container.createEl('p', { text: 'No rules yet.', cls: 'setting-item-description' })
    } else {
      for (const rule of scheduledRules) {
        const profileName = profiles.find(p => p.id === rule.profileId)?.name ?? '(deleted)'
        new Setting(container)
          .setName(this.ruleTitle(rule))
          .setDesc(`Apply: ${profileName}`)
          .addButton(btn =>
            btn.setButtonText('Delete').setWarning().onClick(async () => {
              this.plugin.settings.scheduledRules = scheduledRules.filter(r => r.id !== rule.id)
              await this.plugin.saveSettings()
              this.display()
            })
          )
      }
    }

    if (!this.addingRule) {
      new Setting(container).addButton(btn =>
        btn.setButtonText('+ Add Rule').onClick(() => {
          this.addingRule = true
          this.pendingRule = { type: 'darkMode', profileId: profiles[0]?.id ?? '', darkModeValue: true }
          this.display()
        })
      )
    } else {
      this.renderAddRuleForm(container)
    }
  }

  private renderAddRuleForm(container: HTMLElement): void {
    const formEl = container.createDiv()
    formEl.style.cssText = 'padding-left:1.5rem;border-left:3px solid var(--interactive-accent);margin-bottom:0.75rem'

    const profiles = this.profileManager.getProfiles()
    const rule = this.pendingRule

    new Setting(formEl)
      .setName('Trigger')
      .addDropdown(dd => {
        dd.addOption('darkMode', 'Dark Mode')
        dd.addOption('time', 'Time Range')
        dd.setValue(rule.type ?? 'darkMode')
        dd.onChange(v => { this.pendingRule.type = v as 'darkMode' | 'time'; this.display() })
      })

    if (rule.type === 'darkMode') {
      new Setting(formEl)
        .setName('Mode')
        .addDropdown(dd => {
          dd.addOption('true', 'Dark')
          dd.addOption('false', 'Light')
          dd.setValue(rule.darkModeValue === false ? 'false' : 'true')
          dd.onChange(v => { this.pendingRule.darkModeValue = v === 'true' })
        })
    }

    if (rule.type === 'time') {
      new Setting(formEl)
        .setName('Start time')
        .addText(t => {
          t.setPlaceholder('HH:MM').setValue(rule.startTime ?? '')
          t.onChange(v => { this.pendingRule.startTime = v })
        })
      new Setting(formEl)
        .setName('End time')
        .addText(t => {
          t.setPlaceholder('HH:MM').setValue(rule.endTime ?? '')
          t.onChange(v => { this.pendingRule.endTime = v })
        })
    }

    new Setting(formEl).setName('Days').setDesc('Leave all unchecked for every day')
    const daysEl = formEl.createDiv()
    daysEl.style.cssText = 'display:flex;gap:0.75rem;margin:0 0 0.75rem 1rem'
    for (let d = 0; d < 7; d++) {
      const label = daysEl.createEl('label')
      label.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;font-size:0.85em'
      label.createEl('span', { text: DAY_NAMES[d] })
      const cb = label.createEl('input')
      cb.type = 'checkbox'
      cb.checked = rule.days?.includes(d) ?? false
      cb.onchange = () => {
        const days = [...(rule.days ?? [])]
        if (cb.checked) { if (!days.includes(d)) days.push(d) }
        else { const i = days.indexOf(d); if (i >= 0) days.splice(i, 1) }
        this.pendingRule.days = days.length > 0 ? days.sort((a, b) => a - b) : undefined
      }
    }

    new Setting(formEl)
      .setName('Apply profile')
      .addDropdown(dd => {
        for (const p of profiles) dd.addOption(p.id, p.name)
        dd.setValue(rule.profileId ?? profiles[0]?.id ?? '')
        dd.onChange(v => { this.pendingRule.profileId = v })
      })

    new Setting(formEl)
      .addButton(btn =>
        btn.setButtonText('Add').setCta().onClick(async () => {
          if (!rule.profileId) return
          const newRule: ScheduleRule = {
            id: randomUUID(),
            profileId: rule.profileId,
            type: rule.type ?? 'darkMode',
          }
          if (rule.type === 'darkMode') newRule.darkModeValue = rule.darkModeValue ?? true
          if (rule.type === 'time') {
            if (rule.startTime) newRule.startTime = rule.startTime
            if (rule.endTime) newRule.endTime = rule.endTime
          }
          if (rule.days?.length) newRule.days = rule.days
          this.plugin.settings.scheduledRules.push(newRule)
          await this.plugin.saveSettings()
          this.addingRule = false
          this.pendingRule = {}
          this.display()
        })
      )
      .addButton(btn =>
        btn.setButtonText('Cancel').onClick(() => {
          this.addingRule = false
          this.pendingRule = {}
          this.display()
        })
      )
  }

  private ruleTitle(rule: ScheduleRule): string {
    if (rule.type === 'darkMode') {
      return `Dark Mode — ${rule.darkModeValue === false ? 'light' : 'dark'} mode`
    }
    const days = rule.days?.length ? ` (${rule.days.map(d => DAY_NAMES[d]).join(', ')})` : ''
    return `Time — ${rule.startTime ?? '?'} → ${rule.endTime ?? '?'}${days}`
  }

  previewProfile(profile: Profile): void {
    if (!this.previewSnapshot) this.previewSnapshot = this.profileManager.getActiveProfile()
    this.windowManager.applySettings(profile)
  }

  commitPreview(): void {
    this.previewSnapshot = null
    this.plugin.saveSettings()
  }

  extractThemeColor(): string {
    return getComputedStyle(document.body).getPropertyValue('--background-primary').trim()
  }
}
