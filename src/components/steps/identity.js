// @ts-check
/**
 * Identity step component.
 * Handles programme identity fields including title, award type, NFQ level,
 * credits, school, award standards, and elective definitions.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/identity
 */

import { mountReact } from "../../utils/react-host.js";
import { IdentityStep } from "./react/IdentityStep.js";

/**
 * Renders the Identity step UI by mounting the React component.
 */
export function renderIdentityStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(IdentityStep, {}, content);
}

/**
 * Wires up event handlers for the Identity step form fields.
 * No-op since React handles its own events internally.
 *
 * @param {(() => void)=} _onUpdate - Unused callback (kept for API compatibility)
 */
export function wireIdentityStep(_onUpdate) {
  // React component handles its own events
}
