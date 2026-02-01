// @ts-check
/**
 * Programme Schedule step component.
 * Displays a QQI-style timetable view showing module placement across stages.
 * @module components/steps/schedule
 */

import { state } from "../../state/store.js";
import { escapeHtml } from "../../utils/dom.js";
import { getDevModeToggleHtml, wireDevModeToggle } from "../dev-mode.js";
import { accordionControlsHtml, captureOpenCollapseIds, wireAccordionControls } from "./shared.js";

/**
 * Renders the Schedule step UI.
 * Displays a timetable grid showing modules by stage and semester.
 */
export function renderScheduleStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  const devModeToggleHtml = getDevModeToggleHtml();
  const versions = Array.isArray(p.versions) ? p.versions : [];
  const openCollapseIds = captureOpenCollapseIds("scheduleAccordion");

  if (!versions.length) {
    content.innerHTML =
      devModeToggleHtml +
      `
      <div class="alert alert-warning">Add at least one Programme Version first.</div>
    `;
    wireDevModeToggle(() => window.render?.());
    return;
  }

  // Initialize selected version
  if (!state.selectedVersionId) {
    state.selectedVersionId = versions[0].id;
  }
  const v = versions.find((x) => x.id === state.selectedVersionId) || versions[0];

  // Build version selector options
  const vSelect = versions
    .map(
      (x) => `
    <option value="${escapeHtml(x.id)}" ${x.id === v.id ? "selected" : ""}>
      ${escapeHtml(x.code || "")}${x.code ? " — " : ""}${escapeHtml(x.label || "")}
    </option>
  `,
    )
    .join("");

  /** @type {Record<string, string>} */
  const modalityLabels = {
    F2F: "Face-to-face",
    BLENDED: "Blended",
    ONLINE: "Fully online",
  };
  const modalityKey = v.deliveryModality ? `${v.id}_${v.deliveryModality}` : null;

  // Build module lookup
  const moduleMap = new Map((p.modules ?? []).map((m) => [m.id, m]));

  // Build stage accordion items
  const stageItems = (v.stages ?? [])
    .sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0))
    .map((stg, stgIdx) => {
      const isFirst = stgIdx === 0;
      /** @type {Array<{module: Module, semester: string, status: string, credits: number, totalHours: number, contactHours: number, directedElearn: number, independent: number, workBased: number, caPercent: number, projectPercent: number, practicalPercent: number, examPercent: number}>} */
      const stageModules = (stg.modules ?? [])
        .map((sm) => {
          const m = moduleMap.get(sm.moduleId);
          if (!m) {
            return null;
          }

          // Get effort hours for this version/modality
          const effort = modalityKey && m.effortHours ? (m.effortHours[modalityKey] ?? {}) : {};
          const classroomHrs = Number(effort.classroomHours ?? 0);
          const mentoringHrs = Number(effort.mentoringHours ?? 0);
          const otherContactHrs = Number(effort.otherContactHours ?? 0);
          const contactTotal = classroomHrs + mentoringHrs + otherContactHrs;
          const directedElearn = Number(effort.directedElearningHours ?? 0);
          const independent = Number(effort.independentLearningHours ?? 0);
          const workBased = Number(effort.workBasedHours ?? 0);
          const otherHrs = Number(effort.otherHours ?? 0);
          const totalHours = contactTotal + directedElearn + independent + workBased + otherHrs;

          // Get assessment breakdown
          const assessments = m.assessments ?? [];

          // Categorize assessments for QQI breakdown
          let caPercent = 0,
            projectPercent = 0,
            practicalPercent = 0,
            examPercent = 0;
          assessments.forEach((a) => {
            const w = Number(a.weighting ?? 0);
            const t = (a.type ?? "").toLowerCase();
            if (t.includes("exam")) {
              examPercent += w;
            } else if (t.includes("project")) {
              projectPercent += w;
            } else if (t.includes("practical") || t.includes("lab") || t.includes("demo")) {
              practicalPercent += w;
            } else {
              caPercent += w;
            }
          });

          return {
            module: m,
            semester: sm.semester || "",
            status: "M", // M = Mandatory (default)
            credits: Number(m.credits ?? 0),
            totalHours,
            contactHours: contactTotal,
            directedElearn,
            independent,
            workBased,
            caPercent,
            projectPercent,
            practicalPercent,
            examPercent,
          };
        })
        .filter(/** @type {(x: any) => x is NonNullable<typeof x>} */ ((x) => x !== null));

      const stageCredits = stageModules.reduce((sum, sm) => sum + sm.credits, 0);
      const stageTotalHours = stageModules.reduce((sum, sm) => sum + sm.totalHours, 0);

      const rows = stageModules
        .map(
          (sm) => `
        <tr>
          <td class="small" style="max-width:200px;">${escapeHtml(sm.module.title)}</td>
          <td class="text-center small">${escapeHtml(sm.semester || "—")}</td>
          <td class="text-center small">${escapeHtml(sm.status)}</td>
          <td class="text-center small">${p.nfqLevel || "—"}</td>
          <td class="text-center small fw-semibold">${sm.credits}</td>
          <td class="text-center small">${sm.totalHours || "—"}</td>
          <td class="text-center small">${sm.contactHours || "—"}</td>
          <td class="text-center small">${sm.directedElearn || "—"}</td>
          <td class="text-center small">${sm.independent || "—"}</td>
          <td class="text-center small">${sm.workBased || "—"}</td>
          <td class="text-center small">${sm.caPercent || "—"}</td>
          <td class="text-center small">${sm.projectPercent || "—"}</td>
          <td class="text-center small">${sm.practicalPercent || "—"}</td>
          <td class="text-center small">${sm.examPercent || "—"}</td>
        </tr>
      `,
        )
        .join("");

      // Stage totals row
      const totalsRow = stageModules.length
        ? `
        <tr class="fw-semibold" style="background: var(--bs-tertiary-bg);">
          <td class="small">Stage Total</td>
          <td></td><td></td><td></td>
          <td class="text-center small">${stageCredits}</td>
          <td class="text-center small">${stageTotalHours}</td>
          <td class="text-center small">${stageModules.reduce((s, m) => s + m.contactHours, 0)}</td>
          <td class="text-center small">${stageModules.reduce((s, m) => s + m.directedElearn, 0)}</td>
          <td class="text-center small">${stageModules.reduce((s, m) => s + m.independent, 0)}</td>
          <td class="text-center small">${stageModules.reduce((s, m) => s + m.workBased, 0)}</td>
          <td colspan="4"></td>
        </tr>
      `
        : "";

      const headingId = `schedule_${stg.sequence}_heading`;
      const collapseId = `schedule_${stg.sequence}_collapse`;
      const isActive = openCollapseIds.has(collapseId)
        ? true
        : openCollapseIds.size === 0 && stgIdx === 0;
      return `
        <div class="accordion-item bg-body">
          <h2 class="accordion-header" id="${headingId}">
            <button class="accordion-button ${isActive ? "" : "collapsed"}" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}">
              <div class="d-flex justify-content-between align-items-center w-100">
                <div class="fw-semibold">${escapeHtml(stg.name || `Stage ${stg.sequence}`)}</div>
                <div class="small text-secondary">Target: ${stg.creditsTarget || 0} ECTS • NFQ ${p.nfqLevel || "—"}</div>
              </div>
            </button>
          </h2>
          <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
            <div class="accordion-body p-0">
              <div class="table-responsive">
                <table class="table table-sm table-bordered align-middle mb-0" aria-label="Module schedule for ${escapeHtml(stg.name || "Stage " + stg.sequence)}" data-testid="schedule-table-${stg.sequence}">
                  <thead>
                    <tr>
                      <th rowspan="2" class="align-middle" style="min-width:180px" scope="col">Module Title</th>
                      <th rowspan="2" class="text-center align-middle" style="width:60px" scope="col">Sem</th>
                      <th rowspan="2" class="text-center align-middle" style="width:50px" scope="col">Status</th>
                      <th rowspan="2" class="text-center align-middle" style="width:50px" scope="col">NFQ</th>
                      <th rowspan="2" class="text-center align-middle" style="width:50px" scope="col">ECTS</th>
                      <th colspan="5" class="text-center" scope="colgroup">Total Student Effort (hours)</th>
                      <th colspan="4" class="text-center" scope="colgroup">Assessment Strategy (%)</th>
                    </tr>
                    <tr>
                      <th class="text-center small" style="width:50px" scope="col">Total</th>
                      <th class="text-center small" style="width:55px" scope="col">Contact</th>
                      <th class="text-center small" style="width:55px" scope="col">Dir. E-Learn</th>
                      <th class="text-center small" style="width:60px" scope="col">Indep. Learn</th>
                      <th class="text-center small" style="width:55px" scope="col">Work-based</th>
                      <th class="text-center small" style="width:40px" scope="col">CA</th>
                      <th class="text-center small" style="width:45px" scope="col">Project</th>
                      <th class="text-center small" style="width:50px" scope="col">Practical</th>
                      <th class="text-center small" style="width:45px" scope="col">Exam</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows || `<tr><td colspan="14" class="text-muted text-center">No modules assigned to this stage.</td></tr>`}
                    ${totalsRow}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Programme header info block
  const headerInfo = `
    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <table class="table table-sm table-borderless mb-0">
              <tr><th class="small text-secondary" style="width:140px">Provider:</th><td class="small fw-semibold">National College of Ireland</td></tr>
              <tr><th class="small text-secondary">Programme Title:</th><td class="small">${escapeHtml(p.title || "—")}</td></tr>
              <tr><th class="small text-secondary">Award Title:</th><td class="small">${escapeHtml(p.awardType || "—")}</td></tr>
              <tr><th class="small text-secondary">Version:</th><td class="small">${escapeHtml(v.label || v.code || "—")}</td></tr>
            </table>
          </div>
          <div class="col-md-6">
            <table class="table table-sm table-borderless mb-0">
              <tr><th class="small text-secondary" style="width:140px">NFQ Level:</th><td class="small">${p.nfqLevel || "—"}</td></tr>
              <tr><th class="small text-secondary">Total Credits:</th><td class="small">${p.totalCredits || "—"} ECTS</td></tr>
              <tr><th class="small text-secondary">Delivery Mode:</th><td class="small">${v.deliveryModality ? modalityLabels[v.deliveryModality] || v.deliveryModality : "—"}</td></tr>
              <tr><th class="small text-secondary">Duration:</th><td class="small">${escapeHtml(v.duration || "—")}</td></tr>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  content.innerHTML =
    devModeToggleHtml +
    `
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h5 class="card-title mb-1"><i class="ph ph-calendar me-2" aria-hidden="true"></i>Programme Schedule</h5>
            <div class="small text-secondary"><i class="ph ph-lightbulb me-1" aria-hidden="true"></i>QQI-style module schedule showing effort hours and assessment strategy per stage.</div>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <label for="scheduleVersionSelect" class="visually-hidden">Select programme version</label>
            <select class="form-select" id="scheduleVersionSelect" style="min-width: 260px;" aria-label="Select programme version" data-testid="schedule-version-select">
              ${vSelect}
            </select>
            <button class="btn btn-outline-secondary btn-sm" id="printScheduleBtn" title="Print schedule" aria-label="Print schedule" data-testid="schedule-print-btn">
              <i class="ph ph-printer" aria-hidden="true"></i> Print
            </button>
          </div>
        </div>
        
        ${headerInfo}
        
        ${accordionControlsHtml("scheduleAccordion")}
        ${(v.stages ?? []).length ? `<div class="accordion" id="scheduleAccordion">${stageItems}</div>` : `<div class="alert alert-info"><i class="ph ph-info me-2" aria-hidden="true"></i>No stages defined for this version. Go to Stage Structure to add stages and assign modules.</div>`}
        
        <div class="small text-secondary mt-3">
          <strong>Legend:</strong> Status: M = Mandatory, E = Elective | CA = Continuous Assessment | Contact = Classroom + Mentoring + Other Contact Hours
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls("scheduleAccordion");
  wireScheduleStep();
}

/**
 * Wire Schedule step event handlers
 */
function wireScheduleStep() {
  // Version selector
  const versionSelect = /** @type {HTMLSelectElement | null} */ (
    document.getElementById("scheduleVersionSelect")
  );
  if (versionSelect) {
    versionSelect.onchange = () => {
      state.selectedVersionId = versionSelect.value;
      window.render?.();
    };
  }

  // Print button
  const printBtn = document.getElementById("printScheduleBtn");
  if (printBtn) {
    printBtn.onclick = () => {
      window.print();
    };
  }
}
