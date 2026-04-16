import type { ProfileManager } from './profile-manager'

export class StatusBar {
  constructor(
    private el: HTMLElement,
    private profileManager: ProfileManager,
    private onProfileChange: () => void,
  ) {
    this.render()
    this.el.addEventListener('click', () => this.cycleProfile())
    // TODO: right-click → quick profile picker dropdown
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
