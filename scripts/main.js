// ============================================================
// Untangle — A Campaign Planner
// Foundry VTT Module
// ============================================================

const MODULE_ID = 'untangle';

// ── Application window ────────────────────────────────────

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
  if (!_plannerApp) _plannerApp = new CampaignPlannerApp();
  _plannerApp.render(true, { focus: true });
}

// ── Register keyboard shortcut (Ctrl + Shift + P) ────────

Hooks.on('init', () => {
  game.keybindings.register(MODULE_ID, 'open', {
    name: 'Open Campaign Planner',
    hint: 'Opens the Campaign Planner window',
    editable: [{ key: 'KeyP', modifiers: ['CONTROL', 'SHIFT'] }],
    onDown: () => {
      openCampaignPlanner();
      return true;
    },
  });
});

// ── Add button to the Journal sidebar ────────────────────

Hooks.on('renderJournalDirectory', (_app, html) => {
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

Hooks.on('ready', () => {
  console.log('Untangle | Loaded. Press Ctrl+Shift+P or click the button in the Journal tab to open.');
});
