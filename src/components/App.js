/**
 * App Shell Component - Main application container
 * 
 * This component serves as the root for the Preact application.
 * During migration, it coexists with vanilla JS rendering.
 */

import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import { html } from '../lib/htm.js';
import { 
  programmeSignal, 
  stepIndexSignal, 
  activeStepsSignal,
  currentStepSignal,
  savingSignal,
  lastSavedSignal,
} from '../state/store.js';

/**
 * App component - orchestrates the main application layout
 * 
 * During migration, this component will gradually take over rendering
 * from the vanilla JS functions. Initially it just provides a reactive
 * wrapper that triggers re-renders when signals change.
 */
export function App({ legacyRender }) {
  // Subscribe to signal changes and trigger legacy render
  useSignalEffect(() => {
    // Access signals to subscribe to them
    const _ = programmeSignal.value;
    const __ = stepIndexSignal.value;
    
    // During migration, delegate to legacy render function
    if (legacyRender) {
      legacyRender();
    }
  });

  // This component doesn't render anything yet - it just bridges signals to legacy code
  return null;
}

/**
 * Mount the Preact app shell
 * 
 * @param {Function} legacyRender - The legacy render function to call on state changes
 * @param {HTMLElement} container - Container element (optional, creates hidden container if not provided)
 */
export function mountApp(legacyRender, container) {
  // Create a hidden container for the Preact app if none provided
  if (!container) {
    container = document.createElement('div');
    container.id = 'preact-app-shell';
    container.style.display = 'none';
    document.body.appendChild(container);
  }

  render(html`<${App} legacyRender=${legacyRender} />`, container);
  
  return container;
}

/**
 * Future: Full Preact App component (will replace legacy rendering)
 * 
 * This is a placeholder showing what the final component structure will look like.
 * Uncomment and expand as migration progresses.
 */
/*
export function FullApp() {
  const programme = programmeSignal.value;
  const currentStep = currentStepSignal.value;
  const aSteps = activeStepsSignal.value;
  const saving = savingSignal.value;
  const lastSaved = lastSavedSignal.value;

  return html`
    <div class="app-container">
      <${Header} />
      <main class="container-fluid py-3">
        <div class="row g-3">
          <aside class="col-12 col-lg-3">
            <${Sidebar} steps=${aSteps} currentStep=${currentStep} />
            <${Flags} />
          </aside>
          <section class="col-12 col-lg-9">
            <${StepContent} step=${currentStep} />
          </section>
        </div>
      </main>
    </div>
  `;
}
*/
