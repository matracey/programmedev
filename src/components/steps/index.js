/**
 * Step components index
 * Exports all step renderers - uses Preact for migrated components
 */

import { render } from 'preact';
import { html } from '../../lib/htm.js';

// Preact components (migrated)
import { IdentityStep } from './identity.js';
import { OutcomesStep } from './outcomes.js';
import { VersionsStep } from './versions.js';
import { StagesStep } from './stages.js';
import { StructureStep } from './structure.js';

// Legacy render functions (not yet migrated)
import { renderElectivesStep } from './electives.js';
import { renderMimlosStep } from './mimlos.js';
import { renderEffortHoursStep } from './effort-hours.js';
import { renderAssessmentsStep } from './assessments.js';
import { renderReadingListsStep } from './reading-lists.js';
import { renderScheduleStep } from './schedule.js';
import { renderMappingStep } from './mapping.js';
import { renderTraceabilityStep } from './traceability.js';
import { renderSnapshotStep } from './snapshot.js';

// Dev mode toggle support
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';

// Track currently rendered Preact step to avoid re-mounting
let currentPreactStep = null;
let currentPreactContainer = null;

/**
 * Create a Preact step renderer that wraps a component
 * Renders the component into #content with dev mode toggle
 */
function createPreactStepRenderer(Component, stepKey) {
  // Callback triggers full page re-render including this step
  const onRender = () => {
    window.render?.();
  };
  
  return () => {
    const content = document.getElementById('content');
    if (!content) return;
    
    // Clear any existing content
    content.innerHTML = '';
    currentPreactStep = stepKey;
    
    // Add dev mode toggle if present
    const devModeHtml = getDevModeToggleHtml();
    if (devModeHtml) {
      const devModeDiv = document.createElement('div');
      devModeDiv.innerHTML = devModeHtml;
      content.appendChild(devModeDiv);
      wireDevModeToggle(() => window.render?.());
    }
    
    // Create container for Preact component
    const container = document.createElement('div');
    container.id = `preact-${stepKey}`;
    content.appendChild(container);
    currentPreactContainer = container;
    
    // Render Preact component
    try {
      render(html`<${Component} onRender=${onRender} />`, container);
    } catch (e) {
      console.error(`Error rendering ${stepKey}:`, e);
      container.innerHTML = `<div class="alert alert-danger">Error rendering ${stepKey}: ${e.message}</div>`;
    }
  };
}

/**
 * Reset Preact step tracking (call when switching to legacy step)
 */
function resetPreactTracking() {
  currentPreactStep = null;
  currentPreactContainer = null;
}

/**
 * Wrap a legacy renderer to reset Preact tracking before rendering
 */
function wrapLegacyRenderer(renderer) {
  return (...args) => {
    resetPreactTracking();
    return renderer(...args);
  };
}

/**
 * Get render function for a step key
 */
export function getStepRenderer(stepKey) {
  const renderers = {
    // Preact components (migrated)
    "identity": createPreactStepRenderer(IdentityStep, 'identity'),
    "outcomes": createPreactStepRenderer(OutcomesStep, 'outcomes'),
    "versions": createPreactStepRenderer(VersionsStep, 'versions'),
    "stages": createPreactStepRenderer(StagesStep, 'stages'),
    "structure": createPreactStepRenderer(StructureStep, 'structure'),
    
    // Legacy render functions (not yet migrated) - wrapped to reset Preact tracking
    "electives": wrapLegacyRenderer(renderElectivesStep),
    "mimlos": wrapLegacyRenderer(renderMimlosStep),
    "effort-hours": wrapLegacyRenderer(renderEffortHoursStep),
    "assessments": wrapLegacyRenderer(renderAssessmentsStep),
    "reading-lists": wrapLegacyRenderer(renderReadingListsStep),
    "schedule": wrapLegacyRenderer(renderScheduleStep),
    "mapping": wrapLegacyRenderer(renderMappingStep),
    "traceability": wrapLegacyRenderer(renderTraceabilityStep),
    "snapshot": wrapLegacyRenderer(renderSnapshotStep),
  };
  return renderers[stepKey] || (() => {});
}
