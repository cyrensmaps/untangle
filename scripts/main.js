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

// ── Settings: world-scoped backup mirror ──────────────────
// index.html writes a full copy of its state here (via window.parent.game)
// on every save, so a campaign survives a cleared browser cache/profile —
// it lives in the world data, not just one GM's local storage.

Hooks.on('init', () => {
  game.settings.register(MODULE_ID, 'campaignBackup', {
    scope: 'world',
    config: false,
    type: Object,
    default: {},
  });

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

// ── Add icons to the scene controls (left) toolbar (GM only) ──
//
// We register the tool entries with the core hook so Foundry lays out and
// styles the icons (this part is confirmed working — the icons render).
// We do NOT rely on core calling `tool.onClick` to fire our handlers: that
// dispatch has proven flaky across Foundry versions/builds (clicks landing
// with no console error). Instead we bind our own click listeners straight
// to the rendered DOM nodes in renderSceneControls, which is version-stable
// and lets us see exactly what's happening if something still goes wrong.

const UNTANGLE_TOOLS = [
  { name: 'untangle-open', title: 'Open Untangle', icon: 'fas fa-scroll', fn: () => openCampaignPlanner() },
  { name: 'untangle-quick', title: 'Untangle Quick Access', icon: 'fas fa-bolt', fn: () => toggleQuickAccessWidget() },
];

Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user.isGM) return;
  const tokenControls = Array.isArray(controls)
    ? controls.find(c => c.name === 'token')
    : controls.tokens; // v13+ object shape, kept for forward compatibility

  if (!tokenControls?.tools) return;
  if (Array.isArray(tokenControls.tools)) {
    if (tokenControls.tools.some(t => t.name === 'untangle-open')) return;
    tokenControls.tools.push(...UNTANGLE_TOOLS.map(t => ({ name: t.name, title: t.title, icon: t.icon, button: true })));
  } else {
    if (tokenControls.tools['untangle-open']) return;
    UNTANGLE_TOOLS.forEach(t => { tokenControls.tools[t.name] = { name: t.name, title: t.title, icon: t.icon, button: true }; });
  }
});

Hooks.on('renderSceneControls', (_app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root) return;
  UNTANGLE_TOOLS.forEach(t => {
    const el = root.querySelector(`[data-tool="${t.name}"]`);
    if (el && !el.dataset.untangleBound) {
      el.dataset.untangleBound = '1';
      el.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); t.fn(); });
    }
  });
});

Hooks.on('ready', () => {
  console.log('Untangle | Loaded. Press Ctrl+Shift+P, click the button in the Journal tab, or use the scene controls toolbar to open.');
});
