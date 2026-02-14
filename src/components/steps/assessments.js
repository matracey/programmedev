// @ts-check
/**
 * Assessments step component.
 * Bridged to React implementation.
 * @module components/steps/assessments
 */

import { mountReact } from "../../utils/react-host.js";
import { AssessmentsStep } from "./react/AssessmentsStep.js";

/**
 * Renders the Assessments step UI using React.
 */
export function renderAssessmentsStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  content.innerHTML = "";
  mountReact(AssessmentsStep, {}, content);
}

/**
 * Wire up event handlers for Assessments step.
 * With the React implementation, no additional wiring is needed.
 */
export function wireAssessmentsStep() {
  // Event handling is managed within the React component
}
