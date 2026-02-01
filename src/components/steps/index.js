// @ts-check
/**
 * Step component registry.
 * Maps step keys to their render functions for dynamic step loading.
 * @module components/steps/index
 */

import { renderAssessmentsStep } from "./assessments.js";
import { renderEffortHoursStep } from "./effort-hours.js";
import { renderElectivesStep } from "./electives.js";
import { renderIdentityStep } from "./identity.js";
import { renderMappingStep } from "./mapping.js";
import { renderMimlosStep } from "./mimlos.js";
import { renderOutcomesStep } from "./outcomes.js";
import { renderReadingListsStep } from "./reading-lists.js";
import { renderScheduleStep } from "./schedule.js";
import { renderSnapshotStep } from "./snapshot.js";
import { renderStagesStep } from "./stages.js";
import { renderStructureStep } from "./structure.js";
import { renderTraceabilityStep } from "./traceability.js";
import { renderVersionsStep } from "./versions.js";

/**
 * Returns the render function for a given workflow step key.
 *
 * @param {string} stepKey - The step key (e.g., "identity", "outcomes", "mimlos")
 * @returns {Function} The step's render function, or a no-op if key is unknown
 */
export function getStepRenderer(stepKey) {
  /** @type {Record<string, Function>} */
  const renderers = {
    identity: renderIdentityStep,
    versions: renderVersionsStep,
    stages: renderStagesStep,
    structure: renderStructureStep,
    electives: renderElectivesStep,
    outcomes: renderOutcomesStep,
    mimlos: renderMimlosStep,
    "effort-hours": renderEffortHoursStep,
    assessments: renderAssessmentsStep,
    "reading-lists": renderReadingListsStep,
    schedule: renderScheduleStep,
    mapping: renderMappingStep,
    traceability: renderTraceabilityStep,
    snapshot: renderSnapshotStep,
  };
  return renderers[stepKey] ?? (() => {});
}
