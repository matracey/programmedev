// @ts-check
/**
 * Credits & Modules step component.
 * Manages the programme's module list including mandatory and elective modules.
 * @module components/steps/structure
 */

import { saveDebounced, state } from "../../state/store.js";
import { escapeHtml } from "../../utils/dom.js";
import { uid } from "../../utils/uid.js";
import { getDevModeToggleHtml, wireDevModeToggle } from "../dev-mode.js";
import {
  accordionControlsHtml,
  captureOpenCollapseIds,
  updateAccordionHeader,
  wireAccordionControls,
} from "./shared.js";

/**
 * Renders the Credits & Modules step UI.
 * Displays module list with credit summaries and mandatory/elective classification.
 */
export function renderStructureStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  const devModeToggleHtml = getDevModeToggleHtml();
  const openCollapseIds = captureOpenCollapseIds("modulesAccordion");

  // Calculate credit summaries
  const mandatoryModules = (p.modules ?? []).filter((m) => !m.isElective);
  const electiveModules = (p.modules ?? []).filter((m) => m.isElective === true);
  const mandatoryCredits = mandatoryModules.reduce((acc, m) => acc + (Number(m.credits) ?? 0), 0);
  const electiveCredits = electiveModules.reduce((acc, m) => acc + (Number(m.credits) ?? 0), 0);
  const totalModuleCredits = mandatoryCredits + electiveCredits;
  // Sum credits across all definitions (each definition has its own credit value)
  const electiveDefinitionsCredits = (p.electiveDefinitions ?? []).reduce(
    (acc, def) => acc + (Number(def.credits) ?? 0),
    0,
  );
  const numDefinitions = (p.electiveDefinitions ?? []).length;

  const moduleRows = (p.modules ?? [])
    .map((m, idx) => {
      const headingId = `module_${m.id}_heading`;
      const collapseId = `module_${m.id}_collapse`;
      const titlePreview = (m.title ?? "").trim() || "Module";
      const codePreview = (m.code ?? "").trim();
      const creditsPreview = Number(m.credits ?? 0);
      const isElective = m.isElective === true;
      const typeBadge = isElective
        ? `<span class="badge text-bg-info me-2" title="Elective" aria-label="Elective module">E</span>`
        : `<span class="badge text-bg-primary me-2" title="Mandatory" aria-label="Mandatory module">M</span>`;

      const isActive = openCollapseIds.has(collapseId)
        ? true
        : openCollapseIds.size === 0 && idx === 0;
      return `
      <div class="accordion-item bg-body" data-testid="module-item-${m.id}">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? "" : "collapsed"} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}" data-testid="module-accordion-${m.id}">
            <div class="d-flex w-100 align-items-center gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">${typeBadge}Module ${idx + 1}${codePreview ? `: ${escapeHtml(codePreview)}` : ""}</div>
                <div class="small text-secondary">${escapeHtml(titlePreview)} • ${creditsPreview} cr</div>
              </div>
              <div class="header-actions d-flex align-items-center gap-2 me-2">
                <span class="btn btn-sm btn-outline-danger" role="button" tabindex="0" data-remove-module="${m.id}" aria-label="Remove module ${titlePreview}" data-testid="remove-module-${m.id}"><i class="ph ph-trash" aria-hidden="true"></i> Remove</span>
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <fieldset class="row g-3">
              <legend class="visually-hidden">Module ${idx + 1} details</legend>
              <div class="col-md-2">
                <label class="form-label fw-semibold" for="module-type-${m.id}">Type</label>
                <select class="form-select" id="module-type-${m.id}" data-module-field="isElective" data-module-id="${m.id}" data-testid="module-type-${m.id}">
                  <option value="false" ${!isElective ? "selected" : ""}>Mandatory</option>
                  <option value="true" ${isElective ? "selected" : ""}>Elective</option>
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold" for="module-code-${m.id}">Code (opt.)</label>
                <input class="form-control" id="module-code-${m.id}" data-module-field="code" data-module-id="${m.id}" data-testid="module-code-${m.id}" value="${escapeHtml(m.code ?? "")}">
              </div>
              <div class="col-md-5">
                <label class="form-label fw-semibold" for="module-title-${m.id}">Title</label>
                <input class="form-control" id="module-title-${m.id}" data-module-field="title" data-module-id="${m.id}" data-testid="module-title-${m.id}" value="${escapeHtml(m.title ?? "")}" aria-required="true">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold" for="module-credits-${m.id}">Credits</label>
                <input type="number" class="form-control" id="module-credits-${m.id}" data-module-field="credits" data-module-id="${m.id}" data-testid="module-credits-${m.id}" value="${Number(m.credits ?? 0)}" aria-required="true">
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  content.innerHTML =
    devModeToggleHtml +
    `
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0" id="modules-heading"><i class="ph ph-cube me-2" aria-hidden="true"></i>Credits & modules (QQI-critical)</h5>
          <button class="btn btn-dark btn-sm" id="addModuleBtn" data-testid="add-module-btn" aria-label="Add new module"><i class="ph ph-plus" aria-hidden="true"></i> Add module</button>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-3">
            <label class="form-label fw-semibold">Total programme credits</label>
            <input type="number" class="form-control" id="totalCredits" value="${Number(p.totalCredits ?? 0)}" disabled>
          </div>
          <div class="col-md-9">
            <label class="form-label fw-semibold">Credit summary</label>
            <div class="d-flex gap-3 flex-wrap align-items-center" style="min-height: 38px;">
              <span class="badge text-bg-primary fs-6"><span class="badge text-bg-light text-primary me-1">M</span> ${mandatoryCredits} cr (${mandatoryModules.length} modules)</span>
              <span class="badge text-bg-info fs-6"><span class="badge text-bg-light text-info me-1">E</span> ${electiveCredits} cr (${electiveModules.length} modules)</span>
              ${numDefinitions > 0 ? `<span class="badge text-bg-secondary fs-6">${numDefinitions} elective def(s) = ${electiveDefinitionsCredits} cr</span>` : ""}
              <span class="badge ${totalModuleCredits === (p.totalCredits ?? 0) ? "text-bg-success" : "text-bg-warning"} fs-6">Sum: ${totalModuleCredits} / ${p.totalCredits ?? 0}</span>
            </div>
          </div>
        </div>

        <div class="small text-muted mb-3" role="note">
          <i class="ph ph-lightbulb me-1" aria-hidden="true"></i><strong>Tip:</strong> Mark modules as <span class="badge text-bg-primary">M</span> Mandatory or <span class="badge text-bg-info">E</span> Elective. 
          Elective modules are assigned to groups in the "Electives" step.
        </div>

        ${accordionControlsHtml("modulesAccordion")}
        <div class="accordion" id="modulesAccordion" aria-labelledby="modules-heading" data-testid="modules-accordion">
          ${moduleRows || `<div class="alert alert-info mb-0" role="status"><i class="ph ph-info me-2" aria-hidden="true"></i>No modules added yet.</div>`}
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls("modulesAccordion");
  wireStructureStep();
}

/**
 * Updates a module accordion header in-place without re-rendering.
 *
 * @param {Module} m - The module object
 * @param {number} idx - The module's index in the list
 * @private
 */
function updateModuleAccordionHeader(m, idx) {
  const isElective = m.isElective === true;
  const typeBadge = isElective
    ? `<span class="badge text-bg-info me-2" title="Elective">E</span>`
    : `<span class="badge text-bg-primary me-2" title="Mandatory">M</span>`;
  const codePreview = (m.code ?? "").trim();
  const titlePreview = (m.title ?? "").trim() || "Module";
  const creditsPreview = Number(m.credits ?? 0);

  updateAccordionHeader(`module_${m.id}_heading`, {
    title: `${typeBadge}Module ${idx + 1}${codePreview ? `: ${escapeHtml(codePreview)}` : ""}`,
    subtitle: `${titlePreview} • ${creditsPreview} cr`,
  });
}

/**
 * Wires up event handlers for the Structure step.
 * Handles module CRUD, type changes, and field updates.
 *
 * @private
 */
function wireStructureStep() {
  const p = state.programme;
  p.mode ??= "PROGRAMME_OWNER";
  p.modules ??= [];
  p.ploToMimlos ??= {};
  const modules = p.modules;
  const ploToMimlos = p.ploToMimlos;

  const addBtn = document.getElementById("addModuleBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      modules.push({
        id: uid("mod"),
        code: "",
        title: "New module",
        credits: 0,
        isElective: false,
        mimlos: [],
        assessments: [],
      });
      saveDebounced();
      window.render?.();
    };
  }

  document.querySelectorAll("[data-remove-module]").forEach((btn) => {
    /** @type {HTMLElement} */ (btn).onclick = () => {
      const id = btn.getAttribute("data-remove-module");
      const moduleToRemove = modules.find((m) => m.id === id);
      // Get all MIMLO IDs from the module being removed
      const mimloIdsToRemove = (moduleToRemove?.mimlos ?? []).map((m) => m.id);

      p.modules = modules.filter((m) => m.id !== id);
      // remove MIMLOs from mappings
      for (const ploId of Object.keys(ploToMimlos)) {
        ploToMimlos[ploId] = (ploToMimlos[ploId] ?? []).filter(
          (mimloId) => !mimloIdsToRemove.includes(mimloId),
        );
      }
      // remove from elective groups (nested in definitions)
      (p.electiveDefinitions ?? []).forEach((def) => {
        (def.groups ?? []).forEach((g) => {
          g.moduleIds = (g.moduleIds ?? []).filter((mid) => mid !== id);
        });
      });
      saveDebounced();
      window.render?.();
    };
  });

  document.querySelectorAll("[data-module-field]").forEach((inp) => {
    /** @param {any} e */
    const handler = (e) => {
      const id = inp.getAttribute("data-module-id");
      const field = inp.getAttribute("data-module-field");
      const m = modules.find((x) => x.id === id);
      if (!m || !field) {
        return;
      }
      if (field === "credits") {
        /** @type {any} */ (m)[field] = Number(e.target.value ?? 0);
      } else if (field === "isElective") {
        /** @type {any} */ (m)[field] = e.target.value === "true";
      } else {
        /** @type {any} */ (m)[field] = e.target.value;
      }
      saveDebounced();
      // Update accordion header in-place instead of full re-render to preserve input focus
      updateModuleAccordionHeader(m, modules.indexOf(m));
    };
    if (inp.tagName === "SELECT") {
      inp.addEventListener("change", handler);
      // Full re-render only for select changes (type change affects badge)
      inp.addEventListener("change", () => window.render?.());
    } else {
      inp.addEventListener("input", handler);
    }
  });
}
