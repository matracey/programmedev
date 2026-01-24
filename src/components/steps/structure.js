/**
 * Structure (Credits & Modules) step component
 */

import { state, saveDebounced } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { uid } from '../../utils/uid.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { accordionControlsHtml, wireAccordionControls, captureOpenCollapseIds } from './shared.js';

/**
 * Render the Structure step
 */
export function renderStructureStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const openCollapseIds = captureOpenCollapseIds('modulesAccordion');

  const moduleRows = (p.modules || []).map((m, idx) => {
    const headingId = `module_${m.id}_heading`;
    const collapseId = `module_${m.id}_collapse`;
    const titlePreview = (m.title || "").trim() || "Module";
    const codePreview = (m.code || "").trim();
    const creditsPreview = Number(m.credits || 0);

    const isActive = openCollapseIds.has(collapseId) ? true : (openCollapseIds.size === 0 && idx === 0);
    return `
      <div class="accordion-item bg-body">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? "" : "collapsed"} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}">
            <div class="d-flex w-100 align-items-center gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">Module ${idx + 1}${codePreview ? `: ${escapeHtml(codePreview)}` : ""}</div>
                <div class="small text-secondary">${escapeHtml(titlePreview)} • ${creditsPreview} cr</div>
              </div>
              <div class="header-actions d-flex align-items-center gap-2 me-2">
                <span class="btn btn-sm btn-outline-danger" data-remove-module="${m.id}" role="button">Remove</span>
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <div class="row g-3">
              <div class="col-md-3">
                <label class="form-label fw-semibold">Code (optional)</label>
                <input class="form-control" data-module-field="code" data-module-id="${m.id}" value="${escapeHtml(m.code || "")}">
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold">Title</label>
                <input class="form-control" data-module-field="title" data-module-id="${m.id}" value="${escapeHtml(m.title || "")}">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Credits</label>
                <input type="number" class="form-control" data-module-field="credits" data-module-id="${m.id}" value="${Number(m.credits || 0)}">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0">Credits & modules (QQI-critical)</h5>
          <button class="btn btn-dark btn-sm" id="addModuleBtn">+ Add module</button>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label fw-semibold">Total programme credits (from Identity)</label>
            <input type="number" class="form-control" id="totalCredits" value="${Number(p.totalCredits || 0)}" disabled>
          </div>
          <div class="col-md-8 d-flex align-items-end">
            <div class="small-muted">Tip: keep the module list light at MVP stage — codes can be placeholders.</div>
          </div>
        </div>

        ${accordionControlsHtml('modulesAccordion')}
        <div class="accordion" id="modulesAccordion">
          ${moduleRows || `<div class="alert alert-info mb-0">No modules added yet.</div>`}
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('modulesAccordion');
  wireStructureStep();
}

/**
 * Wire Structure step event handlers
 */
function wireStructureStep() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';

  document.getElementById("addModuleBtn").onclick = () => {
    p.modules.push({ id: uid("mod"), code: "", title: "New module", credits: 0, mimlos: [], assessments: [] });
    saveDebounced();
    window.render?.();
  };

  document.querySelectorAll("[data-remove-module]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-remove-module");
      p.modules = p.modules.filter(m => m.id !== id);
      // remove from mappings too
      for (const ploId of Object.keys(p.ploToModules || {})) {
        p.ploToModules[ploId] = (p.ploToModules[ploId] || []).filter(mid => mid !== id);
      }
      saveDebounced();
      window.render?.();
    };
  });

  document.querySelectorAll("[data-module-field]").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const id = inp.getAttribute("data-module-id");
      const field = inp.getAttribute("data-module-field");
      const m = p.modules.find(x => x.id === id);
      if (!m) return;
      m[field] = field === "credits" ? Number(e.target.value || 0) : e.target.value;
      saveDebounced();
    });
  });
}
