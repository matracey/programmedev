// @ts-check
/**
 * Reading Lists step component.
 * Manages module reading resources with ISBN lookup, outdated warnings, and resource types.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/reading-lists
 */

import { mountReact } from "../../utils/react-host.js";
import { ReadingListsStep } from "./react/ReadingListsStep.js";

/**
 * Renders the Reading Lists step UI by mounting the React component.
 */
export function renderReadingListsStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(ReadingListsStep, {}, content);
}

/**
 * Wires up event handlers for the Reading Lists step.
 * No-op since React handles its own events internally.
 */
export function wireReadingListsStep() {
  // React component handles its own events
}
