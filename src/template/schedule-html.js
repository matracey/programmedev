// @ts-check
/**
 * Programme Schedule HTML table rendering.
 * Generates HTML tables for the schedule template page.
 * @module template/schedule-html
 */

import { escapeHtml } from "../utils/dom.js";

/**
 * Determines assessment types used in a stage.
 * @param {Programme} programme - Programme data
 * @param {Stage["modules"]} stageModules - Modules in the stage
 * @returns {{continuous: boolean, invigilated: boolean, proctored: boolean, project: boolean, practical: boolean, workBased: boolean}}
 */
function getAssessmentTypes(programme, stageModules) {
  const types = {
    continuous: false,
    invigilated: false,
    proctored: false,
    project: false,
    practical: false,
    workBased: false,
  };

  (stageModules ?? []).forEach((sm) => {
    const mod = (programme.modules ?? []).find((m) => m.id === sm.moduleId);
    if (mod?.assessments) {
      mod.assessments.forEach((a) => {
        const t = (a.type ?? "").toLowerCase();
        if (t.includes("exam") && t.includes("campus")) {types.invigilated = true;}
        else if (t.includes("exam") && t.includes("online")) {types.proctored = true;}
        else if (t.includes("project")) {types.project = true;}
        else if (t.includes("practical") || t.includes("lab")) {types.practical = true;}
        else if (t.includes("work")) {types.workBased = true;}
        else {types.continuous = true;}
      });
    }
  });

  return types;
}

/**
 * Renders a single schedule table for a version/stage combination.
 *
 * @param {Programme} programme - Programme data
 * @param {ProgrammeVersion} version - Programme version
 * @param {Stage} stage - Stage data
 * @returns {string} HTML table markup
 */
export function renderScheduleTable(programme, version, stage) {
  const stageModules = stage.modules ?? [];
  const deliveryKey = `${version.id}_${version.deliveryModality}`;

  const assessmentTypes = getAssessmentTypes(programme, stageModules);

  let html = "<table>";

  // ROW 1: Title and Instructions
  html += `<tr>
    <td colspan="29" class="form-section-title">
      <strong>Proposed Programme Schedule(s)</strong> - ${escapeHtml(version.label ?? "")} / ${escapeHtml(stage.name ?? "")}
      <br><span class="instruction-text">Copy and paste the template for each additional stage of the programme.</span>
    </td>
  </tr>`;

  // ROW 2: Provider Name
  html += `<tr>
    <td colspan="3" class="label-cell">Name of Provider:</td>
    <td colspan="26" class="empty-data"></td>
  </tr>`;

  // ROW 3: Programme Title and ECTS
  html += `<tr>
    <td colspan="3" class="label-cell">Programme Title (Principal)</td>
    <td colspan="20" class="empty-data">${escapeHtml(programme.title ?? "")}</td>
    <td colspan="2" class="label-cell">ECTS</td>
    <td colspan="4" class="empty-data">${programme.totalCredits ?? ""}</td>
  </tr>`;

  // ROW 4: Stage Info
  const exitAwardTitle = stage.exitAward?.enabled
    ? stage.exitAward.awardTitle || "Exit Award Available"
    : "";
  html += `<tr>
    <td colspan="3" class="label-cell">Stage (1,2,3, Award etc)</td>
    <td colspan="2" class="empty-data">${escapeHtml(stage.name ?? "")}</td>
    <td colspan="5" class="label-cell">Exit Award Title (if relevant)</td>
    <td colspan="11" class="empty-data">${escapeHtml(exitAwardTitle)}</td>
    <td colspan="2" class="label-cell">Stage ECTS</td>
    <td colspan="6" class="empty-data">${stage.creditsTarget ?? ""}</td>
  </tr>`;

  // ROW 5-6: Programme Delivery Mode
  const dm = version.deliveryModality ?? "";
  html += `<tr>
    <td rowspan="2" colspan="3" class="label-cell checkbox-label">Programme Delivery Mode<br>✔ one as appropriate.</td>
    <td colspan="5" class="form-section-title">On-site Face-to-Face</td>
    <td colspan="6" class="form-section-title">Blended</td>
    <td colspan="6" class="form-section-title">Online</td>
    <td colspan="9" class="form-section-title">Apprenticeship</td>
  </tr>
  <tr>
    <td colspan="5" class="empty-data">${dm === "F2F" ? "✔" : ""}</td>
    <td colspan="6" class="empty-data">${dm === "BLENDED" ? "✔" : ""}</td>
    <td colspan="6" class="empty-data">${dm === "ONLINE" ? "✔" : ""}</td>
    <td colspan="9" class="empty-data">${dm === "APPRENTICESHIP" ? "✔" : ""}</td>
  </tr>`;

  // ROW 7-8: Teaching and Learning Modalities
  html += `<tr>
    <td rowspan="2" colspan="3" class="label-cell checkbox-label">Teaching and Learning Modalities<br>✔ one or more as appropriate.</td>
    <td colspan="4" class="form-section-title">On-site Face-to-Face</td>
    <td colspan="4" class="form-section-title">Synchronous Hybrid</td>
    <td colspan="6" class="form-section-title">Synchronous Online</td>
    <td colspan="4" class="form-section-title">Asynchronous</td>
    <td colspan="3" class="form-section-title">Independent</td>
    <td colspan="5" class="form-section-title">Work Based</td>
  </tr>
  <tr>
    <td colspan="4" class="empty-data">${dm === "F2F" ? "✔" : ""}</td>
    <td colspan="4" class="empty-data">${dm === "BLENDED" ? "✔" : ""}</td>
    <td colspan="6" class="empty-data">${dm === "ONLINE" ? "✔" : ""}</td>
    <td colspan="4" class="empty-data">✔</td>
    <td colspan="3" class="empty-data">✔</td>
    <td colspan="5" class="empty-data"></td>
  </tr>`;

  // ROW 9-10: Assessment Techniques
  html += `<tr>
    <td rowspan="2" colspan="3" class="label-cell checkbox-label">Assessment Techniques Utilised in Stage<br>✔ one or more as appropriate.</td>
    <td colspan="4" class="form-section-title">Continuous Assessment</td>
    <td colspan="4" class="form-section-title">Invigilated Exam – in person</td>
    <td colspan="6" class="form-section-title">Proctored Exam - online</td>
    <td colspan="4" class="form-section-title">Project</td>
    <td colspan="3" class="form-section-title">Practical Skills Demonstration</td>
    <td colspan="5" class="form-section-title">Work Based</td>
  </tr>
  <tr>
    <td colspan="4" class="empty-data">${assessmentTypes.continuous ? "✔" : ""}</td>
    <td colspan="4" class="empty-data">${assessmentTypes.invigilated ? "✔" : ""}</td>
    <td colspan="6" class="empty-data">${assessmentTypes.proctored ? "✔" : ""}</td>
    <td colspan="4" class="empty-data">${assessmentTypes.project ? "✔" : ""}</td>
    <td colspan="3" class="empty-data">${assessmentTypes.practical ? "✔" : ""}</td>
    <td colspan="5" class="empty-data">${assessmentTypes.workBased ? "✔" : ""}</td>
  </tr>`;

  // ROW 11: Modules Section Header
  html += `<tr>
    <td colspan="29" class="form-section-title"><strong>Modules in this stage (add rows as required)</strong></td>
  </tr>`;

  // ROW 12: Grouped Headers
  html += `<tr>
    <td colspan="8" class="label-cell"></td>
    <td colspan="10" class="form-section-title"><strong>Total Student Effort Module (hours)</strong></td>
    <td colspan="11" class="form-section-title"><strong>Assessment – Allocation of Marks<br>(from the module assessment strategy)</strong></td>
  </tr>`;

  // ROW 13: Column Headers (vertical)
  html += `<tr>
    <th>Module Title</th>
    <th class="vertical-header"><span>Semester</span></th>
    <th colspan="2" class="vertical-header"><span>Mandatory (M) or Elective (E)</span></th>
    <th colspan="2" class="vertical-header"><span>Credits (ECTS)</span></th>
    <th colspan="2" class="vertical-header"><span>Total Hours</span></th>
    <th class="vertical-header"><span>On-site Face-to-Face</span></th>
    <th colspan="3" class="vertical-header"><span>Synchronous</span></th>
    <th class="vertical-header"><span>Asynchronous</span></th>
    <th colspan="3" class="vertical-header"><span>Independent</span></th>
    <th colspan="2" class="vertical-header"><span>Work Based</span></th>
    <th colspan="2" class="vertical-header"><span>Continuous Assessment %</span></th>
    <th colspan="2" class="vertical-header"><span>Invigilated Exam – in person %</span></th>
    <th class="vertical-header"><span>Proctored Exam – online %</span></th>
    <th colspan="2" class="vertical-header"><span>Project</span></th>
    <th colspan="2" class="vertical-header"><span>Practical Skills Demonstration %</span></th>
    <th colspan="2" class="vertical-header"><span>Work Based %</span></th>
  </tr>`;

  // Module rows
  stageModules.forEach((sm) => {
    const mod = (programme.modules ?? []).find((m) => m.id === sm.moduleId);
    if (!mod) {return;}

    const effort =
      mod.effortHours?.[deliveryKey] ??
      mod.effortHours?.[Object.keys(mod.effortHours ?? {})[0]] ??
      {};
    const totalHours = (mod.credits ?? 0) * 25;

    const asmPcts = {
      continuous: 0,
      invigilated: 0,
      proctored: 0,
      project: 0,
      practical: 0,
      workBased: 0,
    };
    (mod.assessments ?? []).forEach((a) => {
      const t = (a.type ?? "").toLowerCase();
      const w = a.weighting ?? 0;
      if (t.includes("exam") && t.includes("campus")) {asmPcts.invigilated += w;}
      else if (t.includes("exam") && t.includes("online")) {asmPcts.proctored += w;}
      else if (t.includes("project")) {asmPcts.project += w;}
      else if (t.includes("practical") || t.includes("lab")) {asmPcts.practical += w;}
      else if (t.includes("work")) {asmPcts.workBased += w;}
      else {asmPcts.continuous += w;}
    });

    html += `<tr>
      <td class="empty-data">${escapeHtml(mod.title ?? "")}</td>
      <td class="empty-data">${escapeHtml(sm.semester ?? "")}</td>
      <td colspan="2" class="empty-data">${mod.isElective ? "E" : "M"}</td>
      <td colspan="2" class="empty-data">${mod.credits ?? ""}</td>
      <td colspan="2" class="empty-data">${totalHours}</td>
      <td class="empty-data">${effort.classroomHours ?? ""}</td>
      <td colspan="3" class="empty-data">${effort.mentoringHours ?? ""}</td>
      <td class="empty-data">${effort.directedElearningHours ?? ""}</td>
      <td colspan="3" class="empty-data">${effort.independentLearningHours ?? ""}</td>
      <td colspan="2" class="empty-data">${effort.workBasedHours ?? ""}</td>
      <td colspan="2" class="empty-data">${asmPcts.continuous || ""}</td>
      <td colspan="2" class="empty-data">${asmPcts.invigilated || ""}</td>
      <td class="empty-data">${asmPcts.proctored || ""}</td>
      <td colspan="2" class="empty-data">${asmPcts.project || ""}</td>
      <td colspan="2" class="empty-data">${asmPcts.practical || ""}</td>
      <td colspan="2" class="empty-data">${asmPcts.workBased || ""}</td>
    </tr>`;
  });

  // Add empty rows if no modules
  if (stageModules.length === 0) {
    for (let i = 0; i < 2; i++) {
      html += `<tr>
        <td class="empty-data"></td>
        <td class="empty-data"></td>
        <td colspan="2" class="empty-data"></td>
        <td colspan="2" class="empty-data"></td>
        <td colspan="2" class="empty-data"></td>
        <td class="empty-data"></td>
        <td colspan="3" class="empty-data"></td>
        <td class="empty-data"></td>
        <td colspan="3" class="empty-data"></td>
        <td colspan="2" class="empty-data"></td>
        <td colspan="2" class="empty-data"></td>
        <td colspan="2" class="empty-data"></td>
        <td class="empty-data"></td>
        <td colspan="2" class="empty-data"></td>
        <td colspan="2" class="empty-data"></td>
        <td colspan="2" class="empty-data"></td>
      </tr>`;
    }
  }

  html += "</table>";
  return html;
}

/**
 * Renders all schedule tables for a programme.
 *
 * @param {Programme} data - Programme data
 * @returns {string} HTML markup for all schedules
 */
export function renderAllSchedules(data) {
  if (!data.versions || data.versions.length === 0) {
    return "<p>No programme versions available.</p>";
  }

  let html = "";

  data.versions.forEach((version, vIdx) => {
    const stages = version.stages ?? [];
    if (stages.length === 0) {return;}

    stages.forEach((stage, sIdx) => {
      if (vIdx > 0 || sIdx > 0) {
        html += '<div class="page-break"></div>';
      }
      html += renderScheduleTable(data, version, stage);
    });
  });

  return html || "<p>No stages found in programme versions.</p>";
}
