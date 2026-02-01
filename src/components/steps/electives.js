// @ts-check
/**
 * Electives step component.
 * Allows assigning elective modules to groups within elective definitions.
 * @module components/steps/electives
 */

import { saveDebounced, state, steps } from "../../state/store.js";
import { escapeHtml } from "../../utils/dom.js";
import { getDevModeToggleHtml, wireDevModeToggle } from "../dev-mode.js";
import { accordionControlsHtml, captureOpenCollapseIds, wireAccordionControls } from "./shared.js";

/**
 * Renders the Electives step UI.
 * Displays elective definitions with groups and module assignment checkboxes.
 */
export function renderElectivesStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  const devModeToggleHtml = getDevModeToggleHtml();
  const openCollapseIds = captureOpenCollapseIds("electiveDefinitionsAccordion");

  // Get elective modules
  const electiveModules = (p.modules ?? []).filter((m) => m.isElective === true);
  const mandatoryModules = (p.modules ?? []).filter((m) => !m.isElective);
  const electiveDefinitions = p.electiveDefinitions ?? [];

  // Calculate which modules are assigned to which groups
  const assignedModuleIds = new Set();
  electiveDefinitions.forEach((def) => {
    (def.groups ?? []).forEach((g) => {
      (g.moduleIds ?? []).forEach((id) => assignedModuleIds.add(id));
    });
  });

  // Unassigned elective modules
  const unassignedElectives = electiveModules.filter((m) => !assignedModuleIds.has(m.id));

  // Credit calculations from programme definition (not dynamically from modules)
  const totalCredits = p.totalCredits ?? 0;
  const electiveCredits = electiveDefinitions.reduce((sum, d) => sum + (d.credits ?? 0), 0);
  const mandatoryCredits = totalCredits - electiveCredits;

  // Build HTML for definitions with their groups
  const definitionsHtml =
    electiveDefinitions.length === 0
      ? `<div class="alert alert-info">
        No elective definitions created. 
        <a href="#" data-goto-step="identity" class="alert-link">Go to Identity step</a> to create elective definitions with groups.
       </div>`
      : `${accordionControlsHtml("electiveDefinitionsAccordion")}
       <div class="accordion" id="electiveDefinitionsAccordion">
        ${electiveDefinitions
          .map((def, defIdx) => {
            const defCredits = def.credits ?? 0;
            const groups = def.groups ?? [];
            const collapseId = `collapse_${def.id}`;
            const headingId = `heading_${def.id}`;
            const isActive = openCollapseIds.has(collapseId)
              ? true
              : openCollapseIds.size === 0 && defIdx === 0;

            // Groups within this definition
            const groupsHtml =
              groups.length === 0
                ? `<p class="text-muted">No groups in this definition. <a href="#" data-goto-step="identity" class="alert-link">Add groups in Identity step</a>.</p>`
                : groups
                    .map((g, grpIdx) => {
                      const groupModules = (p.modules ?? []).filter((m) =>
                        (g.moduleIds ?? []).includes(m.id),
                      );
                      const groupCreditsSum = groupModules.reduce(
                        (acc, m) => acc + (Number(m.credits) ?? 0),
                        0,
                      );
                      const creditsMismatch = groupCreditsSum !== defCredits;
                      const hasNonElective = groupModules.some((m) => !m.isElective);

                      return `
                  <div class="card mb-2 border-start border-info border-3" data-testid="elective-group-${g.id}">
                    <div class="card-header py-2 d-flex justify-content-between align-items-center bg-light">
                      <div>
                        ${g.code ? `<span class="badge text-bg-dark me-2">${escapeHtml(g.code)}</span>` : ""}
                        <strong>${escapeHtml(g.name || `Group ${grpIdx + 1}`)}</strong>
                        ${
                          creditsMismatch
                            ? `<span class="badge text-bg-warning ms-2" title="Module credits don't match definition requirement (${defCredits} cr)">${groupCreditsSum}/${defCredits} cr</span>`
                            : `<span class="badge text-bg-success ms-2">${groupCreditsSum}/${defCredits} cr</span>`
                        }
                        ${hasNonElective ? `<span class="badge text-bg-danger ms-2">Contains mandatory module!</span>` : ""}
                      </div>
                      <span class="text-muted small">${groupModules.length} module${groupModules.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div class="card-body py-2">
                      ${
                        groupModules.length === 0
                          ? `<p class="text-muted mb-2 small">No modules assigned to this group yet.</p>`
                          : `<div class="list-group list-group-flush mb-2" role="list" aria-label="Modules in group ${escapeHtml(g.name || `Group ${grpIdx + 1}`)}">
                            ${groupModules
                              .map(
                                (m) => `
                              <div class="list-group-item d-flex justify-content-between align-items-center py-1 px-2" role="listitem">
                                <div>
                                  <span class="badge ${m.isElective ? "text-bg-info" : "text-bg-danger"} me-1" style="font-size:0.7rem" aria-label="${m.isElective ? "Elective" : "Mandatory"}">${m.isElective ? "E" : "M"}</span>
                                  <strong>${escapeHtml(m.code || "")}</strong> ${escapeHtml(m.title || "Untitled")}
                                  <span class="text-muted ms-1">(${m.credits ?? 0} cr)</span>
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-secondary py-0" data-unassign-module="${m.id}" data-from-group="${g.id}" aria-label="Remove ${escapeHtml(m.title || "module")} from group" data-testid="unassign-module-${m.id}-${g.id}"><i class="ph ph-x" aria-hidden="true"></i></button>
                              </div>
                            `,
                              )
                              .join("")}
                           </div>`
                      }
                      
                      <div>
                        <label class="visually-hidden" for="assign-select-${g.id}">Add module to ${escapeHtml(g.name || `Group ${grpIdx + 1}`)}</label>
                        <select class="form-select form-select-sm" id="assign-select-${g.id}" data-assign-to-group="${g.id}" data-testid="assign-module-${g.id}">
                          <option value="">+ Add elective module...</option>
                          ${electiveModules
                            .filter((m) => !(g.moduleIds ?? []).includes(m.id))
                            .map(
                              (m) =>
                                `<option value="${m.id}">${escapeHtml(m.code ?? "")} ${escapeHtml(m.title ?? "Untitled")} (${m.credits ?? 0} cr)${assignedModuleIds.has(m.id) ? " [in another group]" : ""}</option>`,
                            )
                            .join("")}
                        </select>
                      </div>
                    </div>
                  </div>
                `;
                    })
                    .join("");

            const defName = def.name ?? `Definition ${defIdx + 1}`;
            const defCode = def.code ?? "";

            return `
            <div class="accordion-item" data-testid="elective-def-${def.id}">
              <h2 class="accordion-header" id="${headingId}">
                <button class="accordion-button ${isActive ? "" : "collapsed"}" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}" data-testid="elective-def-accordion-${def.id}">
                  <div class="d-flex align-items-center gap-2 w-100">
                    ${defCode ? `<span class="badge text-bg-dark">${escapeHtml(defCode)}</span>` : ""}
                    <span class="fw-semibold">${escapeHtml(defName)}</span>
                    <span class="badge text-bg-info">${defCredits} cr</span>
                    <span class="badge text-bg-secondary">${groups.length} group${groups.length !== 1 ? "s" : ""}</span>
                  </div>
                </button>
              </h2>
              <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
                <div class="accordion-body">
                  <p class="small text-muted mb-3">All groups in this definition must total <strong>${defCredits} credits</strong>. Students choose one group.</p>
                  ${groupsHtml}
                </div>
              </div>
            </div>
          `;
          })
          .join("")}
       </div>`;

  // Unassigned modules section
  const unassignedHtml =
    unassignedElectives.length === 0
      ? ""
      : `
      <div class="card mb-3 border-warning">
        <div class="card-header bg-warning-subtle">
          <strong>Unassigned Elective Modules</strong>
          <span class="badge text-bg-warning ms-2">${unassignedElectives.length}</span>
        </div>
        <div class="card-body">
          <p class="small text-muted">These elective modules are not assigned to any group yet:</p>
          <div class="list-group list-group-flush">
            ${unassignedElectives
              .map(
                (m) => `
              <div class="list-group-item d-flex justify-content-between align-items-center py-2">
                <div>
                  <span class="badge text-bg-info me-2">E</span>
                  <strong>${escapeHtml(m.code ?? "")}</strong> ${escapeHtml(m.title ?? "Untitled")}
                  <span class="text-muted ms-2">(${m.credits ?? 0} cr)</span>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

  content.innerHTML =
    devModeToggleHtml +
    `
    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <h5 class="card-title mb-3" id="electives-heading"><i class="ph ph-path me-2" aria-hidden="true"></i>Electives</h5>
        
        <div class="alert alert-light" role="note">
          <i class="ph ph-lightbulb me-1" aria-hidden="true"></i><strong>How elective definitions & groups work:</strong>
          <ul class="mb-0 mt-2">
            <li>Students complete <strong>every</strong> elective definition in the programme</li>
            <li>For each definition, students choose <strong>one group</strong> to complete</li>
            <li>All modules within the chosen group are completed by the student</li>
          </ul>
        </div>

        <div class="row g-3 mb-3" role="group" aria-label="Credit summary">
          <div class="col-md-3">
            <div class="card bg-light">
              <div class="card-body py-2 text-center">
                <div class="small text-muted">Mandatory Credits</div>
                <div class="fs-4 fw-bold" data-testid="mandatory-credits">${mandatoryCredits}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-light">
              <div class="card-body py-2 text-center">
                <div class="small text-muted">Elective Definitions</div>
                <div class="fs-4 fw-bold" data-testid="elective-def-count">${electiveDefinitions.length}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-light">
              <div class="card-body py-2 text-center">
                <div class="small text-muted">Elective Credits</div>
                <div class="fs-4 fw-bold" data-testid="elective-credits">${electiveCredits} cr</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-light">
              <div class="card-body py-2 text-center">
                <div class="small text-muted">Programme Total</div>
                <div class="fs-4 fw-bold" data-testid="total-credits">${totalCredits} cr</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${unassignedHtml}

    <div class="card shadow-sm">
      <div class="card-body">
        <h6 class="card-title mb-3" id="elective-defs-groups-heading"><i class="ph ph-folders me-2" aria-hidden="true"></i>Elective Definitions & Groups</h6>
        <div aria-labelledby="elective-defs-groups-heading" data-testid="elective-definitions-container">
          ${definitionsHtml}
        </div>
        
        ${
          electiveDefinitions.length > 0 && electiveModules.length === 0
            ? `<div class="alert alert-warning mt-3 mb-0" role="alert">
              <i class="ph ph-warning me-2" aria-hidden="true"></i>No elective modules available. 
              <a href="#" data-goto-step="structure" class="alert-link">Go to Credits & Modules</a> to mark some modules as Elective (E).
             </div>`
            : ""
        }
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls("electiveDefinitionsAccordion");
  wireElectivesStep();
}

/**
 * Wire Electives step event handlers
 */
function wireElectivesStep() {
  const p = state.programme;

  // Handle step navigation links
  document.querySelectorAll("[data-goto-step]").forEach((link) => {
    /** @type {HTMLElement} */ (link).onclick = (/** @type {Event} */ e) => {
      e.preventDefault();
      const stepKey = link.getAttribute("data-goto-step");
      const idx = steps.findIndex((s) => s.key === stepKey);
      if (idx >= 0) {
        state.stepIndex = idx;
        window.render?.();
      }
    };
  });

  // Handle assigning modules to groups (groups are nested in definitions)
  document.querySelectorAll("[data-assign-to-group]").forEach((select) => {
    /** @type {HTMLSelectElement} */ (select).onchange = () => {
      const groupId = select.getAttribute("data-assign-to-group");
      const moduleId = /** @type {HTMLSelectElement} */ (select).value;
      if (!moduleId) {
        return;
      }

      // Find group in any definition
      for (const def of p.electiveDefinitions ?? []) {
        const group = (def.groups ?? []).find((g) => g.id === groupId);
        if (group) {
          group.moduleIds ??= [];
          if (!group.moduleIds.includes(moduleId)) {
            group.moduleIds.push(moduleId);
          }
          break;
        }
      }

      saveDebounced();
      window.render?.();
    };
  });

  // Handle unassigning modules from groups
  document.querySelectorAll("[data-unassign-module]").forEach((btn) => {
    /** @type {HTMLElement} */ (btn).onclick = () => {
      const moduleId = btn.getAttribute("data-unassign-module");
      const groupId = btn.getAttribute("data-from-group");

      // Find group in any definition
      for (const def of p.electiveDefinitions ?? []) {
        const group = (def.groups ?? []).find((g) => g.id === groupId);
        if (group) {
          group.moduleIds = (group.moduleIds ?? []).filter((id) => id !== moduleId);
          break;
        }
      }

      saveDebounced();
      window.render?.();
    };
  });
}
