// @ts-check
/**
 * Programme Versions step component.
 * Manages programme versions (e.g., Full-time, Part-time, Online) with
 * delivery modalities, patterns, intakes, and proctoring settings.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/versions
 */

import { mountReact } from "../../utils/react-host.js";
import { VersionsStep } from "./react/VersionsStep.js";

/**
 * Renders the Programme Versions step UI by mounting the React component.
 */
export function renderVersionsStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(VersionsStep, {}, content);
}

/**
 * Wires up event handlers for the Versions step.
 * No-op since React handles its own events internally.
 */
export function wireVersionsStep() {
  // React component handles its own events
}
