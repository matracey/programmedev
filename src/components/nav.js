/**
 * Navigation Buttons Component (Preact + Legacy)
 * 
 * Handles Back/Next navigation between workflow steps.
 * Includes both Preact hooks and legacy init function for incremental migration.
 */

import { useCallback } from 'preact/hooks';
import { 
  stepIndexSignal, 
  activeStepsSignal,
  programmeSignal,
  state,
  activeSteps,
} from '../state/store.js';

/**
 * useNavigation hook - provides navigation handlers for Preact components
 * 
 * @param {Function} onRender - Callback to trigger re-render after navigation
 * @returns {Object} { goBack, goNext, canGoBack, canGoNext }
 */
export function useNavigation(onRender) {
  const aSteps = activeStepsSignal.value;
  const stepIndex = stepIndexSignal.value;
  const programme = programmeSignal.value;
  
  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < aSteps.length - 1;
  
  const goBack = useCallback(() => {
    if (stepIndexSignal.value > 0) {
      stepIndexSignal.value--;
      if (onRender) onRender();
    }
  }, [onRender]);
  
  const goNext = useCallback(() => {
    const currentSteps = activeStepsSignal.value;
    const currentIdx = stepIndexSignal.value;
    const currentStep = currentSteps[currentIdx];
    const prog = programmeSignal.value;
    
    // Navigation gate: require at least one award standard before leaving identity step
    if (currentStep?.key === 'identity' && !(prog.awardStandardIds?.length)) {
      alert('Select at least one QQI award standard before proceeding.');
      return;
    }
    
    if (currentIdx < currentSteps.length - 1) {
      stepIndexSignal.value++;
      if (onRender) onRender();
    }
  }, [onRender]);
  
  return { goBack, goNext, canGoBack, canGoNext };
}

/**
 * Nav Preact component (optional - for when nav is fully Preact-rendered)
 * 
 * @param {Object} props
 * @param {Function} props.onRender - Callback to trigger re-render
 */
export function Nav({ onRender }) {
  const { goBack, goNext, canGoBack, canGoNext } = useNavigation(onRender);
  
  // This component doesn't render anything - it's used via the hook
  // The actual buttons are in the static HTML and wired via initNavButtons
  return null;
}

// ============================================================================
// LEGACY FUNCTIONS (for backward compatibility during migration)
// ============================================================================

/**
 * Legacy init function - wires event handlers to existing DOM buttons
 * @param {Function} onRender - Callback to trigger re-render
 */
export function initNavButtons(onRender) {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.onclick = () => {
      if (state.stepIndex > 0) {
        state.stepIndex--;
        if (onRender) onRender();
      }
    };
  }

  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.onclick = () => {
      const aSteps = activeSteps();
      
      // Navigation gate: require at least one award standard before leaving identity step
      const currentStep = aSteps[state.stepIndex];
      if (currentStep?.key === 'identity' && !(state.programme.awardStandardIds?.length)) {
        alert('Select at least one QQI award standard before proceeding.');
        return;
      }
      
      if (state.stepIndex < aSteps.length - 1) {
        state.stepIndex++;
        if (onRender) onRender();
      }
    };
  }
}
