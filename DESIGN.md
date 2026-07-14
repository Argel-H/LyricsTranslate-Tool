---
name: LyricsTranslate Tool
tech: React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS 3
state: Dexie.js (IndexedDB) + Zustand + TanStack Query + Axios
i18n: English, Español, Português
colors:
  surface: '#141317'
  surface-dim: '#141317'
  surface-container-lowest: '#0f0e12'
  surface-container-low: '#1c1b1f'
  surface-container: '#201f23'
  surface-container-high: '#2b292e'
  surface-container-highest: '#353438'
  on-surface: '#e6e1e7'
  on-surface-variant: '#cac4d0'
  outline: '#948f9a'
  outline-variant: '#49454f'
  primary: '#e9ddff'
  on-primary: '#37265e'
  primary-container: '#d0bcff'
  on-primary-container: '#594983'
  secondary: '#ccc2dc'
  on-secondary: '#332d41'
  secondary-container: '#4a4359'
  on-secondary-container: '#bab1ca'
  tertiary: '#ffd9e3'
  on-tertiary: '#492532'
  tertiary-container: '#efb8c8'
  on-tertiary-container: '#704654'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  background: '#141317'
  surface-variant: '#363438'
typography:
  display-lg:  { fontFamily: Plus Jakarta Sans, fontSize: 57px, fontWeight: 400, lineHeight: 64px }
  headline-lg: { fontFamily: Plus Jakarta Sans, fontSize: 32px, fontWeight: 400, lineHeight: 40px }
  headline-sm: { fontFamily: Plus Jakarta Sans, fontSize: 24px, fontWeight: 500, lineHeight: 32px }
  title-lg:    { fontFamily: Plus Jakarta Sans, fontSize: 22px, fontWeight: 500, lineHeight: 28px }
  title-md:    { fontFamily: Inter, fontSize: 16px, fontWeight: 500, lineHeight: 24px }
  body-lg:     { fontFamily: Inter, fontSize: 16px, fontWeight: 400, lineHeight: 24px }
  body-md:     { fontFamily: Inter, fontSize: 14px, fontWeight: 400, lineHeight: 20px }
  label-lg:    { fontFamily: Inter, fontSize: 14px, fontWeight: 500, lineHeight: 20px }
  label-md:    { fontFamily: Inter, fontSize: 12px, fontWeight: 500, lineHeight: 16px }
rounded:
  sm: 0.5rem | DEFAULT: 1rem | md: 1.5rem | lg: 2rem | xl: 3rem
  shell: 40px | section: 32px | card: 24px | full: 9999px
spacing: { xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, gutter: 24px }
---

## Architecture

**Stack:** React 19 + TypeScript (strict) + Vite 8 + Tailwind CSS 3 + shadcn/ui.
**State:** Zustand (client state), TanStack Query (server state), Dexie.js (IndexedDB persistence).
**Icons:** lucide-react (navigation/actions), Material Symbols font (status indicators).
**Routing:** react-router-dom v7.
**Loading:** @alerix/m3-loading-indicator (Canvas + spring physics, 7 morphing Material Design shapes).

## Project Structure
```
src/
├── types/          Shared TypeScript interfaces (Project, LyricLine, ShareRecord, API responses)
├── services/       API clients + metadata pipeline (LRCLIB, MusicBrainz, Deezer, Odesli, SimplyTranslate)
├── db/             Dexie.js schema + repositories (projects, share records, settings)
├── stores/         Zustand stores (project, settings, modal, shell, history)
├── i18n/           Translation strings (en.ts, es.ts, pt.ts)
├── hooks/          useDebounce, useI18n, usePageShell, useSmartBack, useCoverTilt, useRotatingIndex, useSharedProjectLoader, useEditorShortcuts
├── lib/            utils (cn), lyricsParser, artistParser, timeUtils, progressUtils, languageFlags, shuffleArray
│   ├── config/     aiConfig, apiConfig, appConfig, constants
│   └── share/      shareProtocol, shareRouting, shareCache, compressionUtils, base64Utils, binary/, transcoder/
├── test/           setup + mocks + shared project factory
├── components/ui/  shadcn/ui primitives (button, input, select, etc.)
├── components/shared/ AnimatedPage, ChangelogModal, ConfirmDialog, MessageModal, LoadingOverlay, LanguageLabel, RotatingFlag, SettingsModal
├── features/
│   ├── shell/      AppShell, Sidebar, TopBar, MasterCard, NavButton, Modal
│   ├── dashboard/  DashboardPage, AllProjectsPage, HeroSection, SearchInput, ProjectCard, etc.
│   ├── editor/     EditorPage, TableRow, TimeControl, TranslationTextarea, FAB, ShareDialog, SharedProjectPage, ViewOnlyPage, viewonly/
│   └── project-setup/ ProjectSetupPage, DropdownSelect, RoundedInput, SectionCard
├── App.tsx          Router (share routes + app shell) + global modals
├── main.tsx         QueryClientProvider + StrictMode
└── index.css        Tailwind layers + CSS custom properties
```

## Routes
| Route | Component | Pattern | Description |
|---|---|---|---|
| `/` | DashboardPage | Master Card Only | Search songs (LRCLIB), recent projects (Dexie) |
| `/projects` | AllProjectsPage | Top Bar + Master Card | Search, status filters, archive/unarchive |
| `/new-project` | ProjectSetupPage | Top Bar + Master Card | Manual project creation |
| `/edit-project/:id` | ProjectSetupPage | Top Bar + Master Card | Edit existing project (delete button available) |
| `/editor/:id` | EditorPage | Top Bar + Master Card | Lyric/translation table, auto-translate, timestamps, share |
| `/s/:data` | SharedProjectPage | Standalone | Decode a share link → preview → import or view-only |
| `/view/:data` | ViewOnlyPage | Standalone | Read-only shared project view |

## Data Flow
1. **Search → Auto-fill:** User searches → LRCLIB (debounced) → click result → `getFullMetadata()` pipeline: ① `extractLyricsFromLrc` → ② `resolveArtistsViaMusicBrainz` (ISRC, MBIDs) → ③ `resolveSocialMediaLinks` → ④ `resolveCoverFromDeezer` (cover, album, artists, streaming via Odesli) → ⑤ `fallbackToDeezerByName` (if ISRC fails) → ⑥ `ensureArtistNames` → ⑦ `buildProjectInput` → create project in Dexie → navigate to `/editor/:id`
2. **Empty Project:** User clicks "Empty Project" → `/new-project` → form with dropdowns, dynamic artists, social media → create project → `/editor/:id`
3. **Editor:** Load project from Dexie → render TableRow per lyric line. Click row → activates (pink bar, time controls). Edit lyrics/translations → auto-save to Dexie. Tab between rows → focus follows. Delete row via trash icon. Auto-translate via Gemini or DeepSeek (requires API key in Settings).
4. **Sidebar:** Home, Settings (modal), About (modal). Only highlighted on `/`.

## API Proxies (Vite dev server)
| Proxy prefix | Target |
|---|---|
| `/api-lrclib` | `https://lrclib.net` |
| `/api-musicbrainz` | `https://musicbrainz.org` |
| `/api-musicbrainz-artist` | `https://musicbrainz.org` |
| `/api-deezer` | `https://api.deezer.com` |
| `/api-odesli` | `https://api.song.link` |
| `/api-translate` | `https://api.simplytranslate.ai` |

Sharing is the exception: the client calls the Cloudflare Worker's `/share` endpoint directly (no Vite proxy) in both dev and production, since the Worker returns permissive CORS.

## Project Sharing

A project is packed into a compact URL and stored behind a short link.

**Encode (`lib/share/shareProtocol.ts`):** `Project` → binary buffer (`binary/BinaryWriter` + `transcoder/` for lyrics) → Brotli compression (`compressionUtils`) → Base64URL (`base64Utils`). Platform/streaming URLs are shortened via `urlTemplateUtils` before packing.

**Short link:** `createShare()` POSTs the raw payload to the Cloudflare Worker, which stores it in **KV** (`SUBS_PASTES`, 30-day TTL) and returns an 8-char id. A local `ShareRecord` (Dexie) keeps the id, timestamps, and expiry for the share history + QR dialog. Deleting a project deletes its share records atomically; the remote KV entry expires on its own.

**Decode (`hooks/useSharedProjectLoader.ts`):** `/s/:data` and `/view/:data` resolve `:data` → if it's a short id, `fetchShare()` GETs it from the Worker → `decodeShareUrl()` reverses the pipeline → `ProjectCreateInput`. `SharedProjectPage` offers import or view-only; `ViewOnlyPage` renders read-only.

## Metadata Extraction Pipeline

`getFullMetadata()` runs a 7-step pipeline with `ExtractionContext` state flowing through each step:

| Step | Source | Extracts |
|------|--------|----------|
| ① `extractLyricsFromLrc` | LRCLIB | lyrics (Map), album name |
| ② `resolveArtistsViaMusicBrainz` | MusicBrainz | ISRC, artist MBIDs, primary artist names |
| ③ `resolveSocialMediaLinks` | MusicBrainz | Social media per artist MBID (Instagram, Twitter, YouTube, TikTok, etc.) |
| ④ `resolveCoverFromDeezer` | Deezer (ISRC) + Worker/Odesli | cover art, album, artists, streaming links |
| ⑤ `fallbackToDeezerByName` | Deezer (name search) | Fallback cover/album/streaming if ISRC fails |
| ⑥ `ensureArtistNames` | LRCLIB fallback | Last-resort artist names if all else fails |
| ⑦ `buildProjectInput` | — | Assembles final `ProjectCreateInput` |

**Production path:** Steps ④-⑤ use the Cloudflare Worker (`/metadata?isrc=...`) which bundles Deezer + Odesli into one response, bypassing Cloudflare protection on the APIs.

## Components

### App Shell (AppShell.tsx)
Layout skeleton with fixed 80px sidebar + flex column (top bar + main). Props: `title`, `onBack`, `actions`, `showTopbar`, `showTopbarBorder`, `bodyBg`/`sidebarBg`/`topbarBg` (synced to body), `onOpenSettings`/`onOpenAbout` (modal triggers).

### Sidebar (Sidebar.tsx + NavButton.tsx)
64×64px nav buttons (`w-16 h-16 rounded-2xl`). Home navigates to `/`. Settings + About pinned at bottom (`mt-auto`) — both open modals. Active state: `bg-secondary-container text-on-secondary-container`. No highlight when not on `/`.

### Top Bar (TopBar.tsx)
`py-4 px-8 md:px-12`. Back button, page title (left), action slot (right). Optional `border-b`.

### Master Card (MasterCard.tsx)
`rounded-[40px] shadow-2xl border border-outline-variant/20`. Optional sticky `header` prop. Content scrolls via `overflow-y-auto px-6 md:px-12 py-10`.

### Modal (Modal.tsx)
Reusable: backdrop blur, Escape key close, scroll lock, close button. Used for Settings, About, and delete confirmations.

### Buttons
- **Primary CTA:** `rounded-full bg-primary-container text-on-primary-container`, hover → `bg-primary text-on-primary`.
- **Secondary/Add:** `bg-secondary-container text-on-secondary-container rounded-full`.
- **Segmented (Editor):** Two-button group `rounded-full overflow-hidden border`. Active: `bg-primary-container`.
- **FAB (Editor):** `h-16 px-8 rounded-full bg-tertiary-container`, disabled (auto-translate unavailable).
- **Delete (Editor row):** Circular trash icon, `absolute left`, hidden → `group-hover:opacity-100 group-hover:size-8`, always visible/large on active row.

### Project Cards
`bg-surface-container rounded-3xl p-5`. Cover image with subtle scale animation (`group-hover:scale-[1.03] duration-300`). Title, artist, status badge (i18n), progress bar. Three-dot menu → Edit/Open/Delete with confirmation modal. Hover: `shadow-lg -translate-y-1`.

### Search Input
Pill-shaped `rounded-full pl-14 pr-6 py-5`. Debounced search → TanStack Query → LRCLIB. Results rendered via `createPortal` to body (sticky on scroll). Results dismiss on selection or blur.

### Dropdown Select
`rounded-full` container, opens → `rounded-t-full rounded-b-none border-b-0`. Dropdown panel: `rounded-b-md overflow-hidden`. Options scrollable via inner `overflow-y-auto`. Compact variant for grid layouts. Both variants support `options` array + `onChange` callback. No purple focus ring.

### Text Inputs (RoundedInput)
`rounded-3xl px-4 py-2 border border-outline-variant/50`. Animated underline on hover/focus: `scale-x-0 → scale-x-100` centered, 1px, purple.

### Table Rows (Editor)
Grid `grid-cols-[120px_120px_1fr_1fr]`. States:
- **Default:** `rounded-[24px]`, hover subtle highlight
- **Active:** `rounded-[32px] bg-surface-container-high shadow-xl border border-primary/20`, pink left accent bar, editable time controls (±100ms with min/max constraints), editable lyric + translation textareas
- **Instrumental:** italic muted text, no delete button
Click row → activate. Click outside table → deactivate. Tab between textareas → focus follows.

### Status Badges
`inline-flex items-center gap-1.5 px-3 py-1 rounded-full`. Material Symbols icons (`play_arrow` / `task_alt`). i18n labels from parent.

### Project Setup Page
Two-column layout. Left: Track Details, Artists (dynamic — add/remove), Cover Art. Right: Localization Targeting (dropdowns with language list), Shared Link (auto-filled from Odesli), Artists Social Media (dynamic entries — add/remove, artist/platform dropdowns). Edit mode (`/edit-project/:id`) adds delete button with confirmation modal.

### i18n
3 language files (`en.ts`, `es.ts`, `pt.ts`) with identical key sets. Shared keys: `common.appName` used across branding. Concatenation via template literals for composed strings (e.g., About modal title). No interpolation engine — simple key-value lookup + manual `.replace()` for dynamic values.

## Elevation
| Layer | Element | Token |
|---|---|---|
| 0 | Page body | `surface-container-lowest` or `surface-container` |
| 1 | Sidebar + Top bar | matches page |
| 2 | Master Card | `surface-container` / `background` |
| 3 | Nested sections | `surface-container-low` |
| 4 | Interactive elements | `surface-container-high` |
