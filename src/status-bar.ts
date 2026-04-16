import { Menu } from 'obsidian'
import type { ProfileManager } from './profile-manager'

export class StatusBar {
  constructor(
    private el: HTMLElement,
    private profileManager: ProfileManager,
    private onProfileChange: () => void,
  ) {
    this.render()
    this.el.addEventListener('click', () => this.cycleProfile())
    this.el.addEventListener('contextmenu', (e) => this.showPicker(e))
  }

  private showPicker(e: MouseEvent): void {
    const menu = new Menu()
    const activeId = this.profileManager.getActiveProfile().id
    for (const profile of this.profileManager.getProfiles()) {
      menu.addItem(item =>
        item
          .setTitle(profile.name)
          .setChecked(profile.id === activeId)
          .onClick(() => {
            this.profileManager.setActiveProfile(profile.id)
            this.render()
            this.onProfileChange()
          })
      )
    }
    menu.showAtMouseEvent(e)
  }

  render(): void {
    const name = this.profileManager.getActiveProfile().name
    this.el.setText(`Transparency: ${name}`)
  }

  private cycleProfile(): void {
    const profiles = this.profileManager.getProfiles()
    const current = this.profileManager.getActiveProfile()
    const idx = profiles.findIndex(p => p.id === current.id)
    const next = profiles[(idx + 1) % profiles.length]
    this.profileManager.setActiveProfile(next.id)
    this.render()
    this.onProfileChange()
  }
}
