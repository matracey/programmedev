// @ts-check
/**
 * Navigation buttons component.
 * Handles back/next button wiring for step navigation.
 * @module components/nav
 */

import { activeSteps, state } from "../state/store.js";

/**
 * Initializes event handlers for navigation buttons (back/next).
 * Includes navigation gate requiring award standard selection before leaving identity step.
 *
 * @param {Function} onRender - Callback to trigger UI re-render after navigation
 */
export function initNavButtons(onRender) {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.onclick = () => {
      if (state.stepIndex > 0) {
        state.stepIndex--;
        if (onRender) {
          onRender();
        }
      }
    };
  }

  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.onclick = () => {
      const aSteps = activeSteps();

      // Navigation gate: require at least one award standard before leaving identity step
      const currentStep = aSteps[state.stepIndex];
      if (currentStep?.key === "identity" && !state.programme.awardStandardIds?.length) {
        alert("Select at least one QQI award standard before proceeding.");
        return;
      }

      if (state.stepIndex < aSteps.length - 1) {
        state.stepIndex++;
        if (onRender) {
          onRender();
        }
      }
    };
  }
}
