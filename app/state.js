// ============================================================
// Untangle — shared state layer
// Loaded by both app/index.html (full planner) and app/widget.html
// (mini HUD) so both read/write the exact same localStorage data.
// ============================================================

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function blankCampaign(name) { return { id: uid(), name, sessions: [], npcs: [], locations: [], hooks: [], maps: [], quickNotes: [], relationships: [], npcPositions: {}, factionPositions: {}, plotThreads: [], factions: [], clocks: [], sessionPrep: { notes: '', scenes: [], questions: [] } }; }

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

document.documentElement.setAttribute('data-theme', state.settings.theme === 'grey' ? 'grey' : 'foundry-basic');

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

function save() { localStorage.setItem('cp_v1', JSON.stringify(state)); _mirrorBackup(); }
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
  state.settings.theme = theme === 'grey' ? 'grey' : 'foundry-basic';
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
// textarea, persisting to camp().quickNotes immediately on "Done" (unlike
// toggleEventEdit's NPC-events pattern, a note has no enclosing modal Save
// button to collect it later, so it has to save itself).
function toggleNoteEdit(btn, noteId) {
  const entry = btn.closest('.note-entry');
  const view = entry.querySelector('.note-text-view');
  const ta = entry.querySelector('.note-text-edit');
  const editing = ta.style.display !== 'none';
  if (editing) {
    const text = ta.value.trim();
    const note = (camp().quickNotes||[]).find(n => n.id === noteId);
    if (note && text) { note.text = text; save(); }
    view.textContent = note ? note.text : ta.value;
    view.style.display = '';
    ta.style.display = 'none';
    btn.textContent = 'Edit';
  } else {
    view.style.display = 'none';
    ta.style.display = '';
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
// we find one there, push it into the new Foundry setting and drop the copy.
(function migrateApiKeysToFoundrySettings() {
  try {
    const pgame = window.parent?.game;
    if (!pgame?.settings || !pgame.user?.isGM) return;
    if (state.settings.apiKey && !pgame.settings.get('untangle', 'claudeApiKey')) {
      pgame.settings.set('untangle', 'claudeApiKey', state.settings.apiKey);
    }
    if (state.settings.openaiKey && !pgame.settings.get('untangle', 'openaiApiKey')) {
      pgame.settings.set('untangle', 'openaiApiKey', state.settings.openaiKey);
    }
  } catch { /* not embedded in Foundry, or settings not registered yet */ }
  delete state.settings.apiKey;
  delete state.settings.openaiKey;
})();
