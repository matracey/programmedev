// @ts-check
/**
 * Shared components and helper functions for step UI.
 * Provides reusable UI patterns like Bloom's taxonomy guidance and accordion controls.
 * @module components/steps/shared
 */

import { escapeHtml } from '../../utils/dom.js';

/**
 * Generates Bloom's taxonomy guidance HTML with NFQ-level-appropriate verbs.
 *
 * @param {number|null} level - The NFQ level (6-10) to generate guidance for
 * @param {string} contextLabel - Label describing the context (e.g., "Programme Learning Outcomes")
 * @returns {string} HTML string containing verb chips and guidance text
 */
export function bloomsGuidanceHtml(level, contextLabel) {
  const lvl = Number(level ?? 0);
  const title = lvl ? `Bloom helper (aligned to NFQ level ${lvl})` : "Bloom helper (choose NFQ level first)";

  let focus = "Use measurable action verbs. Avoid: understand, know, learn about, be aware of.";
  let verbs = ["describe", "explain", "apply", "analyse", "evaluate", "design"];

  if (!lvl) {
    focus = "Pick the programme NFQ level in Identity, then come back here for tailored verb suggestions.";
    verbs = ["describe", "explain", "apply", "analyse", "evaluate", "design"];
  } else if (lvl <= 6) {
    focus = "Emphasise foundational knowledge and applied skills (remember/understand/apply), with some analysis.";
    verbs = ["identify", "describe", "explain", "apply", "demonstrate", "use", "outline", "compare"];
  } else if (lvl === 7) {
    focus = "Balance application and analysis. Show problem-solving and autonomy.";
    verbs = ["apply", "analyse", "interpret", "solve", "integrate", "evaluate", "justify", "develop"];
  } else if (lvl === 8) {
    focus = "Push beyond application: critical analysis, evaluation, and creation/design.";
    verbs = ["analyse", "evaluate", "synthesise", "design", "develop", "critique", "justify", "implement"];
  } else if (lvl === 9) {
    focus = "Emphasise advanced evaluation and creation: originality, research-informed practice.";
    verbs = ["critically evaluate", "synthesise", "design", "develop", "formulate", "lead", "innovate", "apply research to"];
  } else {
    focus = "Emphasise original contribution, research leadership, and creation.";
    verbs = ["originate", "advance", "formulate", "innovate", "lead", "produce", "contribute", "critically appraise"];
  }

  const verbChips = verbs.map(v => `<span class="badge text-bg-light border me-1 mb-1">${escapeHtml(v)}</span>`).join("");

  return `
    <div class="p-3 bg-light border rounded-4 mb-3">
      <div class="fw-semibold mb-1">${escapeHtml(title)} — for ${escapeHtml(contextLabel)}</div>
      <div class="small text-secondary mb-2">${escapeHtml(focus)}</div>
      <div>${verbChips}</div>
      <div class="small text-secondary mt-2">Tip: start outcomes with a verb + object + standard (e.g., "Analyse X using Y to produce Z").</div>
    </div>
  `;
}

/**
 * Generates HTML for accordion expand/collapse all controls.
 *
 * @param {string} accordionId - The ID of the accordion element to control
 * @returns {string} HTML string containing expand/collapse buttons
 */
export function accordionControlsHtml(accordionId) {
  return `
    <div class="d-flex justify-content-end gap-2 mb-2">
      <button class="btn btn-link btn-sm p-0 m-0 text-decoration-none" data-accordion-expand-all="${escapeHtml(accordionId)}"><i class="ph ph-arrows-out-simple" aria-hidden="true"></i> Expand all</button>
      <span class="text-secondary opacity-50">|</span>
      <button class="btn btn-link btn-sm p-0 m-0 text-decoration-none" data-accordion-collapse-all="${escapeHtml(accordionId)}"><i class="ph ph-arrows-in-simple" aria-hidden="true"></i> Collapse all</button>
    </div>
  `;
}

/**
 * Wires up event handlers for accordion expand/collapse all buttons.
 *
 * @param {string} accordionId - The ID of the accordion element to control
 */
export function wireAccordionControls(accordionId) {
  const accordion = document.getElementById(accordionId);

  /** @param {boolean} shouldExpand */
  const toggleAll = (shouldExpand) => {
    if (!accordion) return;
    accordion.querySelectorAll('.accordion-collapse').forEach(el => {
      const ctor = window.bootstrap?.Collapse;
      if (ctor && typeof ctor.getOrCreateInstance === 'function') {
        const inst = ctor.getOrCreateInstance(el, { toggle: false });
        shouldExpand ? inst.show() : inst.hide();
      } else if (ctor) {
        const inst = new ctor(el, { toggle: false });
        shouldExpand ? inst.show() : inst.hide();
      } else {
        el.classList.toggle('show', shouldExpand);
      }
    });
  };

  document.querySelectorAll(`[data-accordion-expand-all="${accordionId}"]`).forEach(btn => {
    /** @type {HTMLElement} */ (btn).onclick = () => toggleAll(true);
  });
  document.querySelectorAll(`[data-accordion-collapse-all="${accordionId}"]`).forEach(btn => {
    /** @type {HTMLElement} */ (btn).onclick = () => toggleAll(false);
  });
}

/**
 * Captures the IDs of currently expanded accordion items.
 * Used to preserve expansion state across re-renders.
 *
 * @param {string} accordionId - The ID of the accordion container
 * @returns {Set<string>} Set of collapse element IDs that are currently open
 */
export function captureOpenCollapseIds(accordionId) {
  const set = new Set();
  const accordion = document.getElementById(accordionId);
  if (!accordion) return set;
  accordion.querySelectorAll('.accordion-collapse.show').forEach(el => {
    if (el.id) set.add(el.id);
  });
  return set;
}

/**
 * Updates an accordion header's title and subtitle in-place without re-rendering.
 * Preserves input focus and accordion state.
 *
 * @param {string} headingId - The ID of the accordion header element (h2)
 * @param {Object} options - The content to update
 * @param {string} [options.title] - New title HTML (updates .fw-semibold element)
 * @param {string} [options.subtitle] - New subtitle text (updates .small.text-secondary element)
 */
export function updateAccordionHeader(headingId, { title, subtitle }) {
  const header = document.getElementById(headingId);
  if (!header) return;
  
  if (title !== undefined) {
    const titleEl = header.querySelector('.fw-semibold');
    if (titleEl) titleEl.innerHTML = title;
  }
  if (subtitle !== undefined) {
    const subtitleEl = header.querySelector('.small.text-secondary');
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }
}
