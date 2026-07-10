# TODO

## Done
- [x] Fetch lyrics from LRCLIB with debounced search
- [x] Fetch ISRC from MusicBrainz
- [x] Fetch cover art, album, and artist data from Deezer (by ISRC and by name)
- [x] Fetch streaming platform links from Odesli/Song.link
- [x] Auto-fill metadata pipeline (search -> full metadata -> create project -> editor)
- [x] Parse LRC timestamps into editable table rows
- [x] Parse artist names (feat., ft., &, comma-separated)
- [x] Editable lyric and translation fields
- [x] Editable timestamps with +/- controls and min/max constraints
- [x] Auto-save to IndexedDB (Dexie.js)
- [x] Export to LRC (original and translated)
- [x] Export to SRT (original and translated)
- [x] Row activation on click, deactivation on outside click
- [x] Tab between rows preserves active state
- [x] Delete individual rows
- [x] Add new rows
- [x] Project CRUD (create, edit, delete) with confirmation modals
- [x] Recent projects dashboard with search
- [x] Empty project creation with manual form
- [x] Dynamic artist management (add/remove)
- [x] Dynamic social media entries (artist-linked, platform dropdowns)
- [x] Language selection dropdowns in project setup
- [x] MusicBrainz artist social media fetching (Instagram, Twitter, YouTube, etc.)
- [x] Deezer artist links extraction from contributors
- [x] i18n (English, Spanish, Portuguese)
- [x] Settings modal (language switcher, reset database)
- [x] About modal
- [x] Translation progress bar (viewport top)
- [x] Fetch artist social links from MusicBrainz relations
- [x] Auto-translate with Google Gemini and DeepSeek AI
- [x] Row locking (protect lines from auto-translate)
- [x] Overwrite translations toggle (global setting)
- [x] Translation suggestions (reuse existing translations)
- [x] Circular Tab navigation between rows (wrap from last→first)
- [x] Patch Notes page
- [x] Music player integration
- [x] Undo/redo for editor changes
- [x] Editor Header Cover

## Pending
- [ ] Read lyrics from imported LRC/SRT files
- [ ] Audio sync offset configuration UI (syncOffsetMs field)
- [ ] Keyboard shortcuts
- [ ] Batch replace in lyrics
- [ ] Dark/light theme toggle
