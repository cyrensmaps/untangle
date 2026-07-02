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
let _backupTimer = null;
function _mirrorBackup() {
  clearTimeout(_backupTimer);
  _backupTimer = setTimeout(() => {
    try {
      const pgame = window.parent?.game;
      if (pgame?.settings && pgame.user?.isGM) {
        pgame.settings.set('untangle', 'campaignBackup', { savedAt: Date.now(), state });
      }
    } catch { /* not embedded in Foundry, or setting not registered yet */ }
  }, 1500);
}

function save() { localStorage.setItem('cp_v1', JSON.stringify(state)); _mirrorBackup(); }
function camp() { return state.campaigns.find(c => c.id === state.currentCampaignId) || state.campaigns[0]; }

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
