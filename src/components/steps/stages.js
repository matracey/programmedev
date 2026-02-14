// @ts-check
/**
 * Stage Structure step component.
 * Manages stages within programme versions and assigns modules to each stage.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/stages
 */

import { mountReact } from "../../utils/react-host.js";
import { StagesStep } from "./react/StagesStep.js";

/**
 * Renders the Stage Structure step UI by mounting the React component.
 */
export function renderStagesStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(StagesStep, {}, content);
}

/**
 * Wires up event handlers for the Stages step form fields.
 * No-op since React handles its own events internally.
 */
export function wireStagesStep() {
  // React component handles its own events
}
