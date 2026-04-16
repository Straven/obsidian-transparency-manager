# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Obsidian plugin replacing `obsidian-electron-window-tweaker` with stable vibrancy
support, named profiles, live preview, and scheduled switching. macOS-only in v1.

## Commands

```bash
npm install         # install deps (first time)
npm run dev         # esbuild watch mode → main.js
npm run build       # production build → main.js
npm run test        # vitest run (all tests)
npm run test -- --reporter=verbose src/__tests__/profile-manager.test.ts  # single file
npm run lint        # eslint src/ main.ts
npm run release     # bump version, update CHANGELOG, commit, tag, push
```

After building, copy to test vault:
```bash
cp main.js manifest.json ~/obsidian-test-vault/.obsidian/plugins/obsidian-transparency-manager/
```

## Architecture

7 source files with clear ownership:

- **main.ts** — plugin lifecycle (`onload`/`onunload`), wires all modules.
  Init is deferred to `app.workspace.onLayoutReady()` to avoid cold-start race.
- **src/window-manager.ts** — sole owner of `BrowserWindow`. Wraps `@electron/remote`,
  rebinds vibrancy on 4 window events (enter/leave-full-screen, maximize/unmaximize),
  dirty-checks before every Electron API call. Gracefully disables if `@electron/remote`
  throws — plugin still loads.
- **src/settings.ts** — `Profile`, `ScheduleRule`, `Settings` types + defaults + `applyDefaults()`
  for upgrade safety. All other modules import types from here.
- **src/profile-manager.ts** — full CRUD. Deleting last profile auto-creates 'No Effect' fallback.
  `onChange` callback triggers `saveData()` + status bar refresh.
- **src/settings-tab.ts** — live preview via `previewProfile()` (debounced 100ms in full UI).
  Reverts to snapshot on `hide()` if user didn't save. Inlines `extractThemeColor()`.
- **src/status-bar.ts** — click cycles profiles. Right-click picker is TODO.
- **src/scheduler.ts** — dark mode via `matchMedia`, time-based via `setInterval` (1 min),
  wake-from-sleep via `powerMonitor` `resume` event. `isInTimeRange()` exported for testing.

## Implementation Status

- [x] Feasibility spike — `@electron/remote` + `powerMonitor` confirmed working
- [x] Infrastructure — package.json, tsconfig, esbuild, .gitignore
- [x] `src/settings.ts` — complete
- [x] `src/window-manager.ts` — complete
- [x] `src/profile-manager.ts` — complete
- [x] `src/scheduler.ts` — complete
- [x] `src/status-bar.ts` — render + click cycle (right-click picker TODO)
- [x] `src/settings-tab.ts` — full settings UI (profile list, live-preview sliders, schedule rules)
- [x] `src/__tests__/` — test suite (vitest) — 4 files, all critical paths covered
- [x] GitHub Actions release CI — `.github/workflows/release.yml`, triggers on `X.Y.Z` tag push
- [x] Release tooling — `release-it` + `@release-it/conventional-changelog`, use `npm run release`
- [x] LICENSE, README.md, CHANGELOG.md
- [ ] Status bar right-click picker
- [ ] README screenshots

## Key Constraints

- **`@electron/remote` only** — `require('electron').remote` removed in Electron 14+.
- **Vibrancy and opacity are mutually exclusive** — when `vibrancyType` is set, opacity
  is forced to 1.0 to prevent double-dimming.
- **Static commands only** — Obsidian has no `removeCommand()`; only 2 commands registered:
  `transparency-manager:next-profile` and `transparency-manager:toggle-vibrancy`.
- **`"isDesktopOnly": true`** in `manifest.json` — prevents mobile installation.
- **Platform guard** — `window-manager.ts` returns early if `process.platform !== 'darwin'`.

## Workflow Preferences

- Terminal session — show planned diffs inline and wait for explicit approval before
  applying any file changes. Never edit files without confirmation.
- Do not use `straven-diff-mcp-viewer`.

## Full Design Doc

`~/.gstack/projects/obsidian-transparency-manager/mykolasarry-unknown-design-20260416-132037.md`
