// ============================================================
// Untangle — shared state layer
// Loaded by both app/index.html (full planner) and app/widget.html
// (mini HUD) so both read/write the exact same localStorage data.
// ============================================================

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function blankCampaign(name) { return { id: uid(), name, sessions: [], npcs: [], locations: [], hooks: [], maps: [], quickNotes: [], relationships: [], npcPositions: {}, factionPositions: {}, plotThreads: [], factions: [], sessionPrep: { notes: '', scenes: [], questions: [] } }; }

const DEFAULT_STATE = () => ({
  settings: { onboarded: false },
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
  if (!state.campaigns) state.campaigns = [];
}

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
