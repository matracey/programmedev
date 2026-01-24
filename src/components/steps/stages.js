/**
 * Stages step component
 */

import { state, saveDebounced, getVersionById, defaultStage } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { sumStageCredits } from '../../utils/helpers.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { accordionControlsHtml, wireAccordionControls } from './shared.js';

/**
 * Render the Stages step
 */
export function renderStagesStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const versions = Array.isArray(p.versions) ? p.versions : [];

  if (!versions.length) {
    content.innerHTML = devModeToggleHtml + `<div class="alert alert-warning">Add at least one Programme Version first.</div>`;
    wireDevModeToggle(() => window.render?.());
    return;
  }

  if (!state.selectedVersionId) state.selectedVersionId = versions[0].id;
  const v = versions.find(x => x.id === state.selectedVersionId) || versions[0];

  const vSelect = versions.map(x => `<option value="${escapeHtml(x.id)}" ${x.id === v.id ? "selected" : ""}>${escapeHtml(x.code || "")}${x.code ? " — " : ""}${escapeHtml(x.label || "")}</option>`).join("");

  const stageCards = (v.stages || []).sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0)).map((s, idx) => {
    const exitOn = s.exitAward && s.exitAward.enabled;
    const exitWrapClass = exitOn ? "" : "d-none";

    const moduleChecks = (p.modules || []).map(m => {
      const picked = (s.modules || []).find(x => x.moduleId === m.id);
      const checked = !!picked;
      const semVal = picked ? (picked.semester || "") : "";
      return `
        <div class="border rounded p-2 mb-2">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="st_${s.id}_mod_${m.id}" ${checked ? "checked" : ""}>
            <label class="form-check-label" for="st_${s.id}_mod_${m.id}">
              ${escapeHtml(m.code ? `${m.code} — ` : "")}${escapeHtml(m.title)} <span class="text-secondary small">(${Number(m.credits || 0)} cr)</span>
            </label>
          </div>
          <div class="mt-2 ${checked ? "" : "d-none"}" id="st_${s.id}_semWrap_${m.id}">
            <label class="form-label small mb-1">Semester / timing tag (optional)</label>
            <input class="form-control form-control-sm" id="st_${s.id}_sem_${m.id}" value="${escapeHtml(semVal)}" placeholder="e.g., S1 / S2 / Year / Block 1">
          </div>
        </div>
      `;
    }).join("");

    const stageCreditSum = sumStageCredits(p.modules || [], s.modules || []);

    const headingId = `stage_${s.id}_heading`;
    const collapseId = `stage_${s.id}_collapse`;
    const summaryName = s.name || `Stage ${s.sequence || ""}`;
    return `
      <div class="accordion-item bg-body">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${idx === 0 ? "" : "collapsed"} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${idx === 0}" aria-controls="${collapseId}">
            <div class="d-flex w-100 align-items-center gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">${escapeHtml(summaryName)}</div>
                <div class="small text-secondary">Sequence ${Number(s.sequence || 1)} • Target ${Number(s.creditsTarget || 0)}cr • Assigned ${stageCreditSum}cr</div>
              </div>
              <div class="header-actions d-flex align-items-center gap-2 me-2">
                <span class="btn btn-sm btn-outline-danger" id="removeStage_${s.id}" role="button">Remove stage</span>
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${idx === 0 ? "show" : ""}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label fw-semibold">Stage name</label>
                <input class="form-control" id="stname_${s.id}" value="${escapeHtml(s.name || "")}">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Sequence</label>
                <input type="number" min="1" class="form-control" id="stseq_${s.id}" value="${Number(s.sequence || 1)}">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Credits target</label>
                <input type="number" min="0" class="form-control" id="stcred_${s.id}" value="${Number(s.creditsTarget || 0)}">
                <div class="small text-secondary mt-1">Assigned modules sum to <span class="fw-semibold">${stageCreditSum}</span> credits.</div>
              </div>
              <div class="col-12">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="stexit_${s.id}" ${exitOn ? "checked" : ""}>
                  <label class="form-check-label fw-semibold" for="stexit_${s.id}">Enable exit award for this stage</label>
                </div>
              </div>
              <div class="col-12 ${exitWrapClass}" id="stexitWrap_${s.id}">
                <label class="form-label fw-semibold">Exit award title</label>
                <input class="form-control" id="stexitTitle_${s.id}" value="${escapeHtml((s.exitAward && s.exitAward.awardTitle) || "")}">
              </div>
              <div class="col-12">
                <label class="form-label fw-semibold">Modules in this stage</label>
                ${moduleChecks || `<div class="text-secondary">No modules defined yet (add modules in Credits & Modules).</div>`}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div>
        <h4 class="mb-1">Stage Structure</h4>
        <div class="text-secondary">Define stages for the selected programme version and assign modules to each stage.</div>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <select class="form-select" id="stageVersionSelect" style="min-width: 260px;">
          ${vSelect}
        </select>
        <button class="btn btn-dark" id="addStageBtn">+ Add stage</button>
      </div>
    </div>

    ${accordionControlsHtml('stagesAccordion')}
    <div class="mt-2 accordion" id="stagesAccordion">
      ${stageCards || `<div class="alert alert-info mb-0">No stages yet for this version. Add a stage to begin.</div>`}
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('stagesAccordion');
  wireStagesStep();
}

/**
 * Wire Stages step event handlers
 */
function wireStagesStep() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  if (!Array.isArray(p.versions)) p.versions = [];
  const versions = p.versions;

  const select = document.getElementById("stageVersionSelect");
  if (select) {
    select.onchange = (e) => {
      state.selectedVersionId = e.target.value;
      saveDebounced();
      window.render?.();
    };
  }

  const v = getVersionById(state.selectedVersionId) || versions[0];
  if (!v) return;
  if (!Array.isArray(v.stages)) v.stages = [];

  const addStageBtn = document.getElementById("addStageBtn");
  if (addStageBtn) {
    addStageBtn.onclick = () => {
      const nextSeq = (v.stages || []).length + 1;
      const s = defaultStage(nextSeq);
      if ((p.totalCredits || 0) > 0 && (v.stages || []).length === 0) {
        s.creditsTarget = (p.totalCredits % 60 === 0) ? 60 : 0;
      }
      v.stages.push(s);
      saveDebounced();
      window.render?.();
    };
  }

  (v.stages || []).forEach((s) => {
    const name = document.getElementById(`stname_${s.id}`);
    if (name) name.oninput = (e) => { s.name = e.target.value; saveDebounced(); };

    const seq = document.getElementById(`stseq_${s.id}`);
    if (seq) seq.oninput = (e) => { s.sequence = Number(e.target.value || 1); saveDebounced(); };

    const cred = document.getElementById(`stcred_${s.id}`);
    if (cred) cred.oninput = (e) => { s.creditsTarget = Number(e.target.value || 0); saveDebounced(); };

    const remove = document.getElementById(`removeStage_${s.id}`);
    if (remove) remove.onclick = (e) => {
      e.stopPropagation();
      v.stages = (v.stages || []).filter(x => x.id !== s.id);
      saveDebounced();
      window.render?.();
    };

    const exit = document.getElementById(`stexit_${s.id}`);
    if (exit) exit.onchange = (e) => {
      if (!s.exitAward) s.exitAward = { enabled: false, awardTitle: "" };
      s.exitAward.enabled = !!e.target.checked;
      saveDebounced();
      window.render?.();
    };

    const exitTitle = document.getElementById(`stexitTitle_${s.id}`);
    if (exitTitle) exitTitle.oninput = (e) => {
      if (!s.exitAward) s.exitAward = { enabled: false, awardTitle: "" };
      s.exitAward.awardTitle = e.target.value;
      saveDebounced();
    };

    if (!Array.isArray(s.modules)) s.modules = [];

    (p.modules || []).forEach((m) => {
      const cb = document.getElementById(`st_${s.id}_mod_${m.id}`);
      if (!cb) return;
      cb.onchange = (e) => {
        const checked = e.target.checked;
        if (checked && !s.modules.find(x => x.moduleId === m.id)) {
          s.modules.push({ moduleId: m.id, semester: "" });
        }
        if (!checked) {
          s.modules = s.modules.filter(x => x.moduleId !== m.id);
        }
        saveDebounced();
        window.render?.();
      };

      const sem = document.getElementById(`st_${s.id}_sem_${m.id}`);
      if (sem) sem.oninput = (e) => {
        const entry = s.modules.find(x => x.moduleId === m.id);
        if (entry) entry.semester = e.target.value;
        saveDebounced();
      };
    });
  });
}
