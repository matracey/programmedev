// @ts-check
/**
 * Programme Learning Outcomes (PLOs) step component.
 * Allows users to define, edit, and map PLOs to QQI award standards.
 * @module components/steps/outcomes
 */

import { lintLearningOutcome } from "../../lib/lo-lint.js";
import {
  getAwardStandard,
  getCriteriaList,
  getDescriptor,
  getThreadList,
  saveDebounced,
  state,
} from "../../state/store.js";
import { escapeHtml } from "../../utils/dom.js";
import { uid } from "../../utils/uid.js";
import { getDevModeToggleHtml, wireDevModeToggle } from "../dev-mode.js";
import {
  accordionControlsHtml,
  bloomsGuidanceHtml,
  captureOpenCollapseIds,
  wireAccordionControls,
} from "./shared.js";

// Track selected standard per PLO for multi-standard support
/** @type {Record<string, string>} */
const ploSelectedStandards = {};

/**
 * Renders the Programme Learning Outcomes step UI.
 * Displays a list of PLOs with text editing, linting, and standard mapping.
 */
export function renderOutcomesStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Capture currently expanded PLO accordions before re-render
  const openCollapseIds = captureOpenCollapseIds("ploAccordion");

  const devModeToggleHtml = getDevModeToggleHtml();
  const hasMultipleStandards = (p.awardStandardIds ?? []).length > 1;

  const rows = (p.plos ?? [])
    .map((o, idx) => {
      // Group mappings by standardId for display when multiple standards
      /** @type {Record<string, any[]>} */
      const mappingsByStandard = {};
      (o.standardMappings ?? []).forEach((/** @type {any} */ m, /** @type {number} */ i) => {
        const stdId = m.standardId ?? (p.awardStandardIds ?? [])[0] ?? "default";
        if (!mappingsByStandard[stdId]) {
          mappingsByStandard[stdId] = [];
        }
        mappingsByStandard[stdId].push({ ...m, index: i });
      });

      // Build mapping badges - group by standard when multiple
      let mappingsHtml = "";
      if (hasMultipleStandards) {
        const stdIds = Object.keys(mappingsByStandard);
        if (stdIds.length === 0) {
          mappingsHtml = '<div class="small text-secondary">No mappings yet for this PLO.</div>';
        } else {
          mappingsHtml = stdIds
            .map((stdId) => {
              const stdIdx = (p.awardStandardIds ?? []).indexOf(stdId);
              const stdName = (p.awardStandardNames ?? [])[stdIdx] ?? stdId;
              const badges = mappingsByStandard[stdId]
                .map(
                  (m) => `
            <span class="badge text-bg-light border me-2 mb-2">
              ${escapeHtml(m.criteria)} / ${escapeHtml(m.thread)}
              <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2" data-remove-plo-map="${o.id}" data-remove-plo-map-index="${m.index}" title="Remove"><i class="ph ph-x" aria-hidden="true"></i></button>
            </span>
          `,
                )
                .join("");
              return `
            <div class="mb-2">
              <div class="small fw-semibold text-primary mb-1">${escapeHtml(stdName)}</div>
              <div>${badges}</div>
            </div>
          `;
            })
            .join("");
        }
      } else {
        const mappings = (o.standardMappings ?? [])
          .map(
            (/** @type {any} */ m, /** @type {number} */ i) => `
        <span class="badge text-bg-light border me-2 mb-2">
          ${escapeHtml(m.criteria)} / ${escapeHtml(m.thread)}
          <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2" data-remove-plo-map="${o.id}" data-remove-plo-map-index="${i}" title="Remove"><i class="ph ph-x" aria-hidden="true"></i></button>
        </span>
      `,
          )
          .join("");
        mappingsHtml =
          mappings || '<div class="small text-secondary">No mappings yet for this PLO.</div>';
      }

      const lintResult = lintLearningOutcome(o.text ?? "");
      const lintWarnings = lintResult.issues
        .filter((i) => i.severity === "warn")
        .map(
          (/** @type {any} */ issue) => `
      <div class="alert alert-warning py-1 px-2 mb-1 small">
        <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
        ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map((/** @type {string} */ s) => escapeHtml(s)).join(", ")}</em>` : ""}
      </div>
    `,
        )
        .join("");

      const preview = (o.text ?? "").trim();
      const previewShort =
        preview.length > 120 ? `${preview.slice(0, 120)}…` : preview || "No text yet";
      const headingId = `plo_${o.id}_heading`;
      const collapseId = `plo_${o.id}_collapse`;
      const isActive = openCollapseIds.has(collapseId)
        ? true
        : openCollapseIds.size === 0 && idx === 0;

      // Standard selector dropdown for multi-standard support
      const standardSelectorHtml = hasMultipleStandards
        ? `
      <div class="mb-2">
        <label class="form-label small mb-1" for="plo-standard-${o.id}">Select standard to map to</label>
        <select class="form-select form-select-sm" id="plo-standard-${o.id}" data-plo-standard-selector="${o.id}" data-testid="plo-standard-${o.id}">
          ${(p.awardStandardIds ?? [])
            .map((/** @type {string} */ stdId, /** @type {number} */ i) => {
              const stdName = (p.awardStandardNames ?? [])[i] ?? stdId;
              const selected =
                (ploSelectedStandards[o.id] ?? (p.awardStandardIds ?? [])[0]) === stdId;
              return `<option value="${escapeHtml(stdId)}" ${selected ? "selected" : ""}>${escapeHtml(stdName)}</option>`;
            })
            .join("")}
        </select>
      </div>
    `
        : "";

      return `
      <div class="accordion-item bg-body" data-testid="plo-item-${o.id}">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? "" : "collapsed"} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}" data-testid="plo-accordion-${o.id}">
            <div class="d-flex w-100 align-items-center gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">PLO ${idx + 1}</div>
                <div class="small text-secondary">${escapeHtml(previewShort)}</div>
              </div>
              <div class="header-actions d-flex align-items-center gap-2 me-2">
                <span class="btn btn-outline-danger btn-sm" role="button" tabindex="0" data-remove-plo="${o.id}" aria-label="Remove PLO ${idx + 1}" data-testid="remove-plo-${o.id}"><i class="ph ph-trash" aria-hidden="true"></i> Remove</span>
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <label class="visually-hidden" for="plo-text-${o.id}">PLO ${idx + 1} text</label>
            <textarea class="form-control" id="plo-text-${o.id}" data-plo-id="${o.id}" data-testid="plo-textarea-${o.id}" rows="3" placeholder="e.g., Analyse… / Design and implement…" aria-describedby="plo-lint-${o.id}">${escapeHtml(o.text ?? "")}</textarea>
            <div class="plo-lint-warnings mt-2" id="plo-lint-${o.id}" role="status" aria-live="polite">${lintWarnings}</div>

            <div class="mt-3">
              <div class="fw-semibold small mb-2" id="plo-mapping-heading-${o.id}">Map this PLO to QQI award standards</div>
              ${
                !(p.awardStandardIds && p.awardStandardIds.length)
                  ? `
                <div class="small text-danger" role="alert">Select a QQI award standard in Identity to enable mapping.</div>
              `
                  : `
                ${standardSelectorHtml}
                <div class="d-flex flex-wrap gap-2 align-items-end" role="group" aria-labelledby="plo-mapping-heading-${o.id}">
                  <div style="min-width:220px">
                    <label class="form-label small mb-1" for="plo-criteria-${o.id}">Criteria</label>
                    <select class="form-select form-select-sm" id="plo-criteria-${o.id}" data-plo-map-criteria="${o.id}" data-testid="plo-criteria-${o.id}"></select>
                  </div>
                  <div style="min-width:260px">
                    <label class="form-label small mb-1" for="plo-thread-${o.id}">Thread</label>
                    <select class="form-select form-select-sm" id="plo-thread-${o.id}" data-plo-map-thread="${o.id}" data-testid="plo-thread-${o.id}"></select>
                  </div>
                  <button type="button" class="btn btn-outline-primary btn-sm" data-add-plo-map="${o.id}" aria-label="Add mapping for PLO ${idx + 1}" data-testid="add-mapping-${o.id}"><i class="ph ph-link me-1" aria-hidden="true"></i>Add mapping</button>
                </div>
                <div class="small text-secondary mt-2" data-plo-map-desc="${o.id}" aria-live="polite"></div>
                <div class="mt-2" data-plo-map-list="${o.id}" role="list" aria-label="Current mappings for PLO ${idx + 1}">
                  ${mappingsHtml}
                </div>
              `
              }
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  content.innerHTML =
    devModeToggleHtml +
    `
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0" id="plos-heading"><i class="ph ph-list-checks me-2" aria-hidden="true"></i>Programme Learning Outcomes (PLOs) (QQI-critical)</h5>
          <button class="btn btn-dark btn-sm" id="addPloBtn" data-testid="add-plo-btn" aria-label="Add new PLO"><i class="ph ph-plus" aria-hidden="true"></i> Add PLO</button>
        </div>
        ${bloomsGuidanceHtml(p.nfqLevel, "Programme Learning Outcomes")}
        <div class="small text-muted mb-3" role="note"><i class="ph ph-lightbulb me-1" aria-hidden="true"></i>Aim for ~6–12 clear, assessable outcomes. Keep them measurable and assessable.</div>
        ${accordionControlsHtml("ploAccordion")}
        <div class="accordion" id="ploAccordion" aria-labelledby="plos-heading" data-testid="plo-accordion">
          ${rows || `<div class="alert alert-info mb-0" role="status"><i class="ph ph-info me-2" aria-hidden="true"></i>No PLOs added yet.</div>`}
        </div>
        <hr class="my-4"/>
        <h6 class="mb-2" id="plo-snapshot-heading"><i class="ph ph-graph me-2" aria-hidden="true"></i>PLO ↔ Award Standard Mapping Snapshot</h6>
        <div id="ploMappingSnapshot" class="small" aria-labelledby="plo-snapshot-heading" data-testid="plo-mapping-snapshot"></div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls("ploAccordion");
  wireOutcomesStep();
}

/**
 * Populates the criteria and thread dropdowns for PLO mapping.
 * Fetches data from the selected award standard and NFQ level.
 *
 * @param {string} ploId - The PLO ID to populate controls for
 * @returns {Promise<void>}
 * @private
 */
async function populatePloMappingControls(ploId) {
  const p = state.programme;
  const selectedStandardId = ploSelectedStandards[ploId] ?? (p.awardStandardIds ?? [])[0];
  if (!selectedStandardId) {
    return;
  }

  const critSel = /** @type {HTMLSelectElement | null} */ (
    document.querySelector(`[data-plo-map-criteria="${ploId}"]`)
  );
  const threadSel = /** @type {HTMLSelectElement | null} */ (
    document.querySelector(`[data-plo-map-thread="${ploId}"]`)
  );
  const descEl = document.querySelector(`[data-plo-map-desc="${ploId}"]`);
  if (!critSel || !threadSel) {
    return;
  }

  try {
    const std = await getAwardStandard(selectedStandardId);
    const level = Number(p.nfqLevel ?? 8);

    // Use new helper functions to get criteria and threads
    const criteriaList = getCriteriaList(std, level).sort((a, b) => a.localeCompare(b));

    /**
     * @param {HTMLSelectElement} el
     * @param {string[]} opts
     * @param {string} [placeholder]
     */
    function setOptions(el, opts, placeholder = "Select...") {
      el.innerHTML = "";
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = placeholder;
      el.appendChild(ph);
      opts.forEach((/** @type {string} */ o) => {
        const opt = document.createElement("option");
        opt.value = o;
        opt.textContent = o;
        el.appendChild(opt);
      });
    }

    function updateDesc() {
      if (!critSel || !threadSel) {
        return;
      }
      const c = critSel.value;
      const t = threadSel.value;
      const d = getDescriptor(std, level, c, t);
      if (descEl) {
        descEl.textContent = d ? d : c && t ? "No descriptor found for this level." : "";
      }
    }

    setOptions(critSel, criteriaList, "Select criteria...");
    setOptions(threadSel, [], "Select thread...");

    // Remove old listeners by cloning
    const newCritSel = /** @type {HTMLSelectElement} */ (critSel.cloneNode(true));
    if (critSel.parentNode) {
      critSel.parentNode.replaceChild(newCritSel, critSel);
    }

    const newThreadSel = /** @type {HTMLSelectElement} */ (threadSel.cloneNode(true));
    if (threadSel.parentNode) {
      threadSel.parentNode.replaceChild(newThreadSel, threadSel);
    }

    newCritSel.addEventListener("change", () => {
      const threads = getThreadList(std, level, newCritSel.value).sort((a, b) =>
        a.localeCompare(b),
      );
      setOptions(newThreadSel, threads, "Select thread...");
      updateDesc();
    });

    newThreadSel.addEventListener("change", updateDesc);
  } catch (err) {
    console.warn("Failed to populate mapping controls:", err);
  }
}

/**
 * Wires up event handlers for the Outcomes step.
 * Handles PLO add/remove, text editing, linting, and standard mappings.
 *
 * @private
 */
function wireOutcomesStep() {
  const p = state.programme;
  p.mode ??= "PROGRAMME_OWNER";
  p.plos ??= [];
  p.ploToModules ??= {};

  // Ensure each PLO has a mapping array
  p.plos = (p.plos ?? []).map((o) => ({
    ...o,
    standardMappings: Array.isArray(o.standardMappings) ? o.standardMappings : [],
  }));

  const addBtn = document.getElementById("addPloBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      p.plos ??= [];
      p.plos.push({ id: uid("plo"), text: "", standardMappings: [] });
      saveDebounced();
      window.render?.();
    };
  }

  document.querySelectorAll("[data-remove-plo]").forEach((btn) => {
    /** @type {HTMLElement} */ (btn).onclick = (/** @type {any} */ e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-remove-plo");
      if (!id || !p.plos) {
        return;
      }
      p.plos = p.plos.filter((o) => o.id !== id);
      delete (/** @type {Record<string, string[]>} */ (p.ploToModules)[id]);
      delete ploSelectedStandards[id];
      saveDebounced();
      window.render?.();
    };
  });

  document.querySelectorAll("[data-plo-id]").forEach((area) => {
    area.addEventListener("input", (/** @type {any} */ e) => {
      const id = area.getAttribute("data-plo-id");
      if (!p.plos) {
        return;
      }
      const o = p.plos.find((x) => x.id === id);
      if (!o) {
        return;
      }
      o.text = e.target?.value ?? "";
      saveDebounced();

      // Update lint warnings dynamically
      const lintResult = lintLearningOutcome(e.target?.value ?? "");
      const warningsHtml = lintResult.issues
        .filter((i) => i.severity === "warn")
        .map(
          (/** @type {any} */ issue) => `
        <div class="alert alert-warning py-1 px-2 mb-1 small">
          <strong>⚠️ "${escapeHtml(issue.match)}"</strong> — ${escapeHtml(issue.message)}
          ${issue.suggestions.length ? `<br><em>Try: ${issue.suggestions.map((/** @type {string} */ s) => escapeHtml(s)).join(", ")}</em>` : ""}
        </div>
      `,
        )
        .join("");

      const parent = /** @type {HTMLElement} */ (area).parentElement;
      if (!parent) {
        return;
      }
      let lintContainer = parent.querySelector(".plo-lint-warnings");
      if (!lintContainer) {
        lintContainer = document.createElement("div");
        lintContainer.className = "plo-lint-warnings mt-2";
        area.insertAdjacentElement("afterend", lintContainer);
      }
      lintContainer.innerHTML = warningsHtml;
    });
  });

  // Standard selector for multi-standard support
  document.querySelectorAll("[data-plo-standard-selector]").forEach((sel) => {
    const ploId = sel.getAttribute("data-plo-standard-selector");
    if (!ploId) {
      return;
    }
    /** @type {Record<string, string>} */ (ploSelectedStandards)[ploId] =
      /** @type {HTMLSelectElement} */ (sel).value ?? (p.awardStandardIds ?? [])[0];

    sel.addEventListener("change", () => {
      /** @type {Record<string, string>} */ (ploSelectedStandards)[ploId] =
        /** @type {HTMLSelectElement} */ (sel).value;
      populatePloMappingControls(ploId);
    });
  });

  // Standards mapping UI
  const selectedStandardId = (p.awardStandardIds ?? [])[0];
  if (!selectedStandardId) {
    return;
  }

  // Initialize mapping controls for each PLO
  (p.plos ?? []).forEach((o) => {
    populatePloMappingControls(o.id);
  });

  // Build snapshot table
  buildMappingSnapshot(p);

  // Wire add mapping buttons
  document.querySelectorAll("[data-add-plo-map]").forEach((btn) => {
    /** @type {HTMLElement} */ (btn).onclick = () => {
      const ploId = btn.getAttribute("data-add-plo-map");
      if (!ploId || !p.plos) {
        return;
      }
      const critSel = /** @type {HTMLSelectElement | null} */ (
        document.querySelector(`[data-plo-map-criteria="${ploId}"]`)
      );
      const threadSel = /** @type {HTMLSelectElement | null} */ (
        document.querySelector(`[data-plo-map-thread="${ploId}"]`)
      );
      const c = critSel?.value ?? "";
      const t = threadSel?.value ?? "";
      if (!c || !t) {
        return alert("Select both Criteria and Thread first.");
      }

      const o = p.plos.find((x) => x.id === ploId);
      if (!o) {
        return;
      }

      // Get selected standard for this PLO (for multi-standard support)
      const standardId = ploSelectedStandards[ploId] ?? (p.awardStandardIds ?? [])[0];

      // Check for duplicates including standardId
      const exists = (o.standardMappings ?? []).some(
        (/** @type {any} */ x) =>
          x.criteria === c &&
          x.thread === t &&
          (x.standardId ?? (p.awardStandardIds ?? [])[0]) === standardId,
      );
      if (!exists) {
        /** @type {any} */ (o.standardMappings).push({
          criteria: c,
          thread: t,
          standardId,
        });
        saveDebounced();
        window.render?.();
      } else {
        alert("This mapping already exists for this PLO and standard.");
      }
    };
  });

  document.querySelectorAll("[data-remove-plo-map]").forEach((btn) => {
    /** @type {HTMLElement} */ (btn).onclick = () => {
      const ploId = btn.getAttribute("data-remove-plo-map");
      const i = Number(btn.getAttribute("data-remove-plo-map-index"));
      if (!p.plos) {
        return;
      }
      const o = p.plos.find((x) => x.id === ploId);
      if (!o) {
        return;
      }
      o.standardMappings = (o.standardMappings ?? []).filter(
        (/** @type {any} */ _, /** @type {number} */ idx) => idx !== i,
      );
      saveDebounced();
      window.render?.();
    };
  });
}

/**
 * Builds and renders the PLO ↔ Standard mapping snapshot table.
 * Shows all PLOs with their mapped criteria/threads and descriptors.
 *
 * @param {Programme} p - The programme data
 * @returns {Promise<void>}
 * @private
 */
async function buildMappingSnapshot(p) {
  const snap = document.getElementById("ploMappingSnapshot");
  if (!snap) {
    return;
  }

  const plos = p.plos ?? [];
  if (!plos.length) {
    snap.innerHTML = `<div class="text-secondary">Add PLOs to see a mapping snapshot.</div>`;
    return;
  }

  // Load all standards
  const standardsMap = new Map();
  for (const stdId of p.awardStandardIds ?? []) {
    try {
      const std = await getAwardStandard(stdId);
      standardsMap.set(stdId, std);
    } catch (err) {
      console.warn(`Failed to load standard ${stdId}:`, err);
    }
  }

  const level = Number(p.nfqLevel ?? 8);
  const hasMultipleStandards = (p.awardStandardIds ?? []).length > 1;

  const rowsHtml = plos
    .map((o, i) => {
      const maps = (o.standardMappings ?? [])
        .map((/** @type {any} */ m) => {
          const stdId = m.standardId ?? (p.awardStandardIds ?? [])[0];
          const std = standardsMap.get(stdId);
          const desc = std ? getDescriptor(std, level, m.criteria, m.thread) : "";
          const shortDesc = desc.length > 180 ? desc.slice(0, 180) + "…" : desc;
          const stdIdx = (p.awardStandardIds ?? []).indexOf(stdId);
          const stdName = hasMultipleStandards
            ? `<span class="badge text-bg-info me-1">${escapeHtml((p.awardStandardNames ?? [])[stdIdx] ?? stdId)}</span>`
            : "";
          return `<li>${stdName}<span class="fw-semibold">${escapeHtml(m.criteria)} / ${escapeHtml(m.thread)}</span><div class="text-secondary">${escapeHtml(shortDesc)}</div></li>`;
        })
        .join("");
      const mapsBlock = maps
        ? `<ul class="mb-0 ps-3">${maps}</ul>`
        : `<span class="text-secondary">No mappings yet</span>`;
      return `<tr><td class="text-nowrap">PLO ${i + 1}</td><td>${escapeHtml(o.text ?? "")}</td><td>${mapsBlock}</td></tr>`;
    })
    .join("");

  snap.innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th style="width:90px;">PLO</th>
            <th>PLO Text</th>
            <th>Mapped Standards (at NFQ Level ${escapeHtml(String(level ?? ""))})</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
}
