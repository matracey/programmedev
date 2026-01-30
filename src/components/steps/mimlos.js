// @ts-check
/**
 * MIMLOs (Module Intended Minimum Learning Outcomes) step component.
 * Manages learning outcomes for each module with linting and Bloom's guidance.
 * @module components/steps/mimlos
 */

import { state, saveDebounced, editableModuleIds, getSelectedModuleId } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { mimloText, ensureMimloObjects } from '../../utils/helpers.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { lintLearningOutcome } from '../../lib/lo-lint.js';
import { bloomsGuidanceHtml, accordionControlsHtml, wireAccordionControls, captureOpenCollapseIds } from './shared.js';

/**
 * Renders the MIMLOs step UI.
 * Displays module learning outcomes with text editing and quality linting.
 */
export function renderMimlosStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const openCollapseIds = captureOpenCollapseIds('mimloAccordion');

  const editableIds = editableModuleIds();
  const selectedId = getSelectedModuleId();
  const canPickModule = (p.mode === "MODULE_EDITOR" && editableIds.length > 1);
  const modulesForEdit = (p.modules ?? []).filter(m => editableIds.includes(m.id));

  const modulePicker = canPickModule ? `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="form-label fw-semibold" for="modulePicker">Assigned module</label>
        <select class="form-select" id="modulePicker" data-testid="mimlo-module-picker">
          ${modulesForEdit.map(m => `<option value="${m.id}" ${m.id === selectedId ? "selected" : ""}>${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</option>`).join("")}
        </select>
      </div>
    </div>
  ` : "";

  const blocks = modulesForEdit.map((m, idx) => {
    ensureMimloObjects(m);
    const items = (m.mimlos ?? []).map((t, i) => {
      const mimloTxt = mimloText(t);
      const lintResult = lintLearningOutcome(mimloTxt);
      const lintWarnings = lintResult.issues.filter(iss => iss.severity === 'warn').map((/** @type {any} */ issue) => `
        <div class="alert alert-warning py-1 px-2 mb-0 mt-1 small">
          <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
          ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map((/** @type {string} */ s) => escapeHtml(s)).join(", ")}</em>` : ""}
        </div>
      `).join("");

      return `
        <div class="mb-2">
          <div class="input-group d-flex gap-2">
            <label class="visually-hidden" for="mimlo-${m.id}-${i}">MIMLO ${i + 1} for ${escapeHtml(m.title || 'module')}</label>
            <input class="form-control" id="mimlo-${m.id}-${i}" data-mimlo-module="${m.id}" data-mimlo-index="${i}" data-testid="mimlo-input-${m.id}-${i}" value="${escapeHtml(mimloTxt)}">
            <button type="button" class="btn btn-outline-danger" data-remove-mimlo="${m.id}" data-remove-mimlo-index="${i}" aria-label="Remove MIMLO ${i + 1}" data-testid="remove-mimlo-${m.id}-${i}"><i class="ph ph-trash" aria-hidden="true"></i> Remove</button>
          </div>
          <div class="mimlo-lint-warnings mt-1" role="status" aria-live="polite">${lintWarnings}</div>
        </div>
      `;
    }).join("");

    const isHidden = (p.mode === "MODULE_EDITOR" && editableIds.length > 1 && m.id !== selectedId);
    const headingId = `mimlo_${m.id}_heading`;
    const collapseId = `mimlo_${m.id}_collapse`;
    const isActive = openCollapseIds.has(collapseId) ? true : (openCollapseIds.size === 0 && idx === 0);
    const countBadge = `<span class="badge text-bg-secondary">${(m.mimlos ?? []).length} item${(m.mimlos ?? []).length !== 1 ? 's' : ''}</span>`;

    return `
      <div class="accordion-item bg-body" ${isHidden ? 'style="display:none"' : ''} data-module-card="${m.id}" data-testid="mimlo-module-${m.id}">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}" data-testid="mimlo-accordion-${m.id}">
            <div class="d-flex w-100 justify-content-between align-items-center">
              <div class="fw-semibold">${escapeHtml((m.code ? m.code + " — " : "") + m.title)}</div>
              <div class="d-flex align-items-center gap-2">
                ${countBadge}
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? 'show' : ''}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <div class="small-muted mb-3" role="note">Add 3–6 MIMLOs per module to start.</div>
            ${items || `<div class="small text-secondary mb-2">No MIMLOs yet.</div>`}
            <button type="button" class="btn btn-outline-secondary btn-sm" data-add-mimlo="${m.id}" aria-label="Add MIMLO to ${escapeHtml(m.title || 'module')}" data-testid="add-mimlo-${m.id}"><i class="ph ph-plus" aria-hidden="true"></i> Add MIMLO</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3" id="mimlos-heading">MIMLOs (Minimum Intended Module Learning Outcomes)</h5>
        ${bloomsGuidanceHtml(p.nfqLevel, "MIMLOs")}
        ${modulePicker}
        ${accordionControlsHtml('mimloAccordion')}
        <div class="accordion" id="mimloAccordion" aria-labelledby="mimlos-heading" data-testid="mimlo-accordion">
          ${modulesForEdit.length ? blocks : `<div class="small text-secondary">Add modules first (Credits & Modules step).</div>`}
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('mimloAccordion');
  wireMimlosStep();
}

/**
 * Wire MIMLOs step event handlers
 */
function wireMimlosStep() {
  const p = state.programme;
  p.mode ??= 'PROGRAMME_OWNER';
  if (!p.modules) p.modules = [];

  const picker = /** @type {HTMLSelectElement | null} */ (document.getElementById("modulePicker"));
  if (picker) {
    picker.onchange = () => {
      state.selectedModuleId = picker.value;
      window.render?.();
    };
  }

  document.querySelectorAll("[data-add-mimlo]").forEach(btn => {
    /** @type {HTMLElement} */ (btn).onclick = () => {
      const id = btn.getAttribute("data-add-mimlo");
      if (!p.modules) return;
      const m = p.modules.find(x => x.id === id);
      if (!m) return;
      m.mimlos ??= [];
      m.mimlos.push({ id: 'mimlo_' + crypto.randomUUID(), text: '' });
      saveDebounced();
      window.render?.();
    };
  });

  document.querySelectorAll("[data-remove-mimlo]").forEach(btn => {
    /** @type {HTMLElement} */ (btn).onclick = () => {
      const id = btn.getAttribute("data-remove-mimlo");
      const idx = Number(btn.getAttribute("data-remove-mimlo-index") ?? 0);
      if (!p.modules) return;
      const m = p.modules.find(x => x.id === id);
      if (!m) return;
      m.mimlos = (m.mimlos ?? []).filter((_, i) => i !== idx);
      saveDebounced();
      window.render?.();
    };
  });

  document.querySelectorAll("[data-mimlo-module]").forEach(inp => {
    inp.addEventListener("input", (/** @type {any} */ e) => {
      const id = inp.getAttribute("data-mimlo-module");
      const idx = Number(inp.getAttribute("data-mimlo-index") ?? 0);
      if (!p.modules) return;
      const m = p.modules.find(x => x.id === id);
      if (!m) return;

      m.mimlos ??= [];
      ensureMimloObjects(m);
      if (!m.mimlos[idx]) m.mimlos[idx] = { id: 'mimlo_' + crypto.randomUUID(), text: '' };
      m.mimlos[idx].text = e.target?.value || '';
      saveDebounced();

      // Update lint warnings dynamically
      const lintResult = lintLearningOutcome(e.target?.value || '');
      const warningsHtml = lintResult.issues.filter(i => i.severity === 'warn').map((/** @type {any} */ issue) => `
        <div class="alert alert-warning py-1 px-2 mb-0 small">
          <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
          ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map((/** @type {string} */ s) => escapeHtml(s)).join(", ")}</em>` : ""}
        </div>
      `).join("");

      const inputGroup = /** @type {HTMLElement} */ (inp).closest('.input-group');
      if (!inputGroup?.parentElement) return;
      let lintContainer = inputGroup.parentElement.querySelector('.mimlo-lint-warnings');
      if (!lintContainer) {
        lintContainer = document.createElement('div');
        lintContainer.className = 'mimlo-lint-warnings mt-1';
        inputGroup.insertAdjacentElement('afterend', lintContainer);
      }
      lintContainer.innerHTML = warningsHtml;
    });
  });
}
