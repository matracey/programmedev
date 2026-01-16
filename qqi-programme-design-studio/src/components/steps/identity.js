/**
 * Identity step component
 */

import { state, saveDebounced, SCHOOL_OPTIONS, AWARD_TYPE_OPTIONS } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';

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
            <select class="form-select" id="standardSelect">
              <option value="" disabled ${!p.awardStandardId ? "selected" : ""}>Select a standard</option>
              <option value="qqi-computing-l6-9" ${p.awardStandardId === "qqi-computing-l6-9" ? "selected" : ""}>Computing (Levels 6–9)</option>
            </select>
            <div class="form-text">This will drive PLO mapping and autocompletion.</div>
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
    saveDebounced(() => onUpdate?.());
    onUpdate?.();
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
  
  const standardSelect = document.getElementById("standardSelect");
  if (standardSelect) {
    standardSelect.addEventListener("change", (e) => {
      p.awardStandardId = e.target.value;
      doUpdate();
    });
  }
  
  const intakeInput = document.getElementById("intakeInput");
  if (intakeInput) {
    intakeInput.addEventListener("input", (e) => {
      p.intakeMonths = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
      doUpdate();
    });
  }
}
