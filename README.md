# Untangle — A Campaign Planner

> A campaign tracker for GMs who discover their story at the table, not before it.

Track NPCs, locations, factions, sessions, and plot threads as they emerge. Map how they connect. Walk into next session knowing exactly where things stand.

---

## Install

In Foundry's module installer, paste this manifest URL at the bottom and click Install:

```
https://raw.githubusercontent.com/cyrensmaps/untangle/main/module.json
```

Once installed, enable the module in **Settings → Manage Modules**, then open it from the **Journal** tab or press **Ctrl + Shift + P**.

---

## API keys

Most of the app works with no setup — you can manually log characters, locations, factions, relationships, and plot threads right away.

Two features require paid API keys, entered in the app's Settings tab:

**Session transcription** uses [OpenAI Whisper](https://platform.openai.com/). You upload a session recording (e.g. from Craig bot) and Whisper transcribes it. A typical 3–4 hour session costs a few cents.

**AI extraction and Find Duplicates** use [Anthropic Claude](https://console.anthropic.com/). Claude reads the transcript and populates your tracker automatically. Find Duplicates also uses Claude to spot entries you logged twice under different names.

Keys are stored in your browser only and go directly to the API providers — nothing passes through this module.

---

## Compatibility

| Foundry version | Status |
|---|---|
| v11 | Minimum |
| v12 | Verified |

---

## Data

All campaign data lives in the browser's local storage inside Foundry. Use the export function in Settings to back up your campaign occasionally.
