// @ts-check
/**
 * PLO to Module Mapping step component (QQI-critical).
 * Maps Programme Learning Outcomes to modules using ploToModules structure.
 * @module components/steps/mapping
 */

import { state, saveDebounced } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { ploText } from '../../utils/helpers.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { accordionControlsHtml, wireAccordionControls, captureOpenCollapseIds } from './shared.js';

/**
 * Returns module IDs that can be edited in MODULE_EDITOR mode.
 *
 * @returns {string[]} Array of editable module IDs
 * @private
 */
function editableModuleIds() {
  const p = state.programme;
  if (p.mode !== 'MODULE_EDITOR') return (p.modules ?? []).map(m => m.id);
  /** @type {string[]} */
  const editable = /** @type {any} */ (p).editableModuleIds ?? [];
  return editable;
}

/**
 * Renders the PLO-Module Mapping step UI.
 * Displays a matrix for mapping PLOs to modules with checkboxes.
 */
export function renderMappingStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const plos = p.plos ?? [];
  const modules = p.modules ?? [];
  const openCollapseIds = captureOpenCollapseIds('mappingAccordion');

  // Ensure ploToModules exists
  if (!p.ploToModules) p.ploToModules = {};
  const ploToModules = p.ploToModules;

  if (!plos.length || !modules.length) {
    content.innerHTML = devModeToggleHtml + `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title"><i class="ph ph-graph me-2" aria-hidden="true"></i>Mapping</h5>
          <div class="alert alert-info mb-0"><i class="ph ph-info me-2" aria-hidden="true"></i>Add PLOs and modules first.</div>
        </div>
      </div>
    `;
    wireDevModeToggle(() => window.render?.());
    return;
  }

  const editableIds = editableModuleIds();
  const isModuleEditor = p.mode === "MODULE_EDITOR";

  // Build PLO blocks with module checkboxes
  const blocks = plos.map((o, idx) => {
    const selected = ploToModules[o.id] ?? [];
    
    // Build checkbox list for each module
    const checks = modules.map(m => {
      const isEditable = editableIds.includes(m.id);
      const isChecked = selected.includes(m.id);
      
      // In module editor mode, hide modules they can't edit (unless already mapped)
      if (isModuleEditor && !isEditable && !isChecked) {
        return '';
      }
      
      const disabled = isModuleEditor && !isEditable;
      const disabledAttr = disabled ? 'disabled' : '';
      const disabledClass = disabled ? 'opacity-50' : '';
      const disabledNote = disabled ? ' <span class="text-secondary fst-italic">(read-only)</span>' : '';
      
      return `
        <label class="list-group-item d-flex gap-2 align-items-center ${disabledClass}">
          <input class="form-check-input m-0" type="checkbox" data-map-plo="${o.id}" data-map-module="${m.id}" ${isChecked ? "checked" : ""} ${disabledAttr} aria-label="Map PLO ${idx + 1} to ${escapeHtml(m.title)}" data-testid="mapping-checkbox-${o.id}-${m.id}">
          <span class="small">${escapeHtml((m.code ? m.code + " — " : "") + m.title)} <span class="text-secondary">(${Number(m.credits ?? 0)} cr)</span>${disabledNote}</span>
        </label>
      `;
    }).filter(Boolean).join("");

    const headingId = `map_${o.id}_heading`;
    const collapseId = `map_${o.id}_collapse`;
    const isActive = openCollapseIds.has(collapseId) ? true : (openCollapseIds.size === 0 && idx === 0);
    const preview = (o.text || '').trim();
    const previewShort = preview.length > 120 ? `${preview.slice(0, 120)}…` : (preview || '—');
    return `
      <div class="accordion-item bg-body">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}">
            <div>
              <div class="fw-semibold">PLO ${idx + 1}</div>
              <div class="small text-secondary">${escapeHtml(previewShort)}</div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? 'show' : ''}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <div class="list-group">${checks || '<div class="small text-secondary">No modules available to map.</div>'}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Module editor mode note
  const modeNote = isModuleEditor 
    ? `<div class="alert alert-info mb-3"><strong>Module Editor Mode:</strong> You can only map PLOs to your assigned modules. Other mappings are shown as read-only.</div>`
    : '';

  // Summary stats
  const unmappedPlos = plos.filter(plo => 
    !(ploToModules[plo.id] ?? []).length
  ).length;

  const modulesWithNoMapping = modules.filter(m => 
    !plos.some(plo => (ploToModules[plo.id] ?? []).includes(m.id))
  ).length;

  const summaryHtml = (unmappedPlos || modulesWithNoMapping) ? `
    <div class="card bg-light mb-3">
      <div class="card-body py-2">
        <div class="small">
          ${unmappedPlos ? `<div class="text-danger">⚠️ ${unmappedPlos} PLO(s) not mapped to any module</div>` : '<div class="text-success">✓ All PLOs mapped to at least one module</div>'}
          ${modulesWithNoMapping ? `<div class="text-warning">⚠️ ${modulesWithNoMapping} module(s) not linked to any PLO</div>` : ''}
        </div>
      </div>
    </div>
  ` : '<div class="alert alert-success mb-3">✓ All PLOs mapped to modules</div>';

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3"><i class="ph ph-graph me-2" aria-hidden="true"></i>Map PLOs to modules (QQI-critical)</h5>
        <p class="text-muted small mb-3"><i class="ph ph-lightbulb me-1" aria-hidden="true"></i>For each PLO, select the modules where this outcome is addressed. This mapping is required for QQI validation and the traceability matrix.</p>
        ${modeNote}
        ${summaryHtml}
        ${accordionControlsHtml('mappingAccordion')}
        <div class="accordion" id="mappingAccordion">
          ${blocks}
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('mappingAccordion');
  wireMappingStep();
}

/**
 * Wire Mapping step event handlers
 */
function wireMappingStep() {
  const p = state.programme;

  // Ensure ploToModules exists
  if (!p.ploToModules) p.ploToModules = {};

  document.querySelectorAll("[data-map-plo]").forEach(chk => {
    /** @type {HTMLInputElement} */ (chk).onchange = () => {
      const ploId = chk.getAttribute("data-map-plo");
      const moduleId = chk.getAttribute("data-map-module");
      if (!ploId || !moduleId || !p.ploToModules) return;
      
      if (!p.ploToModules[ploId]) p.ploToModules[ploId] = [];
      
      if (/** @type {HTMLInputElement} */ (chk).checked) {
        if (!p.ploToModules[ploId].includes(moduleId)) {
          p.ploToModules[ploId].push(moduleId);
        }
      } else {
        p.ploToModules[ploId] = p.ploToModules[ploId].filter((/** @type {string} */ id) => id !== moduleId);
      }
      
      saveDebounced();
    };
  });
}
