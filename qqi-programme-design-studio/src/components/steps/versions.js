/**
 * Versions step component
 */

import { state, saveDebounced, getVersionById, defaultVersion } from '../../state/store.js';
import { escapeHtml, tagHtml } from '../../utils/dom.js';
import { defaultPatternFor, sumPattern } from '../../utils/helpers.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';

const MOD_DEFS = [
  { key: "F2F", label: "Face-to-face" },
  { key: "BLENDED", label: "Blended" },
  { key: "ONLINE", label: "Fully online" },
];

/**
 * Render the Versions step
 */
export function renderVersionsStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const versions = Array.isArray(p.versions) ? p.versions : [];

  const vCards = versions.map((v, idx) => {
    const intakeVal = (v.intakes || []).join(", ");
    const isActive = state.selectedVersionId ? (state.selectedVersionId === v.id) : (idx === 0);
    const selectedMod = v.deliveryModality || "";
    
    const modRadios = MOD_DEFS.map(m => `
      <div class="form-check form-check-inline">
        <input class="form-check-input" type="radio" name="vmod_${v.id}" id="vmod_${v.id}_${m.key}" value="${m.key}" ${selectedMod === m.key ? "checked" : ""}>
        <label class="form-check-label" for="vmod_${v.id}_${m.key}">${escapeHtml(m.label)}</label>
      </div>
    `).join("");

    const patternCard = selectedMod ? (() => {
      const pat = (v.deliveryPatterns || {})[selectedMod] || defaultPatternFor(selectedMod);
      return `
        <div class="card mt-2">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between">
              <div class="fw-semibold">${escapeHtml(selectedMod)} delivery pattern (must total 100%)</div>
              <span class="small">${tagHtml(sumPattern(pat) === 100 ? "ok" : "warn")} <span class="text-secondary">${sumPattern(pat)}%</span></span>
            </div>
            <div class="row g-2 mt-2">
              <div class="col-md-4">
                <label class="form-label">Synchronous Online Classes %</label>
                <input type="number" min="0" max="100" class="form-control" id="pat_${v.id}_${selectedMod}_sync" value="${Number(pat.syncOnlinePct || 0)}">
              </div>
              <div class="col-md-4">
                <label class="form-label">Asynchronous Directed Learning %</label>
                <input type="number" min="0" max="100" class="form-control" id="pat_${v.id}_${selectedMod}_async" value="${Number(pat.asyncDirectedPct || 0)}">
              </div>
              <div class="col-md-4">
                <label class="form-label">On Campus Learning Event %</label>
                <input type="number" min="0" max="100" class="form-control" id="pat_${v.id}_${selectedMod}_campus" value="${Number(pat.onCampusPct || 0)}">
              </div>
            </div>
          </div>
        </div>
      `;
    })() : `<div class="small text-secondary mt-2">Select a delivery modality to define delivery patterns.</div>`;

    const proctorYes = (v.onlineProctoredExams || "TBC") === "YES";
    const proctorNotesStyle = proctorYes ? "" : "d-none";

    return `
      <div class="card mb-3">
        <div class="card-header d-flex flex-wrap gap-2 align-items-center justify-content-between">
          <div class="fw-semibold">Version ${idx + 1}: ${escapeHtml(v.label || "(untitled)")}</div>
          <div class="d-flex gap-2 align-items-center">
            <button class="btn btn-sm ${isActive ? "btn-primary" : "btn-outline-primary"}" id="setActive_${v.id}">${isActive ? "Active for stages" : "Set active"}</button>
            <button class="btn btn-sm btn-outline-danger" id="removeVer_${v.id}">Remove</button>
          </div>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold">Version label</label>
              <input class="form-control" id="vlabel_${v.id}" value="${escapeHtml(v.label || "")}">
            </div>
            <div class="col-md-2">
              <label class="form-label fw-semibold">Code</label>
              <input class="form-control" id="vcode_${v.id}" value="${escapeHtml(v.code || "")}">
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold">Duration</label>
              <input class="form-control" id="vduration_${v.id}" value="${escapeHtml(v.duration || "")}" placeholder="e.g., 1 year FT / 2 years PT">
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">Intakes</label>
              <input class="form-control" id="vintakes_${v.id}" value="${escapeHtml(intakeVal)}" placeholder="Comma-separated, e.g., Sep, Jan">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-semibold">Target cohort size</label>
              <input type="number" min="0" class="form-control" id="vcohort_${v.id}" value="${Number(v.targetCohortSize || 0)}">
            </div>
            <div class="col-md-3">
              <label class="form-label fw-semibold">Number of groups</label>
              <input type="number" min="0" class="form-control" id="vgroups_${v.id}" value="${Number(v.numberOfGroups || 0)}">
            </div>
            <div class="col-12">
              <label class="form-label fw-semibold">Delivery modality</label>
              <div>${modRadios}</div>
              ${patternCard}
            </div>
            <div class="col-12">
              <label class="form-label fw-semibold">Delivery notes</label>
              <textarea class="form-control" rows="3" id="vnotes_${v.id}" placeholder="High-level plan: where learning happens, key touchpoints.">${escapeHtml(v.deliveryNotes || "")}</textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold">Online proctored exams?</label>
              <select class="form-select" id="vproctor_${v.id}">
                <option value="TBC" ${(v.onlineProctoredExams || "TBC") === "TBC" ? "selected" : ""}>TBC</option>
                <option value="NO" ${(v.onlineProctoredExams || "TBC") === "NO" ? "selected" : ""}>No</option>
                <option value="YES" ${(v.onlineProctoredExams || "TBC") === "YES" ? "selected" : ""}>Yes</option>
              </select>
            </div>
            <div class="col-12 ${proctorNotesStyle}" id="vproctorNotesWrap_${v.id}">
              <label class="form-label fw-semibold">Proctoring notes</label>
              <textarea class="form-control" rows="2" id="vproctorNotes_${v.id}" placeholder="What is proctored, when, and why?">${escapeHtml(v.onlineProctoredExamsNotes || "")}</textarea>
            </div>
            <div class="col-12">
              <div class="small text-secondary">Stages in this version: <span class="fw-semibold">${(v.stages || []).length}</span> (define in the next step).</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
      <div>
        <h4 class="mb-1">Programme Versions</h4>
        <div class="text-secondary">Create versions (e.g., FT/PT/Online). Each version can have different delivery patterns, capacity, intakes and stage structure.</div>
      </div>
      <button class="btn btn-dark" id="addVersionBtn">+ Add version</button>
    </div>
    <div class="mt-3">
      ${vCards || `<div class="alert alert-info mb-0">No versions yet. Add at least one version to continue.</div>`}
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireVersionsStep();
}

/**
 * Wire Versions step event handlers
 */
function wireVersionsStep() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  if (!Array.isArray(p.versions)) p.versions = [];

  const addBtn = document.getElementById("addVersionBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      const v = defaultVersion();
      p.versions.push(v);
      state.selectedVersionId = v.id;
      saveDebounced();
      window.render?.();
    };
  }

  (p.versions || []).forEach((v) => {
    const byId = (suffix) => document.getElementById(`${suffix}_${v.id}`);

    const setActive = document.getElementById(`setActive_${v.id}`);
    if (setActive) setActive.onclick = () => { state.selectedVersionId = v.id; saveDebounced(); window.render?.(); };

    const removeBtn = document.getElementById(`removeVer_${v.id}`);
    if (removeBtn) removeBtn.onclick = () => {
      p.versions = (p.versions || []).filter(x => x.id !== v.id);
      if (state.selectedVersionId === v.id) state.selectedVersionId = (p.versions[0] && p.versions[0].id) || null;
      saveDebounced();
      window.render?.();
    };

    const label = byId("vlabel");
    if (label) label.oninput = (e) => { v.label = e.target.value; saveDebounced(); };

    const code = byId("vcode");
    if (code) code.oninput = (e) => { v.code = e.target.value; saveDebounced(); };

    const duration = byId("vduration");
    if (duration) duration.oninput = (e) => { v.duration = e.target.value; saveDebounced(); };

    const intakes = byId("vintakes");
    if (intakes) intakes.oninput = (e) => {
      v.intakes = e.target.value.split(",").map(x => x.trim()).filter(Boolean);
      saveDebounced();
    };

    const cohort = byId("vcohort");
    if (cohort) cohort.oninput = (e) => { v.targetCohortSize = Number(e.target.value || 0); saveDebounced(); };

    const groups = byId("vgroups");
    if (groups) groups.oninput = (e) => { v.numberOfGroups = Number(e.target.value || 0); saveDebounced(); };

    const notes = byId("vnotes");
    if (notes) notes.oninput = (e) => { v.deliveryNotes = e.target.value; saveDebounced(); };

    const proctor = byId("vproctor");
    if (proctor) proctor.onchange = (e) => {
      v.onlineProctoredExams = e.target.value;
      saveDebounced();
      window.render?.();
    };

    const proctorNotes = byId("vproctorNotes");
    if (proctorNotes) proctorNotes.oninput = (e) => { v.onlineProctoredExamsNotes = e.target.value; saveDebounced(); };

    // Modality radio buttons & patterns
    const MOD_KEYS = ["F2F", "BLENDED", "ONLINE"];
    if (!v.deliveryPatterns || typeof v.deliveryPatterns !== "object") v.deliveryPatterns = {};

    MOD_KEYS.forEach((mod) => {
      const radio = document.getElementById(`vmod_${v.id}_${mod}`);
      if (!radio) return;
      radio.onchange = (e) => {
        if (e.target.checked) {
          v.deliveryModality = mod;
          if (!v.deliveryPatterns[mod]) v.deliveryPatterns[mod] = defaultPatternFor(mod);
          saveDebounced();
          window.render?.();
        }
      };
    });

    const selectedMod = v.deliveryModality;
    if (selectedMod) {
      if (!v.deliveryPatterns[selectedMod]) v.deliveryPatterns[selectedMod] = defaultPatternFor(selectedMod);

      const sync = document.getElementById(`pat_${v.id}_${selectedMod}_sync`);
      const async = document.getElementById(`pat_${v.id}_${selectedMod}_async`);
      const campus = document.getElementById(`pat_${v.id}_${selectedMod}_campus`);

      const update = () => {
        const pat = v.deliveryPatterns[selectedMod] || defaultPatternFor(selectedMod);
        pat.syncOnlinePct = Number(sync ? sync.value : pat.syncOnlinePct || 0);
        pat.asyncDirectedPct = Number(async ? async.value : pat.asyncDirectedPct || 0);
        pat.onCampusPct = Number(campus ? campus.value : pat.onCampusPct || 0);
        v.deliveryPatterns[selectedMod] = pat;
        saveDebounced();
      };

      if (sync) sync.oninput = update;
      if (async) async.oninput = update;
      if (campus) campus.oninput = update;
    }
  });
}
