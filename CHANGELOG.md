# Changelog

All notable changes to this module are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
