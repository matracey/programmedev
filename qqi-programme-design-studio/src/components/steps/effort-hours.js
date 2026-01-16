/**
 * Effort Hours step component
 * Matches legacy app.js effort hours structure with 8 detailed fields
 */

import { state, saveDebounced, editableModuleIds, getSelectedModuleId } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';

/**
 * Render the Effort Hours step
 */
export function renderEffortHoursStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();

  const editableIds = editableModuleIds();
  const selectedId = getSelectedModuleId();
  const modulesForEdit = (p.modules || []).filter(m => editableIds.includes(m.id));
  const canPickModule = (p.mode === "MODULE_EDITOR" && editableIds.length > 1);

  const modulePicker = canPickModule ? `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="form-label fw-semibold">Assigned module</label>
        <select class="form-select" id="modulePicker">
          ${modulesForEdit.map(m => `<option value="${m.id}" ${m.id===selectedId?"selected":""}>${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</option>`).join("")}
        </select>
      </div>
    </div>
  ` : "";

  // Build version/modality combinations from programme versions
  const versions = Array.isArray(p.versions) ? p.versions : [];
  const modalityLabels = { F2F: "Face-to-face", BLENDED: "Blended", ONLINE: "Fully online" };
  const versionModalities = versions
    .filter(v => v.deliveryModality)
    .map(v => ({
      key: `${v.id}_${v.deliveryModality}`,
      versionId: v.id,
      modality: v.deliveryModality,
      label: `${v.label || v.code || 'Version'} — ${modalityLabels[v.deliveryModality] || v.deliveryModality}`
    }));

  const blocks = modulesForEdit.map(m => {
    // Ensure effortHours structure exists for each version/modality
    m.effortHours = m.effortHours || {};
    versionModalities.forEach(vm => {
      m.effortHours[vm.key] = m.effortHours[vm.key] || {
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
    });

    const isHidden = (p.mode === "MODULE_EDITOR" && editableIds.length > 1 && m.id !== selectedId);
    
    // Calculate totals for each version/modality
    const getTotalHours = (key) => {
      const e = m.effortHours[key] || {};
      return Number(e.classroomHours || 0) + Number(e.mentoringHours || 0) + 
             Number(e.otherContactHours || 0) + Number(e.directedElearningHours || 0) + 
             Number(e.independentLearningHours || 0) + Number(e.otherHours || 0) + 
             Number(e.workBasedHours || 0);
    };

    // Expected total based on credits (1 ECTS = 25 hours typically)
    const expectedTotal = Number(m.credits || 0) * 25;

    const modalityRows = versionModalities.map(vm => {
      const e = m.effortHours[vm.key] || {};
      const total = getTotalHours(vm.key);
      const totalClass = total === expectedTotal ? 'text-bg-success' : (total > 0 ? 'text-bg-warning' : 'text-bg-secondary');
      
      return `
        <tr data-version-modality="${vm.key}" data-module-id="${m.id}">
          <td class="fw-semibold align-middle">${escapeHtml(vm.label)}</td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="classroomHours" value="${e.classroomHours || 0}" min="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="classroomRatio" value="${escapeHtml(e.classroomRatio || '1:60')}" placeholder="1:60">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="mentoringHours" value="${e.mentoringHours || 0}" min="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="mentoringRatio" value="${escapeHtml(e.mentoringRatio || '1:25')}" placeholder="1:25">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:60px" 
              data-effort-field="otherContactHours" value="${e.otherContactHours || 0}" min="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="otherContactRatio" value="${escapeHtml(e.otherContactRatio || '')}" placeholder="1:X">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:90px" 
              data-effort-field="otherContactSpecify" value="${escapeHtml(e.otherContactSpecify || '')}" placeholder="Specify...">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="directedElearningHours" value="${e.directedElearningHours || 0}" min="0">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="independentLearningHours" value="${e.independentLearningHours || 0}" min="0">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:60px" 
              data-effort-field="otherHours" value="${e.otherHours || 0}" min="0">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm" style="width:90px" 
              data-effort-field="otherHoursSpecify" value="${escapeHtml(e.otherHoursSpecify || '')}" placeholder="Specify...">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" style="width:70px" 
              data-effort-field="workBasedHours" value="${e.workBasedHours || 0}" min="0">
          </td>
          <td class="text-center align-middle">
            <span class="badge ${totalClass}" data-total-display>${total}</span>
          </td>
        </tr>
      `;
    }).join("");

    const noVersionsMsg = versionModalities.length === 0 
      ? `<div class="alert alert-info mb-0">No programme versions with delivery modalities defined. Go to the Programme Versions step to add versions and select their delivery modality.</div>` 
      : "";

    return `
      <div class="card border-0 bg-white shadow-sm mb-4" ${isHidden ? 'style="display:none"' : ""} data-module-card="${m.id}">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="fw-semibold">${escapeHtml((m.code ? m.code + " — " : "") + m.title)}</div>
            <div class="small text-secondary">
              ${m.credits} ECTS × 25 = <strong>${expectedTotal}</strong> expected hours
            </div>
          </div>
          
          ${noVersionsMsg || `
          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle mb-0" data-effort-table="${m.id}">
              <thead>
                <tr>
                  <th rowspan="2" class="align-middle" style="min-width:150px">Version / Modality</th>
                  <th colspan="2" class="text-center">Classroom &amp; Demonstrations</th>
                  <th colspan="2" class="text-center">Mentoring &amp; Small-group</th>
                  <th colspan="3" class="text-center">Other Contact (specify)</th>
                  <th rowspan="2" class="text-center align-middle" style="min-width:80px">Directed<br>E-learning</th>
                  <th rowspan="2" class="text-center align-middle" style="min-width:80px">Independent<br>Learning</th>
                  <th colspan="2" class="text-center">Other Hours (specify)</th>
                  <th rowspan="2" class="text-center align-middle" style="min-width:80px">Work-based<br>Learning</th>
                  <th rowspan="2" class="text-center align-middle" style="min-width:70px">Total<br>Effort</th>
                </tr>
                <tr>
                  <th class="text-center small">Hours</th>
                  <th class="text-center small">Min Ratio</th>
                  <th class="text-center small">Hours</th>
                  <th class="text-center small">Min Ratio</th>
                  <th class="text-center small">Hours</th>
                  <th class="text-center small">Ratio</th>
                  <th class="text-center small">Type</th>
                  <th class="text-center small">Hours</th>
                  <th class="text-center small">Type</th>
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
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">Effort Hours by Version / Modality</h5>
        <p class="small text-secondary mb-3">
          Define how student learning effort is distributed across different activity types for each programme version and delivery modality.
          This helps demonstrate the workload balance and staffing requirements (teacher/learner ratios).
        </p>
        ${modulePicker}
        ${modulesForEdit.length ? blocks : `<div class="small text-secondary">Add modules first (Credits & Modules step).</div>`}
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireEffortHoursStep();
}

/**
 * Get total effort hours for a module/version-modality key
 */
function getTotalHours(effortData) {
  const e = effortData || {};
  return Number(e.classroomHours || 0) + Number(e.mentoringHours || 0) + 
         Number(e.otherContactHours || 0) + Number(e.directedElearningHours || 0) + 
         Number(e.independentLearningHours || 0) + Number(e.otherHours || 0) + 
         Number(e.workBasedHours || 0);
}

/**
 * Wire Effort Hours step event handlers
 */
function wireEffortHoursStep() {
  const p = state.programme;

  const picker = document.getElementById("modulePicker");
  if (picker) {
    picker.onchange = () => {
      state.selectedModuleId = picker.value;
      window.render?.();
    };
  }

  document.querySelectorAll("[data-version-modality]").forEach(row => {
    const vmKey = row.getAttribute("data-version-modality");
    const moduleId = row.getAttribute("data-module-id");
    const m = p.modules.find(x => x.id === moduleId);
    if (!m) return;

    row.querySelectorAll("input[data-effort-field]").forEach(inp => {
      inp.addEventListener("input", (e) => {
        const field = inp.getAttribute("data-effort-field");
        m.effortHours = m.effortHours || {};
        m.effortHours[vmKey] = m.effortHours[vmKey] || {};

        // Handle number vs text fields
        if (field.includes("Hours")) {
          m.effortHours[vmKey][field] = Number(e.target.value) || 0;
        } else {
          m.effortHours[vmKey][field] = e.target.value;
        }

        saveDebounced();

        // Update total display
        const total = getTotalHours(m.effortHours[vmKey]);
        const expected = Number(m.credits || 0) * 25;
        const badge = row.querySelector("[data-total-display]");
        if (badge) {
          badge.textContent = total;
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
