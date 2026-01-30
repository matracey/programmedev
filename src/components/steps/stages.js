// @ts-check
/**
 * Stage Structure step component.
 * Manages stages within programme versions and assigns modules to each stage.
 * @module components/steps/stages
 */

import { state, saveDebounced, getVersionById, defaultStage } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { sumStageCredits } from '../../utils/helpers.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { accordionControlsHtml, wireAccordionControls, captureOpenCollapseIds, updateAccordionHeader } from './shared.js';

/**
 * Renders the Stage Structure step UI.
 * Displays stages for the selected version with module assignments and exit awards.
 */
export function renderStagesStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const openCollapseIds = captureOpenCollapseIds('stagesAccordion');
  const versions = Array.isArray(p.versions) ? p.versions : [];

  if (!versions.length) {
    content.innerHTML = devModeToggleHtml + `<div class="alert alert-warning">Add at least one Programme Version first.</div>`;
    wireDevModeToggle(() => window.render?.());
    return;
  }

  if (!state.selectedVersionId) state.selectedVersionId = versions[0].id;
  const v = versions.find(x => x.id === state.selectedVersionId) || versions[0];

  const vSelect = versions.map(x => `<option value="${escapeHtml(x.id)}" ${x.id === v.id ? "selected" : ""}>${escapeHtml(x.code || "")}${x.code ? " — " : ""}${escapeHtml(x.label || "")}</option>`).join("");

  const stageCards = (v.stages ?? []).sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0)).map((s, idx) => {
    const exitOn = s.exitAward && s.exitAward.enabled;
    const exitWrapClass = exitOn ? "" : "d-none";

    const moduleChecks = (p.modules ?? []).map(m => {
      const picked = (s.modules ?? []).find((/** @type {any} */ x) => x.moduleId === m.id);
      const checked = !!picked;
      const semVal = picked ? (picked.semester ?? "") : "";
      return `
        <div class="border rounded p-2 mb-2">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="st_${s.id}_mod_${m.id}" data-testid="stage-module-${s.id}-${m.id}" ${checked ? "checked" : ""}>
            <label class="form-check-label" for="st_${s.id}_mod_${m.id}">
              ${escapeHtml(m.code ? `${m.code} — ` : "")}${escapeHtml(m.title)} <span class="text-secondary small">(${Number(m.credits ?? 0)} cr)</span>
            </label>
          </div>
          <div class="mt-2 ${checked ? "" : "d-none"}" id="st_${s.id}_semWrap_${m.id}">
            <label class="form-label small mb-1" for="st_${s.id}_sem_${m.id}">Semester / timing tag (optional)</label>
            <input class="form-control form-control-sm" id="st_${s.id}_sem_${m.id}" data-testid="stage-semester-${s.id}-${m.id}" value="${escapeHtml(semVal)}" placeholder="e.g., S1 / S2 / Year / Block 1">
          </div>
        </div>
      `;
    }).join("");

    const stageCreditSum = sumStageCredits(p.modules ?? [], s.modules ?? []);

    const headingId = `stage_${s.id}_heading`;
    const collapseId = `stage_${s.id}_collapse`;
    const isActive = openCollapseIds.has(collapseId) ? true : (openCollapseIds.size === 0 && idx === 0);
    const summaryName = s.name || `Stage ${s.sequence || ""}`;
    return `
      <div class="accordion-item bg-body" data-testid="stage-item-${s.id}">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? "" : "collapsed"} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}" data-testid="stage-accordion-${s.id}">
            <div class="d-flex w-100 align-items-center gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">${escapeHtml(summaryName)}</div>
                <div class="small text-secondary">Sequence ${Number(s.sequence || 1)} • Target ${Number(s.creditsTarget || 0)}cr • Assigned ${stageCreditSum}cr</div>
              </div>
              <div class="header-actions d-flex align-items-center gap-2 me-2">
                <span class="btn btn-sm btn-outline-danger" role="button" tabindex="0" id="removeStage_${s.id}" aria-label="Remove stage ${summaryName}" data-testid="remove-stage-${s.id}"><i class="ph ph-trash" aria-hidden="true"></i> Remove stage</span>
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <fieldset class="row g-3">
              <legend class="visually-hidden">Stage ${idx + 1} details</legend>
              <div class="col-md-6">
                <label class="form-label fw-semibold" for="stname_${s.id}">Stage name</label>
                <input class="form-control" id="stname_${s.id}" data-testid="stage-name-${s.id}" value="${escapeHtml(s.name ?? "")}">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold" for="stseq_${s.id}">Sequence</label>
                <input type="number" min="1" class="form-control" id="stseq_${s.id}" data-testid="stage-sequence-${s.id}" value="${Number(s.sequence ?? 1)}">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold" for="stcred_${s.id}">Credits target</label>
                <input type="number" min="0" class="form-control" id="stcred_${s.id}" data-testid="stage-credits-${s.id}" value="${Number(s.creditsTarget ?? 0)}">
                <div class="small text-secondary mt-1" role="status">Assigned modules sum to <span class="fw-semibold">${stageCreditSum}</span> credits.</div>
              </div>
              <div class="col-12">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="stexit_${s.id}" data-testid="stage-exit-${s.id}" ${exitOn ? "checked" : ""}>
                  <label class="form-check-label fw-semibold" for="stexit_${s.id}">Enable exit award for this stage</label>
                </div>
              </div>
              <div class="col-12 ${exitWrapClass}" id="stexitWrap_${s.id}">
                <label class="form-label fw-semibold" for="stexitTitle_${s.id}">Exit award title</label>
                <input class="form-control" id="stexitTitle_${s.id}" data-testid="stage-exit-title-${s.id}" value="${escapeHtml((s.exitAward && s.exitAward.awardTitle) || "")}">
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold" id="stage-modules-label-${s.id}">Modules in this stage</label>
                <div role="group" aria-labelledby="stage-modules-label-${s.id}">
                  ${moduleChecks || `<div class="text-secondary">No modules defined yet (add modules in Credits & Modules).</div>`}
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div>
        <h4 class="mb-1" id="stages-heading"><i class="ph ph-stairs me-2" aria-hidden="true"></i>Stage Structure</h4>
        <div class="text-secondary small"><i class="ph ph-lightbulb me-1" aria-hidden="true"></i>Define stages for the selected programme version and assign modules to each stage.</div>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <label class="visually-hidden" for="stageVersionSelect">Select programme version</label>
        <select class="form-select" id="stageVersionSelect" data-testid="stage-version-select" style="min-width: 260px;">
          ${vSelect}
        </select>
        <button class="btn btn-dark" id="addStageBtn" data-testid="add-stage-btn" aria-label="Add new stage"><i class="ph ph-plus" aria-hidden="true"></i> Add stage</button>
      </div>
    </div>

    ${accordionControlsHtml('stagesAccordion')}
    <div class="mt-2 accordion" id="stagesAccordion" aria-labelledby="stages-heading" data-testid="stages-accordion">
      ${stageCards || `<div class="alert alert-info mb-0" role="status"><i class="ph ph-info me-2" aria-hidden="true"></i>No stages yet for this version. Add a stage to begin.</div>`}
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('stagesAccordion');
  wireStagesStep();
}

/**
 * Updates a stage accordion header in-place without re-rendering.
 *
 * @param {Stage} s - The stage object
 * @param {Module[]} modules - All programme modules
 * @private
 */
function updateStageAccordionHeader(s, modules) {
  const summaryName = s.name || `Stage ${s.sequence || ""}`;
  const stageCreditSum = sumStageCredits(modules, s.modules ?? []);
  
  updateAccordionHeader(`stage_${s.id}_heading`, {
    title: escapeHtml(summaryName),
    subtitle: `Sequence ${Number(s.sequence ?? 1)} • Target ${Number(s.creditsTarget ?? 0)}cr • Assigned ${stageCreditSum}cr`
  });
}

/**
 * Wires up event handlers for the Stages step.
 * Handles stage CRUD, module assignments, and exit award settings.
 *
 * @private
 */
function wireStagesStep() {
  const p = state.programme;
  p.mode ??= 'PROGRAMME_OWNER';
  if (!Array.isArray(p.versions)) p.versions = [];
  const versions = p.versions;

  const select = document.getElementById("stageVersionSelect");
  if (select) {
    select.onchange = (/** @type {any} */ e) => {
      state.selectedVersionId = e.target?.value || null;
      saveDebounced();
      window.render?.();
    };
  }

  const v = getVersionById(state.selectedVersionId || '') || versions[0];
  if (!v) return;
  if (!Array.isArray(v.stages)) v.stages = [];

  const addStageBtn = document.getElementById("addStageBtn");
  if (addStageBtn) {
    addStageBtn.onclick = () => {
      const nextSeq = (v.stages ?? []).length + 1;
      const s = defaultStage(nextSeq);
      if ((p.totalCredits ?? 0) > 0 && (v.stages ?? []).length === 0) {
        s.creditsTarget = (p.totalCredits % 60 === 0) ? 60 : 0;
      }
      v.stages ??= [];
      v.stages.push(s);
      saveDebounced();
      window.render?.();
    };
  }

  (v.stages ?? []).forEach((s) => {
    const name = document.getElementById(`stname_${s.id}`);
    if (name) name.oninput = (/** @type {any} */ e) => { 
      s.name = e.target?.value || ''; 
      saveDebounced();
      updateStageAccordionHeader(s, p.modules ?? []);
    };

    const seq = document.getElementById(`stseq_${s.id}`);
    if (seq) seq.oninput = (/** @type {any} */ e) => { 
      s.sequence = Number(e.target?.value ?? 1); 
      saveDebounced();
      updateStageAccordionHeader(s, p.modules ?? []);
    };

    const cred = document.getElementById(`stcred_${s.id}`);
    if (cred) cred.oninput = (/** @type {any} */ e) => { 
      s.creditsTarget = Number(e.target?.value ?? 0); 
      saveDebounced();
      updateStageAccordionHeader(s, p.modules ?? []);
    };

    const remove = document.getElementById(`removeStage_${s.id}`);
    if (remove) remove.onclick = (/** @type {any} */ e) => {
      e.stopPropagation();
      v.stages = (v.stages ?? []).filter((/** @type {Stage} */ x) => x.id !== s.id);
      saveDebounced();
      window.render?.();
    };

    const exit = document.getElementById(`stexit_${s.id}`);
    if (exit) exit.onchange = (/** @type {any} */ e) => {
      if (!s.exitAward) s.exitAward = { enabled: false, awardTitle: "" };
      s.exitAward.enabled = !!e.target?.checked;
      saveDebounced();
      window.render?.();
    };

    const exitTitle = document.getElementById(`stexitTitle_${s.id}`);
    if (exitTitle) exitTitle.oninput = (/** @type {any} */ e) => {
      if (!s.exitAward) s.exitAward = { enabled: false, awardTitle: "" };
      s.exitAward.awardTitle = e.target?.value || '';
      saveDebounced();
    };

    s.modules ??= [];
    const stageModules = s.modules;

    (p.modules ?? []).forEach((m) => {
      const cb = document.getElementById(`st_${s.id}_mod_${m.id}`);
      if (!cb) return;
      cb.onchange = (/** @type {any} */ e) => {
        const checked = e.target?.checked;
        if (checked && !stageModules.find((/** @type {any} */ x) => x.moduleId === m.id)) {
          stageModules.push({ moduleId: m.id, semester: "" });
        }
        if (!checked) {
          s.modules = stageModules.filter((/** @type {any} */ x) => x.moduleId !== m.id);
        }
        saveDebounced();
        window.render?.();
      };

      const sem = document.getElementById(`st_${s.id}_sem_${m.id}`);
      if (sem) sem.oninput = (/** @type {any} */ e) => {
        const entry = stageModules.find((/** @type {any} */ x) => x.moduleId === m.id);
        if (entry) entry.semester = e.target?.value || '';
        saveDebounced();
      };
    });
  });
}
