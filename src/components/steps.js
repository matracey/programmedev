/**
 * Steps sidebar component
 */

import { state, activeSteps } from '../state/store.js';

/**
 * Render the workflow steps sidebar
 * @param {Function} onStepChange - Callback when step changes
 */
export function renderSteps(onStepChange) {
  const box = document.getElementById("stepList");
  if (!box) return;

  const aSteps = activeSteps();
  box.innerHTML = "";

  // Clamp index if steps changed
  if (state.stepIndex < 0) state.stepIndex = 0;
  if (state.stepIndex >= aSteps.length) state.stepIndex = 0;

  aSteps.forEach((s, idx) => {
    const isActive = idx === state.stepIndex;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "list-group-item list-group-item-action " + (isActive ? "active" : "");
    btn.textContent = `${idx + 1}. ${s.title}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.setAttribute("aria-controls", "content");
    btn.setAttribute("data-testid", `step-${s.key}`);
    if (isActive) {
      btn.setAttribute("aria-current", "step");
    }
    btn.onclick = () => {
      state.stepIndex = idx;
      if (onStepChange) onStepChange();
    };
    box.appendChild(btn);
  });

  const backBtn = document.getElementById("backBtn") || document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (backBtn) backBtn.disabled = state.stepIndex === 0;
  if (nextBtn) nextBtn.disabled = state.stepIndex === aSteps.length - 1;
}
