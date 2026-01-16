/**
 * QQI Programme Design Studio - Entry Point
 */

// Import styles
import './style.css';

// Import state management
import { state, load, saveNow, resetProgramme, activeSteps } from './state/store.js';

// Import components
import { renderHeader } from './components/header.js';
import { renderSteps } from './components/steps.js';
import { renderFlags } from './components/flags.js';
import { initNavButtons } from './components/nav.js';
import { getStepRenderer } from './components/steps/index.js';

// Import export functionality
import { downloadJson, importJson } from './export/json.js';

// Import validation
import { validateProgramme, completionPercent } from './utils/validation.js';

/**
 * Main render function - renders the entire UI
 */
async function render() {
  const steps = activeSteps();
  const currentStep = steps[state.stepIndex];
  
  // Render sidebar components
  renderHeader();
  renderSteps(render);
  
  // Render validation flags
  const flags = validateProgramme(state.programme);
  renderFlags(flags, goToStep);
  
  // Render current step content
  if (currentStep) {
    const stepRenderer = getStepRenderer(currentStep.key);
    await stepRenderer();
  }
}

/**
 * Navigate to a specific step by key
 */
function goToStep(stepKey) {
  const steps = activeSteps();
  const idx = steps.findIndex(s => s.key === stepKey);
  if (idx >= 0) {
    state.stepIndex = idx;
    render();
  }
}

/**
 * Wire global header buttons
 */
function wireGlobalButtons() {
  // Export button
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => downloadJson(state.programme));
  }
  
  // Import button
  const importInput = document.getElementById('importInput');
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        Object.assign(state.programme, data);
        saveNow();
        render();
      } catch (err) {
        alert('Failed to import JSON: ' + err.message);
      }
      
      e.target.value = '';
    });
  }
  
  // Reset button
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all data? This cannot be undone.')) {
        resetProgramme();
        render();
      }
    });
  }
  
  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const html = document.documentElement;
  
  if (themeToggle && themeIcon) {
    // Set initial theme based on localStorage or system preference
    const stored = localStorage.getItem('nci_pds_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored || (prefersDark ? 'dark' : 'light');
    html.setAttribute('data-bs-theme', initial);
    themeIcon.textContent = initial === 'dark' ? '☀️' : '🌙';
    
    themeToggle.addEventListener('click', () => {
      const next = html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-bs-theme', next);
      localStorage.setItem('nci_pds_theme', next);
      themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }
}

/**
 * Initialize the application
 */
function init() {
  // Load state from localStorage
  load();
  
  // Wire global buttons
  wireGlobalButtons();
  
  // Wire navigation buttons
  initNavButtons(render);
  
  // Expose render globally for step components
  window.render = render;
  
  // Initial render
  render();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
