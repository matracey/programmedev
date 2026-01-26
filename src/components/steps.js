/**
 * Steps Sidebar Component (Preact + Legacy)
 * 
 * Renders the workflow steps navigation in the sidebar.
 * Includes both Preact component and legacy render function for incremental migration.
 */

import { html } from '../lib/htm.js';
import { 
  stepIndexSignal, 
  activeStepsSignal,
  state,
  activeSteps,
} from '../state/store.js';

/**
 * Steps Preact component - displays workflow steps in sidebar
 * 
 * @param {Object} props
 * @param {Function} props.onStepChange - Callback when step changes
 */
export function Steps({ onStepChange }) {
  const aSteps = activeStepsSignal.value;
  let stepIndex = stepIndexSignal.value;
  
  // Clamp index if steps changed
  if (stepIndex < 0) stepIndex = 0;
  if (stepIndex >= aSteps.length) stepIndex = 0;

  const handleStepClick = (idx) => {
    stepIndexSignal.value = idx;
    if (onStepChange) onStepChange();
  };

  return html`
    ${aSteps.map((s, idx) => html`
      <button
        type="button"
        class="list-group-item list-group-item-action ${idx === stepIndex ? 'active' : ''}"
        onClick=${() => handleStepClick(idx)}
      >
        ${idx + 1}. ${s.title}
      </button>
    `)}
  `;
}

/**
 * NavButtons Preact component - Back/Next navigation buttons state
 * Updates button disabled state based on current step
 */
export function useNavButtonState() {
  const aSteps = activeStepsSignal.value;
  const stepIndex = stepIndexSignal.value;
  
  return {
    backDisabled: stepIndex === 0,
    nextDisabled: stepIndex === aSteps.length - 1,
  };
}

// ============================================================================
// LEGACY FUNCTIONS (for backward compatibility during migration)
// ============================================================================

/**
 * Legacy render function - updates DOM directly
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
