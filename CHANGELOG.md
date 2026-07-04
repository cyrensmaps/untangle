# Changelog

All notable changes to this module are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.10.2]

### Fixed
- The Player Wiki hotbar button now appears immediately when the GM publishes/refreshes the wiki, instead of only after reloading Foundry. Publishing happens from inside the campaign planner's iframe, and nothing was telling the main Foundry window to re-check whether the button should show.

## [1.10.1]

### Changed
- The Player Wiki button now sits directly beside Untangle's other hotbar buttons instead of off at the far right edge.

## [1.10.0]

### Changed
- **Player Wiki no longer publishes a Foundry Journal Entry.** It now lives entirely in its own tabbed Player Wiki window (Characters, Locations, Factions, The Story So Far, Rumors & Open Questions, and Map), matching Untangle's own look instead of Foundry's journal sheet styling. Every entry that mentions another one (a Character's Location and Faction, a Location's residents, a Faction's members, a Session's featured Characters/Locations, a Rumor's related Characters/Locations) is a clickable link that jumps straight to it. Publishing now also deletes any Journal Entry a previous version created for you.
- The player-facing hotbar button is now labeled "Player Wiki" (was "Campaign Map") and opens the full wiki, not just the map.

## [1.9.2]

### Changed
- Player Wiki pages are far more wiki-like: Characters split into "Player Characters" and "NPCs", and every page now cross-links to related pages (a Character's Location and Faction, a Location's notable residents, a Faction's known members, a Session's featured Characters/Locations, a Rumor's related Characters/Locations).
- Player Wiki Characters now show status (if not simply "Alive") and Faction attitude is now shown on the Factions page - both were already tracked but never surfaced to players.
- Replaced the plain heading-and-paragraph layout on every Player Wiki page with a cleaner portrait-beside-text layout and small status/attitude badges.

### Fixed
- Removed a pale border that showed around the Quick Access and Player Wiki Map companion windows.
- Player Wiki map pins now show their name on hover, matching the GM's own map view, instead of requiring a click.

## [1.9.1]

### Changed
- Timeline is now a premium feature, requiring an active Patreon pledge linked in Untangle Settings.

## [1.9.0]

### Added
- **Player Wiki (premium)**: publish an opt-in, player-safe view of your campaign directly into a Foundry Journal Entry - Characters, Locations, Factions, "The Story So Far" (session recaps), and "Rumors & Open Questions" (from Plot Threads' public descriptions and clues, never GM Truth). Nothing is visible to players until you explicitly check it on the new Player Wiki page and click Publish; player viewing permission is granted automatically.
- **Interactive Campaign Map for players**: a new map button next to the macro bar (visible to everyone, not just the GM) opens a companion window showing your published maps and pins, including the "who's here" roster for location pins - filtered to only the Characters, Maps, and Pins you've marked visible.

## [1.8.0]

### Added
- Timeline entries (Sessions and custom events) can now have a color tint, picked from the same swatch palette as Factions and Clocks.
- Timeline entries can now be dragged past one another to fully reorder the timeline, not just nudged between their immediate neighbors - other entries dynamically swap sides (left/right) live as you drag past them.
- Custom Timeline entries can now be linked to several Characters, Locations, Factions, and Plot Threads at once ("Connections"), shown as clickable chips that jump straight to that entity.

### Changed
- Normalized em dashes and en dashes to plain hyphens across all user-facing text (UI copy, notifications, READMEs, the module description shown in Foundry's module browser).

## [1.7.0]

### Added
- **First Patreon-gated premium features**: Printable Campaign Bible, Roll Table Sync, Post to Journal, and Drag-to-Hotbar Macros now require an active Patreon pledge linked in Untangle Settings. Everything else stays free — including Hover Token Tooltip and Simple Calendar, and any future integration with another Foundry module, by standing policy.
- Campaign Bible: a "Player-safe version" toggle that hides GM-only fields (Plot Thread truths, Faction goals, NPC motivations, session key-events), a new "The Story So Far" chapter listing every session in order, and NPC portraits.
- Roll Table Sync: per-Location "who's here right now" tables, per-Faction member tables, and a "Rumors & Hooks" table built from active/rumor Plot Threads.
- Drag-to-Hotbar Macros now also works for Factions, Clocks, and Maps (previously only Characters, Locations, and Plot Threads), each with its own fallback macro icon.

### Changed
- Dashboard's "NPCs" stat and related labels renamed to "Characters," since the count always included Player Characters too.
- Roll Table sync now also re-syncs a table's Foundry-visible name on every sync, not just its results — matters more now that Location/Faction tables exist, since renaming one of those is more common than renaming the whole campaign.

### Fixed
- The Patreon entitlement check for the three features gated from `scripts/main.js` (only Drag-to-Hotbar Macros currently) only ever checked the manual on/off toggle, never actual Patreon entitlement, since it was written before any feature was premium. Non-entitled GMs would have kept getting a working feature. Fixed via a small cross-context entitlement cache.
- The drag-to-hotbar handles themselves are now hidden for non-entitled GMs, rather than left draggable-looking while silently doing nothing on drop.

## [1.6.1]

### Fixed
- Feature toggle checkboxes on Settings looked broken (scattered, uneven spacing) — they were inheriting form-field padding meant for text inputs, which bloats a checkbox's layout box far beyond its visible size. Now styled consistently with every other checkbox in the app.
- Pasting a Patreon token (or unlinking) could report failure on the first try even when it actually worked — a race condition where the app re-checked the saved token before Foundry's world-scope setting had finished round-tripping to the server. Saving now waits for that to complete before verifying.
- Toggling a feature off/on could visually snap back until clicked again, for the same underlying race-condition reason as above.

### Added
- Patreon logo next to the Premium Features description on the Settings page.

## [1.6.0]

### Added
- **Redesigned Timeline** — a vertical spine with sessions and custom events as circular nodes, connected to alternating left/right summary boxes. Click anywhere on the spine to add a new entry at that point; drag a node to reorder it along the timeline (with stoppers so order can't invert); the track grows automatically as entries are added.
- **Feature toggles** — every optional feature (Session Prep, Timeline, Recap, Stale Callback surfacing, Maps, Clocks, Relationships & Spark, Field Notes, Search, Name Generator, Voice Dictation, Campaign Bible, Roll Table Sync, Post to Journal, Pull from Foundry, Hover Token Tooltip, Drag-to-Hotbar Macros, the "Add to Untangle" button, and Simple Calendar integration) can now be shown or hidden from a new "Features" card on Untangle's own Settings page. Hiding is hide-only — the underlying data keeps working, so re-enabling a feature never loses anything.
- **Patreon integration (opt-in)** — a new "Premium Features" card on Settings lets a GM log in with Patreon and link an active pledge, verified entirely locally via a signed token (no feature currently requires this; it's groundwork for optional future premium features).
- Settlement and City added as Character types, for systems that track settlements as their own sheets.

### Changed
- The main planner window opens smaller by default (1180×740, was 1300×860) so it doesn't cover the macro bar as much on smaller displays.
- Foundry v13 verified compatible.
- The old dedicated "Show Token Hover Tooltip" Foundry setting was folded into the new unified Features toggle system (Settings → Features → Hover Token Tooltip), so there's one place to control it instead of two.

## [1.5.0]

### Added
- **Hover-a-token tooltip** — hovering a token linked to an Untangle Character shows their role, voice description, and key notes right on the canvas, no window-switching needed.
- **Drag-to-hotbar macros** — drag a Character/Location/Plot Thread card onto Foundry's macro bar to create a one-click "jump straight here" macro.
- **Printable Campaign Bible** — a clean, light-mode printable summary of Factions, active Plot Threads, Characters, Locations, and Clocks, using the browser's own print-to-PDF (Settings → Tools).
- **Voice dictation for Field Notes** — dictate a note hands-free using the browser's built-in speech recognition (free, no API key), in both the main window and the Quick Access widget.
- **Simple Calendar integration** — sessions can carry an in-world date, with a one-click "Pull from Calendar" button when Simple Calendar is active.
- **Auto-generated Roll Tables** — "Sync Roll Tables to Foundry" (Settings → Tools) builds real Foundry Roll Tables from your own Characters and Locations, for on-the-fly random picks in Foundry's own Rollable Tables sidebar.

### Changed
- "Pin Everyone Here" reworked: a Location pin on a map now automatically lists everyone based there as a clickable roster, instead of creating separate marker pins.
- Quick Access widget's Field Notes tab is capture-only now (no saved-notes list — there wasn't room to show it usefully); notes are still viewable/editable on the main Field Notes page.
- Removed the Faction attitude trend feature.
- Visual cleanup pass on the Quick Access widget (fixed a real styling bug where the note-tagging dropdown wasn't picking up the shared input padding/font-size rule, plus more consistent spacing throughout).

### Fixed
- "Add to Untangle" on an Actor sheet now flips to "Open in Untangle" immediately after adding, instead of requiring the sheet to be reopened.
- **Post to Journal / Roll Table sync threw "incorrectly constructed with a Unknown instead of an object"** — the iframe is same-origin but still a separate JS realm, so a plain object built inside it has a different identity than one built in the parent window; Foundry's document-creation validation rejected it. Objects are now round-tripped through the parent window's own JSON before being handed to any Foundry document API. Also applied to the Foundry world-backup mirror, which may have been silently failing the same way without ever surfacing an error.

## [1.4.1]

### Fixed
- **Cross-window data loss** — the Quick Access widget, main planner, and the "Add to Untangle" Actor-sheet button are separate windows writing the same data; if the main planner was left open, it could silently overwrite what another window had just saved (most visibly: "Add to Untangle" reporting success but the character never actually appearing). Every window now picks up changes made by the others instead of clobbering them.
- Field Note tagging now also works from the Quick Access widget, not just the main window, and notes can be edited after saving (both places).
- Faction attitude trend wasn't showing after a single attitude change — it only displayed once there were 2+ recorded changes. The change a faction is moving *from* is now seeded alongside the new one, so the trend appears immediately.
- Hardened Scene-linked map image loading: passes through `data:`/`http` URLs unchanged, automatically retries with an alternate path-resolution strategy if the first attempt fails to load, and shows a clear on-page message (plus a console-logged URL for debugging) instead of a silently broken image if both attempts fail.

## [1.4.0]

### Added
- **Linked Foundry Scenes** — Maps can now link a real Foundry Scene instead of uploading an image; the background stays live, and a "Jump to Scene" button appears wherever a Map or Location is scene-linked. Locations gained their own optional Scene link independent of Maps.
- **One-click Actor → Character import** — every Actor sheet (as GM) now has an "Add to Untangle" button in its header, switching to "Open in Untangle" once that Actor's already linked.
- **Spark, moved and improved** — no longer a random-pair widget tab; it's now a button on the Relationship Web where you pick the two entities yourself, and an approved suggestion is written straight onto the web as a real relationship. Relationships also gained a Notes area (static text with an Edit button, same pattern as NPC Session Events).
- Spark shortcut directly from an NPC's own modal, pre-filled with that character.
- Field Notes can now be tagged to a Character/Location/Faction/Thread, and show up inside that entity's own modal.
- Faction attitude changes are now tracked as a trend (e.g. Hostile → Wary → Neutral) instead of just the current value.
- "Previously On…" now flags clocks about to fill and stale callbacks, alongside the existing summary and open threads.
- Maps: a Location pin can now "+ Pin Everyone Here," auto-placing pins for every Character based there.
- Relationship Web: hovering a node dims everything not connected to it.

### Changed
- Session Prep now clears out Planned Scenes/Open Questions already marked done when a session is logged, instead of letting them accumulate indefinitely.

### Fixed
- Saving a Field Note now refreshes the page immediately instead of requiring a navigation to show up.

## [1.3.0]

### Added
- **Find Contradictions** — AI session processing now flags when a new transcript conflicts with something already logged (a restated name, role, or detail), shown as informational callouts in the review modal with a direct link to fix the entry.
- **Loose Ends** — AI session processing also surfaces unresolved questions raised in the transcript; approved ones land straight in Session Prep's Open Questions.
- **Spark** — a new Quick Access widget tab that picks two things you've already logged and asks Claude for a surprising connection between them, with its own cost-confirmation modal, Regenerate, and Save as Field Note.
- Quick Access widget: clicking a clock's or stale callback's name now opens the main Untangle window straight to that item.

### Changed
- Delete/destructive confirmations (sessions, characters, locations, maps, campaigns, threads, factions, clocks, restoring a Foundry backup) now use an in-window modal instead of the browser's native confirm() popup.
- "Save without AI" on the Log New Session page moved next to the Back button instead of being repeated under each input mode.
- Quick Access widget's tab strip is now a scrollable row instead of a fixed grid, so future tabs don't require another layout rework.

## [1.2.0]

### Added
- **Clocks** — Blades-in-the-Dark style progress clocks (4/6/8/12 segments), optionally linked to a Faction or Plot Thread, tickable from a new Clocks page or from the Quick Access widget.
- **Stale Callbacks** — automatic surfacing of NPCs, Locations, Plot Threads, and Factions that haven't come up in the last few sessions, shown on the Session Prep page and in a new Quick Access widget tab.
- Changelog: this repo now maintains CHANGELOG.md, and GitHub Releases pull their notes straight from it.

## [1.1.3]

### Added
- Confirmation modal before any action that spends your Claude/OpenAI balance (transcribe & process, process with AI, re-analyse, find duplicates, generate voice description), linking to the relevant provider's billing page.
- Inline "this costs money" reminders on the session-log page, and an expanded Whisper (OpenAI) tab notice spelling out that it needs your own paid API key.

### Changed
- Removed the descriptive paragraph under "API keys & data" in Settings, leaving just the button through to Foundry's Configure Settings.

## [1.1.2]

### Fixed
- API Keys and Manage Data settings menus disappearing entirely — caused by `game.settings.registerMenu()` requiring a `FormApplication` subclass; both menu classes were plain `Application` and failed silently during registration.
- Settings/keybinding registrations are now wrapped individually in `try/catch` so one failure can no longer cascade and silently disable the others.

## [1.1.1]

### Added
- Theme system with two options: "Foundry Basic" (new default, amber/parchment palette) and "Grey" (the previous palette, preserved).
- Password-masked input fields for the Claude and OpenAI API keys.

### Changed
- Extracted CSS/JS genuinely duplicated between `app/index.html` and `app/widget.html` into shared `theme.css` and `components.css`.
- Removed the floating Note/Names buttons from the main window (redundant with the macro-bar buttons and covered content).

## [1.1.0]

### Added
- Persistent quick-access button bar above Foundry's macro bar, extensible for future buttons.
- Logo slot above the campaign switcher.
- Module settings (quick-bar position offsets) moved into Foundry's native Configure Settings.

### Changed
- Full visual redesign: new color scheme, all emoji icons removed in favor of plain text.

## [1.0.2]

### Fixed
- Scene control buttons not responding to clicks — Foundry's `tool.onClick` dispatch was unreliable across versions; replaced with direct DOM event binding.

## [1.0.1]

### Added
- GM-only access gating across every entry point (the module holds GM secrets and previously had no check).
- Global search, onboarding modal, "Previously on…" recap generator, "Post to Journal," "Pull from Foundry" (Actor → Character import), and a Foundry-native world-setting backup mirror.
- Quick Access widget (Field Notes + Name Generator tabs).

## [1.0.0]

### Added
- Initial release: campaign tracker with Sessions, NPCs, Locations, Plot Threads, Factions, Relationship Web, Maps, and session editing.
