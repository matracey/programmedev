// @ts-check
/**
 * Effort Hours step component.
 * Manages detailed student effort hour breakdowns per module and delivery modality.
 * @module components/steps/effort-hours
 */

import { state, saveDebounced, editableModuleIds, getSelectedModuleId } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { accordionControlsHtml, wireAccordionControls, captureOpenCollapseIds } from './shared.js';

/**
 * Renders the Effort Hours step UI.
 * Displays effort hour inputs per module with delivery modality variations.
 */
export function renderEffortHoursStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const openCollapseIds = captureOpenCollapseIds('effortHoursAccordion');

  const editableIds = editableModuleIds();
  const selectedId = getSelectedModuleId();
  const modulesForEdit = (p.modules ?? []).filter(m => editableIds.includes(m.id));
  const canPickModule = (p.mode === "MODULE_EDITOR" && editableIds.length > 1);

  const modulePicker = canPickModule ? `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="form-label fw-semibold" for="modulePicker">Assigned module</label>
        <select class="form-select" id="modulePicker" data-testid="effort-module-picker" aria-label="Select module for effort hours">
          ${modulesForEdit.map(m => `<option value="${m.id}" ${m.id===selectedId?"selected":""}>${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</option>`).join("")}
        </select>
      </div>
    </div>
  ` : "";

  // Build version/modality combinations from programme versions
  const versions = Array.isArray(p.versions) ? p.versions : [];
  /** @type {Record<string, string>} */
  const modalityLabels = { F2F: "Face-to-face", BLENDED: "Blended", ONLINE: "Fully online" };
  const versionModalities = versions
    .filter(v => v.deliveryModality)
    .map(v => ({
      key: `${v.id}_${v.deliveryModality}`,
      versionId: v.id,
      modality: v.deliveryModality || '',
      label: `${v.label || v.code || 'Version'} — ${v.deliveryModality ? (modalityLabels[v.deliveryModality] || v.deliveryModality) : ''}`
    }));

  const blocks = modulesForEdit.map((m, idx) => {
    // Ensure effortHours structure exists for each version/modality
    if (!m.effortHours) m.effortHours = {};
    const effortHours = m.effortHours;
    versionModalities.forEach(vm => {
      if (!effortHours[vm.key]) {
        effortHours[vm.key] = {
          classroomHours: 0,
          classroomRatio: "1:60",
          mentoringHours: 0,
          mentoringRatio: "1:25",
          otherContactHours: 0,
          otherContactRatio: "",
          otherContactSpecify: "",
          directedElearningHours: 0,
          independentLearningHours: 0,
          otherHours: 0,
          otherHoursSpecify: "",
          workBasedHours: 0
        };
      }
    });

    const isHidden = (p.mode === "MODULE_EDITOR" && editableIds.length > 1 && m.id !== selectedId);
    
    // Calculate totals for each version/modality
    /** @param {string} key */
    const getTotalHours = (key) => {
      const e = m.effortHours?.[key] ?? {};
      return Number(e.classroomHours ?? 0) + Number(e.mentoringHours ?? 0) + 
             Number(e.otherContactHours ?? 0) + Number(e.directedElearningHours ?? 0) + 
             Number(e.independentLearningHours ?? 0) + Number(e.otherHours ?? 0) + 
             Number(e.workBasedHours ?? 0);
    };

    // Expected total based on credits (1 ECTS = 25 hours typically)
    const expectedTotal = Number(m.credits ?? 0) * 25;

    const modalityRows = versionModalities.map(vm => {
      const e = m.effortHours?.[vm.key] ?? {};
      const total = getTotalHours(vm.key);
      const totalClass = total === expectedTotal ? 'text-bg-success' : (total > 0 ? 'text-bg-warning' : 'text-bg-secondary');
      
      return `
        <tr data-version-modality="${vm.key}" data-module-id="${m.id}" data-testid="effort-row-${m.id}-${vm.key}">
          <td class="fw-semibold align-middle">${escapeHtml(vm.label)}</td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="classroomHours" value="${e.classroomHours || 0}" min="0"
              aria-label="Classroom hours for ${escapeHtml(vm.label)}" data-testid="effort-classroom-hours-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="classroomRatio" value="${escapeHtml(e.classroomRatio || '1:60')}" placeholder="1:60"
              aria-label="Classroom ratio for ${escapeHtml(vm.label)}" data-testid="effort-classroom-ratio-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="mentoringHours" value="${e.mentoringHours || 0}" min="0"
              aria-label="Mentoring hours for ${escapeHtml(vm.label)}" data-testid="effort-mentoring-hours-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="mentoringRatio" value="${escapeHtml(e.mentoringRatio || '1:25')}" placeholder="1:25"
              aria-label="Mentoring ratio for ${escapeHtml(vm.label)}" data-testid="effort-mentoring-ratio-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:60px" 
              data-effort-field="otherContactHours" value="${e.otherContactHours || 0}" min="0"
              aria-label="Other contact hours for ${escapeHtml(vm.label)}" data-testid="effort-other-contact-hours-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="otherContactRatio" value="${escapeHtml(e.otherContactRatio || '')}" placeholder="1:X"
              aria-label="Other contact ratio for ${escapeHtml(vm.label)}" data-testid="effort-other-contact-ratio-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:90px" 
              data-effort-field="otherContactSpecify" value="${escapeHtml(e.otherContactSpecify || '')}" placeholder="Specify..."
              aria-label="Other contact type for ${escapeHtml(vm.label)}" data-testid="effort-other-contact-specify-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="directedElearningHours" value="${e.directedElearningHours || 0}" min="0"
              aria-label="Directed e-learning hours for ${escapeHtml(vm.label)}" data-testid="effort-directed-elearning-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="independentLearningHours" value="${e.independentLearningHours || 0}" min="0"
              aria-label="Independent learning hours for ${escapeHtml(vm.label)}" data-testid="effort-independent-learning-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:60px" 
              data-effort-field="otherHours" value="${e.otherHours || 0}" min="0"
              aria-label="Other hours for ${escapeHtml(vm.label)}" data-testid="effort-other-hours-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:90px" 
              data-effort-field="otherHoursSpecify" value="${escapeHtml(e.otherHoursSpecify || '')}" placeholder="Specify..."
              aria-label="Other hours type for ${escapeHtml(vm.label)}" data-testid="effort-other-hours-specify-${m.id}-${vm.key}">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="workBasedHours" value="${e.workBasedHours || 0}" min="0"
              aria-label="Work-based learning hours for ${escapeHtml(vm.label)}" data-testid="effort-work-based-${m.id}-${vm.key}">
          </td>
          <td class="text-center align-middle">
            <span class="badge ${totalClass}" data-total-display data-testid="effort-total-${m.id}-${vm.key}">${total}</span>
          </td>
        </tr>
      `;
    }).join("");

    const noVersionsMsg = versionModalities.length === 0 
      ? `<div class="alert alert-info mb-0">No programme versions with delivery modalities defined. Go to the Programme Versions step to add versions and select their delivery modality.</div>` 
      : "";

    const headingId = `effort_${m.id}_heading`;
    const collapseId = `effort_${m.id}_collapse`;
    const isActive = openCollapseIds.has(collapseId) ? true : (openCollapseIds.size === 0 && idx === 0);

    return `
      <div class="accordion-item bg-body" ${isHidden ? 'style="display:none"' : ""} data-module-card="${m.id}">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? "" : "collapsed"} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}">
            <div class="d-flex w-100 align-items-center gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">${escapeHtml((m.code ? m.code + " — " : "") + m.title)}</div>
                <div class="small text-secondary">
                  ${m.credits} ECTS × 25 = <strong>${expectedTotal}</strong> expected hours
                </div>
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            ${noVersionsMsg || `
            <div class="table-responsive">
              <table class="table table-sm table-bordered align-middle mb-0" data-effort-table="${m.id}" aria-label="Effort hours for ${escapeHtml(m.title)}" data-testid="effort-table-${m.id}">
                <thead>
                  <tr>
                    <th rowspan="2" class="align-middle" style="min-width:150px" scope="col">Version / Modality</th>
                    <th colspan="2" class="text-center" scope="colgroup">Classroom &amp; Demonstrations</th>
                    <th colspan="2" class="text-center" scope="colgroup">Mentoring &amp; Small-group</th>
                    <th colspan="3" class="text-center" scope="colgroup">Other Contact (specify)</th>
                    <th rowspan="2" class="text-center align-middle" style="min-width:80px" scope="col">Directed<br>E-learning</th>
                    <th rowspan="2" class="text-center align-middle" style="min-width:80px" scope="col">Independent<br>Learning</th>
                    <th colspan="2" class="text-center" scope="colgroup">Other Hours (specify)</th>
                    <th rowspan="2" class="text-center align-middle" style="min-width:80px" scope="col">Work-based<br>Learning</th>
                    <th rowspan="2" class="text-center align-middle" style="min-width:70px" scope="col">Total<br>Effort</th>
                  </tr>
                  <tr>
                    <th class="text-center small" scope="col">Hours</th>
                    <th class="text-center small" scope="col">Min Ratio</th>
                    <th class="text-center small" scope="col">Hours</th>
                    <th class="text-center small" scope="col">Min Ratio</th>
                    <th class="text-center small" scope="col">Hours</th>
                    <th class="text-center small" scope="col">Ratio</th>
                    <th class="text-center small" scope="col">Type</th>
                    <th class="text-center small" scope="col">Hours</th>
                    <th class="text-center small" scope="col">Type</th>
                  </tr>
                </thead>
                <tbody>
                  ${modalityRows}
                </tbody>
              </table>
            </div>
            
            <div class="small text-secondary mt-2">
              <strong>Tip:</strong> Total effort hours should equal ${expectedTotal} (based on ${m.credits} ECTS credits × 25 hours per credit).
            </div>
            `}
          </div>
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3"><i class="ph ph-clock me-2" aria-hidden="true"></i>Effort Hours by Version / Modality</h5>
        <p class="small text-secondary mb-3">
          <i class="ph ph-lightbulb me-1" aria-hidden="true"></i>Define how student learning effort is distributed across different activity types for each programme version and delivery modality.
          This helps demonstrate the workload balance and staffing requirements (teacher/learner ratios).
        </p>
        ${modulePicker}
        ${accordionControlsHtml('effortHoursAccordion')}
        <div class="accordion" id="effortHoursAccordion">
          ${modulesForEdit.length ? blocks : `<div class="alert alert-info mb-0"><i class="ph ph-info me-2" aria-hidden="true"></i>Add modules first (Credits & Modules step).</div>`}
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('effortHoursAccordion');
  wireEffortHoursStep();
}

/**
 * Get total effort hours for a module/version-modality key
 * @param {Record<string, any>} effortData
 */
function getTotalHours(effortData) {
  const e = effortData ?? {};
  return Number(e.classroomHours ?? 0) + Number(e.mentoringHours ?? 0) + 
         Number(e.otherContactHours ?? 0) + Number(e.directedElearningHours ?? 0) + 
         Number(e.independentLearningHours ?? 0) + Number(e.otherHours ?? 0) + 
         Number(e.workBasedHours ?? 0);
}

/**
 * Wire Effort Hours step event handlers
 */
function wireEffortHoursStep() {
  const p = state.programme;
  p.modules ??= [];

  const picker = /** @type {HTMLSelectElement | null} */ (document.getElementById("modulePicker"));
  if (picker) {
    picker.onchange = () => {
      state.selectedModuleId = picker.value;
      window.render?.();
    };
  }

  document.querySelectorAll("[data-version-modality]").forEach(row => {
    const vmKey = row.getAttribute("data-version-modality");
    const moduleId = row.getAttribute("data-module-id");
    if (!vmKey || !p.modules) return;
    const m = p.modules.find(x => x.id === moduleId);
    if (!m) return;

    row.querySelectorAll("input[data-effort-field]").forEach(inp => {
      inp.addEventListener("input", (/** @type {any} */ e) => {
        const field = inp.getAttribute("data-effort-field");
        if (!field) return;
        m.effortHours ??= {};
        m.effortHours[vmKey] ??= {};

        // Handle number vs text fields
        if (field.includes("Hours")) {
          m.effortHours[vmKey][field] = Number(e.target?.value) || 0;
        } else {
          m.effortHours[vmKey][field] = e.target?.value || '';
        }

        saveDebounced();

        // Update total display
        const total = getTotalHours(m.effortHours[vmKey]);
        const expected = Number(m.credits ?? 0) * 25;
        const badge = row.querySelector("[data-total-display]");
        if (badge) {
          badge.textContent = String(total);
          badge.classList.remove('text-bg-success', 'text-bg-warning', 'text-bg-secondary');
          if (total === expected) {
            badge.classList.add('text-bg-success');
          } else if (total > 0) {
            badge.classList.add('text-bg-warning');
          } else {
            badge.classList.add('text-bg-secondary');
          }
        }
      });
    });
  });
}
