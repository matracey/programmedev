/**
 * Outcomes (PLOs) step component
 */

import { state, saveDebounced, getAwardStandard } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { uid } from '../../utils/uid.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { lintLearningOutcome } from '../../lib/lo-lint.js';
import { bloomsGuidanceHtml } from './shared.js';

/**
 * Render the Outcomes step
 */
export function renderOutcomesStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();

  const rows = (p.plos || []).map((o, idx) => {
    const mappings = (o.standardMappings || []).map((m, i) => `
      <span class="badge text-bg-light border me-2 mb-2">
        ${escapeHtml(m.criteria)} / ${escapeHtml(m.thread)}
        <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2" data-remove-plo-map="${o.id}" data-remove-plo-map-index="${i}" title="Remove">×</button>
      </span>
    `).join("");

    const lintResult = lintLearningOutcome(o.text || "");
    const lintWarnings = lintResult.issues.filter(i => i.severity === 'warn').map(issue => `
      <div class="alert alert-warning py-1 px-2 mb-1 small">
        <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
        ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map(s => escapeHtml(s)).join(", ")}</em>` : ""}
      </div>
    `).join("");

    return `
      <div class="card border-0 bg-white shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="fw-semibold">PLO ${idx + 1}</div>
            <button class="btn btn-outline-danger btn-sm" data-remove-plo="${o.id}">Remove</button>
          </div>

          <textarea class="form-control" data-plo-id="${o.id}" rows="3" placeholder="e.g., Analyse… / Design and implement…">${escapeHtml(o.text || "")}</textarea>
          <div class="plo-lint-warnings mt-2">${lintWarnings}</div>

          <div class="mt-3">
            <div class="fw-semibold small mb-2">Map this PLO to QQI award standards</div>
            ${!p.awardStandardId ? `
              <div class="small text-danger">Select a QQI award standard in Identity to enable mapping.</div>
            ` : `
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
                ${mappings || `<div class="small text-secondary">No mappings yet for this PLO.</div>`}
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
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0">Programme Learning Outcomes (PLOs) (QQI-critical)</h5>
          <button class="btn btn-dark btn-sm" id="addPloBtn">+ Add PLO</button>
        </div>
        ${bloomsGuidanceHtml(p.nfqLevel, "Programme Learning Outcomes")}
        <div class="small-muted mb-3">Aim for ~6–12 clear, assessable outcomes. Keep them measurable and assessable.</div>
        ${rows || `<div class="small text-secondary">No PLOs added yet.</div>`}
        <hr class="my-4"/>
        <h6 class="mb-2">PLO ↔ Award Standard Mapping Snapshot</h6>
        <div id="ploMappingSnapshot" class="small"></div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireOutcomesStep();
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
    p.plos.push({ id: uid("plo"), text: "", standardMappings: [] });
    saveDebounced();
    window.render?.();
  };

  document.querySelectorAll("[data-remove-plo]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-remove-plo");
      p.plos = p.plos.filter(o => o.id !== id);
      delete p.ploToModules[id];
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

  // Standards mapping UI
  if (!p.awardStandardId) return;

  getAwardStandard().then(std => {
    const level = String(p.nfqLevel || "");
    const criteriaList = Object.keys(std.index || {}).sort((a, b) => a.localeCompare(b));

    // Snapshot table
    const snap = document.getElementById("ploMappingSnapshot");
    if (snap) {
      const plos = p.plos || [];
      if (!plos.length) {
        snap.innerHTML = `<div class="text-secondary">Add PLOs to see a mapping snapshot.</div>`;
      } else {
        const rowsHtml = plos.map((o, i) => {
          const maps = (o.standardMappings || []).map(m => {
            const desc = (std.index?.[m.criteria]?.[m.thread]?.[level] || "").toString();
            const shortDesc = desc.length > 180 ? (desc.slice(0, 180) + "…") : desc;
            return `<li><span class="fw-semibold">${escapeHtml(m.criteria)} / ${escapeHtml(m.thread)}</span><div class="text-secondary">${escapeHtml(shortDesc)}</div></li>`;
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
    }

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

    document.querySelectorAll("[data-plo-map-criteria]").forEach(sel => {
      const ploId = sel.getAttribute("data-plo-map-criteria");
      const threadSel = document.querySelector(`[data-plo-map-thread="${ploId}"]`);
      const descEl = document.querySelector(`[data-plo-map-desc="${ploId}"]`);

      setOptions(sel, criteriaList, "Select criteria...");
      setOptions(threadSel, [], "Select thread...");

      function updateDesc() {
        const c = sel.value;
        const t = threadSel.value;
        const d = (((std.index || {})[c] || {})[t] || {})[level] || "";
        descEl.textContent = d ? d : (c && t ? "No descriptor found for this level." : "");
      }

      sel.addEventListener("change", () => {
        const threads = Object.keys((std.index || {})[sel.value] || {}).sort((a, b) => a.localeCompare(b));
        setOptions(threadSel, threads, "Select thread...");
        updateDesc();
      });

      threadSel.addEventListener("change", updateDesc);
      updateDesc();
    });

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

        const exists = (o.standardMappings || []).some(x => x.criteria === c && x.thread === t);
        if (!exists) {
          o.standardMappings.push({ criteria: c, thread: t });
          saveDebounced();
          window.render?.();
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

  }).catch(err => {
    console.warn("Standards load failed:", err);
  });
}
