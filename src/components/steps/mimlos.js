// @ts-check
/**
 * MIMLOs (Module Intended Minimum Learning Outcomes) step component.
 * Manages learning outcomes for each module with linting and Bloom's guidance.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/mimlos
 */

import { mountReact } from "../../utils/react-host.js";
import { MimlosStep } from "./react/MimlosStep.js";

/**
 * Renders the MIMLOs step UI by mounting the React component.
 */
export function renderMimlosStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(MimlosStep, {}, content);
}

/**
 * Wires up event handlers for the MIMLOs step.
 * No-op since React handles its own events internally.
 */
export function wireMimlosStep() {
  // React component handles its own events
}
