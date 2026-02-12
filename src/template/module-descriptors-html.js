// @ts-check
/**
 * Module Descriptors HTML table rendering (Section 7).
 * Generates HTML tables for module descriptors per the QQI template.
 * @module template/module-descriptors-html
 */

import { escapeHtml } from "../utils/dom.js";

/**
 * Formats effort hours for the teaching modalities table.
 * @param {Module} mod - Module data
 * @param {string} versionKey - Version/delivery key to look up effort hours
 * @returns {{ classroomHours: number, syncOnlineHours: number, syncHybridHours: number, asyncHours: number, independentHours: number, workBasedHours: number, otherHours: number, total: number }}
 */
function getEffortHours(mod, versionKey) {
  const effort =
    mod.effortHours?.[versionKey] ?? mod.effortHours?.[Object.keys(mod.effortHours ?? {})[0]] ?? {};

  const classroomHours = effort.classroomHours ?? 0;
  const syncOnlineHours = effort.mentoringHours ?? 0;
  const syncHybridHours = effort.otherContactHours ?? 0;
  const asyncHours = effort.directedElearningHours ?? 0;
  const independentHours = effort.independentLearningHours ?? 0;
  const workBasedHours = effort.workBasedHours ?? 0;
  const otherHours = effort.otherHours ?? 0;

  const total =
    classroomHours +
    syncOnlineHours +
    syncHybridHours +
    asyncHours +
    independentHours +
    workBasedHours +
    otherHours;

  return {
    classroomHours,
    syncOnlineHours,
    syncHybridHours,
    asyncHours,
    independentHours,
    workBasedHours,
    otherHours,
    total,
  };
}

/**
 * Gets assessment percentages by type.
 * @param {Module} mod - Module data
 * @returns {{ continuous: number, invigilated: number, proctored: number, project: number, practical: number, workBased: number }}
 */
function getAssessmentPercentages(mod) {
  const pcts = {
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
    if (t.includes("exam") && t.includes("campus")) {
      pcts.invigilated += w;
    } else if (t.includes("exam") && t.includes("online")) {
      pcts.proctored += w;
    } else if (t.includes("project")) {
      pcts.project += w;
    } else if (t.includes("practical") || t.includes("lab")) {
      pcts.practical += w;
    } else if (t.includes("work")) {
      pcts.workBased += w;
    } else {
      pcts.continuous += w;
    }
  });

  return pcts;
}

/**
 * Gets the PLO numbers that a module maps to.
 * @param {Programme} programme - Programme data
 * @param {string} moduleId - Module ID
 * @returns {string} Comma-separated PLO numbers
 */
function getModuleRelatedPLOs(programme, moduleId) {
  const ploIds = [];
  const mapping = programme.ploToModules ?? {};

  Object.entries(mapping).forEach(([ploId, moduleIds]) => {
    if ((moduleIds ?? []).includes(moduleId)) {
      ploIds.push(ploId);
    }
  });

  return ploIds
    .map((id) => {
      const plo = (programme.plos ?? []).find((p) => p.id === id);
      return plo?.code ?? id.replace("plo_", "");
    })
    .sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    })
    .join(", ");
}

/**
 * Renders a single module descriptor table (Section 7).
 *
 * @param {Programme} programme - Programme data
 * @param {Module} mod - Module data
 * @param {ProgrammeVersion} version - Programme version
 * @param {Stage} stage - Stage containing this module
 * @param {{ semester?: string }} stageModule - Stage module reference
 * @returns {string} HTML table markup
 */
export function renderModuleDescriptor(programme, mod, version, stage, stageModule) {
  const versionKey = `${version.id}_${version.deliveryModality}`;
  const effort = getEffortHours(mod, versionKey);
  const asmPcts = getAssessmentPercentages(mod);
  const mimlos = mod.mimlos ?? [];
  const assessments = mod.assessments ?? [];
  const readingList = mod.readingList ?? [];
  const hoursPerWeek =
    effort.total > 0 && version.durationWeeks
      ? Math.round(effort.total / version.durationWeeks)
      : "";
  const relatedPLOs = getModuleRelatedPLOs(programme, mod.id);

  let html = '<table class="module-descriptor">';

  // 7.1 Module Overview header
  html += `<tr>
    <td colspan="11" class="section-header">
      <strong>7.1</strong>&nbsp;&nbsp;&nbsp;<strong>Module Overview</strong>
      <span class="instruction-text"> (copy and paste for other modules)</span>
    </td>
  </tr>`;

  // Row: Module Number | [value] | Module Title | [value]
  html += `<tr>
    <td class="label-cell">Module<br>Number</td>
    <td class="data-cell">${escapeHtml(mod.code ?? "")}</td>
    <td colspan="2" class="label-cell">Module Title</td>
    <td colspan="7" class="data-cell">${escapeHtml(mod.title ?? "")}</td>
  </tr>`;

  // Row: Stage | [value] | Semester | [value] | Duration | [value] | ECTS | [value]
  html += `<tr>
    <td colspan="2" class="label-cell">Stage of Principal Programme</td>
    <td class="data-cell">${escapeHtml(stage.name ?? "")}</td>
    <td class="label-cell">Semester<br><span class="instruction-text">(if applicable)</span></td>
    <td class="data-cell">${escapeHtml(stageModule.semester ?? "")}</td>
    <td colspan="2" class="label-cell">Duration.<br><span class="instruction-text">(Weeks F/T)</span></td>
    <td class="data-cell">${version.durationWeeks ?? ""}</td>
    <td class="label-cell">ECTS</td>
    <td colspan="2" class="data-cell">${mod.credits ?? ""}</td>
  </tr>`;

  // Row: Mandatory/Elective | Hours | Analysis header
  html += `<tr>
    <td class="label-cell">Mandatory<br>/ Elective<br>(M/E)</td>
    <td class="label-cell">Hours of Learner<br>Effort / Week<sup>2</sup></td>
    <td colspan="9" class="section-subheader" style="text-align: center;">Analysis of required hours of learning effort</td>
  </tr>`;

  // Teaching and Learning Modalities header row
  html += `<tr>
    <td rowspan="11" class="data-cell" style="vertical-align: top; text-align: center;">${mod.isElective ? "E" : "M"}</td>
    <td rowspan="11" class="data-cell" style="vertical-align: top; text-align: center;">${hoursPerWeek}</td>
    <td colspan="5" class="label-cell">Teaching and Learning Modalities</td>
    <td colspan="2" class="label-cell">✓if relevant to this<br>module</td>
    <td colspan="2" class="label-cell">Approx. proportion<br>of total (hours)</td>
  </tr>`;

  // Direct Contact Hours subheader
  html += `<tr>
    <td colspan="9" class="subsection-header">Direct Contact Hours</td>
  </tr>`;

  // On-site face-to-face
  html += `<tr>
    <td colspan="5" class="modality-label">On-site face-to-face</td>
    <td colspan="2" class="data-cell">${effort.classroomHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="data-cell">${effort.classroomHours || ""}</td>
  </tr>`;

  // Synchronous online
  html += `<tr>
    <td colspan="5" class="modality-label">Synchronous online</td>
    <td colspan="2" class="data-cell">${effort.syncOnlineHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="data-cell">${effort.syncOnlineHours || ""}</td>
  </tr>`;

  // Synchronous Hybrid
  html += `<tr>
    <td colspan="5" class="modality-label">Synchronous Hybrid</td>
    <td colspan="2" class="data-cell">${effort.syncHybridHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="data-cell">${effort.syncHybridHours || ""}</td>
  </tr>`;

  // Indirect/Non-contact Hours subheader
  html += `<tr>
    <td colspan="9" class="subsection-header">Indirect/Non-contact Hours</td>
  </tr>`;

  // Asynchronous
  html += `<tr>
    <td colspan="5" class="modality-label">Asynchronous</td>
    <td colspan="2" class="data-cell">${effort.asyncHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="data-cell">${effort.asyncHours || ""}</td>
  </tr>`;

  // Independent Learning
  html += `<tr>
    <td colspan="5" class="modality-label">Independent Learning</td>
    <td colspan="2" class="data-cell">${effort.independentHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="data-cell">${effort.independentHours || ""}</td>
  </tr>`;

  // Work Based
  html += `<tr>
    <td colspan="5" class="modality-label">Work Based</td>
    <td colspan="2" class="data-cell">${effort.workBasedHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="data-cell">${effort.workBasedHours || ""}</td>
  </tr>`;

  // Other (identify)
  html += `<tr>
    <td colspan="5" class="modality-label">Other (identify)</td>
    <td colspan="2" class="data-cell">${effort.otherHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="data-cell">${effort.otherHours || ""}</td>
  </tr>`;

  // Total row
  html += `<tr>
    <td colspan="5" class="label-cell">Total</td>
    <td colspan="2" class="data-cell"></td>
    <td colspan="2" class="data-cell">${effort.total || ""}</td>
  </tr>`;

  // Pre-Requisite row
  html += `<tr>
    <td colspan="8" class="label-cell">Pre-Requisite Module, if any. Module Number and Title</td>
    <td colspan="3" class="data-cell"></td>
  </tr>`;

  // Co-Requisite row
  html += `<tr>
    <td colspan="8" class="label-cell">Co-Requisite Module, if any. Module Number and Title</td>
    <td colspan="3" class="data-cell"></td>
  </tr>`;

  // Max learners row
  html += `<tr>
    <td colspan="8" class="label-cell">Maximum number of learners per instance of the module</td>
    <td colspan="3" class="data-cell"></td>
  </tr>`;

  // Staff qualifications header
  html += `<tr>
    <td colspan="11" class="section-subheader">
      Specification of the qualifications (academic, pedagogical and professional/occupational) and experience required of staff working in this module.
    </td>
  </tr>`;

  // Staff table header
  html += `<tr>
    <td colspan="4" class="label-cell">Role e.g.,<br>Tutor, Mentor,<br>Lecturer, Research<br>Supervisor, etc.</td>
    <td colspan="4" class="label-cell">Qualifications &amp; experience required</td>
    <td colspan="3" class="label-cell">Staff (X) : Learner (Y)<br>Ratio<br>Express as X:Y</td>
  </tr>`;

  // Empty staff row
  html += `<tr>
    <td colspan="4" class="data-cell" style="min-height: 30pt;">&nbsp;</td>
    <td colspan="4" class="data-cell">&nbsp;</td>
    <td colspan="3" class="data-cell">&nbsp;</td>
  </tr>`;

  // Assessment Techniques header
  html += `<tr>
    <td colspan="11" class="section-subheader">Assessment Techniques – percentage contribution</td>
  </tr>`;

  // Assessment Techniques labels row 1 (3 columns)
  html += `<tr>
    <td colspan="4" class="label-cell">Continuous<br>Assessment</td>
    <td colspan="4" class="label-cell">Proctored Exam – in<br>person</td>
    <td colspan="3" class="label-cell">Practical Skills<br>Based</td>
  </tr>`;

  // Assessment Techniques values row 1
  html += `<tr>
    <td colspan="4" class="data-cell">${asmPcts.continuous || ""}</td>
    <td colspan="4" class="data-cell">${asmPcts.invigilated || ""}</td>
    <td colspan="3" class="data-cell">${asmPcts.practical || ""}</td>
  </tr>`;

  // Assessment Techniques labels row 2 (3 columns)
  html += `<tr>
    <td colspan="4" class="label-cell">Project</td>
    <td colspan="4" class="label-cell">Proctored Exam –<br>online</td>
    <td colspan="3" class="label-cell">Work Based</td>
  </tr>`;

  // Assessment Techniques values row 2
  html += `<tr>
    <td colspan="4" class="data-cell">${asmPcts.project || ""}</td>
    <td colspan="4" class="data-cell">${asmPcts.proctored || ""}</td>
    <td colspan="3" class="data-cell">${asmPcts.workBased || ""}</td>
  </tr>`;

  // Capstone modules row
  html += `<tr>
    <td colspan="4" class="label-cell">Capstone modules<br>(Yes/No)?</td>
    <td colspan="7" class="label-cell">If Yes, provide details</td>
  </tr>`;
  html += `<tr>
    <td colspan="4" class="data-cell">&nbsp;</td>
    <td colspan="7" class="data-cell">&nbsp;</td>
  </tr>`;

  // 7.2 MIMLOs header
  html += `<tr>
    <td colspan="11" class="section-header">
      <strong>7.2</strong>&nbsp;&nbsp;&nbsp;<strong>Minimum Intended Module Learning Outcomes (MIMLOs)</strong>
    </td>
  </tr>`;

  // MIMLO table header
  html += `<tr>
    <td colspan="9" class="label-cell">MIMLO<br>On successful completion of this module a learner will be able to:</td>
    <td colspan="2" class="label-cell" style="text-align: right;">Related MIPLO<br>#</td>
  </tr>`;

  // MIMLO rows (show at least 5)
  const mimloCount = Math.max(5, mimlos.length);
  for (let i = 0; i < mimloCount; i++) {
    const mimlo = mimlos[i];
    html += `<tr>
      <td class="data-cell" style="width: 30px;">${i + 1}.</td>
      <td colspan="8" class="data-cell">${mimlo ? escapeHtml(mimlo.text) : ""}</td>
      <td colspan="2" class="data-cell" style="text-align: right;">${mimlo ? relatedPLOs : ""}</td>
    </tr>`;
  }

  // 7.3 Indicative Module Content
  html += `<tr>
    <td colspan="11" class="section-header">
      <strong>7.3</strong>&nbsp;&nbsp;&nbsp;<strong>Indicative Module Content, Organisation and Structure</strong>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="11" class="data-cell content-area">&nbsp;</td>
  </tr>`;

  // 7.4 Work based learning
  html += `<tr>
    <td colspan="11" class="section-header">
      <strong>7.4</strong>&nbsp;&nbsp;&nbsp;<strong>Work based learning and practice-placement</strong>
      <span class="instruction-text"> (if applicable)</span>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="11" class="data-cell content-area">&nbsp;</td>
  </tr>`;

  // 7.5 Specific module resources
  html += `<tr>
    <td colspan="11" class="section-header">
      <strong>7.5</strong>&nbsp;&nbsp;&nbsp;<strong>Specific module resources required</strong>
      <span class="instruction-text"> (if applicable)</span>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="11" class="data-cell content-area">&nbsp;</td>
  </tr>`;

  // 7.6 Application of programme teaching
  html += `<tr>
    <td colspan="11" class="section-header">
      <strong>7.6</strong>&nbsp;&nbsp;&nbsp;<strong>Application of programme teaching, learning and assessment strategies to this module</strong>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="11" class="data-cell content-area">&nbsp;</td>
  </tr>`;

  // 7.7 Summative Assessment Strategy
  html += `<tr>
    <td colspan="11" class="section-header">
      <strong>7.7</strong>&nbsp;&nbsp;&nbsp;<strong>Summative Assessment Strategy for this module</strong>
    </td>
  </tr>`;

  // Assessment strategy table header
  html += `<tr>
    <td colspan="4" class="label-cell">MIMLOs</td>
    <td colspan="4" class="label-cell"><em>Technique(s)</em></td>
    <td colspan="3" class="label-cell"><em>Weighting</em></td>
  </tr>`;

  // Assessment rows
  assessments.forEach((a) => {
    const mimloNums = (a.mimloIds ?? [])
      .map((id) => {
        const idx = mimlos.findIndex((m) => m.id === id);
        return idx >= 0 ? idx + 1 : "";
      })
      .filter((n) => n !== "")
      .join(", ");

    html += `<tr>
      <td colspan="4" class="data-cell">${mimloNums}</td>
      <td colspan="4" class="data-cell">${escapeHtml(a.title ?? a.type ?? "")}</td>
      <td colspan="3" class="data-cell">${a.weighting ?? ""}%</td>
    </tr>`;
  });

  // Add empty rows if few assessments
  const emptyAssessmentRows = Math.max(0, 3 - assessments.length);
  for (let i = 0; i < emptyAssessmentRows; i++) {
    html += `<tr>
      <td colspan="4" class="data-cell">&nbsp;</td>
      <td colspan="4" class="data-cell">&nbsp;</td>
      <td colspan="3" class="data-cell">&nbsp;</td>
    </tr>`;
  }

  // 7.8 Sample Assessment Materials
  html += `<tr>
    <td colspan="11" class="section-header">
      <strong>7.8</strong>&nbsp;&nbsp;&nbsp;<strong>Sample Assessment Materials</strong>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="11" class="instruction-text" style="padding: 4pt; font-style: italic;">
      List sample assessment materials as supporting documentation and supply in separate document.
    </td>
  </tr>`;

  // 7.9 Indicative reading lists
  html += `<tr>
    <td colspan="11" class="section-header">
      <strong>7.9</strong>&nbsp;&nbsp;&nbsp;<strong>Indicative reading lists and other information resources</strong>
    </td>
  </tr>`;

  // Reading list entries
  if (readingList.length > 0) {
    readingList.forEach((item) => {
      const citation =
        item.citation ??
        `${item.author ?? ""} (${item.year ?? ""}). ${item.title ?? ""}. ${item.publisher ?? ""}.`;
      html += `<tr>
        <td colspan="11" class="data-cell">${escapeHtml(citation)}</td>
      </tr>`;
    });
  } else {
    html += `<tr>
      <td colspan="11" class="data-cell content-area">&nbsp;</td>
    </tr>`;
  }

  html += "</table>";
  return html;
}

/**
 * Renders all module descriptors for a programme (Section 7).
 *
 * @param {Programme} data - Programme data
 * @returns {string} HTML markup for all module descriptors
 */
export function renderAllModuleDescriptors(data) {
  if (!data.modules || data.modules.length === 0) {
    return "<p>No modules available.</p>";
  }

  if (!data.versions || data.versions.length === 0) {
    return "<p>No programme versions available.</p>";
  }

  let html = '<h2 class="section-title">Section 7: Module Descriptors</h2>';

  // Use the first version as default context
  const defaultVersion = data.versions[0];

  // Build a map of moduleId -> stage/stageModule for lookup
  /** @type {Map<string, { version: ProgrammeVersion, stage: Stage, stageModule: { moduleId: string, semester?: string } }>} */
  const moduleContextMap = new Map();

  data.versions.forEach((version) => {
    (version.stages ?? []).forEach((stage) => {
      (stage.modules ?? []).forEach((sm) => {
        if (!moduleContextMap.has(sm.moduleId)) {
          moduleContextMap.set(sm.moduleId, { version, stage, stageModule: sm });
        }
      });
    });
  });

  // Render each module
  data.modules.forEach((mod, idx) => {
    const context = moduleContextMap.get(mod.id);
    const version = context?.version ?? defaultVersion;
    const stage = context?.stage ?? { id: "", name: "" };
    const stageModule = context?.stageModule ?? { moduleId: mod.id };

    if (idx > 0) {
      html += '<div class="page-break"></div>';
    }

    html += renderModuleDescriptor(data, mod, version, stage, stageModule);
  });

  return html;
}
