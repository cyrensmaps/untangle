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
      width: 1300,
      height: 860,
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
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
    wrap.appendChild(iframe);
    return $(wrap);
  }
}

// Keep a single instance so it doesn't re-create on every open
let _plannerApp = null;

function openCampaignPlanner() {
  if (!game.user.isGM) return; // Untangle holds GM secrets — never open for players
  try {
    if (!_plannerApp) _plannerApp = new CampaignPlannerApp();
    _plannerApp.render(true, { focus: true });
  } catch (err) {
    console.error('Untangle | Failed to open planner', err);
    ui.notifications?.error('Untangle failed to open — see console (F12) for details.');
  }
}

// ── Quick Access widget (field notes + name generator, always one click away) ──

class QuickAccessApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'untangle-quick-access',
      title: 'Untangle — Quick Access',
      width: 320,
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
    ui.notifications?.error('Untangle Quick Access failed to open — see console (F12) for details.');
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
      title: 'Untangle — Campaign Data',
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
    if (!confirm('Clear all Untangle data stored in this browser? This cannot be undone — export a backup first if unsure.')) return;
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
      title: 'Untangle — API Keys',
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
    game.settings.register(MODULE_ID, 'quickbarEnabled', {
      name: 'Show Quick Bar',
      hint: 'Shows the Untangle quick-access buttons above the macro bar.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: () => renderQuickbar(),
    });
    game.settings.register(MODULE_ID, 'quickbarOffsetX', {
      name: 'Quick Bar Horizontal Offset',
      hint: 'Shifts the quick-access buttons left/right (in pixels) relative to the macro bar, in case it overlaps other UI.',
      scope: 'world',
      config: true,
      type: Number,
      default: 0,
      onChange: () => renderQuickbar(),
    });
    game.settings.register(MODULE_ID, 'quickbarOffsetY', {
      name: 'Quick Bar Vertical Offset',
      hint: 'Shifts the quick-access buttons up/down (in pixels) relative to the macro bar.',
      scope: 'world',
      config: true,
      type: Number,
      default: 0,
      onChange: () => renderQuickbar(),
    });
  } catch (err) { console.error('Untangle | Failed to register quick bar settings', err); }

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

Hooks.on('ready', () => {
  console.log('Untangle | Loaded. Press Ctrl+Shift+P, click the button in the Journal tab, or use the quick bar above the macro bar to open.');
});
