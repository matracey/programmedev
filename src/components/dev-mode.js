// @ts-check
/**
 * Developer mode toggle component.
 * Provides UI for switching between Programme Owner and Module Editor modes.
 * Only visible when ?dev=true query parameter is present.
 * @module components/dev-mode
 */

import { state, setMode } from '../state/store.js';

/**
 * Checks if developer mode UI should be displayed.
 * Returns true when the URL contains ?dev=true parameter.
 *
 * @returns {boolean} True if dev mode UI should be shown
 */
export function isDevModeUI() {
  try {
    return new URLSearchParams(window.location.search).get("dev") === "true";
  } catch {
    return false;
  }
}

/**
 * Generates HTML for the dev mode toggle switch.
 * Returns empty string when not in dev mode.
 *
 * @returns {string} HTML string for the toggle, or empty if dev mode disabled
 */
export function getDevModeToggleHtml() {
  if (!isDevModeUI()) return "";
  
  return `
    <div class="d-flex justify-content-end align-items-center mb-2">
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" id="devModeToggle" ${state.programme.mode === "MODULE_EDITOR" ? "checked" : ""}>
        <label class="form-check-label small" for="devModeToggle">
          ${state.programme.mode === "MODULE_EDITOR" ? "Module Editor Mode" : "Programme Owner Mode"}
        </label>
      </div>
    </div>
  `;
}

/**
 * Wires up event handlers for the dev mode toggle switch.
 *
 * @param {Function} onModeChange - Callback invoked when mode changes
 */
export function wireDevModeToggle(onModeChange) {
  const toggle = /** @type {HTMLInputElement | null} */ (document.getElementById("devModeToggle"));
  if (!toggle) return;
  
  toggle.onchange = () => {
    if (toggle.checked) {
      setMode("MODULE_EDITOR");
    } else {
      setMode("PROGRAMME_OWNER");
    }
    if (onModeChange) onModeChange();
  };
}
