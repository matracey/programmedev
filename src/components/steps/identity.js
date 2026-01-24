/**
 * Identity step component
 */

import { state, saveDebounced, SCHOOL_OPTIONS, AWARD_TYPE_OPTIONS, getAwardStandards, getAwardStandard } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';

// Cache award standards for quick selector rendering
let standardsCache = [];
let standardsLoaded = false;

/**
 * Render the Identity step
 */
export function renderIdentityStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;
  
  const devModeToggleHtml = getDevModeToggleHtml();
  
  const schoolOpts = SCHOOL_OPTIONS.map(s => 
    `<option value="${escapeHtml(s)}" ${p.school === s ? "selected" : ""}>${escapeHtml(s)}</option>`
  ).join("");
  
  const awardOpts = AWARD_TYPE_OPTIONS.map(a => {
    if (a === "Other") return `<option value="Other" ${p.awardTypeIsOther ? "selected" : ""}>Other (type below)</option>`;
    return `<option value="${escapeHtml(a)}" ${(!p.awardTypeIsOther && p.awardType === a) ? "selected" : ""}>${escapeHtml(a)}</option>`;
  }).join("");

  // Lazy-load standards once, then re-render to show options
  if (!standardsLoaded) {
    standardsLoaded = true;
    getAwardStandards().then(list => {
      standardsCache = Array.isArray(list) ? list : [];
      renderIdentityStep();
    }).catch(() => {
      standardsCache = [];
    });
  }

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">Identity (QQI-critical)</h5>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label fw-semibold">Programme title</label>
            <input class="form-control" id="titleInput" value="${escapeHtml(p.title)}">
          </div>
          <div class="col-md-6">
            <label class="form-label fw-semibold">Award type</label>
            <select class="form-select" id="awardSelect">
              <option value="" disabled ${(!p.awardType && !p.awardTypeIsOther) ? "selected" : ""}>Select an award type</option>
              ${awardOpts}
            </select>
            <div class="mt-2" id="awardOtherWrap" style="display:${p.awardTypeIsOther ? "block" : "none"}">
              <input class="form-control" id="awardOtherInput" value="${escapeHtml(p.awardTypeIsOther ? p.awardType : "")}" placeholder="Type the award type">
            </div>
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold">NFQ level</label>
            <input type="number" min="6" max="9" step="1" class="form-control" id="levelInput" value="${p.nfqLevel ?? ""}">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold">Total credits (ECTS)</label>
            <input type="number" min="1" step="1" class="form-control" id="totalCreditsInput" value="${p.totalCredits ?? ""}" placeholder="e.g., 180 / 240">
          </div>
          <div class="col-md-4">
            <label class="form-label fw-semibold">School / Discipline</label>
            <select class="form-select" id="schoolSelect">
              <option value="" disabled ${!p.school ? "selected" : ""}>Select a School</option>
              ${schoolOpts}
            </select>
          </div>
          <div class="col-md-12">
            <label class="form-label fw-semibold">QQI award standard</label>
            <div id="standardSelectorsContainer"></div>
            <div class="form-text">Select up to two standards. These drive PLO mapping and autocompletion.</div>
          </div>
          <div class="col-12">
            <label class="form-label fw-semibold">Intake months</label>
            <input class="form-control" id="intakeInput" value="${escapeHtml((p.intakeMonths || []).join(", "))}" placeholder="Comma-separated, e.g., Sep, Jan">
          </div>
        </div>
      </div>
    </div>
  `;
  
  wireDevModeToggle(() => window.render?.());
  wireIdentityStep();
}

/**
 * Wire Identity step event handlers
 */
export function wireIdentityStep(onUpdate) {
  const p = state.programme;
  const doUpdate = () => {
    window.render?.(); // Update immediately to show changed value
    saveDebounced(() => {
      window.render?.(); // Update again after save to show save status
      onUpdate?.();
    });
  };
  
  const titleInput = document.getElementById("titleInput");
  if (titleInput) {
    titleInput.addEventListener("input", (e) => {
      p.title = e.target.value;
      doUpdate();
    });
  }
  
  const awardSelect = document.getElementById("awardSelect");
  const awardOtherWrap = document.getElementById("awardOtherWrap");
  const awardOtherInput = document.getElementById("awardOtherInput");
  
  if (awardSelect) {
    awardSelect.addEventListener("change", (e) => {
      if (e.target.value === "Other") {
        p.awardTypeIsOther = true;
        p.awardType = awardOtherInput?.value || "";
        if (awardOtherWrap) awardOtherWrap.style.display = "block";
      } else {
        p.awardTypeIsOther = false;
        p.awardType = e.target.value;
        if (awardOtherWrap) awardOtherWrap.style.display = "none";
      }
      doUpdate();
    });
  }
  
  if (awardOtherInput) {
    awardOtherInput.addEventListener("input", (e) => {
      if (p.awardTypeIsOther) {
        p.awardType = e.target.value;
        doUpdate();
      }
    });
  }
  
  const levelInput = document.getElementById("levelInput");
  if (levelInput) {
    levelInput.addEventListener("input", (e) => {
      p.nfqLevel = e.target.value ? Number(e.target.value) : null;
      doUpdate();
    });
  }
  
  const totalCreditsInput = document.getElementById("totalCreditsInput");
  if (totalCreditsInput) {
    totalCreditsInput.addEventListener("input", (e) => {
      p.totalCredits = Number(e.target.value || 0);
      doUpdate();
    });
  }
  
  const schoolSelect = document.getElementById("schoolSelect");
  if (schoolSelect) {
    schoolSelect.addEventListener("change", (e) => {
      p.school = e.target.value;
      doUpdate();
    });
  }
  
  // Ensure arrays exist for standards
  if (!Array.isArray(p.awardStandardIds)) p.awardStandardIds = [];
  if (!Array.isArray(p.awardStandardNames)) p.awardStandardNames = [];

  const standardsContainer = document.getElementById("standardSelectorsContainer");
  if (standardsContainer) {
    const renderStandardSelectors = () => {
      const numSelectors = Math.min((p.awardStandardIds.length || 0) + 1, 2);
      let html = "";

      for (let i = 0; i < numSelectors; i++) {
        const selectedId = p.awardStandardIds[i] || "";
        const canRemove = i > 0 || p.awardStandardIds.length > 1;

        const optionList = (standardsCache || []).map(s => {
          const id = s?.standard_id || "";
          const name = s?.standard_name || s?.standardName || id;
          return `<option value="${escapeHtml(id)}" ${selectedId === id ? "selected" : ""}>${escapeHtml(name)}</option>`;
        }).join("") || `<option value="qqi-computing-l6-9" ${selectedId === "qqi-computing-l6-9" ? "selected" : ""}>Computing (Levels 6-9)</option>`;

        html += `
          <div class="d-flex gap-2 mb-2 align-items-start">
            <select class="form-select standard-selector" data-index="${i}">
              <option value="" ${!selectedId ? "selected" : ""}>Select a standard${i > 0 ? " (optional)" : ""}</option>
              ${optionList}
            </select>
            ${canRemove && selectedId ? `<button type="button" class="btn btn-outline-danger remove-standard" data-index="${i}">Remove</button>` : ""}
          </div>
        `;
      }

      standardsContainer.innerHTML = html;

      standardsContainer.querySelectorAll('.standard-selector').forEach(sel => {
        sel.addEventListener('change', async (e) => {
          const index = Number(e.target.getAttribute('data-index')) || 0;
          const newValue = e.target.value;

          if (newValue) {
            p.awardStandardIds[index] = newValue;
            try {
              const s = await getAwardStandard(newValue);
              p.awardStandardNames[index] = s?.standard_name || s?.standardName || "QQI Award Standard";
            } catch (err) {
              console.warn('Failed to load standard', err);
              p.awardStandardNames[index] = "QQI Award Standard";
            }
          } else {
            p.awardStandardIds.splice(index, 1);
            p.awardStandardNames.splice(index, 1);
          }

          p.awardStandardIds = p.awardStandardIds.filter(Boolean);
          p.awardStandardNames = p.awardStandardNames.filter(Boolean);

          doUpdate();
          renderStandardSelectors();
        });
      });

      standardsContainer.querySelectorAll('.remove-standard').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = Number(e.target.getAttribute('data-index')) || 0;
          p.awardStandardIds.splice(index, 1);
          p.awardStandardNames.splice(index, 1);
          doUpdate();
          renderStandardSelectors();
        });
      });
    };

    renderStandardSelectors();
  }
  
  const intakeInput = document.getElementById("intakeInput");
  if (intakeInput) {
    intakeInput.addEventListener("input", (e) => {
      p.intakeMonths = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      doUpdate();
    });
  }
}
