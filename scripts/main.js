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
  if (!_plannerApp) _plannerApp = new CampaignPlannerApp();
  _plannerApp.render(true, { focus: true });
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
  if (_quickAccessApp?.rendered) {
    _quickAccessApp.close();
    return;
  }
  if (!_quickAccessApp) _quickAccessApp = new QuickAccessApp();
  _quickAccessApp.render(true);
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

Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user.isGM) return;
  const tokenControls = Array.isArray(controls)
    ? controls.find(c => c.name === 'token')
    : controls.tokens; // v13+ object shape, kept for forward compatibility

  if (!tokenControls?.tools) return;
  if (Array.isArray(tokenControls.tools)) {
    if (tokenControls.tools.some(t => t.name === 'untangle-open')) return;
    tokenControls.tools.push(
      { name: 'untangle-open', title: 'Open Untangle', icon: 'fas fa-scroll', button: true, onClick: openCampaignPlanner },
      { name: 'untangle-quick', title: 'Untangle Quick Access', icon: 'fas fa-bolt', button: true, onClick: toggleQuickAccessWidget },
    );
  } else {
    if (tokenControls.tools['untangle-open']) return;
    tokenControls.tools['untangle-open'] = { name: 'untangle-open', title: 'Open Untangle', icon: 'fas fa-scroll', button: true, onClick: openCampaignPlanner };
    tokenControls.tools['untangle-quick'] = { name: 'untangle-quick', title: 'Untangle Quick Access', icon: 'fas fa-bolt', button: true, onClick: toggleQuickAccessWidget };
  }
});

Hooks.on('ready', () => {
  console.log('Untangle | Loaded. Press Ctrl+Shift+P, click the button in the Journal tab, or use the scene controls toolbar to open.');
});
