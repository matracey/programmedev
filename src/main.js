// @ts-check
/**
 * QQI Programme Design Studio - Application entry point.
 * Initializes the application, wires up event handlers, and manages rendering.
 * @module main
 */

// Import styles
// Import all of Bootstrap's JS
import * as bootstrap from "bootstrap";

import { renderFlags } from "./components/flags.js";
// Import components
import { renderHeader } from "./components/header.js";
import { initNavButtons } from "./components/nav.js";
import { renderSteps } from "./components/steps.js";
import { getStepRenderer } from "./components/steps/index.js";
// Import export functionality
import { downloadJson, importJson } from "./export/json.js";
// Import state management
import {
  activeSteps,
  getAwardStandard,
  load,
  migrateProgramme,
  resetProgramme,
  saveNow,
  state,
  validateStandardMappings,
} from "./state/store.js";
// Import validation
import { completionPercent, validateProgramme } from "./utils/validation.js";

import "./style.css";
// Import Phosphor Icons
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/bold";

/**
 * Main render function - renders the entire UI.
 * Updates the header, step sidebar, validation flags, and current step content.
 *
 * @returns {Promise<void>}
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
 * Navigates to a specific workflow step by its key.
 *
 * @param {string} stepKey - The step key to navigate to (e.g., "identity", "outcomes")
 */
function goToStep(stepKey) {
  const steps = activeSteps();
  const idx = steps.findIndex((s) => s.key === stepKey);
  if (idx >= 0) {
    state.stepIndex = idx;
    render();
  }
}

/**
 * Wires up global header button event handlers.
 * Handles export, import, reset, and theme toggle functionality.
 */
function wireGlobalButtons() {
  // Export button
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => downloadJson(state.programme));
  }

  // Import button
  const importInput = document.getElementById("importInput");
  if (importInput) {
    importInput.addEventListener("change", async (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      const file = target.files?.[0];
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        /** @type {Record<string, unknown>} */
        const data = JSON.parse(text);

        // Automatically migrate programme to current schema version
        /** @type {Programme} */
        const migrated = /** @type {Programme} */ (migrateProgramme(data));

        // Load all standards for validation (skip if no standards)
        const standardsPromises = (migrated.awardStandardIds ?? []).map(
          (/** @type {string} */ id) => getAwardStandard(id).catch(() => null),
        );
        const standards = (await Promise.all(standardsPromises)).filter(Boolean);

        // Validate mappings still work with new standards
        /** @type {ValidationResult} */
        const validation = /** @type {ValidationResult} */ (
          validateStandardMappings(migrated, standards)
        );

        if (validation.warnings.length > 0) {
          console.warn("Standard mapping warnings:", validation.warnings);
        }

        if (!validation.isValid) {
          console.error("Standard mapping errors:", validation.errors);
          const proceed = confirm(
            `Programme has ${validation.errors.length} invalid standard mapping(s). ` +
              "These will need to be fixed manually. Import anyway?",
          );
          if (!proceed) {
            target.value = "";
            return;
          }
        }

        Object.assign(state.programme, migrated);
        saveNow();
        render();

        // Show success message with migration info
        if (migrated.schemaVersion !== data.schemaVersion) {
          alert(
            `Programme imported and upgraded from schema v${data.schemaVersion} to v${migrated.schemaVersion}`,
          );
        }
      } catch (err) {
        const error = /** @type {Error} */ (err);
        alert("Failed to import JSON: " + error.message);
      }

      target.value = "";
    });
  }

  // Reset button
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset all data? This cannot be undone.")) {
        resetProgramme();
        render();
      }
    });
  }

  // Theme toggle
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const html = document.documentElement;

  if (themeToggle && themeIcon) {
    // Set initial theme based on localStorage or system preference
    const stored = localStorage.getItem("nci_pds_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored || (prefersDark ? "dark" : "light");
    html.setAttribute("data-bs-theme", initial);
    themeIcon.className = initial === "dark" ? "ph ph-sun" : "ph ph-moon";

    themeToggle.addEventListener("click", () => {
      const next = html.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
      html.setAttribute("data-bs-theme", next);
      localStorage.setItem("nci_pds_theme", next);
      themeIcon.className = next === "dark" ? "ph ph-sun" : "ph ph-moon";
    });
  }
}

/**
 * Initializes the application.
 * Loads state from localStorage, wires event handlers, and performs initial render.
 */
function init() {
  // Load state from localStorage
  load();

  // Wire global buttons
  wireGlobalButtons();

  // Wire navigation buttons
  initNavButtons(render);

  // Expose render globally for step components
  /** @type {Window & { render?: () => void | Promise<void> }} */
  (window).render = render;

  // Initial render
  render();
}

// Start the app when DOM is ready
document.addEventListener("DOMContentLoaded", init);
