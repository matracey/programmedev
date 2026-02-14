// @ts-check
/**
 * PLO to MIMLO Mapping step component (QQI-critical).
 * Maps Programme Learning Outcomes to MIMLOs using ploToMimlos structure.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/mapping
 */

import { mountReact } from "../../utils/react-host.js";
import { MappingStep } from "./react/MappingStep.js";

/**
 * Renders the PLO-MIMLO Mapping step UI by mounting the React component.
 */
export function renderMappingStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(MappingStep, {}, content);
}

/**
 * Wires up event handlers for the Mapping step.
 * No-op since React handles its own events internally.
 */
export function wireMappingStep() {
  // React component handles its own events
}
