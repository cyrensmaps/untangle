# Untangle — A Campaign Planner

Do you run your best sessions by feel? The kind where a throwaway NPC becomes someone the whole table is obsessed with, a town you made up on the spot starts to feel like it has centuries of history, and the story goes somewhere nobody planned — including you.

The trouble is, somewhere between sessions you're staring at scattered notes wondering which faction controls the northern road, what that merchant's actual name was, and which thread you accidentally pulled last week that now seems connected to everything.

Untangle is a campaign tracker built for GMs who discover their story at the table. Log NPCs, locations, factions, sessions, and plot threads as they emerge. Map how they connect. Walk into next session knowing exactly where things stand — without changing the way you play.


---

## Install

In Foundry's module installer, paste this manifest URL at the bottom and click Install:

```
https://raw.githubusercontent.com/cyrensmaps/untangle/main/module.json
```

Once installed, enable the module in **Settings → Manage Modules**. Open it from the **Journal** tab, press **Ctrl + Shift + P**, or use the buttons above the macro bar.

---

## API keys

Most of the app works with no setup — you can manually log characters, locations, factions, relationships, and plot threads right away.

Two features require paid API keys, entered in Foundry's **Settings → Configure Settings → Untangle**:

**Session transcription** uses [OpenAI Whisper](https://platform.openai.com/). You upload a session recording (e.g. from Craig bot) and Whisper transcribes it. A typical 3–4 hour session costs a few cents.

**AI extraction and Find Duplicates** use [Anthropic Claude](https://console.anthropic.com/). Claude reads the transcript and populates your tracker automatically. Find Duplicates also uses Claude to spot entries you logged twice under different names.

Keys are stored in this Foundry world's settings (GM-only, hidden from players) and go directly to the API providers — nothing passes through this module.

---

## Compatibility

| Foundry version | Status |
|---|---|
| v11 | Minimum |
| v12 | Verified |
| v13 | Verified |

---

## Data

All campaign data lives in the browser's local storage inside Foundry, mirrored into the world's settings as a backup. Export, import, or clear it from Foundry's **Settings → Configure Settings → Untangle → Manage Data**.
