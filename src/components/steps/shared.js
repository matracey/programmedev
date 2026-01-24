/**
 * Shared components and helpers for steps
 */

import { escapeHtml } from '../../utils/dom.js';

/**
 * Generate Bloom's taxonomy guidance HTML based on NFQ level
 */
export function bloomsGuidanceHtml(level, contextLabel) {
  const lvl = Number(level || 0);
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
 * Reusable accordion controls (expand / collapse all)
 */
export function accordionControlsHtml(accordionId) {
  return `
    <div class="d-flex justify-content-end gap-2 mb-2">
      <button class="btn btn-link btn-sm p-0 m-0 text-decoration-none" data-accordion-expand-all="${escapeHtml(accordionId)}">Expand all</button>
      <span class="text-secondary opacity-50">|</span>
      <button class="btn btn-link btn-sm p-0 m-0 text-decoration-none" data-accordion-collapse-all="${escapeHtml(accordionId)}">Collapse all</button>
    </div>
  `;
}

export function wireAccordionControls(accordionId) {
  const accordion = document.getElementById(accordionId);

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
    btn.onclick = () => toggleAll(true);
  });
  document.querySelectorAll(`[data-accordion-collapse-all="${accordionId}"]`).forEach(btn => {
    btn.onclick = () => toggleAll(false);
  });
}
