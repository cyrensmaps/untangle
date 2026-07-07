// ============================================================
// Untangle — shared state layer
// Loaded by both app/index.html (full planner) and app/widget.html
// (mini HUD) so both read/write the exact same localStorage data.
// ============================================================

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function blankCampaign(name) { return { id: uid(), name, sessions: [], npcs: [], locations: [], hooks: [], maps: [], quickNotes: [], relationships: [], npcPositions: {}, factionPositions: {}, plotThreads: [], factions: [], clocks: [], timelineEvents: [], sessionPrep: { notes: '', scenes: [], questions: [] } }; }

const DEFAULT_STATE = () => ({
  settings: { onboarded: false, theme: 'foundry-basic' },
  currentCampaignId: null,
  campaigns: [],
});

let state = JSON.parse(localStorage.getItem('cp_v1') || 'null');

if (!state) {
  state = DEFAULT_STATE();
  const first = blankCampaign('My Campaign');
  state.campaigns.push(first);
  state.currentCampaignId = first.id;
} else if (state.sessions) {
  // Migrate old single-campaign format
  const m = DEFAULT_STATE();
  const c = blankCampaign(state.settings?.campaignName || 'My Campaign');
  c.sessions = state.sessions || [];
  c.npcs = state.npcs || [];
  c.locations = state.locations || [];
  c.hooks = state.hooks || [];
  m.campaigns.push(c);
  m.currentCampaignId = c.id;
  state = m;
} else {
  // Ensure newer settings fields exist after update
  if (!state.settings) state.settings = {};
  if (state.settings.onboarded === undefined) state.settings.onboarded = true; // existing users aren't "first run"
  if (!state.settings.theme) state.settings.theme = 'foundry-basic';
  if (!state.campaigns) state.campaigns = [];
}

// Single source of truth for which theme keys are real - both here and in
// setTheme() below, an unrecognized/stale value falls back to the default
// rather than silently rendering with no matching [data-theme="..."] CSS
// block at all (unstyled). app/index.html's THEMES array (labels for the
// Settings dropdown) should stay in sync with this list.
const VALID_THEME_KEYS = ['foundry-basic', 'grey', 'fantasy', 'scifi', 'horror'];

document.documentElement.setAttribute('data-theme', VALID_THEME_KEYS.includes(state.settings.theme) ? state.settings.theme : 'foundry-basic');

if (!state.campaigns.length) {
  const first = blankCampaign('My Campaign');
  state.campaigns.push(first);
  state.currentCampaignId = first.id;
}
if (!state.currentCampaignId || !state.campaigns.find(c => c.id === state.currentCampaignId)) {
  state.currentCampaignId = state.campaigns[0].id;
}

// Mirror state into a Foundry world setting (best-effort) so a campaign
// survives a cleared browser cache. Debounced since save() can fire often.
// Only meaningful when running inside the Foundry iframe — falls back to
// a no-op if window.parent.game isn't reachable (e.g. opened standalone).
// An iframe is same-origin but still its own separate JS realm, so a plain
// object literal built in here has a DIFFERENT Object.prototype identity
// than the parent window's. Some of Foundry's internals — Document
// creation's DataModel validation in particular — do a strict "is this
// really a plain object" check that fails on objects from a foreign realm,
// throwing something like "JournalEntry was incorrectly constructed with a
// Unknown instead of an object." Round-tripping through the PARENT's own
// JSON.parse/stringify rebuilds the object using the parent's realm, which
// fixes it. Use this on any object literal handed to a window.parent.game
// API (Document create/update/createEmbeddedDocuments, settings.set, etc).
function toFoundryPlain(obj) {
  try { return window.parent.JSON.parse(JSON.stringify(obj)); }
  catch { return obj; }
}

let _backupTimer = null;
function _mirrorBackup() {
  clearTimeout(_backupTimer);
  _backupTimer = setTimeout(() => {
    try {
      const pgame = window.parent?.game;
      if (pgame?.settings && pgame.user?.isGM) {
        pgame.settings.set('untangle', 'campaignBackup', toFoundryPlain({ savedAt: Date.now(), state }));
      }
    } catch { /* not embedded in Foundry, or setting not registered yet */ }
  }, 1500);
}

function save() {
  try {
    localStorage.setItem('cp_v1', JSON.stringify(state));
  } catch (err) {
    // Most likely the browser's localStorage quota - state includes every
    // campaign's base64 NPC portraits and map images, which can add up.
    // Previously this threw uncaught and whatever the user just did (add an
    // NPC, tick a clock...) silently failed to persist with no indication.
    console.error('Untangle | Failed to save - localStorage quota likely exceeded', err);
    const msg = 'Untangle could not save - your browser storage may be full. Try removing a large map image.';
    if (typeof toast === 'function') toast(msg, 'error'); else alert(msg);
    return;
  }
  _mirrorBackup();
}
function camp() { return state.campaigns.find(c => c.id === state.currentCampaignId) || state.campaigns[0]; }

// The main planner, the Quick Access widget, and main.js's "Add to Untangle"
// Actor-sheet button are all separate browsing contexts writing the same
// localStorage key. Without this, an already-open window holds a stale
// in-memory `state` — the next time IT calls save() (even for something
// unrelated), it overwrites whatever another context just wrote, silently
// erasing it. The browser's `storage` event fires in every other context
// sharing this origin whenever one of them writes to localStorage, so we
// use it to pull in that change instead of clobbering it later.
window.addEventListener('storage', (e) => {
  if (e.key !== 'cp_v1' || !e.newValue) return;
  try {
    state = JSON.parse(e.newValue);
    if (typeof onExternalStateChange === 'function') onExternalStateChange();
  } catch { /* ignore a corrupt/partial write */ }
});

function setTheme(theme) {
  state.settings.theme = VALID_THEME_KEYS.includes(theme) ? theme : 'foundry-basic';
  document.documentElement.setAttribute('data-theme', state.settings.theme);
  save();
}

// ── Progress clocks (shared between index.html and widget.html) ──
// Flat row of clickable segments, Blades-in-the-Dark style. Click a segment
// to fill up to it; click the last filled segment again to remove a tick.
function clockSegmentsHTML(clock, tickFnName, editable) {
  let segs = '';
  for (let i = 0; i < clock.segments; i++) {
    const filled = i < clock.filled;
    const click = editable ? ` onclick="event.stopPropagation();${tickFnName}('${clock.id}',${i})"` : '';
    segs += `<div class="clock-seg${filled?' filled':''}"${click} style="${filled?`background:${clock.color};border-color:${clock.color}`:''}"></div>`;
  }
  return `<div class="clock-segments">${segs}</div>`;
}

function tickClockValue(clock, segIndex) {
  clock.filled = (clock.filled === segIndex + 1) ? segIndex : segIndex + 1;
}

// ── Stale callback surfacing ──
// Flags NPCs/Locations/Threads/Factions that had appeared in earlier sessions
// but haven't come up in the last `threshold` sessions — resurfacing the
// threads an improv-heavy GM is most likely to have forgotten about.
const STALE_THRESHOLD = 3;

function computeStaleEntities(threshold) {
  threshold = threshold || STALE_THRESHOLD;
  const c = camp();
  const total = c.sessions.length;
  if (total <= threshold) return [];

  const sessionNumberById = {};
  c.sessions.forEach(s => { sessionNumberById[s.id] = s.number; });
  const maxSessionNumber = ids => ids.reduce((m, sid) => {
    const n = sessionNumberById[sid];
    return (n !== undefined && n > m) ? n : m;
  }, 0);

  const out = [];

  (c.npcs||[]).forEach(n => {
    if (!n.sessions || !n.sessions.length) return;
    const last = maxSessionNumber(n.sessions);
    const since = total - last;
    if (since >= threshold) out.push({ type: 'npc', id: n.id, name: n.name, sessionsSince: since, color: 'var(--accent)' });
  });

  (c.locations||[]).forEach(l => {
    if (!l.sessionIds || !l.sessionIds.length) return;
    const last = maxSessionNumber(l.sessionIds);
    const since = total - last;
    if (since >= threshold) out.push({ type: 'location', id: l.id, name: l.name, sessionsSince: since, color: 'var(--green)' });
  });

  (c.plotThreads||[]).forEach(t => {
    if (t.status === 'resolved' || t.status === 'abandoned') return;
    const npcSessions = (t.npcIds||[]).flatMap(id => (c.npcs.find(n=>n.id===id)?.sessions)||[]);
    const locSessions = (t.locationIds||[]).flatMap(id => (c.locations.find(l=>l.id===id)?.sessionIds)||[]);
    const linked = [...npcSessions, ...locSessions];
    if (!linked.length) return;
    const last = maxSessionNumber(linked);
    const since = total - last;
    if (since >= threshold) out.push({ type: 'thread', id: t.id, name: t.title, sessionsSince: since, color: '#dd8800' });
  });

  (c.factions||[]).forEach(f => {
    if (f.status === 'defeated') return;
    const memberSessions = (f.memberIds||[]).flatMap(id => (c.npcs.find(n=>n.id===id)?.sessions)||[]);
    if (!memberSessions.length) return;
    const last = maxSessionNumber(memberSessions);
    const since = total - last;
    if (since >= threshold) out.push({ type: 'faction', id: f.id, name: f.name, sessionsSince: since, color: f.color || '#888888' });
  });

  return out.sort((a,b) => b.sessionsSince - a.sessionsSince);
}

// ── Cross-window navigation ──
// The Quick Access widget and the main planner are separate Foundry
// Application windows (separate iframes), each reloaded fresh whenever
// opened — so "click a name in the widget, open it in the main window"
// can't reach across iframes directly. Instead the widget stashes what to
// open here (same-origin localStorage), then asks the top Foundry window
// to open/focus the planner; the planner checks for this on load.
function setPendingNav(payload) {
  try { localStorage.setItem('cp_pending_nav', JSON.stringify(payload)); } catch { /* ignore */ }
}
function consumePendingNav() {
  try {
    const raw = localStorage.getItem('cp_pending_nav');
    if (!raw) return null;
    localStorage.removeItem('cp_pending_nav');
    return JSON.parse(raw);
  } catch { return null; }
}
function openInPlanner(type, id) {
  setPendingNav({ type, id });
  try { window.parent.openCampaignPlanner(); } catch { /* not embedded in Foundry */ }
}

// ── Field note tagging + editing (shared between index.html and widget.html) ──
// Builds the "About" dropdown options for tagging a note to an entity.
// Broader than the relationship web's NPC/Faction-only scope since notes
// aren't constrained to what the web can draw.
function _noteEntityOpts(selectedType, selectedId) {
  const c = camp();
  const groups = [
    { label: 'Characters',   items: c.npcs,        type: 'npc',      nameKey: 'name'  },
    { label: 'Locations',    items: c.locations,   type: 'location', nameKey: 'name'  },
    { label: 'Factions',     items: c.factions,    type: 'faction',  nameKey: 'name'  },
    { label: 'Plot Threads', items: c.plotThreads, type: 'thread',   nameKey: 'title' },
  ];
  return groups.filter(g => g.items.length).map(g => `<optgroup label="${g.label}">${g.items.map(it =>
    `<option value="${g.type}:${it.id}" ${selectedType===g.type&&selectedId===it.id?'selected':''}>${esc(it[g.nameKey])}</option>`
  ).join('')}</optgroup>`).join('');
}

// Toggles a single quick note between its static view and an editable
// textarea + About link select, persisting to camp().quickNotes immediately
// on "Done" (unlike toggleEventEdit's NPC-events pattern, a note has no
// enclosing modal Save button to collect it later, so it has to save
// itself). Re-renders the whole page on commit rather than patching the DOM
// in place, since the About chip below the note (built from a fresh camp()
// lookup + a per-type click handler) needs a real rebuild when the link
// just changed. widget.html has no note list at all, so this only ever
// actually runs from app/index.html's Field Notes page, where a global
// render() always exists.
function toggleNoteEdit(btn, noteId) {
  const entry = btn.closest('.note-entry');
  const view = entry.querySelector('.note-text-view');
  const ta = entry.querySelector('.note-text-edit');
  const aboutSel = entry.querySelector('.note-about-edit');
  const editing = ta.style.display !== 'none';
  if (editing) {
    const text = ta.value.trim();
    if (text) {
      const note = (camp().quickNotes||[]).find(n => n.id === noteId);
      if (note) {
        note.text = text;
        const aboutVal = aboutSel?.value || '';
        const [aboutType, aboutId] = aboutVal ? aboutVal.split(':') : [null, null];
        note.aboutType = aboutType || null;
        note.aboutId = aboutId || null;
        save();
      }
    }
    if (typeof render === 'function') render();
  } else {
    view.style.display = 'none';
    ta.style.display = '';
    if (aboutSel) aboutSel.style.display = '';
    ta.focus();
    btn.textContent = 'Done';
  }
}

// ── Voice dictation for quick note capture (shared) ──
// Uses the browser's built-in Web Speech API — free, no API key, and works
// entirely independent of the Claude/Whisper features — rather than adding
// another paid transcription path just for short field notes. Not
// supported in every browser (notably Firefox), so callers should check
// speechRecognitionSupported() before showing a dictate button at all.
function speechRecognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function toggleDictation(textareaId, btn) {
  if (btn._recognition) { btn._recognition.stop(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const ta = document.getElementById(textareaId);
  if (!ta) return;

  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = false;
  try { rec.lang = navigator.language || 'en-US'; } catch { /* ignore */ }

  rec.onresult = (e) => {
    let chunk = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) chunk += e.results[i][0].transcript;
    }
    chunk = chunk.trim();
    if (chunk) ta.value = ta.value.trim() ? ta.value.trim() + ' ' + chunk : chunk;
  };
  rec.onerror = (e) => { console.error('Untangle | Dictation error', e.error); };
  rec.onend = () => {
    btn._recognition = null;
    btn.textContent = 'Dictate';
    btn.style.color = '';
  };

  try {
    rec.start();
    btn._recognition = rec;
    btn.textContent = '● Stop';
    btn.style.color = 'var(--red)';
  } catch (err) {
    console.error('Untangle | Could not start dictation', err);
  }
}

// ── Feature toggles ──
// Lets the GM hide any optional feature from Untangle's own Settings page
// (not Foundry's native Configure Settings sheet — see the "Features" card
// in renderSettings()). Hiding is "hide only": the underlying data and logic
// keep running either way, only the UI entry points disappear. Every entry
// here is something layered on top of the core Sessions/Characters/
// Locations/Factions/Plot-Threads tracking, which is never gated.
//
// `premium` marks a feature as requiring an active Patreon pledge (see
// isPatreonEntitled() below) in addition to being manually enabled. Nothing
// is premium yet — flipping one to `true` later is a one-line change, not a
// rearchitecture.
const FEATURE_REGISTRY = [
  { key: 'sessionPrep',       label: 'Session Prep',              category: 'At the Table',       premium: false },
  { key: 'timeline',          label: 'Timeline',                  category: 'At the Table',       premium: true  },
  { key: 'recap',             label: 'Session Recap',             category: 'At the Table',       premium: false },
  { key: 'staleCallbacks',    label: 'Stale Callback Surfacing',  category: 'At the Table',       premium: false },
  { key: 'maps',              label: 'Maps',                      category: 'World',              premium: false },
  { key: 'clocks',            label: 'Clocks',                    category: 'Story',               premium: false },
  { key: 'relationshipWeb',   label: 'Relationships & Spark',     category: 'Story',               premium: false },
  { key: 'fieldNotes',        label: 'Field Notes',                category: 'Story',               premium: false },
  { key: 'threadBranches',    label: 'Thread Branches',           category: 'Story',               premium: true  },
  { key: 'mysteryBoard',      label: 'Mystery Board',             category: 'Story',               premium: true  },
  { key: 'globalSearch',      label: 'Search',                    category: 'Tools',               premium: false },
  { key: 'nameGenerator',     label: 'Name Generator',            category: 'Tools',               premium: false },
  { key: 'voiceDictation',    label: 'Voice Dictation',           category: 'Tools',               premium: false },
  { key: 'campaignBible',     label: 'Printable Campaign Bible',  category: 'Tools',               premium: true  },
  { key: 'rollTableSync',     label: 'Roll Table Sync',           category: 'Tools',               premium: true  },
  { key: 'postToJournal',     label: 'Post to Journal',           category: 'Tools',               premium: true  },
  { key: 'playerWiki',        label: 'Player Companion',          category: 'Tools',               premium: true  },
  { key: 'pullFromFoundry',   label: 'Pull from Foundry',         category: 'Tools',               premium: false },
  { key: 'hoverTokenTooltip', label: 'Hover Token Tooltip',       category: 'Foundry Integration', premium: false },
  { key: 'hotbarMacros',      label: 'Drag-to-Hotbar Macros',     category: 'Foundry Integration', premium: true  },
  { key: 'addToUntangleButton', label: '"Add to Untangle" Button', category: 'Foundry Integration', premium: false },
  { key: 'simpleCalendar',    label: 'Simple Calendar Integration', category: 'Foundry Integration', premium: false },
];

function getFeatureToggles() {
  try {
    return window.parent?.game?.settings?.get('untangle', 'featureToggles') || {};
  } catch { return {}; }
}

// Returns the settings.set() promise (not fire-and-forget) for the same
// reason setPatreonToken() does: this is a world-scope setting, so it
// round-trips to the server before game.settings.get() reflects the new
// value — callers that immediately re-render (which re-reads it via
// isFeatureEnabled()) must await this first.
async function setFeatureToggle(key, enabled) {
  try {
    const pgame = window.parent?.game;
    if (!pgame?.settings) return;
    const current = getFeatureToggles();
    current[key] = enabled;
    await pgame.settings.set('untangle', 'featureToggles', toFoundryPlain(current));
  } catch { /* not embedded in Foundry, or setting not registered yet */ }
}

// Unknown key -> true (fail open, so a feature not yet registered here isn't
// accidentally hidden). Otherwise: manually enabled (default true) AND, if
// the feature is marked premium, the GM is Patreon-entitled.
function isFeatureEnabled(key) {
  const feature = FEATURE_REGISTRY.find(f => f.key === key);
  if (!feature) return true;
  const toggles = getFeatureToggles();
  const manuallyEnabled = toggles[key] !== false;
  if (!manuallyEnabled) return false;
  return !feature.premium || isPatreonEntitled();
}

// ── Patreon entitlement ──
// Real verification needs a client_secret that can never live in code anyone
// can download, so this module never talks to Patreon directly — a small
// stateless Cloudflare Worker (see patreon-worker/) does the OAuth handshake
// and hands back a signed ES256 JWT this module verifies LOCALLY via Web
// Crypto (no server call needed per feature check, only at login time).
//
// PATREON_WORKER_URL / PATREON_PUBLIC_JWK are filled in once the Worker is
// deployed (see patreon-worker/README.md). Until then, isPatreonEntitled()
// simply returns false — no premium features exist yet, so this has no
// visible effect.
const PATREON_WORKER_URL = 'https://untangle-patreon.untangle-patreon.workers.dev';
const PATREON_PUBLIC_JWK = {"key_ops":["verify"],"ext":true,"kty":"EC","x":"TIbKYsGeOMKG4DRtVGgE4X1oFrr6UpXQKCBKB63wOIs","y":"0FocwsV0rKzEA3MebrxPKhjlHOc3I7KgePA4yMVVjzk","crv":"P-256"}; // paste the PUBLIC JWK from generate-keys.js here

let _patreonEntitled = false;
let _patreonExpiry = 0;

function base64urlToUint8Array(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(b64url.length + (4 - b64url.length % 4) % 4, '=');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Verifies the stored Patreon token's signature + expiry, then caches the
// result. Async because Web Crypto's verify is Promise-based, but the app's
// render paths (render(), nav building, widget tabs) are all synchronous —
// so callers use the sync isPatreonEntitled() below for actual gating, and
// only call this once on load (and right after saving a new token) to keep
// that cache fresh.
//
// Also mirrors the result into localStorage (shared same-origin with the
// top Foundry window, same mechanism as cp_v1/cp_pending_nav) so
// scripts/main.js — which runs outside this iframe and can't call this
// function or do its own async crypto verify inside a synchronous hook
// guard — can cheaply read a premium feature's entitlement without
// re-verifying the token itself. Missing/stale cache reads as "not
// entitled," which is the safe default for a goodwill gate.
async function verifyPatreonToken() {
  const result = await _verifyPatreonTokenInner();
  try { localStorage.setItem('cp_patreon_entitled', result ? '1' : '0'); } catch { /* ignore */ }
  // Also mirror into a world-scope setting so scripts/main.js (separate JS
  // scope from this iframe, can't call this function directly) can gate the
  // Player Companion hotbar button for EVERY connected client, not just
  // this browser. Only the GM can actually write a world-scope setting in
  // Foundry, so this silently no-ops for players - which is correct, since
  // entitlement is fundamentally about the GM's own Patreon account.
  try { await window.parent?.game?.settings?.set('untangle', 'patreonEntitledCache', result); } catch { /* not GM, or not in Foundry - ignore */ }
  return result;
}

async function _verifyPatreonTokenInner() {
  _patreonEntitled = false;
  _patreonExpiry = 0;
  if (!PATREON_PUBLIC_JWK) return false;
  const token = getPatreonToken();
  if (!token) return false;

  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) return false;

    const payload = JSON.parse(new TextDecoder().decode(base64urlToUint8Array(payloadB64)));
    if (!payload.exp || payload.exp * 1000 < Date.now()) return false;

    const key = await crypto.subtle.importKey(
      'jwk', PATREON_PUBLIC_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, key, base64urlToUint8Array(sigB64), signingInput
    );
    if (!valid || !payload.entitled) return false;

    _patreonEntitled = true;
    _patreonExpiry = payload.exp * 1000;
    return true;
  } catch { return false; }
}

// Sync read for use in render paths: trusts the cache from the last
// verifyPatreonToken() call, but still catches an expiry that's since
// passed without needing another async crypto call.
function isPatreonEntitled() {
  if (!_patreonEntitled) return false;
  if (Date.now() > _patreonExpiry) { _patreonEntitled = false; return false; }
  return true;
}

function getPatreonToken() {
  try { return window.parent?.game?.settings?.get('untangle', 'patreonToken') || ''; } catch { return ''; }
}

// Returns the settings.set() promise (not fire-and-forget): world-scope
// settings round-trip to the server before game.settings.get() reflects the
// new value, so callers that immediately re-read it (verifyPatreonToken())
// must await this first, or they can read the stale pre-save value.
async function setPatreonToken(token) {
  try {
    const pgame = window.parent?.game;
    if (!pgame?.settings) return;
    await pgame.settings.set('untangle', 'patreonToken', token || '');
  } catch { /* not embedded in Foundry, or setting not registered yet */ }
}

// API keys live in Foundry's world settings (Configure Settings → Untangle),
// not in this localStorage-backed state — set there, they're visible to the
// GM regardless of which browser/device opens the planner.
function getClaudeKey() {
  try { return window.parent?.game?.settings?.get('untangle', 'claudeApiKey') || ''; } catch { return ''; }
}
function getOpenAIKey() {
  try { return window.parent?.game?.settings?.get('untangle', 'openaiApiKey') || ''; } catch { return ''; }
}

// One-time migration: keys used to live in this state object. The first time
// we find one there, push it into the new Foundry setting and drop the copy -
// but only once that write is actually confirmed to have gone through; each
// key is handled independently so a failure migrating one doesn't take the
// other down with it, and a failed write always leaves the local copy in
// place rather than deleting a key that was never actually saved anywhere.
(async function migrateApiKeysToFoundrySettings() {
  const pgame = window.parent?.game;
  if (!pgame?.settings || !pgame.user?.isGM) return;

  if (state.settings.apiKey) {
    try {
      if (!pgame.settings.get('untangle', 'claudeApiKey')) {
        await pgame.settings.set('untangle', 'claudeApiKey', state.settings.apiKey);
      }
      delete state.settings.apiKey;
    } catch { /* settings not registered yet, or the write failed - keep the local copy */ }
  }

  if (state.settings.openaiKey) {
    try {
      if (!pgame.settings.get('untangle', 'openaiApiKey')) {
        await pgame.settings.set('untangle', 'openaiApiKey', state.settings.openaiKey);
      }
      delete state.settings.openaiKey;
    } catch { /* settings not registered yet, or the write failed - keep the local copy */ }
  }
})();
