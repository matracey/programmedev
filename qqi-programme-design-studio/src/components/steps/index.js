/**
 * Step components index
 * Exports all step renderers
 */

import { renderIdentityStep } from './identity.js';
import { renderVersionsStep } from './versions.js';
import { renderStagesStep } from './stages.js';
import { renderStructureStep } from './structure.js';
import { renderOutcomesStep } from './outcomes.js';
import { renderMimlosStep } from './mimlos.js';
import { renderEffortHoursStep } from './effort-hours.js';
import { renderAssessmentsStep } from './assessments.js';
import { renderReadingListsStep } from './reading-lists.js';
import { renderScheduleStep } from './schedule.js';
import { renderMappingStep } from './mapping.js';
import { renderTraceabilityStep } from './traceability.js';
import { renderSnapshotStep } from './snapshot.js';

/**
 * Get render function for a step key
 */
export function getStepRenderer(stepKey) {
  const renderers = {
    "identity": renderIdentityStep,
    "versions": renderVersionsStep,
    "stages": renderStagesStep,
    "structure": renderStructureStep,
    "outcomes": renderOutcomesStep,
    "mimlos": renderMimlosStep,
    "effort-hours": renderEffortHoursStep,
    "assessments": renderAssessmentsStep,
    "reading-lists": renderReadingListsStep,
    "schedule": renderScheduleStep,
    "mapping": renderMappingStep,
    "traceability": renderTraceabilityStep,
    "snapshot": renderSnapshotStep,
  };
  return renderers[stepKey] || (() => {});
}
