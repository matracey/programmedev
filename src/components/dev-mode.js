/**
 * Dev mode toggle component
 */

import { state, setMode } from '../state/store.js';

/**
 * Check if dev mode UI should be shown
 */
export function isDevModeUI() {
  try {
    return new URLSearchParams(window.location.search).get("dev") === "true";
  } catch {
    return false;
  }
}

/**
 * Get HTML for dev mode toggle (empty string if not in dev mode)
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
 * Wire dev mode toggle events
 * @param {Function} onModeChange - Callback when mode changes
 */
export function wireDevModeToggle(onModeChange) {
  const toggle = document.getElementById("devModeToggle");
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
