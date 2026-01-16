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
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "list-group-item list-group-item-action " + (idx === state.stepIndex ? "active" : "");
    btn.textContent = `${idx + 1}. ${s.title}`;
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
