/**
 * Outcomes (PLOs) step component
 */

import { state, saveDebounced, getAwardStandard, getAwardStandards } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { uid } from '../../utils/uid.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { lintLearningOutcome } from '../../lib/lo-lint.js';
import { bloomsGuidanceHtml, accordionControlsHtml, wireAccordionControls } from './shared.js';

// Track selected standard per PLO for multi-standard support
const ploSelectedStandards = {};

/**
 * Render the Outcomes step
 */
export function renderOutcomesStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const hasMultipleStandards = (p.awardStandardIds || []).length > 1;

  const rows = (p.plos || []).map((o, idx) => {
    // Group mappings by standardId for display when multiple standards
    const mappingsByStandard = {};
    (o.standardMappings || []).forEach((m, i) => {
      const stdId = m.standardId || (p.awardStandardIds || [])[0] || 'default';
      if (!mappingsByStandard[stdId]) mappingsByStandard[stdId] = [];
      mappingsByStandard[stdId].push({ ...m, index: i });
    });

    // Build mapping badges - group by standard when multiple
    let mappingsHtml = '';
    if (hasMultipleStandards) {
      const stdIds = Object.keys(mappingsByStandard);
      if (stdIds.length === 0) {
        mappingsHtml = '<div class="small text-secondary">No mappings yet for this PLO.</div>';
      } else {
        mappingsHtml = stdIds.map(stdId => {
          const stdIdx = (p.awardStandardIds || []).indexOf(stdId);
          const stdName = (p.awardStandardNames || [])[stdIdx] || stdId;
          const badges = mappingsByStandard[stdId].map(m => `
            <span class="badge text-bg-light border me-2 mb-2">
              ${escapeHtml(m.criteria)} / ${escapeHtml(m.thread)}
              <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2" data-remove-plo-map="${o.id}" data-remove-plo-map-index="${m.index}" title="Remove">×</button>
            </span>
          `).join("");
          return `
            <div class="mb-2">
              <div class="small fw-semibold text-primary mb-1">${escapeHtml(stdName)}</div>
              <div>${badges}</div>
            </div>
          `;
        }).join("");
      }
    } else {
      const mappings = (o.standardMappings || []).map((m, i) => `
        <span class="badge text-bg-light border me-2 mb-2">
          ${escapeHtml(m.criteria)} / ${escapeHtml(m.thread)}
          <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2" data-remove-plo-map="${o.id}" data-remove-plo-map-index="${i}" title="Remove">×</button>
        </span>
      `).join("");
      mappingsHtml = mappings || '<div class="small text-secondary">No mappings yet for this PLO.</div>';
    }

    const lintResult = lintLearningOutcome(o.text || "");
    const lintWarnings = lintResult.issues.filter(i => i.severity === 'warn').map(issue => `
      <div class="alert alert-warning py-1 px-2 mb-1 small">
        <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
        ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map(s => escapeHtml(s)).join(", ")}</em>` : ""}
      </div>
    `).join("");

    const preview = (o.text || "").trim();
    const previewShort = preview.length > 120 ? `${preview.slice(0, 120)}…` : (preview || "No text yet");
    const headingId = `plo_${o.id}_heading`;
    const collapseId = `plo_${o.id}_collapse`;
    const isActive = (state.expandPloId && state.expandPloId === o.id) ? true : (idx === 0);

    // Standard selector dropdown for multi-standard support
    const standardSelectorHtml = hasMultipleStandards ? `
      <div class="mb-2">
        <label class="form-label small mb-1">Select standard to map to</label>
        <select class="form-select form-select-sm" data-plo-standard-selector="${o.id}">
          ${(p.awardStandardIds || []).map((stdId, i) => {
            const stdName = (p.awardStandardNames || [])[i] || stdId;
            const selected = (ploSelectedStandards[o.id] || (p.awardStandardIds || [])[0]) === stdId;
            return `<option value="${escapeHtml(stdId)}" ${selected ? 'selected' : ''}>${escapeHtml(stdName)}</option>`;
          }).join("")}
        </select>
      </div>
    ` : '';

    return `
      <div class="accordion-item bg-body">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? "" : "collapsed"} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}">
            <div class="d-flex w-100 align-items-center gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">PLO ${idx + 1}</div>
                <div class="small text-secondary">${escapeHtml(previewShort)}</div>
              </div>
              <div class="header-actions d-flex align-items-center gap-2 me-2">
                <span class="btn btn-outline-danger btn-sm" data-remove-plo="${o.id}" role="button">Remove</span>
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <textarea class="form-control" data-plo-id="${o.id}" rows="3" placeholder="e.g., Analyse… / Design and implement…">${escapeHtml(o.text || "")}</textarea>
            <div class="plo-lint-warnings mt-2">${lintWarnings}</div>

            <div class="mt-3">
              <div class="fw-semibold small mb-2">Map this PLO to QQI award standards</div>
              ${!(p.awardStandardIds && p.awardStandardIds.length) ? `
                <div class="small text-danger">Select a QQI award standard in Identity to enable mapping.</div>
              ` : `
                ${standardSelectorHtml}
                <div class="d-flex flex-wrap gap-2 align-items-end">
                  <div style="min-width:220px">
                    <label class="form-label small mb-1">Criteria</label>
                    <select class="form-select form-select-sm" data-plo-map-criteria="${o.id}"></select>
                  </div>
                  <div style="min-width:260px">
                    <label class="form-label small mb-1">Thread</label>
                    <select class="form-select form-select-sm" data-plo-map-thread="${o.id}"></select>
                  </div>
                  <button type="button" class="btn btn-outline-primary btn-sm" data-add-plo-map="${o.id}">Add mapping</button>
                </div>
                <div class="small text-secondary mt-2" data-plo-map-desc="${o.id}"></div>
                <div class="mt-2" data-plo-map-list="${o.id}">
                  ${mappingsHtml}
                </div>
              `}
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
          <h5 class="card-title mb-0">Programme Learning Outcomes (PLOs) (QQI-critical)</h5>
          <button class="btn btn-dark btn-sm" id="addPloBtn">+ Add PLO</button>
        </div>
        ${bloomsGuidanceHtml(p.nfqLevel, "Programme Learning Outcomes")}
        <div class="small-muted mb-3">Aim for ~6–12 clear, assessable outcomes. Keep them measurable and assessable.</div>
        ${accordionControlsHtml('ploAccordion')}
        <div class="accordion" id="ploAccordion">
          ${rows || `<div class="alert alert-info mb-0">No PLOs added yet.</div>`}
        </div>
        <hr class="my-4"/>
        <h6 class="mb-2">PLO ↔ Award Standard Mapping Snapshot</h6>
        <div id="ploMappingSnapshot" class="small"></div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('ploAccordion');
  wireOutcomesStep();
}

/**
 * Populate PLO mapping controls for a specific PLO based on selected standard
 */
async function populatePloMappingControls(ploId) {
  const p = state.programme;
  const selectedStandardId = ploSelectedStandards[ploId] || (p.awardStandardIds || [])[0];
  if (!selectedStandardId) return;

  const critSel = document.querySelector(`[data-plo-map-criteria="${ploId}"]`);
  const threadSel = document.querySelector(`[data-plo-map-thread="${ploId}"]`);
  const descEl = document.querySelector(`[data-plo-map-desc="${ploId}"]`);
  if (!critSel || !threadSel) return;

  try {
    const std = await getAwardStandard(selectedStandardId);
    const level = String(p.nfqLevel || "");
    const criteriaList = Object.keys(std.index || {}).sort((a, b) => a.localeCompare(b));

    function setOptions(el, opts, placeholder = "Select...") {
      el.innerHTML = "";
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = placeholder;
      el.appendChild(ph);
      opts.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o;
        el.appendChild(opt);
      });
    }

    function updateDesc() {
      const c = critSel.value;
      const t = threadSel.value;
      const d = (((std.index || {})[c] || {})[t] || {})[level] || "";
      if (descEl) descEl.textContent = d ? d : (c && t ? "No descriptor found for this level." : "");
    }

    setOptions(critSel, criteriaList, "Select criteria...");
    setOptions(threadSel, [], "Select thread...");

    // Remove old listeners by cloning
    const newCritSel = critSel.cloneNode(true);
    critSel.parentNode.replaceChild(newCritSel, critSel);
    
    const newThreadSel = threadSel.cloneNode(true);
    threadSel.parentNode.replaceChild(newThreadSel, threadSel);

    newCritSel.addEventListener("change", () => {
      const threads = Object.keys((std.index || {})[newCritSel.value] || {}).sort((a, b) => a.localeCompare(b));
      setOptions(newThreadSel, threads, "Select thread...");
      updateDesc();
    });

    newThreadSel.addEventListener("change", updateDesc);
  } catch (err) {
    console.warn("Failed to populate mapping controls:", err);
  }
}

/**
 * Wire Outcomes step event handlers
 */
function wireOutcomesStep() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';

  // Ensure each PLO has a mapping array
  p.plos = (p.plos || []).map(o => ({ ...o, standardMappings: Array.isArray(o.standardMappings) ? o.standardMappings : [] }));

  document.getElementById("addPloBtn").onclick = () => {
    const newId = uid("plo");
    p.plos.push({ id: newId, text: "", standardMappings: [] });
    state.expandPloId = newId;
    saveDebounced();
    window.render?.();
  };

  document.querySelectorAll("[data-remove-plo]").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-remove-plo");
      p.plos = p.plos.filter(o => o.id !== id);
      delete p.ploToModules[id];
      delete ploSelectedStandards[id];
      saveDebounced();
      window.render?.();
    };
  });

  document.querySelectorAll("[data-plo-id]").forEach(area => {
    area.addEventListener("input", (e) => {
      const id = area.getAttribute("data-plo-id");
      const o = p.plos.find(x => x.id === id);
      if (!o) return;
      o.text = e.target.value;
      saveDebounced();

      // Update lint warnings dynamically
      const lintResult = lintLearningOutcome(e.target.value);
      const warningsHtml = lintResult.issues.filter(i => i.severity === 'warn').map(issue => `
        <div class="alert alert-warning py-1 px-2 mb-1 small">
          <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
          ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map(s => escapeHtml(s)).join(", ")}</em>` : ""}
        </div>
      `).join("");

      let lintContainer = area.parentElement.querySelector('.plo-lint-warnings');
      if (!lintContainer) {
        lintContainer = document.createElement('div');
        lintContainer.className = 'plo-lint-warnings mt-2';
        area.insertAdjacentElement('afterend', lintContainer);
      }
      lintContainer.innerHTML = warningsHtml;
    });
  });

  // Standard selector for multi-standard support
  document.querySelectorAll("[data-plo-standard-selector]").forEach(sel => {
    const ploId = sel.getAttribute("data-plo-standard-selector");
    ploSelectedStandards[ploId] = sel.value || (p.awardStandardIds || [])[0];
    
    sel.addEventListener("change", () => {
      ploSelectedStandards[ploId] = sel.value;
      populatePloMappingControls(ploId);
    });
  });

  // Standards mapping UI
  const selectedStandardId = (p.awardStandardIds || [])[0];
  if (!selectedStandardId) return;

  // Initialize mapping controls for each PLO
  (p.plos || []).forEach(o => {
    populatePloMappingControls(o.id);
  });

  // Build snapshot table
  buildMappingSnapshot(p);

  // Wire add mapping buttons
  document.querySelectorAll("[data-add-plo-map]").forEach(btn => {
    btn.onclick = () => {
      const ploId = btn.getAttribute("data-add-plo-map");
      const critSel = document.querySelector(`[data-plo-map-criteria="${ploId}"]`);
      const threadSel = document.querySelector(`[data-plo-map-thread="${ploId}"]`);
      const c = critSel?.value || "";
      const t = threadSel?.value || "";
      if (!c || !t) return alert("Select both Criteria and Thread first.");

      const o = p.plos.find(x => x.id === ploId);
      if (!o) return;

      // Get selected standard for this PLO (for multi-standard support)
      const standardId = ploSelectedStandards[ploId] || (p.awardStandardIds || [])[0];

      // Check for duplicates including standardId
      const exists = (o.standardMappings || []).some(x => 
        x.criteria === c && x.thread === t && (x.standardId || (p.awardStandardIds || [])[0]) === standardId
      );
      if (!exists) {
        o.standardMappings.push({ criteria: c, thread: t, standardId });
        saveDebounced();
        window.render?.();
      } else {
        alert("This mapping already exists for this PLO and standard.");
      }
    };
  });

  document.querySelectorAll("[data-remove-plo-map]").forEach(btn => {
    btn.onclick = () => {
      const ploId = btn.getAttribute("data-remove-plo-map");
      const i = Number(btn.getAttribute("data-remove-plo-map-index"));
      const o = p.plos.find(x => x.id === ploId);
      if (!o) return;
      o.standardMappings = (o.standardMappings || []).filter((_, idx) => idx !== i);
      saveDebounced();
      window.render?.();
    };
  });
}

/**
 * Build the PLO ↔ Standard mapping snapshot table
 */
async function buildMappingSnapshot(p) {
  const snap = document.getElementById("ploMappingSnapshot");
  if (!snap) return;

  const plos = p.plos || [];
  if (!plos.length) {
    snap.innerHTML = `<div class="text-secondary">Add PLOs to see a mapping snapshot.</div>`;
    return;
  }

  // Load all standards
  const standardsMap = new Map();
  for (const stdId of (p.awardStandardIds || [])) {
    try {
      const std = await getAwardStandard(stdId);
      standardsMap.set(stdId, std);
    } catch (err) {
      console.warn(`Failed to load standard ${stdId}:`, err);
    }
  }

  const level = String(p.nfqLevel || "");
  const hasMultipleStandards = (p.awardStandardIds || []).length > 1;

  const rowsHtml = plos.map((o, i) => {
    const maps = (o.standardMappings || []).map(m => {
      const stdId = m.standardId || (p.awardStandardIds || [])[0];
      const std = standardsMap.get(stdId) || { index: {} };
      const desc = (std.index?.[m.criteria]?.[m.thread]?.[level] || "").toString();
      const shortDesc = desc.length > 180 ? (desc.slice(0, 180) + "…") : desc;
      const stdName = hasMultipleStandards ? `<span class="badge text-bg-info me-1">${escapeHtml((p.awardStandardNames || [])[(p.awardStandardIds || []).indexOf(stdId)] || stdId)}</span>` : '';
      return `<li>${stdName}<span class="fw-semibold">${escapeHtml(m.criteria)} / ${escapeHtml(m.thread)}</span><div class="text-secondary">${escapeHtml(shortDesc)}</div></li>`;
    }).join("");
    const mapsBlock = maps ? `<ul class="mb-0 ps-3">${maps}</ul>` : `<span class="text-secondary">No mappings yet</span>`;
    return `<tr><td class="text-nowrap">PLO ${i + 1}</td><td>${escapeHtml(o.text || "")}</td><td>${mapsBlock}</td></tr>`;
  }).join("");

  snap.innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th style="width:90px;">PLO</th>
            <th>PLO Text</th>
            <th>Mapped Standards (at NFQ Level ${escapeHtml(level || "")})</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
}
