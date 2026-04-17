# Transparency Manager

An Obsidian plugin for advanced window transparency on macOS. Stable replacement for `obsidian-electron-window-tweaker` with named profiles, live preview, and scheduled switching.

## Features

- **Named profiles** — create and switch between transparency configurations (Default, Focus, Minimal, etc.)
- **Live preview** — adjust vibrancy and opacity in settings and see changes instantly, no restart required
- **Scheduled profiles** — auto-switch based on time of day or macOS dark/light mode, with correct wake-from-sleep behavior
- **Status bar toggle** — click to cycle profiles directly from the Obsidian status bar
- **Stable vibrancy** — correctly rebinds vibrancy after fullscreen and maximize/unmaximize events that would otherwise reset it
- **Theme-aware suggestions** — reads your active theme's background color when creating profiles

## Requirements

- macOS (Windows/Linux support planned for v2)
- Obsidian 1.4.0 or later
- **For vibrancy**: enable **Settings → Appearance → Translucent window** in Obsidian

## Installation

### BRAT (recommended during beta)

1. Install [BRAT](https://obsidian.md/plugins?id=obsidian42-brat) from Community Plugins
2. Open BRAT settings → **Add Beta Plugin**
3. Enter: `Straven/obsidian-transparency-manager`

### Manual

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/Straven/obsidian-transparency-manager/releases/latest)
2. Copy both files to `<vault>/.obsidian/plugins/obsidian-transparency-manager/`
3. Enable the plugin in **Settings → Community plugins**

### Community Plugins

Coming soon — pending Obsidian community plugins review.

## Usage

### Profiles

Profiles store a vibrancy type and opacity level. Three built-in profiles ship by default:

| Profile | Vibrancy | Opacity |
|---|---|---|
| Default | `under-window` | — |
| Focus | `sidebar` | — |
| Minimal | none | 92% |

Create, rename, duplicate, and reorder profiles in **Settings → Transparency Manager**.

### Commands

| Command | Description |
|---|---|
| **Cycle to next profile** | Rotate through all profiles in order |
| **Toggle vibrancy on/off** | Quickly enable or disable vibrancy |

Assign hotkeys in **Settings → Hotkeys**.

### Scheduled Switching

Create rules in **Settings → Transparency Manager → Schedule** to switch profiles automatically:

- **Dark mode** — switch when macOS enters dark or light mode
- **Time-based** — switch at a specific time, with optional day-of-week filter (supports overnight ranges)

Time rules fire immediately on system wake from sleep.

### Status Bar

Click the **Transparency Manager** status bar item to cycle through profiles.

## Development

```bash
npm install
npm run dev        # esbuild watch mode → main.js
npm run build      # production build
npm run test       # run test suite
npm run lint       # eslint
npm run release    # bump version, update CHANGELOG, tag, and push
```

Copy build output to your test vault:

```bash
cp main.js manifest.json <vault>/.obsidian/plugins/obsidian-transparency-manager/
```

## License

[MIT](LICENSE)
