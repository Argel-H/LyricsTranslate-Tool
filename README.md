<div style="display: grid; grid-template-columns: auto auto; align-items: center;">
     <div style="justify-self: center;">
         <img class="icon" align="left" width="140px" src="extras/icon.webp" alt="Argel H logo">
     </div>
     <div style="margin-left: 20px; margin-top:-20px; justify-self: center; align-self: center;">
         <h1>LyricsTranslate Tool</h1>
         <p style="margin-top: -20px;"><strong>Argel H's Lyrics Translation Editor</strong> – simplify your <i>music video</i> translation workflow. </p>
     </div>
 </div>

## Quick Start

```bash
npm install
npm run dev
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| UI | Tailwind CSS 3 + shadcn/ui |
| State | Zustand (client), TanStack Query (server) |
| Persistence | Dexie.js (IndexedDB) |
| Routing | react-router-dom v7 |
| Icons | lucide-react + Material Symbols |
| i18n | Custom key-value (en, es, pt) |

## Features

- Search songs via LRCLIB and auto-fill metadata from Deezer, MusicBrainz, and Odesli
- Manual project creation with dynamic artists and social media links
- Editable lyric/translation table with timestamp controls
- Tab navigation between rows
- Export to LRC and SRT (original or translated)
- Translation progress indicator
- 3 languages (English, Spanish, Portuguese)

## API Services

| Service | Purpose |
|---|---|
| LRCLIB | Synced/plain lyrics search |
| MusicBrainz | ISRC lookup, artist social media links |
| Deezer | Cover art, album name, artist list, artist links |
| Odesli/Song.link | Streaming platform links, shared link |
| SimplyTranslate AI | Auto-translation (currently disabled) |

All services are accessed through Vite dev server proxies to avoid CORS issues.

## Project Structure

```
src/
  types/          Shared interfaces
  services/       API clients
  db/             Dexie.js schema and repositories
  stores/         Zustand stores
  i18n/           Translation strings
  hooks/          useDebounce, useI18n
  lib/            Utilities, parsers
  components/ui/  shadcn primitives
  features/
    shell/        AppShell, Sidebar, TopBar, MasterCard, Modal
    dashboard/    Search, project cards, hero section
    editor/       Lyric table, time controls, export
    project-setup/ Form, dropdowns, social media
    settings/     Language selector (standalone page)
```

## Routes

| Route | Page |
|---|---|
| `/` | Dashboard |
| `/new-project` | Project Setup |
| `/edit-project/:id` | Edit Project |
| `/editor/:id` | Translation Editor |
