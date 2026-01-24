/**
 * Snapshot step component (QQI export view with Word export)
 * Full QQI-compatible snapshot with programme summary, versions, PLO matrix
 */

import { state } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { ploText, mimloText } from '../../utils/helpers.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { accordionControlsHtml, wireAccordionControls, captureOpenCollapseIds } from './shared.js';
import { exportProgrammeToWord } from '../../export/word.js';
import { completionPercent } from '../../utils/validation.js';

/**
 * Default delivery pattern for a modality
 */
function defaultPatternFor(mod) {
  if (mod === "F2F") return { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 };
  if (mod === "ONLINE") return { syncOnlinePct: 60, asyncDirectedPct: 40, onCampusPct: 0 };
  return { syncOnlinePct: 30, asyncDirectedPct: 20, onCampusPct: 50 }; // BLENDED
}

/**
 * Sum credits for a stage's modules
 */
function sumStageCredits(allModules, stageModules) {
  const moduleIds = (stageModules || []).map(x => x.moduleId);
  return allModules
    .filter(m => moduleIds.includes(m.id))
    .reduce((sum, m) => sum + Number(m.credits || 0), 0);
}

/**
 * Render the Snapshot step
 */
export function renderSnapshotStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const versions = Array.isArray(p.versions) ? p.versions : [];
  const isComplete100 = completionPercent(p) === 100;
  const openCollapseIds = captureOpenCollapseIds('snapshotAccordion');

  // Build module labels for matrix
  const moduleLabels = (p.modules || []).map((m, i) => {
    const label = (m.code && m.code.trim()) ? m.code.trim() : `M${i + 1}`;
    const full = (m.code && m.code.trim()) ? `${m.code.trim()} — ${m.title}` : m.title;
    return { id: m.id, label, full, credits: Number(m.credits || 0) };
  });

  // PLO ↔ Module Matrix
  const matrixHeader = moduleLabels.map(m => 
    `<th class="text-center" title="${escapeHtml(m.full)}">${escapeHtml(m.label)}</th>`
  ).join("");
  
  const matrixRows = (p.plos || []).map((o, i) => {
    const selected = p.ploToModules?.[o.id] || [];
    const cells = moduleLabels.map(m => {
      const on = selected.includes(m.id);
      return `<td class="text-center">${on ? "✓" : ""}</td>`;
    }).join("");
    return `<tr><th class="small" style="min-width:260px" title="${escapeHtml(o.text || "")}">PLO ${i + 1}</th>${cells}</tr>`;
  }).join("");

  const matrixTable = `
    <div class="mt-4">
      <div class="fw-semibold mb-2">PLO ↔ Module Mapping Matrix</div>
      <div class="table-responsive">
        <table class="table table-sm table-bordered align-middle mb-0">
          <thead><tr><th style="min-width:260px">PLO</th>${matrixHeader}</tr></thead>
          <tbody>${matrixRows || `<tr><td colspan="${moduleLabels.length + 1}" class="text-secondary">Add PLOs and map them to modules to generate a matrix.</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;

  // Build version cards
  const versionItems = versions.map((v, idx) => {
    const mods = Array.isArray(v.deliveryModalities) ? v.deliveryModalities : (v.deliveryModality ? [v.deliveryModality] : []);
    const patterns = v.deliveryPatterns || {};
    const modLines = mods.map(mod => {
      const pat = patterns[mod] || defaultPatternFor(mod);
      return `<div class="small"><span class="fw-semibold">${escapeHtml(mod)}</span>: ${Number(pat.syncOnlinePct || 0)}% sync online, ${Number(pat.asyncDirectedPct || 0)}% async directed, ${Number(pat.onCampusPct || 0)}% on-campus</div>`;
    }).join("");

    const stages = (v.stages || []).slice().sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
    const stageLines = stages.map(s => {
      const stageMods = (s.modules || []).map(x => x.moduleId);
      const modNames = (p.modules || []).filter(m => stageMods.includes(m.id)).map(m => (m.code && m.code.trim()) ? m.code.trim() : m.title).join(", ");
      const creditsSum = sumStageCredits(p.modules || [], s.modules || []);
      const exitTxt = (s.exitAward && s.exitAward.enabled) ? ` • Exit award: ${escapeHtml(s.exitAward.awardTitle || "")}` : "";
      return `<li class="small"><span class="fw-semibold">${escapeHtml(s.name || "Stage")}</span> — target ${Number(s.creditsTarget || 0)}cr (assigned ${creditsSum}cr)${exitTxt}<br><span class="text-secondary">${escapeHtml(modNames || "No modules assigned")}</span></li>`;
    }).join("");

    const headingId = `snap_${v.id}_heading`;
    const collapseId = `snap_${v.id}_collapse`;
    const isActive = openCollapseIds.has(collapseId) ? true : (openCollapseIds.size === 0 && idx === 0);
    const summary = `${escapeHtml(v.label || v.code || "Version")} • ${escapeHtml(v.duration || "—")} • Intakes: ${escapeHtml((v.intakes || []).join(", ") || "—")}`;
    return `
      <div class="accordion-item bg-body">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}">
            <div>
              <div class="fw-semibold">Version ${idx + 1}</div>
              <div class="small text-secondary">${summary}</div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? 'show' : ''}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <div class="small"><span class="fw-semibold">Cohort:</span> ${Number(v.targetCohortSize || 0) || "—"} • <span class="fw-semibold">Groups:</span> ${Number(v.numberOfGroups || 0) || "—"}</div>
              </div>
              <div class="small">
                <span class="fw-semibold">Online proctored exams:</span> ${escapeHtml(v.onlineProctoredExams || "TBC")}
              </div>
            </div>

            <div class="mt-2">
              <div class="fw-semibold small mb-1">Delivery patterns</div>
              ${modLines || `<div class="small text-secondary">—</div>`}
            </div>

            <div class="mt-3">
              <div class="fw-semibold small mb-1">Stage structure</div>
              ${stageLines ? `<ul class="mb-0 ps-3">${stageLines}</ul>` : `<div class="small text-secondary">—</div>`}
            </div>

            ${(v.onlineProctoredExams || "TBC") === "YES" && (v.onlineProctoredExamsNotes || "").trim()
              ? `<div class="mt-2 small"><span class="fw-semibold">Proctoring notes:</span> ${escapeHtml(v.onlineProctoredExamsNotes)}</div>`
              : ""}

            ${(v.deliveryNotes || "").trim()
              ? `<div class="mt-2 small"><span class="fw-semibold">Delivery notes:</span> ${escapeHtml(v.deliveryNotes)}</div>`
              : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <h5 class="card-title mb-3">QQI Snapshot (copy/paste-ready)</h5>

        ${isComplete100 
          ? `<div class="d-flex gap-2 mb-3">
              <button id="exportWordBtn" class="btn btn-success btn-sm">Export Programme Descriptor (Word)</button>
              <span class="small text-secondary align-self-center">Generates a .docx using the template in assets.</span>
            </div>` 
          : `<div class="small text-secondary mb-3">Complete all sections to enable Word export (100%).</div>`}

        <div class="mt-3 p-3 bg-light border rounded-4">
          <div class="fw-semibold mb-2">Programme summary</div>
          <div class="small"><span class="fw-semibold">Title:</span> ${escapeHtml(p.title || "—")}</div>
          <div class="small"><span class="fw-semibold">Award:</span> ${escapeHtml(p.awardType || "—")}</div>
          <div class="small"><span class="fw-semibold">NFQ level:</span> ${escapeHtml(p.nfqLevel ?? "—")}</div>
          <div class="small"><span class="fw-semibold">School:</span> ${escapeHtml(p.school || "—")}</div>

          <div class="mt-3">
            <div class="fw-semibold mb-2">Modules</div>
            ${(p.modules || []).length ? `
              <ul class="small mb-0 ps-3">
                ${(p.modules || []).map(m => `<li>${escapeHtml(m.code ? `${m.code} — ` : "")}${escapeHtml(m.title)} (${Number(m.credits || 0)} cr)</li>`).join("")}
              </ul>
            ` : `<div class="small text-secondary">—</div>`}
          </div>
        </div>

        <div class="mt-3 p-3 bg-light border rounded-4">
          <div class="fw-semibold mb-2">Programme Learning Outcomes (PLOs)</div>
          ${(p.plos || []).length ? `
            <ol class="small mb-0 ps-3">
              ${(p.plos || []).map(o => `<li>${escapeHtml(o.text || "—")}</li>`).join("")}
            </ol>
          ` : `<div class="small text-secondary">—</div>`}
        </div>

        <div class="mt-3">
          <div class="fw-semibold mb-2">Programme versions</div>
          ${accordionControlsHtml('snapshotAccordion')}
          ${(versions.length) ? `<div class="accordion" id="snapshotAccordion">${versionItems}</div>` : `<div class="alert alert-warning mb-0">No versions added yet.</div>`}
        </div>

        ${matrixTable}

        <div class="mt-4 d-flex flex-wrap gap-2">
          <button class="btn btn-outline-secondary" id="copyJsonBtn">Copy JSON to clipboard</button>
          <button class="btn btn-dark" id="downloadJsonBtn">Download JSON</button>
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('snapshotAccordion');
  wireSnapshotStep();
}

/**
 * Wire Snapshot step event handlers
 */
function wireSnapshotStep() {
  // Copy JSON to clipboard
  const copyJsonBtn = document.getElementById("copyJsonBtn");
  if (copyJsonBtn) {
    copyJsonBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(state.programme, null, 2));
        // Brief visual feedback
        const originalText = copyJsonBtn.textContent;
        copyJsonBtn.textContent = "Copied!";
        copyJsonBtn.classList.add("btn-success");
        copyJsonBtn.classList.remove("btn-outline-secondary");
        setTimeout(() => {
          copyJsonBtn.textContent = originalText;
          copyJsonBtn.classList.remove("btn-success");
          copyJsonBtn.classList.add("btn-outline-secondary");
        }, 1500);
      } catch (err) {
        console.error("Copy failed:", err);
        alert("Failed to copy to clipboard.");
      }
    };
  }

  // Download JSON
  const downloadJsonBtn = document.getElementById("downloadJsonBtn");
  if (downloadJsonBtn) {
    downloadJsonBtn.onclick = () => {
      const filename = (state.programme.title || "programme").replace(/[^a-z0-9]/gi, "_") + "-design.json";
      const blob = new Blob([JSON.stringify(state.programme, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  // Word export
  const exportWordBtn = document.getElementById("exportWordBtn");
  if (exportWordBtn) {
    exportWordBtn.onclick = async () => {
      try {
        await exportProgrammeToWord(state.programme);
      } catch (err) {
        console.error("Word export error:", err);
        alert(err?.message || String(err));
      }
    };
  }
}
