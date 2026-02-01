// @ts-check
/**
 * Steps sidebar component.
 * Renders the workflow step navigation list.
 * @module components/steps
 */

import { activeSteps, state } from "../state/store.js";

/**
 * Icon mapping for each step key.
 * @type {Record<string, string>}
 */
const STEP_ICONS = {
  identity: "ph-identification-card",
  outcomes: "ph-list-checks",
  versions: "ph-git-branch",
  stages: "ph-stairs",
  structure: "ph-cube",
  electives: "ph-path",
  mimlos: "ph-graduation-cap",
  "effort-hours": "ph-clock",
  assessments: "ph-exam",
  "reading-lists": "ph-books",
  schedule: "ph-calendar",
  mapping: "ph-graph",
  traceability: "ph-flow-arrow",
  snapshot: "ph-file-doc",
};

/**
 * Renders the workflow steps sidebar navigation.
 * Highlights the current step and updates navigation button states.
 *
 * @param {Function} onStepChange - Callback invoked when user selects a different step
 */
export function renderSteps(onStepChange) {
  const box = document.getElementById("stepList");
  if (!box) {
    return;
  }

  const aSteps = activeSteps();
  box.innerHTML = "";

  // Clamp index if steps changed
  if (state.stepIndex < 0) {
    state.stepIndex = 0;
  }
  if (state.stepIndex >= aSteps.length) {
    state.stepIndex = 0;
  }

  aSteps.forEach((s, idx) => {
    const isActive = idx === state.stepIndex;
    const iconClass = STEP_ICONS[s.key] ?? "ph-circle";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "list-group-item list-group-item-action " + (isActive ? "active" : "");
    btn.innerHTML = `<i class="ph ${iconClass} me-2" aria-hidden="true"></i>${idx + 1}. ${s.title}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.setAttribute("aria-controls", "content");
    btn.setAttribute("data-testid", `step-${s.key}`);
    if (isActive) {
      btn.setAttribute("aria-current", "step");
    }
    btn.onclick = () => {
      state.stepIndex = idx;
      if (onStepChange) {
        onStepChange();
      }
    };
    box.appendChild(btn);
  });

  const backBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById("backBtn") || document.getElementById("prevBtn")
  );
  const nextBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById("nextBtn"));
  if (backBtn) {
    backBtn.disabled = state.stepIndex === 0;
  }
  if (nextBtn) {
    nextBtn.disabled = state.stepIndex === aSteps.length - 1;
  }
}
