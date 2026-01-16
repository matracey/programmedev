/**
 * MIMLOs step component
 */

import { state, saveDebounced, editableModuleIds, getSelectedModuleId } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { mimloText, ensureMimloObjects } from '../../utils/helpers.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { lintLearningOutcome } from '../../lib/lo-lint.js';
import { bloomsGuidanceHtml } from './shared.js';

/**
 * Render the MIMLOs step
 */
export function renderMimlosStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();

  const editableIds = editableModuleIds();
  const selectedId = getSelectedModuleId();
  const canPickModule = (p.mode === "MODULE_EDITOR" && editableIds.length > 1);
  const modulesForEdit = (p.modules || []).filter(m => editableIds.includes(m.id));

  const modulePicker = canPickModule ? `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="form-label fw-semibold">Assigned module</label>
        <select class="form-select" id="modulePicker">
          ${modulesForEdit.map(m => `<option value="${m.id}" ${m.id === selectedId ? "selected" : ""}>${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</option>`).join("")}
        </select>
      </div>
    </div>
  ` : "";

  const blocks = modulesForEdit.map(m => {
    ensureMimloObjects(m);
    const items = (m.mimlos || []).map((t, i) => {
      const mimloTxt = mimloText(t);
      const lintResult = lintLearningOutcome(mimloTxt);
      const lintWarnings = lintResult.issues.filter(iss => iss.severity === 'warn').map(issue => `
        <div class="alert alert-warning py-1 px-2 mb-0 mt-1 small">
          <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
          ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map(s => escapeHtml(s)).join(", ")}</em>` : ""}
        </div>
      `).join("");

      return `
        <div class="mb-2">
          <div class="input-group d-flex gap-2">
            <input class="form-control" data-mimlo-module="${m.id}" data-mimlo-index="${i}" value="${escapeHtml(mimloTxt)}">
            <button class="btn btn-outline-danger" data-remove-mimlo="${m.id}" data-remove-mimlo-index="${i}">Remove</button>
          </div>
          <div class="mimlo-lint-warnings mt-1">${lintWarnings}</div>
        </div>
      `;
    }).join("");

    const isHidden = (p.mode === "MODULE_EDITOR" && editableIds.length > 1 && m.id !== selectedId);

    return `
      <div class="card border-0 bg-white shadow-sm mb-3" ${isHidden ? 'style="display:none"' : ""} data-module-card="${m.id}">
        <div class="card-body">
          <div class="fw-semibold mb-1">${escapeHtml((m.code ? m.code + " — " : "") + m.title)}</div>
          <div class="small-muted mb-3">Add 3–6 MIMLOs per module to start.</div>
          ${items || `<div class="small text-secondary mb-2">No MIMLOs yet.</div>`}
          <button class="btn btn-outline-secondary btn-sm" data-add-mimlo="${m.id}">+ Add MIMLO</button>
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">MIMLOs (Minimum Intended Module Learning Outcomes)</h5>
        ${bloomsGuidanceHtml(p.nfqLevel, "MIMLOs")}
        ${modulePicker}
        ${modulesForEdit.length ? blocks : `<div class="small text-secondary">Add modules first (Credits & Modules step).</div>`}
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireMimlosStep();
}

/**
 * Wire MIMLOs step event handlers
 */
function wireMimlosStep() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';

  const picker = document.getElementById("modulePicker");
  if (picker) {
    picker.onchange = () => {
      state.selectedModuleId = picker.value;
      window.render?.();
    };
  }

  document.querySelectorAll("[data-add-mimlo]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-add-mimlo");
      const m = p.modules.find(x => x.id === id);
      if (!m) return;
      m.mimlos = m.mimlos || [];
      m.mimlos.push({ id: 'mimlo_' + crypto.randomUUID(), text: '' });
      saveDebounced();
      window.render?.();
    };
  });

  document.querySelectorAll("[data-remove-mimlo]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-remove-mimlo");
      const idx = Number(btn.getAttribute("data-remove-mimlo-index"));
      const m = p.modules.find(x => x.id === id);
      if (!m) return;
      m.mimlos = (m.mimlos || []).filter((_, i) => i !== idx);
      saveDebounced();
      window.render?.();
    };
  });

  document.querySelectorAll("[data-mimlo-module]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const id = inp.getAttribute("data-mimlo-module");
      const idx = Number(inp.getAttribute("data-mimlo-index"));
      const m = p.modules.find(x => x.id === id);
      if (!m) return;

      m.mimlos = m.mimlos || [];
      ensureMimloObjects(m);
      if (!m.mimlos[idx]) m.mimlos[idx] = { id: 'mimlo_' + crypto.randomUUID(), text: '' };
      m.mimlos[idx].text = e.target.value;
      saveDebounced();

      // Update lint warnings dynamically
      const lintResult = lintLearningOutcome(e.target.value);
      const warningsHtml = lintResult.issues.filter(i => i.severity === 'warn').map(issue => `
        <div class="alert alert-warning py-1 px-2 mb-0 small">
          <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
          ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map(s => escapeHtml(s)).join(", ")}</em>` : ""}
        </div>
      `).join("");

      let lintContainer = inp.closest('.input-group').parentElement.querySelector('.mimlo-lint-warnings');
      if (!lintContainer) {
        lintContainer = document.createElement('div');
        lintContainer.className = 'mimlo-lint-warnings mt-1';
        inp.closest('.input-group').insertAdjacentElement('afterend', lintContainer);
      }
      lintContainer.innerHTML = warningsHtml;
    });
  });
}
