// @ts-check
/**
 * Assessments step component.
 * Manages module assessments with types, weights, MIMLO mapping, and integrity controls.
 * @module components/steps/assessments
 */

import { state, saveDebounced, editableModuleIds, getSelectedModuleId } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { accordionControlsHtml, wireAccordionControls, captureOpenCollapseIds, updateAccordionHeader } from './shared.js';
import { ensureMimloObjects, mimloText, formatPct } from '../../utils/helpers.js';

// Assessment types matching legacy
const ASSESSMENT_TYPES = [
  "Report/Essay",
  "Project",
  "Presentation",
  "Portfolio",
  "Practical/Lab",
  "Exam (On campus)",
  "Exam (Online)",
  "Reflective Journal",
  "Other"
];

// Assessment modes
const ASSESSMENT_MODES = ["Online", "OnCampus", "Hybrid"];

// Integrity controls
const INTEGRITY_CONTROLS = [
  { key: "proctored", label: "Proctored" },
  { key: "viva", label: "Viva/oral" },
  { key: "inClass", label: "In-class component" },
  { key: "originalityCheck", label: "Originality check" },
  { key: "aiDeclaration", label: "AI declaration" }
];

// Assessment report types
const ASSESSMENT_REPORT_TYPES = [
  { id: "byStageType", label: "By stage: assessment types + weighting" },
  { id: "byModule", label: "By module: assessment types + weighting" },
  { id: "coverage", label: "MIMLO coverage (unassessed outcomes)" }
];

/**
 * Get version by ID
 * @param {Programme} p
 * @param {string} versionId
 */
function getVersionById(p, versionId) {
  return (p.versions ?? []).find(v => v.id === versionId) ?? (p.versions ?? [])[0] ?? null;
}

/**
 * Build report: By Stage Type
 * @param {Programme} p
 * @param {string} versionId
 */
function reportByStageType(p, versionId) {
  const v = getVersionById(p, versionId);
  if (!v) return `<div class="alert alert-warning mb-0">No versions found.</div>`;

  const modMap = new Map((p.modules ?? []).map((/** @type {Module} */ m) => [m.id, m]));

  /** @type {string[]} */
  const stageAgg = [];
  (v.stages ?? []).forEach((/** @type {any} */ stg) => {
    const typeMap = new Map();
    (stg.modules ?? []).forEach((/** @type {any} */ ref) => {
      const m = modMap.get(ref.moduleId);
      if (!m) return;
      (m.assessments ?? []).forEach((/** @type {any} */ a) => {
        const t = a.type || "Unspecified";
        const rec = typeMap.get(t) ?? { weight: 0, count: 0 };
        rec.weight += Number(a.weighting ?? 0);
        rec.count += 1;
        typeMap.set(t, rec);
      });
    });

    const rows = Array.from(typeMap.entries())
      .sort((a, b) => (b[1].weight - a[1].weight))
      .map(([type, rec]) => `
        <tr>
          <td>${escapeHtml(type)}</td>
          <td>${rec.count}</td>
          <td>${formatPct(rec.weight)}</td>
        </tr>
      `).join("") || `<tr><td colspan="3" class="text-muted">No assessments found in this stage.</td></tr>`;

    stageAgg.push(`
      <div class="card border-0 bg-white shadow-sm mb-3">
        <div class="card-body">
          <div class="fw-semibold mb-2">${escapeHtml(stg.name || "Stage")}</div>
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Assessment type</th>
                  <th class="text-nowrap">Count</th>
                  <th class="text-nowrap">Total weighting</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  });

  return stageAgg.join("") || `<div class="text-muted">No stages configured.</div>`;
}

/**
 * Build report: By Module
 * @param {Programme} p
 */
function reportByModule(p) {
  const rows = (p.modules ?? []).map((/** @type {Module} */ m) => {
    const typeMap = new Map();
    (m.assessments ?? []).forEach((/** @type {any} */ a) => {
      const t = a.type || "Unspecified";
      const rec = typeMap.get(t) ?? { weight: 0, count: 0 };
      rec.weight += Number(a.weighting ?? 0);
      rec.count += 1;
      typeMap.set(t, rec);
    });

    const summary = Array.from(typeMap.entries())
      .sort((a, b) => b[1].weight - a[1].weight)
      .map(([t, rec]) => `${t} (${rec.count}, ${rec.weight}%)`)
      .join("; ");

    return `
      <tr>
        <td class="text-nowrap">${escapeHtml(m.code || "")}</td>
        <td>${escapeHtml(m.title || "")}</td>
        <td class="text-nowrap">${escapeHtml(summary || "—")}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="3" class="text-muted">No modules.</td></tr>`;

  return `
    <div class="card border-0 bg-white shadow-sm">
      <div class="card-body">
        <div class="fw-semibold mb-2">By module</div>
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Code</th>
                <th>Module</th>
                <th>Assessment mix</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * Build report: MIMLO Coverage
 * @param {Programme} p
 */
function reportCoverage(p) {
  const items = (p.modules ?? []).map((/** @type {Module} */ m) => {
    ensureMimloObjects(m);
    const mimlos = m.mimlos ?? [];
    const assessed = new Set();
    (m.assessments ?? []).forEach((/** @type {any} */ a) => (a.mimloIds ?? []).forEach((/** @type {string} */ id) => assessed.add(id)));

    const unassessed = mimlos.filter((/** @type {MIMLO} */ mi) => !assessed.has(mi.id));
    if (!unassessed.length) {
      return `
        <div class="card border-0 bg-white shadow-sm mb-2">
          <div class="card-body">
            <div class="fw-semibold">${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</div>
            <div class="small text-success">✓ All MIMLOs are assessed.</div>
          </div>
        </div>
      `;
    }
    return `
      <div class="card border-0 bg-white shadow-sm mb-2">
        <div class="card-body">
          <div class="fw-semibold">${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</div>
          <div class="small text-warning mb-2">Unassessed MIMLOs (${unassessed.length}):</div>
          <ul class="small mb-0">
            ${unassessed.map((/** @type {MIMLO} */ mi) => `<li>${escapeHtml(mimloText(mi))}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;
  }).join("");

  return items || `<div class="text-muted">No modules.</div>`;
}

/**
 * Build assessment report HTML based on report type
 * @param {Programme} p
 * @param {string} reportId
 * @param {string} versionId
 */
function buildAssessmentReportHtml(p, reportId, versionId) {
  switch (reportId) {
    case "byStageType": return reportByStageType(p, versionId);
    case "byModule": return reportByModule(p);
    case "coverage": return reportCoverage(p);
    default: return `<div class="text-muted">Select a report.</div>`;
  }
}

/**
 * Open report in new browser tab
 * @param {string} html
 * @param {string} [title]
 */
function openReportInNewTab(html, title = "Report") {
  const w = window.open("", "_blank");
  if (!w) return alert("Popup blocked. Allow popups to open report in a new tab.");
  w.document.open();
  w.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${title}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="p-3">
        <h4 class="mb-3">${title}</h4>
        ${html}
      </body>
    </html>
  `);
  w.document.close();
}

/**
 * Render the Assessments step
 */
export function renderAssessmentsStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const openCollapseIds = captureOpenCollapseIds('assessmentsAccordion');

  const editableIds = editableModuleIds();
  const selectedId = getSelectedModuleId();
  const canPickModule = (p.mode === "MODULE_EDITOR" && editableIds.length > 1);
  const modulesForEdit = (p.modules ?? []).filter(m => editableIds.includes(m.id));

  // Module picker for MODULE_EDITOR mode
  const modulePicker = canPickModule ? `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="form-label fw-semibold">Assigned module</label>
        <select class="form-select" id="assessmentModulePicker">
          ${modulesForEdit.map(m => `<option value="${m.id}" ${m.id === selectedId ? "selected" : ""}>${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</option>`).join("")}
        </select>
      </div>
    </div>
  ` : "";

  // Type options for assessment type select
  const typeOpts = ASSESSMENT_TYPES;

  // Build module cards with assessments
  const cards = modulesForEdit.map((m, idx) => {
    ensureMimloObjects(m);
    m.assessments ??= [];
    const total = m.assessments.reduce((acc, a) => acc + (Number(a.weighting) ?? 0), 0);
    const totalBadge = (total === 100)
      ? `<span class="badge text-bg-success">Total ${total}%</span>`
      : `<span class="badge text-bg-warning">Total ${total}% (should be 100)</span>`;

    // Build assessment accordion items for this module
    const asmItems = (m.assessments ?? []).map((a, asmIdx) => {
      const mode = a.mode ?? "Online";
      const integ = a.integrity ?? {};
      const asmHeadingId = `asm_${m.id}_${a.id}_heading`;
      const asmCollapseId = `asm_${m.id}_${a.id}_collapse`;
      const asmActive = openCollapseIds.has(asmCollapseId) ? true : (openCollapseIds.size === 0 && asmIdx === 0);

      return `
        <div class="accordion-item bg-body" data-testid="assessment-item-${a.id}">
          <h2 class="accordion-header" id="${asmHeadingId}">
            <button class="accordion-button ${asmActive ? '' : 'collapsed'} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${asmCollapseId}" aria-expanded="${asmActive}" aria-controls="${asmCollapseId}" data-testid="assessment-accordion-${a.id}">
              <div class="d-flex w-100 align-items-center gap-2">
                <div class="flex-grow-1 text-start">
                  <div class="fw-semibold">${escapeHtml(a.title || "Assessment")}</div>
                  <div class="small text-nowrap text-secondary">${escapeHtml(a.type || "")} • ${a.weighting ?? 0}%</div>
                </div>
                <div class="header-actions d-flex align-items-center gap-2 me-2">
                  <span class="btn btn-sm btn-outline-danger" role="button" tabindex="0" data-remove-asm="${m.id}" data-asm-id="${a.id}" aria-label="Remove assessment ${escapeHtml(a.title || '')}" data-testid="remove-asm-${a.id}"><i class="ph ph-trash" aria-hidden="true"></i> Remove</span>
                </div>
              </div>
            </button>
          </h2>
          <div id="${asmCollapseId}" class="accordion-collapse collapse ${asmActive ? 'show' : ''}" aria-labelledby="${asmHeadingId}">
            <div class="accordion-body">
              <fieldset class="row g-2">
                <legend class="visually-hidden">Assessment details</legend>
                <div class="col-md-4">
                  <label class="form-label small fw-semibold" for="asm-title-${a.id}">Title</label>
                  <input class="form-control" id="asm-title-${a.id}" data-asm-title="${m.id}" data-asm-id="${a.id}" data-testid="asm-title-${a.id}" value="${escapeHtml(a.title || "")}">
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-semibold" for="asm-type-${a.id}">Type</label>
                  <select class="form-select" id="asm-type-${a.id}" data-asm-type="${m.id}" data-asm-id="${a.id}" data-testid="asm-type-${a.id}">
                    ${typeOpts.map(t => `<option value="${escapeHtml(t)}" ${(a.type || "") === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}
                  </select>
                </div>
                <div class="col-md-2">
                  <label class="form-label small fw-semibold" for="asm-weight-${a.id}">Weighting %</label>
                  <input type="number" min="0" max="100" step="1" class="form-control" id="asm-weight-${a.id}"
                    data-asm-weight="${m.id}" data-asm-id="${a.id}" data-testid="asm-weight-${a.id}" value="${a.weighting ?? ""}">
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-semibold" for="asm-mode-${a.id}">Mode</label>
                  <select class="form-select" id="asm-mode-${a.id}" data-asm-mode="${m.id}" data-asm-id="${a.id}" data-testid="asm-mode-${a.id}">
                    ${ASSESSMENT_MODES.map(x => `<option value="${x}" ${mode === x ? "selected" : ""}>${x}</option>`).join("")}
                  </select>
                </div>
              </fieldset>

              <div class="row g-2 mt-2">
                <div class="col-md-6">
                  <div class="fw-semibold small mb-1" id="mimlo-map-heading-${a.id}">Map to MIMLOs</div>
                  <div class="border rounded p-2" data-asm-mimlo-box="${m.id}" data-asm-id="${a.id}" role="group" aria-labelledby="mimlo-map-heading-${a.id}">
                    ${(m.mimlos ?? []).map((mi, miIdx) => {
                      const checked = (a.mimloIds ?? []).includes(mi.id);
                      return `
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" id="asm-mimlo-${a.id}-${mi.id}"
                            data-asm-mimlo="${m.id}" data-asm-id="${a.id}" data-mimlo-id="${mi.id}" data-testid="asm-mimlo-${a.id}-${mi.id}" ${checked ? "checked" : ""}>
                          <label class="form-check-label small" for="asm-mimlo-${a.id}-${mi.id}">${escapeHtml(mimloText(mi))}</label>
                        </div>
                      `;
                    }).join("") || '<span class="text-muted small">Add MIMLOs first</span>'}
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="fw-semibold small mb-1" id="integrity-heading-${a.id}">Integrity controls</div>
                  <div class="border rounded p-2" role="group" aria-labelledby="integrity-heading-${a.id}">
                    ${INTEGRITY_CONTROLS.map(({ key, label }) => `
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="asm-int-${a.id}-${key}"
                          data-integrity-option="${m.id}" data-asm-id="${a.id}" data-int-key="${key}" data-testid="asm-integrity-${a.id}-${key}" ${integ[key] ? "checked" : ""}>
                        <label class="form-check-label small" for="asm-int-${a.id}-${key}">${label}</label>
                      </div>
                    `).join("")}
                  </div>
                </div>
              </div>

              <div class="mt-2">
                <label class="form-label small fw-semibold" for="asm-notes-${a.id}">Notes</label>
                <textarea class="form-control" rows="2" id="asm-notes-${a.id}" data-asm-notes="${m.id}" data-asm-id="${a.id}" data-testid="asm-notes-${a.id}">${escapeHtml(a.notes || "")}</textarea>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    const isHidden = (p.mode === "MODULE_EDITOR" && editableIds.length > 1 && m.id !== selectedId);
    const headingId = `asm_${m.id}_heading`;
    const collapseId = `asm_${m.id}_collapse`;
    const modActive = openCollapseIds.has(collapseId) ? true : (openCollapseIds.size === 0 && idx === 0);
    return `
      <div class="accordion-item bg-body" ${isHidden ? 'style="display:none"' : ''} data-module-card="${m.id}" data-testid="asm-module-${m.id}">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${modActive ? '' : 'collapsed'} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${modActive}" aria-controls="${collapseId}" data-testid="asm-module-accordion-${m.id}">
            <div class="d-flex w-100 align-items-center gap-2">
              <div class="flex-grow-1 text-start">
                <div class="fw-semibold">${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</div>
                <div class="small text-secondary">${m.assessments.length} assessment${m.assessments.length !== 1 ? 's' : ''}</div>
              </div>
              <div class="header-actions d-flex align-items-center gap-2 me-2">
                ${totalBadge}
                <button type="button" class="btn btn-sm btn-outline-primary" data-add-asm="${m.id}" aria-label="Add assessment to ${escapeHtml(m.title || 'module')}" data-testid="add-asm-${m.id}"><i class="ph ph-plus" aria-hidden="true"></i> Add</button>
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${modActive ? 'show' : ''}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            ${asmItems || `<div class="text-muted small">No assessments yet. Click "+ Add" to create one.</div>`}
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Report controls section
  const reportSection = `
    <div class="card border-0 bg-white shadow-sm mb-3">
      <div class="card-body">
        <fieldset class="row g-2 align-items-end">
          <legend class="visually-hidden">Assessment reports</legend>
          <div class="col-md-4">
            <label class="form-label small fw-semibold" for="reportTypeSelect">Report type</label>
            <select class="form-select" id="reportTypeSelect" data-testid="report-type-select">
              ${ASSESSMENT_REPORT_TYPES.map(r => `<option value="${r.id}" ${(state.reportTypeId || "byStageType") === r.id ? "selected" : ""}>${escapeHtml(r.label)}</option>`).join("")}
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-semibold" for="reportVersionSelect">Version</label>
            <select class="form-select" id="reportVersionSelect" data-testid="report-version-select">
              ${(p.versions ?? []).map(v => `<option value="${v.id}" ${(state.reportVersionId ?? (p.versions?.[0]?.id)) === v.id ? "selected" : ""}>${escapeHtml(v.label || v.code || "Version")}</option>`).join("")}
            </select>
          </div>
          <div class="col-md-4 d-flex gap-2">
            <button class="btn btn-outline-primary w-50" id="runReportInlineBtn" type="button" data-testid="run-report-inline">Show below</button>
            <button class="btn btn-outline-secondary w-50" id="runReportNewTabBtn" type="button" data-testid="run-report-newtab">Open in new tab</button>
          </div>
        </fieldset>
        <div class="mt-3" id="reportOutput" role="region" aria-live="polite" style="display:none;"></div>
      </div>
    </div>
  `;

  content.innerHTML = devModeToggleHtml + `
    <div class="d-flex align-items-center justify-content-between mb-3">
      <div>
        <div class="h5 mb-0" id="assessments-heading">Assessments</div>
        <div class="text-muted small">Create assessments per module, set weightings, and map to MIMLOs.</div>
      </div>
    </div>

    ${reportSection}
    ${modulePicker}
    ${accordionControlsHtml('assessmentsAccordion')}
    <div class="accordion" id="assessmentsAccordion" aria-labelledby="assessments-heading" data-testid="assessments-accordion">
      ${modulesForEdit.length ? cards : `<div class="alert alert-warning" role="alert">No modules available to edit.</div>`}
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('assessmentsAccordion');
  wireAssessmentsStep();
}

/**
 * Update assessment accordion header in-place (preserves input focus)
 * @param {ModuleAssessment} a
 */
function updateAssessmentHeader(a) {
  updateAccordionHeader(`asm_${a.id}_heading`, {
    title: escapeHtml(a.title || "Assessment"),
    subtitle: `${escapeHtml(a.type || "")} • ${a.weighting ?? 0}%`
  });
}

/**
 * Wire Assessments step event handlers
 */
function wireAssessmentsStep() {
  const p = state.programme;
  if (!p.modules) p.modules = [];

  // Report controls
  const reportTypeSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById("reportTypeSelect"));
  const reportVersionSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById("reportVersionSelect"));
  const runInline = document.getElementById("runReportInlineBtn");
  const runNewTab = document.getElementById("runReportNewTabBtn");
  const out = document.getElementById("reportOutput");

  if (reportTypeSelect) {
    reportTypeSelect.onchange = () => {
      state.reportTypeId = reportTypeSelect.value;
    };
  }

  if (reportVersionSelect) {
    reportVersionSelect.onchange = () => {
      state.reportVersionId = reportVersionSelect.value;
    };
  }

  function getReportState() {
    const rid = state.reportTypeId || "byStageType";
    const vid = state.reportVersionId || (p.versions?.[0]?.id) || "";
    return { rid, vid };
  }

  if (runInline && out) {
    runInline.onclick = () => {
      const { rid, vid } = getReportState();
      const html = buildAssessmentReportHtml(p, rid, vid);
      out.style.display = "";
      out.innerHTML = html;
    };
  }

  if (runNewTab) {
    runNewTab.onclick = () => {
      const { rid, vid } = getReportState();
      const html = buildAssessmentReportHtml(p, rid, vid);
      const label = (ASSESSMENT_REPORT_TYPES.find(x => x.id === rid)?.label) || "Report";
      openReportInNewTab(html, label);
    };
  }

  // Module picker
  const picker = /** @type {HTMLSelectElement | null} */ (document.getElementById("assessmentModulePicker"));
  if (picker) {
    picker.onchange = () => {
      state.selectedModuleId = picker.value;
      window.render?.();
    };
  }

  // Add assessment
  document.querySelectorAll("[data-add-asm]").forEach(btn => {
    /** @type {HTMLElement} */ (btn).onclick = (/** @type {any} */ e) => {
      e.stopPropagation();
      const mid = btn.getAttribute("data-add-asm");
      if (!p.modules) return;
      const m = p.modules.find(x => x.id === mid);
      if (!m) return;
      ensureMimloObjects(m);
      m.assessments ??= [];
      m.assessments.push({
        id: "asm_" + crypto.randomUUID(),
        title: "",
        type: "Report/Essay",
        weighting: 0,
        mode: "Online",
        integrity: { proctored: false, viva: false, inClass: false, originalityCheck: true, aiDeclaration: true },
        mimloIds: [],
        notes: ""
      });
      saveDebounced();
      window.render?.();
    };
  });

  // Remove assessment
  document.querySelectorAll("[data-remove-asm]").forEach(btn => {
    /** @type {HTMLElement} */ (btn).onclick = (/** @type {any} */ e) => {
      e.stopPropagation();
      const mid = btn.getAttribute("data-remove-asm");
      const aid = btn.getAttribute("data-asm-id");
      if (!p.modules) return;
      const m = p.modules.find(x => x.id === mid);
      if (!m) return;
      m.assessments ??= [];
      m.assessments = m.assessments.filter(a => a.id !== aid);
      saveDebounced();
      window.render?.();
    };
  });

  // Helper to find module and assessment
  /**
   * @param {string | null} mid
   * @param {string | null} aid
   */
  function findAsm(mid, aid) {
    if (!p.modules) return null;
    const m = p.modules.find(x => x.id === mid);
    if (!m) return null;
    m.assessments ??= [];
    const a = m.assessments.find(x => x.id === aid);
    return { m, a };
  }

  // Assessment title
  document.querySelectorAll("[data-asm-title]").forEach(inp => {
    /** @type {HTMLInputElement} */ (inp).oninput = () => {
      const mid = inp.getAttribute("data-asm-title");
      const aid = inp.getAttribute("data-asm-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.title = /** @type {HTMLInputElement} */ (inp).value;
      saveDebounced();
      updateAssessmentHeader(found.a);
    };
  });

  // Assessment type
  document.querySelectorAll("[data-asm-type]").forEach(sel => {
    /** @type {HTMLSelectElement} */ (sel).onchange = () => {
      const mid = sel.getAttribute("data-asm-type");
      const aid = sel.getAttribute("data-asm-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.type = /** @type {HTMLSelectElement} */ (sel).value;
      saveDebounced();
      updateAssessmentHeader(found.a);
    };
  });

  // Assessment weight
  document.querySelectorAll("[data-asm-weight]").forEach(inp => {
    /** @type {HTMLInputElement} */ (inp).oninput = () => {
      const mid = inp.getAttribute("data-asm-weight");
      const aid = inp.getAttribute("data-asm-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.weighting = Number(/** @type {HTMLInputElement} */ (inp).value ?? 0);
      saveDebounced();
      updateAssessmentHeader(found.a);
    };
  });

  // Assessment mode
  document.querySelectorAll("[data-asm-mode]").forEach(sel => {
    /** @type {HTMLSelectElement} */ (sel).onchange = () => {
      const mid = sel.getAttribute("data-asm-mode");
      const aid = sel.getAttribute("data-asm-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.mode = /** @type {HTMLSelectElement} */ (sel).value;
      saveDebounced();
    };
  });

  // Assessment notes
  document.querySelectorAll("[data-asm-notes]").forEach(area => {
    /** @type {HTMLTextAreaElement} */ (area).oninput = () => {
      const mid = area.getAttribute("data-asm-notes");
      const aid = area.getAttribute("data-asm-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a) return;
      found.a.notes = /** @type {HTMLTextAreaElement} */ (area).value;
      saveDebounced();
    };
  });

  // Integrity controls
  document.querySelectorAll("[data-integrity-option]").forEach(chk => {
    /** @type {HTMLInputElement} */ (chk).onchange = () => {
      const mid = chk.getAttribute("data-integrity-option");
      const aid = chk.getAttribute("data-asm-id");
      const key = chk.getAttribute("data-int-key");
      const found = findAsm(mid, aid);
      if (!found || !found.a || !key) return;
      found.a.integrity ??= {};
      found.a.integrity[key] = /** @type {HTMLInputElement} */ (chk).checked;
      saveDebounced();
    };
  });

  // MIMLO mapping
  document.querySelectorAll("[data-asm-mimlo]").forEach(chk => {
    /** @type {HTMLInputElement} */ (chk).onchange = () => {
      const mid = chk.getAttribute("data-asm-mimlo");
      const aid = chk.getAttribute("data-asm-id");
      const mimloId = chk.getAttribute("data-mimlo-id");
      const found = findAsm(mid, aid);
      if (!found || !found.a || !mimloId) return;
      found.a.mimloIds ??= [];
      if (/** @type {HTMLInputElement} */ (chk).checked) {
        if (!found.a.mimloIds.includes(mimloId)) found.a.mimloIds.push(mimloId);
      } else {
        found.a.mimloIds = found.a.mimloIds.filter(x => x !== mimloId);
      }
      saveDebounced();
    };
  });
}
