// @ts-check
/**
 * QQI Snapshot step component.
 * Generates a comprehensive QQI-compatible programme summary with Word export.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/snapshot
 */

import { mountReact } from "../../utils/react-host.js";
import { SnapshotStep } from "./react/SnapshotStep.js";

/**
 * Renders the Snapshot step UI by mounting the React component.
 */
export function renderSnapshotStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(SnapshotStep, {}, content);
}

/**
 * Wires up event handlers for the Snapshot step.
 * No-op since React handles its own events internally.
 */
export function wireSnapshotStep() {
  // React component handles its own events
}
