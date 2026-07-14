// ============================================================
// Untangle — A Campaign Planner
// Foundry VTT Module
// ============================================================

const MODULE_ID = 'untangle';

// ── Application window (full planner) ────────────────────

class CampaignPlannerApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'untangle-app',
      title: 'Untangle',
      width: 1180,
      height: 800,
      resizable: true,
      minimizable: true,
    });
  }

  // Render the planner HTML inside an iframe.
  // Same-origin as Foundry, so localStorage and API calls all work.
  async _renderInner(_data) {
    const url = `modules/${MODULE_ID}/app/index.html`;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%;height:100%;overflow:hidden;';
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = 'microphone'; // for Field Notes voice dictation (Web Speech API)
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
    wrap.appendChild(iframe);
    return $(wrap);
  }
}

// Keep a single instance so it doesn't re-create on every open
let _plannerApp = null;

function openCampaignPlanner() {
  if (!game.user.isGM) return; // Untangle holds GM secrets - never open for players
  try {
    if (!_plannerApp) _plannerApp = new CampaignPlannerApp();
    _plannerApp.render(true, { focus: true });
  } catch (err) {
    console.error('Untangle | Failed to open planner', err);
    ui.notifications?.error('Untangle failed to open - see console (F12) for details.');
  }
}

// ── Quick Access widget (field notes + name generator, always one click away) ──

class QuickAccessApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'untangle-quick-access',
      title: 'Untangle - Quick Access',
      width: 420,
      height: 440,
      resizable: true,
      minimizable: true,
    });
  }

  async _renderInner(_data) {
    const url = `modules/${MODULE_ID}/app/widget.html`;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%;height:100%;overflow:hidden;';
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = 'microphone'; // for Field Notes voice dictation (Web Speech API)
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
    wrap.appendChild(iframe);
    return $(wrap);
  }
}

let _quickAccessApp = null;

function toggleQuickAccessWidget() {
  if (!game.user.isGM) return;
  try {
    if (_quickAccessApp?.rendered) {
      _quickAccessApp.close();
      return;
    }
    if (!_quickAccessApp) _quickAccessApp = new QuickAccessApp();
    _quickAccessApp.render(true);
  } catch (err) {
    console.error('Untangle | Failed to open Quick Access', err);
    ui.notifications?.error('Untangle Quick Access failed to open - see console (F12) for details.');
  }
}

// ── Player Wiki (GM and players alike) ──
// The first window in this module NOT gated to game.user.isGM. Originally
// just a companion map viewer (the rest of the wiki lived in a Foundry
// Journal Entry), this now renders the whole player-safe wiki — Characters,
// Locations, Factions, Story So Far, Rumors, and Map — since the Journal
// Entry approach never looked or felt like part of Untangle. It reads the
// playerWikiData world setting (registered above), never the GM's own
// cp_v1 localStorage, since a player's browser doesn't have that at all.

class PlayerWikiApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'untangle-wiki-viewer',
      title: 'Player Companion',
      width: 880,
      height: 640,
      resizable: true,
      minimizable: true,
    });
  }

  async _renderInner(_data) {
    const url = `modules/${MODULE_ID}/app/wiki-viewer.html`;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%;height:100%;overflow:hidden;';
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
    wrap.appendChild(iframe);
    return $(wrap);
  }
}

let _wikiViewerApp = null;

function toggleWikiViewer() {
  try {
    if (_wikiViewerApp?.rendered) {
      _wikiViewerApp.close();
      return;
    }
    if (!_wikiViewerApp) _wikiViewerApp = new PlayerWikiApp();
    _wikiViewerApp.render(true);
  } catch (err) {
    console.error('Untangle | Failed to open Player Companion', err);
  }
}

// ── Campaign data: export / import / clear ────────────────
// Operates directly on this browser's localStorage — the same store
// app/index.html reads/writes (key 'cp_v1') — so it works even without
// opening the planner.

class UntangleDataConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'untangle-data-config',
      title: 'Untangle - Campaign Data',
      width: 420,
      height: 'auto',
    });
  }

  async _renderInner(_data) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:4px 2px;display:flex;flex-direction:column;gap:12px;';
    wrap.innerHTML = `
      <p>Export a full backup of all campaigns, import a previous backup, or clear all Untangle data stored in this browser.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" data-action="export">Export backup</button>
        <button type="button" data-action="import">Import backup</button>
        <button type="button" data-action="clear" style="color:#c0524f">Clear all data</button>
      </div>
      <input type="file" data-role="import-file" accept=".json" style="display:none">
    `;
    return $(wrap);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="export"]').on('click', () => this._export());
    html.find('[data-action="import"]').on('click', () => html.find('[data-role="import-file"]')[0].click());
    html.find('[data-role="import-file"]').on('change', (ev) => this._import(ev));
    html.find('[data-action="clear"]').on('click', () => this._clear());
  }

  _export() {
    const raw = localStorage.getItem('cp_v1');
    if (!raw) { ui.notifications.warn('No Untangle data found in this browser.'); return; }
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `campaign-backup-${new Date().toISOString().split('T')[0]}.json` });
    a.click();
    URL.revokeObjectURL(url);
  }

  _import(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imp = JSON.parse(e.target.result);
        if (!imp.campaigns && !imp.sessions) throw new Error('Invalid file');
        let final = imp;
        if (imp.sessions && !imp.campaigns) {
          // Legacy single-campaign export — wrap it as an additional campaign
          // rather than replacing everything, matching the old in-app import.
          const existing = JSON.parse(localStorage.getItem('cp_v1') || 'null') || { settings: {}, campaigns: [] };
          const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          const wrapped = {
            id: uid(),
            name: imp.settings?.campaignName || 'Imported Campaign',
            sessions: imp.sessions || [], npcs: imp.npcs || [], locations: imp.locations || [], hooks: imp.hooks || [],
            maps: [], quickNotes: [], relationships: [], npcPositions: {}, factionPositions: {}, plotThreads: [], factions: [],
            sessionPrep: { notes: '', scenes: [], questions: [] },
          };
          existing.campaigns = existing.campaigns || [];
          existing.campaigns.push(wrapped);
          existing.currentCampaignId = wrapped.id;
          final = existing;
        }
        localStorage.setItem('cp_v1', JSON.stringify(final));
        ui.notifications.info('Untangle data imported. Reopen the planner to see it.');
      } catch {
        ui.notifications.error('Invalid Untangle backup file.');
      }
      ev.target.value = '';
    };
    reader.readAsText(file);
  }

  _clear() {
    if (!confirm('Clear all Untangle data stored in this browser? This cannot be undone - export a backup first if unsure.')) return;
    localStorage.removeItem('cp_v1');
    ui.notifications.info('Untangle data cleared.');
  }
}

// ── API keys ───────────────────────────────────────────────
// A dedicated form instead of plain config:true string settings, because
// Foundry's default settings list renders String settings as plain text
// inputs — no masking. type="password" here hides the value as it's
// typed/pasted and whenever the form reopens.

class UntangleApiKeyConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'untangle-api-key-config',
      title: 'Untangle - API Keys',
      width: 420,
      height: 'auto',
    });
  }

  async _renderInner(_data) {
    const claude = game.settings.get(MODULE_ID, 'claudeApiKey') || '';
    const openai = game.settings.get(MODULE_ID, 'openaiApiKey') || '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:4px 2px;display:flex;flex-direction:column;gap:14px;';
    wrap.innerHTML = `
      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">Claude API Key</label>
        <p style="margin:0 0 6px;font-size:0.85em;opacity:0.8">Used for AI transcript analysis and Find Duplicates. Get one at console.anthropic.com.</p>
        <input type="password" name="claude" value="${claude.replace(/"/g, '&quot;')}" placeholder="sk-ant-…" autocomplete="off" style="width:100%">
      </div>
      <div>
        <label style="display:block;font-weight:600;margin-bottom:4px">OpenAI API Key</label>
        <p style="margin:0 0 6px;font-size:0.85em;opacity:0.8">Used for session audio transcription (Whisper). Get one at platform.openai.com/api-keys.</p>
        <input type="password" name="openai" value="${openai.replace(/"/g, '&quot;')}" placeholder="sk-…" autocomplete="off" style="width:100%">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button type="button" data-action="save">Save</button>
      </div>
    `;
    return $(wrap);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find('[data-action="save"]').on('click', async () => {
      await game.settings.set(MODULE_ID, 'claudeApiKey', html.find('input[name="claude"]').val());
      await game.settings.set(MODULE_ID, 'openaiApiKey', html.find('input[name="openai"]').val());
      ui.notifications.info('Untangle API keys saved.');
      this.close();
    });
  }
}

// ── Settings: world-scoped backup mirror ──────────────────
// index.html writes a full copy of its state here (via window.parent.game)
// on every save, so a campaign survives a cleared browser cache/profile —
// it lives in the world data, not just one GM's local storage.

// Each block below is independently try/caught: registerMenu throws if
// `type` isn't a FormApplication (or ApplicationV2, v13+) subclass, and a
// thrown error inside this hook would otherwise silently abort every
// registration after it — which is exactly how the API Keys AND Data menus
// both went missing at once previously. Isolating each block means one
// bad registration can't take the others down with it, and logs loudly
// instead of failing silently.
Hooks.on('init', () => {
  try {
    game.settings.register(MODULE_ID, 'campaignBackup', {
      scope: 'world',
      config: false,
      type: Object,
      default: {},
    });
  } catch (err) { console.error('Untangle | Failed to register campaignBackup setting', err); }

  try {
    // Restricted so only a GM/Assistant GM can even bind or trigger this
    game.keybindings.register(MODULE_ID, 'open', {
      name: 'Open Campaign Planner',
      hint: 'Opens the Campaign Planner window',
      editable: [{ key: 'KeyP', modifiers: ['CONTROL', 'SHIFT'] }],
      restricted: true,
      onDown: () => {
        openCampaignPlanner();
        return true;
      },
    });
  } catch (err) { console.error('Untangle | Failed to register keybinding', err); }

  try {
    // All Untangle settings use scope 'world': it keeps them out of players'
    // Configure Settings entirely (world-scoped entries are GM-only, both to
    // see and to edit), which matters since this whole module is GM-only.
    // onChange re-renders both the quickbar AND the Player Companion button -
    // renderWikiButton() positions itself relative to the quickbar's live
    // getBoundingClientRect(), so if only renderQuickbar() ran here the
    // Companion button would visually detach (frozen at the old position)
    // the moment the GM changed one of these three settings, until some
    // unrelated hotbar re-render happened to fix it.
    game.settings.register(MODULE_ID, 'quickbarEnabled', {
      name: 'Show Quick Bar',
      hint: 'Shows the Untangle quick-access buttons above the macro bar.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: () => { renderQuickbar(); renderWikiButton(); },
    });
    game.settings.register(MODULE_ID, 'quickbarOffsetX', {
      name: 'Quick Bar Horizontal Offset',
      hint: 'Shifts the quick-access buttons left/right (in pixels) relative to the macro bar, in case it overlaps other UI.',
      scope: 'world',
      config: true,
      type: Number,
      default: 0,
      onChange: () => { renderQuickbar(); renderWikiButton(); },
    });
    game.settings.register(MODULE_ID, 'quickbarOffsetY', {
      name: 'Quick Bar Vertical Offset',
      hint: 'Shifts the quick-access buttons up/down (in pixels) relative to the macro bar.',
      scope: 'world',
      config: true,
      type: Number,
      default: 0,
      onChange: () => { renderQuickbar(); renderWikiButton(); },
    });
  } catch (err) { console.error('Untangle | Failed to register quick bar settings', err); }

  try {
    // Per-feature show/hide, set from Untangle's own in-app Settings page
    // (the "Features" card) — not Foundry's native Configure Settings list.
    // config:false since app/state.js's isFeatureEnabled() is the only
    // intended way to read/write this; main.js hooks read it directly since
    // they run in the top window, outside the iframe app/state.js lives in.
    // onChange re-evaluates the Player Companion button immediately when the
    // GM flips its toggle off/on, same reasoning as patreonEntitledCache and
    // playerWikiData below — without it the button only disappears after a
    // hotbar re-render triggered by something unrelated, or a page reload.
    game.settings.register(MODULE_ID, 'featureToggles', {
      scope: 'world',
      config: false,
      type: Object,
      default: {},
      onChange: () => renderWikiButton(),
    });
  } catch (err) { console.error('Untangle | Failed to register featureToggles setting', err); }

  try {
    // Holds the signed JWT from a completed Patreon login (see
    // patreon-worker/). Verified locally by app/state.js's
    // verifyPatreonToken() — this module never talks to Patreon directly.
    game.settings.register(MODULE_ID, 'patreonToken', {
      scope: 'world',
      config: false,
      type: String,
      default: '',
    });
  } catch (err) { console.error('Untangle | Failed to register patreonToken setting', err); }

  try {
    // Mirrors app/state.js's verifyPatreonToken() result into a world-scope
    // setting (that function also writes localStorage, but that's per-
    // browser and this module runs outside the iframe it lives in, so it
    // can't read that directly for anyone but the exact same browser tab).
    // Only the GM's own client can actually verify+write this (Foundry only
    // lets GMs write world-scope settings), which is correct - entitlement
    // is fundamentally about the GM's Patreon account, not any one viewer's.
    // onChange re-evaluates the Player Companion button for every connected
    // client the moment the GM's browser (re-)verifies its token.
    game.settings.register(MODULE_ID, 'patreonEntitledCache', {
      scope: 'world',
      config: false,
      type: Boolean,
      default: false,
      onChange: () => renderWikiButton(),
    });
  } catch (err) { console.error('Untangle | Failed to register patreonEntitledCache setting', err); }

  try {
    // Holds the whole player-safe wiki snapshot the Player Wiki's "Publish"
    // button writes (app/index.html's publishPlayerWiki()). World-scope
    // settings are synced to and readable by every connected client,
    // players included — not just config:false's usual GM-only-config-UI
    // meaning — which is exactly why this exists: the Player Wiki window
    // (PlayerWikiApp, below) runs in a player's own browser and has no
    // access to the GM's cp_v1 localStorage at all, so this is its only
    // data source.
    // onChange fires on every connected client (Foundry broadcasts world
    // settings over the socket) whenever the GM publishes/republishes from
    // inside the iframe — without it the hotbar button only ever gets
    // (re-)evaluated on page load or hotbar-page-switch, so it wouldn't
    // appear until someone reloaded Foundry after the very first publish.
    game.settings.register(MODULE_ID, 'playerWikiData', {
      scope: 'world',
      config: false,
      type: Object,
      default: {},
      onChange: () => renderWikiButton(),
    });
  } catch (err) { console.error('Untangle | Failed to register playerWikiData setting', err); }

  try {
    // Fully shared/collaborative notes in Player Companion, on Characters,
    // Locations, Factions, or Rumors alike - any player or the GM can
    // add/edit/delete ANY note, a real communal document rather than each
    // person's own private list. Keyed by "type:id" (e.g. "rumors:abc123")
    // in one object rather than a separate setting per entity type.
    // World-scope settings can only be written by the GM, so a non-GM
    // client can't call this directly; see the 'module.untangle' socket
    // listener below, which applies a player's edit on the GM's behalf.
    game.settings.register(MODULE_ID, 'sharedNotes', {
      scope: 'world',
      config: false,
      type: Object,
      default: {},
    });
  } catch (err) { console.error('Untangle | Failed to register sharedNotes setting', err); }

  try {
    // API keys — used by the planner's AI extraction (Claude) and audio
    // transcription (Whisper) features. Read directly from these settings by
    // app/index.html via window.parent.game.settings.get(...). config:false
    // because they're edited through UntangleApiKeyConfig (masked inputs)
    // instead of Foundry's default plain-text settings list.
    game.settings.register(MODULE_ID, 'claudeApiKey', {
      scope: 'world',
      config: false,
      type: String,
      default: '',
    });
    game.settings.register(MODULE_ID, 'openaiApiKey', {
      scope: 'world',
      config: false,
      type: String,
      default: '',
    });
    game.settings.registerMenu(MODULE_ID, 'apiKeyConfig', {
      name: 'API Keys',
      label: 'Manage API Keys',
      hint: 'Set your Claude and OpenAI API keys. Values are masked once entered.',
      icon: 'fas fa-key',
      type: UntangleApiKeyConfig,
      restricted: true,
    });
  } catch (err) { console.error('Untangle | Failed to register API key settings/menu', err); }

  try {
    // Data management (export/import/clear) — a menu button rather than a
    // plain setting since these are one-off actions, not stored values.
    game.settings.registerMenu(MODULE_ID, 'dataConfig', {
      name: 'Campaign Data',
      label: 'Manage Data',
      hint: 'Export a backup, import a previous backup, or clear all Untangle data stored in this browser.',
      icon: 'fas fa-database',
      type: UntangleDataConfig,
      restricted: true,
    });
  } catch (err) { console.error('Untangle | Failed to register data menu', err); }
});

// ── Add button to the Journal sidebar (GM only) ───────────

Hooks.on('renderJournalDirectory', (_app, html) => {
  if (!game.user.isGM) return;
  // Avoid adding the button more than once
  if (html[0].querySelector('.cp-sidebar-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'cp-sidebar-btn';
  btn.innerHTML = '<i class="fas fa-scroll"></i> Untangle';
  btn.title = 'Open Untangle (Ctrl+Shift+P)';
  btn.addEventListener('click', openCampaignPlanner);

  // Insert above the journal entry list
  const header = html[0].querySelector('.directory-header');
  if (header) header.insertAdjacentElement('afterend', btn);
});

// ── One-click "Add to Untangle" on Actor sheets (GM only) ──
//
// renderActorSheet (not getActorSheetHeaderButtons) deliberately: the
// header-buttons hook name is derived from the sheet's *exact* runtime
// class (e.g. dnd5e's ActorSheet5eCharacter fires
// getActorSheet5eCharacterHeaderButtons, not the generic name), so it'd
// silently never fire on most system-specific sheets. renderActorSheet
// fires for the base class and works regardless of which system is active.
//
// Reads/writes localStorage directly, same approach UntangleDataConfig
// already uses for export/import/clear — no need for the planner iframe
// to be open.

// Which of the three features gated from this top-window script are
// premium — keep this in sync with the `premium` flags on the matching
// entries in FEATURE_REGISTRY, app/state.js.
const PREMIUM_FEATURES_MAIN = new Set(['hotbarMacros']);

// Synchronous read of the Patreon-entitlement cache app/state.js's
// verifyPatreonToken() mirrors into localStorage (shared same-origin with
// the iframe, same mechanism as cp_v1/cp_pending_nav). This script can't
// call verifyPatreonToken() itself (different JS scope than the iframe) or
// do its own async crypto verify inside a synchronous hook guard, so it
// trusts whatever the iframe last verified. Missing/stale reads as "not
// entitled" — the safe default for a goodwill gate, not a hard blocker.
function _isPatreonEntitledMain() {
  try { return localStorage.getItem('cp_patreon_entitled') === '1'; } catch { return false; }
}

// Mirrors app/state.js's isFeatureEnabled() for the handful of features that
// live in this top-window script rather than the iframe app — same
// featureToggles world setting, just read directly since main.js has no
// access to the iframe's JS scope.
function _isFeatureEnabledMain(key) {
  try {
    const toggles = game.settings.get(MODULE_ID, 'featureToggles') || {};
    if (toggles[key] === false) return false;
  } catch { return true; }
  return !PREMIUM_FEATURES_MAIN.has(key) || _isPatreonEntitledMain();
}

function _stripHtmlMain(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || div.innerText || '').trim();
}

// Cached parse of the cp_v1 localStorage blob. This module's own window
// doesn't touch canvas rendering when it's idle, but hoverToken (below)
// fires on every mouse-in/out over a token during active play - re-parsing
// a campaign's full state (which can run into the low megabytes once maps
// and NPC portraits are counted) on every single hover was doing real work
// on the same thread that drives token/canvas rendering. Invalidated by the
// 'storage' event, which fires here whenever the planner or Quick Access
// iframe (different browsing contexts) writes to the same key - but NOT for
// a write this exact window makes itself, which is why addActorToUntangle()
// below also clears the flag manually right after its own direct write.
let _untangleStateCache = null;
let _untangleStateCacheLoaded = false;

function _readUntangleState() {
  if (!_untangleStateCacheLoaded) {
    try { _untangleStateCache = JSON.parse(localStorage.getItem('cp_v1') || 'null'); }
    catch { _untangleStateCache = null; }
    _untangleStateCacheLoaded = true;
  }
  return _untangleStateCache;
}

window.addEventListener('storage', (e) => {
  if (e.key === 'cp_v1') _untangleStateCacheLoaded = false;
});

// Tokenizer and Token Variant Art can both leave actor.img pointing at
// Foundry's blank mystery-man placeholder while the "real" art the GM sees
// lives on the prototype token instead (Tokenizer commonly saves the
// composited artwork to the token image without also updating the portrait;
// Token Variant Art's per-user/HUD art swaps are often display-only and
// never touch the document at all, so there's nothing on the Actor for
// either module to read in that case - only the token-image fallback below
// is something we can reliably pull).
// Wildcard paths (e.g. "npc-*.webp", used by core wildcard tokens and some
// art-pool modules) are never usable as a literal <img src> - browsers don't
// glob - so those are rejected too rather than returned as a guaranteed-404 URL.
function _resolveActorImgMain(actor) {
  const isUsable = (p) => !!p && !p.includes('mystery-man') && !p.includes('*');
  const toRoute = (p) => foundry.utils?.getRoute ? foundry.utils.getRoute(p) : (p.startsWith('http') ? p : '/' + p.replace(/^\/+/, ''));
  if (isUsable(actor.img)) return toRoute(actor.img);
  const tokenSrc = actor.prototypeToken?.texture?.src;
  if (isUsable(tokenSrc)) return toRoute(tokenSrc);
  return null;
}

function addActorToUntangle(actor) {
  const state = _readUntangleState();
  if (!state?.campaigns?.length) {
    ui.notifications.warn('Open Untangle at least once first, so there is a campaign to add this character to.');
    return;
  }
  const campaign = state.campaigns.find(c => c.id === state.currentCampaignId) || state.campaigns[0];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const bio = actor.system?.details?.biography?.value || actor.system?.details?.biography || '';
  const img = _resolveActorImgMain(actor);
  if (!campaign.npcs) campaign.npcs = [];
  campaign.npcs.push({
    id: uid(), name: actor.name, role: '', motivation: '', notes: _stripHtmlMain(bio), secrets: '',
    locationId: null, status: 'alive', type: actor.type === 'character' ? 'pc' : 'npc', voiceDescription: '',
    sessions: [], events: [], image: img, imageOffsetX: 50, imageOffsetY: 50, foundryActorId: actor.id,
  });
  localStorage.setItem('cp_v1', JSON.stringify(state));
  _untangleStateCacheLoaded = false; // this window's own write - no 'storage' event fires for it
  ui.notifications.info(`Added "${actor.name}" to Untangle.`);
}

Hooks.on('renderActorSheet', (app, html) => {
  try {
    if (!game.user.isGM || !_isFeatureEnabledMain('addToUntangleButton')) return;
    const el = app.element;
    if (!el || !el.length) return;
    const header = el.find('.window-header');
    if (!header.length || header.find('.untangle-actor-btn').length) return;

    const actor = app.actor || app.object;
    if (!actor) return;

    const btn = $(`<a class="header-button untangle-actor-btn"><i class="fas fa-scroll"></i> Add to Untangle</a>`);

    // Re-checks whether this Actor is already linked and updates the
    // button's label/icon in place — called both on first render and right
    // after a successful add, so the button flips to "Open in Untangle"
    // immediately instead of only on the sheet's next re-render.
    let existing = null;
    function refreshButtonState() {
      const state = _readUntangleState();
      const campaign = state?.campaigns?.find(c => c.id === state.currentCampaignId);
      existing = campaign?.npcs?.find(n => n.foundryActorId === actor.id) || null;
      btn.html(`<i class="fas fa-scroll"></i> ${existing ? 'Open in Untangle' : 'Add to Untangle'}`);
    }
    refreshButtonState();

    btn.on('click', (ev) => {
      ev.preventDefault();
      if (existing) {
        localStorage.setItem('cp_pending_nav', JSON.stringify({ type: 'npc', id: existing.id }));
        openCampaignPlanner();
      } else {
        addActorToUntangle(actor);
        refreshButtonState();
      }
    });

    const closeBtn = header.find('.close');
    if (closeBtn.length) closeBtn.before(btn); else header.append(btn);
  } catch (err) { console.error('Untangle | Failed to add Actor sheet button', err); }
});

// ── "/fdn" chat command: save a Field Note without opening Untangle ──
// Same direct-localStorage approach as addActorToUntangle() above (works
// even if no Untangle window is open at all) — the GM can jot something
// down mid-session straight from the chat box instead of alt-tabbing.
function addFieldNoteFromChat(text) {
  const state = _readUntangleState();
  if (!state?.campaigns?.length) {
    ui.notifications.warn('Untangle | Open Untangle at least once first, so there is a campaign to add this note to.');
    return;
  }
  const campaign = state.campaigns.find(c => c.id === state.currentCampaignId) || state.campaigns[0];
  if (!campaign.quickNotes) campaign.quickNotes = [];

  // Optional "@[Name]" tag at the start links the note the same way the full
  // Field Notes UI does - matched by exact case-insensitive name against
  // NPCs, then Locations, Factions, and Plot Threads, in that order. If
  // nothing matches, the tag text is left in the note rather than silently
  // dropped, so the GM can still see what they typed.
  let aboutType = null, aboutId = null, linkedName = '';
  const tagMatch = text.match(/^@\[([^\]]+)\]\s*/);
  if (tagMatch) {
    const name = tagMatch[1].trim().toLowerCase();
    const lists = [
      ['npc', campaign.npcs], ['location', campaign.locations],
      ['faction', campaign.factions], ['thread', campaign.plotThreads],
    ];
    for (const [type, list] of lists) {
      const found = (list||[]).find(x => (type === 'thread' ? x.title : x.name)?.toLowerCase() === name);
      if (found) { aboutType = type; aboutId = found.id; linkedName = tagMatch[1].trim(); break; }
    }
    if (aboutType) text = text.slice(tagMatch[0].length);
  }

  const now = new Date();
  const timestamp = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  campaign.quickNotes.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text, timestamp, aboutType, aboutId,
  });
  localStorage.setItem('cp_v1', JSON.stringify(state));
  _untangleStateCacheLoaded = false; // this window's own write - no 'storage' event fires for it
  ui.notifications.info(linkedName ? `Untangle | Field note saved, linked to "${linkedName}".` : 'Untangle | Field note saved.');
}

Hooks.on('chatMessage', (chatLog, message) => {
  if (!/^\/fdn\b/i.test(message)) return true; // not our command - let Foundry handle it normally
  if (!game.user.isGM) { ui.notifications.warn('Untangle | Only the GM can add field notes this way.'); return false; }
  const text = message.replace(/^\/fdn\s*/i, '').trim();
  if (!text) { ui.notifications.warn('Untangle | Usage: /fdn [@[Name]] <text>'); return false; }
  addFieldNoteFromChat(text);
  return false; // swallow the message - never post "/fdn ..." to chat
});

// ── Hover-a-token tooltip (GM only) ────────────────────────
// Glancing at a token mid-encounter shows its linked NPC's key details
// without opening the full planner, straight from the same localStorage
// data everything else reads. Positioning uses canvas.stage.toGlobal() to
// convert the token's world coordinates through the current pan/zoom into
// screen pixels — the standard approach, but exact behavior should be
// spot-checked live since it can't be tested outside a running canvas.

function _escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let _untangleTokenTooltip = null;
function _removeTokenTooltip() {
  _untangleTokenTooltip?.remove();
  _untangleTokenTooltip = null;
}

Hooks.on('hoverToken', (token, hovered) => {
  try {
    if (!game.user.isGM) return;
    if (!hovered || !_isFeatureEnabledMain('hoverTokenTooltip')) { _removeTokenTooltip(); return; }

    const actorId = token.actor?.id;
    if (!actorId) return;
    const state = _readUntangleState();
    const campaign = state?.campaigns?.find(c => c.id === state.currentCampaignId);
    const npc = campaign?.npcs?.find(n => n.foundryActorId === actorId);
    if (!npc) return;

    const lines = [];
    // Deliberately no 'alive' entry - alive is the common/default case and
    // isn't worth flagging in a hover tooltip, only the exceptions are.
    // Custom NPC Statuses added via Settings (state.settings.customListValues)
    // merge in here so a GM-added status shows up the same way built-ins do.
    const statusLabels = { dead: 'Dead', unknown: 'Unknown / Missing', fled: 'Fled', imprisoned: 'Imprisoned' };
    (state?.settings?.customListValues?.npcStatuses||[]).forEach(s => statusLabels[s.value] = s.label);
    if (npc.status && statusLabels[npc.status]) lines.push(`<div class="untangle-tt-status">${_escHtml(statusLabels[npc.status])}</div>`);
    if (npc.role) lines.push(`<div class="untangle-tt-role">${_escHtml(npc.role)}</div>`);
    const faction = campaign.factions?.find(f => (f.memberIds||[]).includes(npc.id));
    if (faction) lines.push(`<div class="untangle-tt-faction">${_escHtml(faction.name)}</div>`);
    if (npc.voiceDescription) lines.push(`<div class="untangle-tt-voice">${_escHtml(npc.voiceDescription)}</div>`);
    const detail = npc.motivation || npc.notes;
    if (detail) lines.push(`<div class="untangle-tt-detail">${_escHtml(detail.slice(0, 160))}</div>`);
    if (!lines.length) return;

    _removeTokenTooltip();
    const el = document.createElement('div');
    el.id = 'untangle-token-tooltip';
    el.innerHTML = `<div class="untangle-tt-name">${_escHtml(npc.name)}</div>${lines.join('')}`;
    document.body.appendChild(el);

    const worldPos = token.center || { x: token.x, y: token.y };
    const globalPos = canvas.stage.toGlobal(new PIXI.Point(worldPos.x, worldPos.y));
    const rect = canvas.app.view.getBoundingClientRect();
    let left = rect.left + globalPos.x;
    let top = rect.top + globalPos.y - 16;

    // Clamp to the viewport - the element has a translate(-50%,-100%) CSS
    // transform (centered horizontally, anchored above its left/top point),
    // so the actual rendered box is offset from left/top by half its width
    // and its full height. Measured after insertion since size depends on
    // content length.
    const margin = 8;
    const tw = el.offsetWidth, th = el.offsetHeight;
    const visLeft = left - tw / 2, visRight = left + tw / 2;
    const visTop = top - th, visBottom = top;
    if (visLeft < margin) left += margin - visLeft;
    if (visRight > window.innerWidth - margin) left -= visRight - (window.innerWidth - margin);
    if (visTop < margin) top += margin - visTop;
    if (visBottom > window.innerHeight - margin) top -= visBottom - (window.innerHeight - margin);

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    _untangleTokenTooltip = el;
  } catch (err) { console.error('Untangle | Token tooltip failed', err); }
});

Hooks.on('canvasPan', _removeTokenTooltip);
Hooks.on('canvasReady', _removeTokenTooltip);

// ── Drag a card (NPC/Location/Thread/Faction/Clock/Map) to the hotbar for a
// one-click jump ──
// The card's dragstart (app/index.html) sets a custom
// { type: 'untangle-entity', entityType, entityId, name, image } payload via
// dataTransfer — Foundry's TextEditor.getDragEventData parses it and passes
// it straight to this hook as `data`.
const HOTBAR_FALLBACK_ICON = {
  npc: 'icons/svg/mystery-man.svg',
  location: 'icons/svg/village.svg',
  thread: 'icons/svg/book.svg',
  faction: 'icons/svg/statue.svg',
  clock: 'icons/svg/clockwork.svg',
  map: 'icons/svg/map.svg',
};

const HOTBAR_ENTITY_LIST_KEY = { npc: 'npcs', location: 'locations', thread: 'plotThreads', faction: 'factions', clock: 'clocks', map: 'maps' };

Hooks.on('hotbarDrop', (_bar, data, slot) => {
  if (!game.user.isGM || data?.type !== 'untangle-entity' || !_isFeatureEnabledMain('hotbarMacros')) return;
  const { entityType, entityId, name, image } = data;
  (async () => {
    try {
      let macro = game.macros.find(m => m.getFlag(MODULE_ID, 'entityId') === entityId && m.getFlag(MODULE_ID, 'entityType') === entityType);
      if (!macro) {
        // Checks the underlying entity still exists before jumping to it -
        // if the GM later deletes the NPC/Location/etc this macro points at,
        // clicking it now cleans itself up with an explanation instead of
        // silently opening the planner to nothing.
        const listKey = HOTBAR_ENTITY_LIST_KEY[entityType] || 'npcs';
        const command = [
          `try {`,
          `  const raw = localStorage.getItem('cp_v1');`,
          `  const st = raw ? JSON.parse(raw) : null;`,
          `  const campaign = st?.campaigns?.find(c => c.id === st.currentCampaignId);`,
          `  const exists = campaign?.${listKey}?.some(x => x.id === '${entityId}');`,
          `  if (!exists) { ui.notifications.warn('Untangle | This macro\\'s linked item no longer exists - deleting the macro.'); await this.delete(); return; }`,
          `} catch (err) { console.error('Untangle | Macro existence check failed', err); }`,
          `localStorage.setItem('cp_pending_nav', JSON.stringify(${JSON.stringify({ type: entityType, id: entityId })}));`,
          `if (window.openCampaignPlanner) window.openCampaignPlanner();`,
        ].join('\n');
        macro = await Macro.create({
          name: `Untangle: ${name || entityType}`,
          type: 'script',
          scope: 'global',
          command,
          img: image || HOTBAR_FALLBACK_ICON[entityType] || 'icons/svg/book.svg',
        });
        await macro.setFlag(MODULE_ID, 'entityId', entityId);
        await macro.setFlag(MODULE_ID, 'entityType', entityType);
      }
      await game.user.assignHotbarMacro(macro, slot);
    } catch (err) { console.error('Untangle | Failed to create hotbar macro', err); }
  })();
  return false; // tell Foundry not to also run its own default drop handling
});

// ── Quick bar: persistent buttons anchored above the macro bar (GM only) ──
//
// To add another quick-launch button later, just push another entry here —
// { id, icon: '<Font Awesome class>', title, onClick } — renderQuickbar()
// picks up any entries in this array automatically.
const QUICK_BUTTONS = [
  { id: 'open', icon: 'fa-scroll', title: 'Open Untangle', onClick: () => openCampaignPlanner() },
  { id: 'quick', icon: 'fa-bolt', title: 'Untangle Quick Access', onClick: () => toggleQuickAccessWidget() },
];

function renderQuickbar() {
  const hotbar = document.getElementById('hotbar');
  if (!hotbar) return;

  let bar = document.getElementById('untangle-quickbar');
  if (!game.user.isGM) { bar?.remove(); return; }

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'untangle-quickbar';
    hotbar.appendChild(bar);
  }

  const enabled = game.settings.get(MODULE_ID, 'quickbarEnabled');
  bar.style.display = enabled ? 'flex' : 'none';
  if (!enabled) return;

  const offsetX = game.settings.get(MODULE_ID, 'quickbarOffsetX') || 0;
  const offsetY = game.settings.get(MODULE_ID, 'quickbarOffsetY') || 0;
  bar.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-100% + ${offsetY}px))`;

  bar.innerHTML = '';
  QUICK_BUTTONS.forEach(b => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'untangle-quickbar-btn';
    btn.title = b.title;
    btn.innerHTML = `<i class="fas ${b.icon}"></i>`;
    btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); b.onClick(); });
    bar.appendChild(btn);
  });
}

Hooks.on('renderHotbar', renderQuickbar);
Hooks.once('ready', renderQuickbar);

// ── Player Companion map button — visible to EVERY connected client, not
// just the GM. Uses the patreonEntitledCache world setting (mirrored by
// app/state.js's verifyPatreonToken(), see its registration above) rather
// than a local entitlement check, since a player's browser has no way to
// verify the GM's own Patreon link itself — the cache is only ever written
// by the GM's client, which is exactly who this entitlement is actually
// about. wiki-viewer.html still does its own independent check once opened
// as defense in depth, but the button itself now correctly hides for
// everyone the moment the GM isn't entitled, instead of dead-ending players
// at an "unavailable" screen.
function _wikiButtonShouldShow() {
  try {
    const toggles = game.settings.get(MODULE_ID, 'featureToggles') || {};
    if (toggles.playerWiki === false) return false;
    if (!game.settings.get(MODULE_ID, 'patreonEntitledCache')) return false;
    const data = game.settings.get(MODULE_ID, 'playerWikiData') || {};
    return !!(data.characters?.length || data.locations?.length || data.factions?.length ||
      data.sessions?.length || data.rumors?.length || data.clocks?.length || Object.keys(data.maps || {}).length);
  } catch { return false; }
}

function renderWikiButton() {
  const hotbar = document.getElementById('hotbar');
  if (!hotbar) return;

  let bar = document.getElementById('untangle-wiki-btn-bar');
  if (!_wikiButtonShouldShow()) { bar?.remove(); return; }

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'untangle-wiki-btn-bar';
    hotbar.appendChild(bar);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'untangle-wiki-btn';
    btn.title = 'Player Companion';
    btn.innerHTML = '<i class="fas fa-book-open"></i>';
    btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); toggleWikiViewer(); });
    bar.appendChild(btn);
  }

  // Sit directly beside the GM quickbar (same row, immediately to its
  // right) instead of off at the hotbar's right edge, so all of Untangle's
  // buttons read as one group and move together if the GM drags the
  // quickbar's position around via its Horizontal/Vertical Offset settings.
  // renderQuickbar() is hooked before this function (registration order
  // below), so its bar has already been created/positioned by the time this
  // runs. getBoundingClientRect() (not offsetLeft/offsetTop) is used because
  // it reflects the quickbar's actual on-screen box AFTER its own
  // offset-driven transform is applied - offsetLeft/offsetTop would only
  // give the untransformed layout position and silently ignore any offset
  // the GM has configured. Players never see the quickbar at all, so this
  // falls back to the same centered/lifted position the quickbar itself
  // uses by default.
  const hotbarRect = hotbar.getBoundingClientRect();
  const quickbar = document.getElementById('untangle-quickbar');
  const quickbarRect = quickbar && quickbar.style.display !== 'none' ? quickbar.getBoundingClientRect() : null;
  if (quickbarRect) {
    bar.style.left = `${quickbarRect.right - hotbarRect.left + 6}px`;
    bar.style.top = `${quickbarRect.top - hotbarRect.top}px`;
    bar.style.transform = 'none';
  } else {
    bar.style.left = '50%';
    bar.style.top = '0';
    bar.style.transform = 'translateY(-100%)';
  }
}

Hooks.on('renderHotbar', renderWikiButton);
Hooks.once('ready', renderWikiButton);

Hooks.on('ready', () => {
  console.log('Untangle | Loaded. Press Ctrl+Shift+P, click the button in the Journal tab, or use the quick bar above the macro bar to open.');
});

// Relays a non-GM client's shared-note edit (Characters, Locations,
// Factions, or Rumors) into the world-scope sharedNotes setting (see its
// registration above) - every connected client receives this broadcast, but
// only the GM's own client should ever act on it, both because only a GM
// can write a world setting at all and because otherwise every client would
// try to apply the same write. Always active whenever the GM's own browser
// session is open, independent of whether any Untangle window happens to be
// open at the time.
// Serializes relayed writes strictly one-at-a-time: without this, two
// sharedNotesWrite messages arriving close together (from the same player
// firing two quick actions, or two different players editing near-
// simultaneously) could both read the same pre-update snapshot via
// game.settings.get() before either write's set() had actually resolved -
// the second one to finish would then silently overwrite the first's
// change. Chaining every write off a single promise means each one's get()
// always happens after the previous write has fully landed.
let _sharedNotesQueue = Promise.resolve();

Hooks.once('ready', () => {
  game.socket.on('module.untangle', (data) => {
    if (!game.user.isGM || data?.type !== 'sharedNotesWrite') return;
    if (typeof data.key !== 'string' || !Array.isArray(data.notes)) return;
    _sharedNotesQueue = _sharedNotesQueue.then(async () => {
      try {
        const all = game.settings.get(MODULE_ID, 'sharedNotes') || {};
        await game.settings.set(MODULE_ID, 'sharedNotes', { ...all, [data.key]: data.notes });
      } catch (err) { console.error('Untangle | Failed to relay a shared note write', err); }
    });
  });
});

// ── Macros ────────────────────────────────────────────────
// Auto-created as ordinary World Macros the first time each GM client loads
// (idempotent - recreated if deleted), so they show up ready to drag onto
// the hotbar without needing an actual Compendium pack build pipeline,
// which this repo has no tooling for. Every macro here is flagged with
// {untangle: {builtin: <key>}} so ensureUntangleMacros() can tell which
// ones already exist without relying on name matching (which would break
// if a GM renamed one).

// A few of these need to call a function that only exists inside the
// planner's iframe (app/index.html), not this top-window script - this
// opens the planner if it's not already open, then polls briefly for its
// iframe to finish loading (contentWindow.navigate is one of the first
// functions app/index.html's script defines) before running fn against it.
function _withPlannerWindow(fn) {
  if (!game.user.isGM) return;
  openCampaignPlanner();
  const tryRun = (attemptsLeft) => {
    const iframe = _plannerApp?.element?.[0]?.querySelector?.('iframe');
    const win = iframe?.contentWindow;
    if (win && typeof win.navigate === 'function') { fn(win); return; }
    if (attemptsLeft <= 0) { console.warn('Untangle | Timed out waiting for the planner to load.'); return; }
    setTimeout(() => tryRun(attemptsLeft - 1), 100);
  };
  tryRun(50); // ~5s max wait
}

function untangleShowOnboarding() {
  _withPlannerWindow(win => {
    win.state.settings.onboarded = false;
    win.save();
    win.maybeShowOnboarding();
  });
}
function untangleNewSession() {
  _withPlannerWindow(win => win.navigate('session-new'));
}
function untanglePublishPlayerCompanion() {
  _withPlannerWindow(win => win.publishPlayerWiki());
}
function untangleJumpToSessionPrep() {
  _withPlannerWindow(win => win.navigate('prep'));
}

// Same polling-for-the-iframe-to-load approach as _withPlannerWindow, but
// for the (much smaller) Quick Access widget window instead - only opens it
// if it isn't already showing, since this widget's own open button is a
// toggle and re-triggering it here would just close what a GM already had open.
function _withQuickAccessWindow(fn) {
  if (!game.user.isGM) return;
  if (!_quickAccessApp?.rendered) toggleQuickAccessWidget();
  const tryRun = (attemptsLeft) => {
    const iframe = _quickAccessApp?.element?.[0]?.querySelector?.('iframe');
    const win = iframe?.contentWindow;
    if (win && typeof win.qaSwitch === 'function') { fn(win); return; }
    if (attemptsLeft <= 0) { console.warn('Untangle | Timed out waiting for Quick Access to load.'); return; }
    setTimeout(() => tryRun(attemptsLeft - 1), 100);
  };
  tryRun(50);
}
function untangleRollAName() {
  _withQuickAccessWindow(win => win.qaSwitch('names'));
}

// The macro-equivalent of the "/fdn" chat command, for GMs who'd rather
// click a hotbar button mid-session than remember chat syntax - reuses the
// exact same save path (and @[Name] tagging) as /fdn itself.
function untangleQuickFieldNote() {
  if (!game.user.isGM) return;
  new Dialog({
    title: 'Quick Field Note',
    content: `<div class="form-group"><label>Note <span style="opacity:0.7">(start with @[Name] to link it to a character, location, faction, or thread)</span></label><textarea id="untangle-qfn-text" rows="4" style="width:100%"></textarea></div>`,
    buttons: {
      save: {
        label: 'Save',
        callback: html => {
          const text = (html.find ? html.find('#untangle-qfn-text').val() : html.querySelector('#untangle-qfn-text')?.value)?.trim();
          if (text) addFieldNoteFromChat(text);
        },
      },
      cancel: { label: 'Cancel' },
    },
    default: 'save',
  }).render(true);
}

const UNTANGLE_MACROS = [
  { key: 'showOnboarding', name: 'Untangle: Show Onboarding', command: 'untangleShowOnboarding();' },
  { key: 'openPlanner', name: 'Untangle: Open Planner', command: 'openCampaignPlanner();' },
  { key: 'toggleQuickAccess', name: 'Untangle: Toggle Quick Access', command: 'toggleQuickAccessWidget();' },
  { key: 'togglePlayerCompanion', name: 'Untangle: Toggle Player Companion', command: 'toggleWikiViewer();' },
  { key: 'newSession', name: 'Untangle: New Session', command: 'untangleNewSession();' },
  { key: 'publishPlayerCompanion', name: 'Untangle: Publish Player Companion', command: 'untanglePublishPlayerCompanion();' },
  { key: 'rollAName', name: 'Untangle: Roll a Name', command: 'untangleRollAName();' },
  { key: 'sessionPrep', name: 'Untangle: Jump to Session Prep', command: 'untangleJumpToSessionPrep();' },
  { key: 'quickFieldNote', name: 'Untangle: Quick Field Note', command: 'untangleQuickFieldNote();' },
];

async function ensureUntangleMacros() {
  if (!game.user.isGM) return;
  const existingKeys = new Set(
    game.macros.contents
      .map(m => m.getFlag(MODULE_ID, 'builtin'))
      .filter(Boolean)
  );
  for (const m of UNTANGLE_MACROS) {
    if (existingKeys.has(m.key)) continue;
    try {
      await Macro.create({
        name: m.name,
        type: 'script',
        img: 'icons/svg/book.svg',
        command: m.command,
        flags: { [MODULE_ID]: { builtin: m.key } },
      });
    } catch (err) { console.error(`Untangle | Failed to create macro "${m.name}"`, err); }
  }
}

Hooks.once('ready', ensureUntangleMacros);
