// @ts-check
/**
 * PLO to MIMLO Mapping step component (QQI-critical).
 * Maps Programme Learning Outcomes to MIMLOs using ploToMimlos structure.
 * Shows hierarchical checkboxes: Module → MIMLOs.
 * @module components/steps/mapping
 */

import { saveDebounced, state } from "../../state/store.js";
import { escapeHtml } from "../../utils/dom.js";
import { getDevModeToggleHtml, wireDevModeToggle } from "../dev-mode.js";
import { accordionControlsHtml, captureOpenCollapseIds, wireAccordionControls } from "./shared.js";

/**
 * Returns module IDs that can be edited in MODULE_EDITOR mode.
 *
 * @returns {string[]} Array of editable module IDs
 * @private
 */
function editableModuleIds() {
  const p = state.programme;
  if (p.mode !== "MODULE_EDITOR") {
    return (p.modules ?? []).map((m) => m.id);
  }
  /** @type {string[]} */
  const editable = /** @type {any} */ (p).editableModuleIds ?? [];
  return editable;
}

/**
 * Gets all MIMLO IDs for a module.
 * @param {Module} mod - Module
 * @returns {string[]} Array of MIMLO IDs
 */
function getModuleMimloIds(mod) {
  return (mod.mimlos ?? []).map((m) => m.id);
}

/**
 * Checks if all MIMLOs of a module are mapped to a PLO.
 * @param {string[]} mappedMimloIds - Currently mapped MIMLO IDs for a PLO
 * @param {Module} mod - Module to check
 * @returns {"all" | "some" | "none"} Mapping state
 */
function getModuleMappingState(mappedMimloIds, mod) {
  const moduleMimloIds = getModuleMimloIds(mod);
  if (moduleMimloIds.length === 0) {
    return "none";
  }
  const mappedCount = moduleMimloIds.filter((id) => mappedMimloIds.includes(id)).length;
  if (mappedCount === 0) {
    return "none";
  }
  if (mappedCount === moduleMimloIds.length) {
    return "all";
  }
  return "some";
}

/**
 * Renders the PLO-MIMLO Mapping step UI.
 * Displays hierarchical checkboxes for mapping PLOs to MIMLOs via modules.
 */
export function renderMappingStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  const devModeToggleHtml = getDevModeToggleHtml();
  const plos = p.plos ?? [];
  const modules = p.modules ?? [];
  const openCollapseIds = captureOpenCollapseIds("mappingAccordion");

  // Ensure ploToMimlos exists
  if (!p.ploToMimlos) {
    p.ploToMimlos = {};
  }
  const ploToMimlos = p.ploToMimlos;

  if (!plos.length || !modules.length) {
    content.innerHTML =
      devModeToggleHtml +
      `
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

  // Build PLO blocks with hierarchical module/MIMLO checkboxes
  const blocks = plos
    .map((o, idx) => {
      const mappedMimloIds = ploToMimlos[o.id] ?? [];

      // Build hierarchical checkbox list for each module and its MIMLOs
      const moduleBlocks = modules
        .map((m) => {
          const isEditable = editableIds.includes(m.id);
          const moduleMimlos = m.mimlos ?? [];
          const mappingState = getModuleMappingState(mappedMimloIds, m);

          // In module editor mode, hide modules they can't edit (unless already has mapped MIMLOs)
          if (isModuleEditor && !isEditable && mappingState === "none") {
            return "";
          }

          const disabled = isModuleEditor && !isEditable;
          const disabledAttr = disabled ? "disabled" : "";
          const disabledClass = disabled ? "opacity-50" : "";
          const disabledNote = disabled
            ? ' <span class="text-secondary fst-italic">(read-only)</span>'
            : "";

          // Module-level checkbox state
          const moduleChecked = mappingState === "all" ? "checked" : "";
          const moduleIndeterminate = mappingState === "some" ? "data-indeterminate" : "";

          // Build MIMLO checkboxes
          const mimloChecks = moduleMimlos
            .map((mimlo, mimloIdx) => {
              const isMimloChecked = mappedMimloIds.includes(mimlo.id);
              const mimloText = mimlo.text || `MIMLO ${mimloIdx + 1}`;
              const shortText = mimloText.length > 80 ? `${mimloText.slice(0, 80)}…` : mimloText;
              return `
              <label class="list-group-item d-flex gap-2 align-items-start ps-4 ${disabledClass}">
                <input class="form-check-input m-0 mt-1" type="checkbox" 
                  data-map-plo="${o.id}" 
                  data-map-mimlo="${mimlo.id}" 
                  data-map-module="${m.id}"
                  ${isMimloChecked ? "checked" : ""} 
                  ${disabledAttr} 
                  aria-label="Map PLO ${idx + 1} to MIMLO: ${escapeHtml(shortText)}"
                  data-testid="mapping-checkbox-${o.id}-${mimlo.id}">
                <span class="small">${mimloIdx + 1}. ${escapeHtml(shortText)}</span>
              </label>
            `;
            })
            .join("");

          const moduleCollapseId = `map_${o.id}_${m.id}_mimlos`;
          const hasMimlos = moduleMimlos.length > 0;

          // Count selected MIMLOs for this module
          const selectedCount = moduleMimlos.filter((mimlo) => mappedMimloIds.includes(mimlo.id)).length;
          const totalCount = moduleMimlos.length;

          // Make the module name clickable to expand/collapse if it has MIMLOs
          const moduleNameAttrs = hasMimlos
            ? `role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#${moduleCollapseId}" aria-expanded="false" aria-controls="${moduleCollapseId}" style="cursor: pointer;"`
            : "";

          // Badge styling: gray for none, primary for any selection
          const badgeClass =
            selectedCount === 0
              ? "bg-secondary-subtle text-secondary-emphasis"
              : "bg-primary-subtle text-primary-emphasis";

          return `
          <div class="module-mapping-group border-start border-2 ${mappingState !== "none" ? "border-primary" : "border-light"} mb-2">
            <div class="d-flex align-items-center gap-2 py-2 px-2 bg-light rounded-end ${disabledClass}">
              <input class="form-check-input m-0" type="checkbox" 
                data-map-plo="${o.id}" 
                data-map-module-all="${m.id}"
                ${moduleChecked}
                ${moduleIndeterminate}
                ${disabledAttr} 
                aria-label="Map PLO ${idx + 1} to all MIMLOs of ${escapeHtml(m.title)}"
                data-testid="mapping-module-checkbox-${o.id}-${m.id}">
              <span class="small fw-semibold flex-grow-1 ${hasMimlos ? "text-primary-emphasis" : ""}" ${moduleNameAttrs}>
                ${hasMimlos ? '<i class="ph ph-caret-right me-1 collapse-icon" aria-hidden="true"></i>' : ""}${escapeHtml((m.code ? m.code + " — " : "") + m.title)} <span class="text-secondary fw-normal">(${Number(m.credits ?? 0)} cr)</span>${disabledNote}
              </span>
              ${
                hasMimlos
                  ? `<span class="badge ${badgeClass}">${selectedCount} / ${totalCount} selected</span>`
                  : `<span class="small text-secondary fst-italic">No MIMLOs</span>`
              }
            </div>
            ${
              hasMimlos
                ? `
              <div class="collapse" id="${moduleCollapseId}">
                <div class="list-group list-group-flush">${mimloChecks}</div>
              </div>
            `
                : ""
            }
          </div>
        `;
        })
        .filter(Boolean)
        .join("");

      const headingId = `map_${o.id}_heading`;
      const collapseId = `map_${o.id}_collapse`;
      const isActive = openCollapseIds.has(collapseId)
        ? true
        : openCollapseIds.size === 0 && idx === 0;
      const preview = (o.text || "").trim();
      const previewShort = preview.length > 120 ? `${preview.slice(0, 120)}…` : preview || "—";
      const mappedCount = mappedMimloIds.length;
      const badgeClass = mappedCount > 0 ? "text-bg-primary" : "text-bg-secondary";

      return `
      <div class="accordion-item bg-body">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? "" : "collapsed"}" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}">
            <div class="d-flex w-100 align-items-center gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">PLO ${idx + 1}</div>
                <div class="small text-secondary">${escapeHtml(previewShort)}</div>
              </div>
              <span class="badge ${badgeClass} me-2">${mappedCount} MIMLOs</span>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            ${moduleBlocks || '<div class="small text-secondary">No modules available to map.</div>'}
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  // Module editor mode note
  const modeNote = isModuleEditor
    ? `<div class="alert alert-info mb-3"><strong>Module Editor Mode:</strong> You can only map PLOs to MIMLOs in your assigned modules. Other mappings are shown as read-only.</div>`
    : "";

  // Summary stats - now based on MIMLOs
  const unmappedPlos = plos.filter((plo) => !(ploToMimlos[plo.id] ?? []).length).length;

  // Count modules with at least one MIMLO mapped to any PLO
  const modulesWithMapping = new Set();
  Object.values(ploToMimlos).forEach((mimloIds) => {
    (mimloIds ?? []).forEach((mimloId) => {
      const mod = modules.find((m) => (m.mimlos ?? []).some((mi) => mi.id === mimloId));
      if (mod) {
        modulesWithMapping.add(mod.id);
      }
    });
  });
  const modulesWithNoMapping = modules.filter((m) => !modulesWithMapping.has(m.id)).length;

  const summaryHtml =
    unmappedPlos || modulesWithNoMapping
      ? `
    <div class="card bg-light mb-3">
      <div class="card-body py-2">
        <div class="small">
          ${unmappedPlos ? `<div class="text-danger">⚠️ ${unmappedPlos} PLO(s) not mapped to any MIMLO</div>` : '<div class="text-success">✓ All PLOs mapped to at least one MIMLO</div>'}
          ${modulesWithNoMapping ? `<div class="text-warning">⚠️ ${modulesWithNoMapping} module(s) have no MIMLOs linked to any PLO</div>` : ""}
        </div>
      </div>
    </div>
  `
      : '<div class="alert alert-success mb-3">✓ All PLOs mapped to MIMLOs</div>';

  content.innerHTML =
    devModeToggleHtml +
    `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3"><i class="ph ph-graph me-2" aria-hidden="true"></i>Map PLOs to MIMLOs (QQI-critical)</h5>
        <p class="text-muted small mb-3"><i class="ph ph-lightbulb me-1" aria-hidden="true"></i>For each PLO, select the module MIMLOs that address this outcome. Check a module to select all its MIMLOs, or expand to select individual MIMLOs.</p>
        ${modeNote}
        ${summaryHtml}
        ${accordionControlsHtml("mappingAccordion")}
        <div class="accordion" id="mappingAccordion">
          ${blocks}
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls("mappingAccordion");
  wireMappingStep();
}

/**
 * Wire Mapping step event handlers for hierarchical MIMLO checkboxes.
 */
function wireMappingStep() {
  const p = state.programme;

  // Ensure ploToMimlos exists
  if (!p.ploToMimlos) {
    p.ploToMimlos = {};
  }

  // Set indeterminate state for module checkboxes marked with data-indeterminate
  document.querySelectorAll("[data-indeterminate]").forEach((chk) => {
    /** @type {HTMLInputElement} */ (chk).indeterminate = true;
  });

  // Handle individual MIMLO checkbox changes
  document.querySelectorAll("[data-map-mimlo]").forEach((chk) => {
    /** @type {HTMLInputElement} */ (chk).onchange = () => {
      const ploId = chk.getAttribute("data-map-plo");
      const mimloId = chk.getAttribute("data-map-mimlo");
      const moduleId = chk.getAttribute("data-map-module");
      if (!ploId || !mimloId || !p.ploToMimlos) {
        return;
      }

      if (!p.ploToMimlos[ploId]) {
        p.ploToMimlos[ploId] = [];
      }

      if (/** @type {HTMLInputElement} */ (chk).checked) {
        if (!p.ploToMimlos[ploId].includes(mimloId)) {
          p.ploToMimlos[ploId].push(mimloId);
        }
      } else {
        p.ploToMimlos[ploId] = p.ploToMimlos[ploId].filter(
          (/** @type {string} */ id) => id !== mimloId,
        );
      }

      // Update module-level checkbox state
      updateModuleCheckboxState(ploId, moduleId);

      saveDebounced();
    };
  });

  // Handle module-level checkbox changes (check/uncheck all MIMLOs)
  document.querySelectorAll("[data-map-module-all]").forEach((chk) => {
    /** @type {HTMLInputElement} */ (chk).onchange = () => {
      const ploId = chk.getAttribute("data-map-plo");
      const moduleId = chk.getAttribute("data-map-module-all");
      if (!ploId || !moduleId || !p.ploToMimlos) {
        return;
      }

      const mod = (p.modules ?? []).find((m) => m.id === moduleId);
      if (!mod) {
        return;
      }

      const moduleMimloIds = getModuleMimloIds(mod);

      if (!p.ploToMimlos[ploId]) {
        p.ploToMimlos[ploId] = [];
      }

      if (/** @type {HTMLInputElement} */ (chk).checked) {
        // Add all MIMLOs from this module
        moduleMimloIds.forEach((mimloId) => {
          if (!p.ploToMimlos?.[ploId]?.includes(mimloId)) {
            p.ploToMimlos?.[ploId]?.push(mimloId);
          }
        });
        // Check all MIMLO checkboxes in this module
        document
          .querySelectorAll(`[data-map-plo="${ploId}"][data-map-module="${moduleId}"]`)
          .forEach((mimloChk) => {
            /** @type {HTMLInputElement} */ (mimloChk).checked = true;
          });
      } else {
        // Remove all MIMLOs from this module
        p.ploToMimlos[ploId] = p.ploToMimlos[ploId].filter(
          (/** @type {string} */ id) => !moduleMimloIds.includes(id),
        );
        // Uncheck all MIMLO checkboxes in this module
        document
          .querySelectorAll(`[data-map-plo="${ploId}"][data-map-module="${moduleId}"]`)
          .forEach((mimloChk) => {
            /** @type {HTMLInputElement} */ (mimloChk).checked = false;
          });
      }

      // Clear indeterminate state
      /** @type {HTMLInputElement} */ (chk).indeterminate = false;

      // Update badge and border
      updateModuleCheckboxState(ploId, moduleId);

      saveDebounced();
    };
  });
}

/**
 * Updates the module-level checkbox state and badge based on individual MIMLO selections.
 * @param {string | null} ploId - PLO ID
 * @param {string | null} moduleId - Module ID
 */
function updateModuleCheckboxState(ploId, moduleId) {
  if (!ploId || !moduleId) {
    return;
  }

  const p = state.programme;
  const mod = (p.modules ?? []).find((m) => m.id === moduleId);
  if (!mod) {
    return;
  }

  const mappedMimloIds = p.ploToMimlos?.[ploId] ?? [];
  const mappingState = getModuleMappingState(mappedMimloIds, mod);

  const moduleChk = /** @type {HTMLInputElement | null} */ (
    document.querySelector(`[data-map-plo="${ploId}"][data-map-module-all="${moduleId}"]`)
  );

  if (moduleChk) {
    moduleChk.checked = mappingState === "all";
    moduleChk.indeterminate = mappingState === "some";

    // Update the badge in the same row
    const row = moduleChk.closest(".module-mapping-group");
    const badge = row?.querySelector(".badge");
    if (badge) {
      const moduleMimlos = mod.mimlos ?? [];
      const totalCount = moduleMimlos.length;
      const selectedCount = moduleMimlos.filter((mimlo) =>
        mappedMimloIds.includes(mimlo.id),
      ).length;

      badge.textContent = `${selectedCount} / ${totalCount} selected`;

      // Update badge color: gray for none, primary for any selection
      badge.className = "badge";
      if (selectedCount === 0) {
        badge.classList.add("bg-secondary-subtle", "text-secondary-emphasis");
      } else {
        badge.classList.add("bg-primary-subtle", "text-primary-emphasis");
      }
    }

    // Update border color on the module group
    if (row) {
      row.classList.remove("border-primary", "border-light");
      row.classList.add(mappingState !== "none" ? "border-primary" : "border-light");
    }
  }
}
