# Untangle — A Campaign Planner

Do you run your best sessions by feel? The kind where a throwaway NPC becomes someone the whole table is obsessed with, a town you made up on the spot starts to feel like it has centuries of history, and the story goes somewhere nobody planned — including you.

The trouble is, somewhere between sessions you're staring at scattered notes wondering which faction controls the northern road, what that merchant's actual name was, and which thread you accidentally pulled last week that now seems connected to everything.\n\nUntangle is a campaign tracker built for GMs who discover their story at the table. Log NPCs, locations, factions, sessions, and plot threads as they emerge. Map how they connect. Walk into next session knowing exactly where things stand — without changing the way you play.

---

## What it is

Untangle is a single HTML file you open in your browser. No install, no account, no server. Everything saves locally in your browser.

It works as a standalone file or as a **Foundry VTT module** (see below).

---

## Features

- **Dashboard** — quick overview of your campaign
- **Characters** — NPCs and PCs with descriptions, faction badges, location history, and session appearances
- **Factions** — track groups, their members, and connected plot threads
- **Locations** — places with linked characters, sessions, and map pins
- **Maps** — upload images and drop pins for any location
- **Sessions** — log what happened, who showed up, and where it took place
- **Session Prep** — notes and hooks before you run
- **Timeline** — see your sessions laid out with their people and places
- **Relationships** — a visual web connecting NPCs and factions with typed edges (ally, rival, family, member, and more)
- **Plot Threads** — track story threads with status, clues, and linked characters
- **Field Notes** — freeform notes that don't belong anywhere else

---

## What you can do without any paid API

Everything listed above. All manual entry, editing, linking, and the relationship web work out of the box with no API key needed.

---

## What requires a paid API key

### Session logging from audio (OpenAI / Whisper)

Untangle can transcribe a session recording and automatically extract NPCs, locations, and factions from what was said. This uses **OpenAI's Whisper API**, which requires an [OpenAI account](https://platform.openai.com/) with credits.

Whisper is cheap — a typical 3-4 hour session recording costs a few cents to transcribe.

### AI extraction and Find Duplicates (Anthropic / Claude)

Once a session is transcribed, Claude reads the transcript and pulls out the people, places, and factions mentioned — populating your tracker automatically. The **Find Duplicates** feature (on Characters, Factions, and Locations) also uses Claude to spot entries you may have logged twice under slightly different names.

This requires an [Anthropic account](https://console.anthropic.com/) with credits.

Both API keys are entered in **Settings** inside the app and stay in your browser only — they're never sent anywhere except directly to the API providers.

---

## Getting started

1. Download `campaign-planner.html`
2. Open it in any modern browser (Chrome, Firefox, Edge)
3. Start adding your world

No setup required. If you want audio transcription and AI extraction, go to Settings and add your API keys.

---

## Foundry VTT

Untangle is also available as a Foundry VTT module. Install it via manifest URL:

```
https://raw.githubusercontent.com/cyrensmaps/untangle/main/module.json
```

Once installed and enabled, open it from the **Journal** tab or press **Ctrl + Shift + P**.

For full setup instructions, see [`foundry-module/GITHUB-GUIDE.md`](foundry-module/GITHUB-GUIDE.md).

---

## Data and privacy

All your campaign data is stored in your browser's local storage. Nothing is uploaded or synced anywhere. If you clear your browser data, your campaign goes with it — so export a backup from Settings occasionally.

---

## Credits

Built by Jesper. AI features powered by [Anthropic Claude](https://anthropic.com) and [OpenAI Whisper](https://openai.com).
