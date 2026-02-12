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
  const plos = programme.plos ?? [];

  Object.entries(mapping).forEach(([ploId, moduleIds]) => {
    if ((moduleIds ?? []).includes(moduleId)) {
      ploIds.push(ploId);
    }
  });

  // Convert PLO IDs to their sequential position (1-based index in plos array)
  return ploIds
    .map((id) => {
      const index = plos.findIndex((p) => p.id === id);
      return index >= 0 ? index + 1 : null;
    })
    .filter((n) => n !== null)
    .sort((a, b) => /** @type {number} */ (a) - /** @type {number} */ (b))
    .join(", ");
}

/**
 * Renders the 7.1 Module Overview table.
 * @param {Module} mod - Module data
 * @param {Stage} stage - Stage data
 * @param {{ semester?: string }} stageModule - Stage module reference
 * @param {ProgrammeVersion} version - Programme version
 * @param {{ classroomHours: number, syncOnlineHours: number, syncHybridHours: number, asyncHours: number, independentHours: number, workBasedHours: number, otherHours: number, total: number }} effort - Effort hours
 * @returns {string} HTML table
 */
function renderModuleOverviewTable(mod, stage, stageModule, version, effort) {
  const hoursPerWeek =
    effort.total > 0 && version.durationWeeks
      ? Math.round(effort.total / version.durationWeeks)
      : "";

  return `
<table class="module-table" aria-label="Module Overview">
  <colgroup>
    <col style="width: 18%">
    <col style="width: 22%">
    <col style="width: 18%">
    <col style="width: 16%">
    <col style="width: 14%">
    <col style="width: 12%">
  </colgroup>
  <tr class="title-row">
    <th colspan="6">7.1&emsp;Module Overview <span class="note">(copy and paste for other modules)</span></th>
  </tr>
  <tr>
    <th class="hdr tight">Module Number</th>
    <td class="tight">${escapeHtml(mod.code ?? "")}</td>
    <th class="hdr tight">Module Title</th>
    <td colspan="3" class="tight">${escapeHtml(mod.title ?? "")}</td>
  </tr>
  <tr>
    <th colspan="2" class="hdr tight">Stage of Principal Programme</th>
    <td class="tight">${escapeHtml(stage.name ?? "")}</td>
    <th class="hdr tight">Semester<br><span class="note">(if applicable)</span></th>
    <td class="tight">${escapeHtml(stageModule.semester ?? "")}</td>
    <td class="tight">&nbsp;</td>
  </tr>
  <tr>
    <th class="hdr tight">Duration.<br><span class="note">(Weeks F/T)</span></th>
    <td class="tight">${version.durationWeeks ?? ""}</td>
    <th class="hdr tight">ECTS</th>
    <td class="tight">${mod.credits ?? ""}</td>
    <td colspan="2" class="tight">&nbsp;</td>
  </tr>
  <tr>
    <th class="hdr tight">Mandatory / Elective<br>(M/E)</th>
    <td class="tight">${mod.isElective ? "E" : "M"}</td>
    <th class="hdr tight">Hours of Learner<br>Effort / Week<sup>2</sup></th>
    <td class="tight">${hoursPerWeek}</td>
    <td colspan="2" class="hdr tight">&nbsp;</td>
  </tr>
  <tr>
    <td colspan="6" class="grey center"><strong>Analysis of required hours of learning effort</strong></td>
  </tr>
  <tr>
    <th colspan="3" class="hdr tight">Teaching and Learning Modalities</th>
    <th class="hdr tight">√ if relevant to this module</th>
    <th colspan="2" class="hdr tight">Approx. proportion of total (hours)</th>
  </tr>
  <tr>
    <td colspan="3" class="subhdr tight">Direct Contact Hours</td>
    <td class="tight">&nbsp;</td>
    <td colspan="2" class="tight">&nbsp;</td>
  </tr>
  <tr>
    <td colspan="3" class="tight">On-site face-to-face</td>
    <td class="tight">${effort.classroomHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="tight">${effort.classroomHours || ""}</td>
  </tr>
  <tr>
    <td colspan="3" class="tight">Synchronous online</td>
    <td class="tight">${effort.syncOnlineHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="tight">${effort.syncOnlineHours || ""}</td>
  </tr>
  <tr>
    <td colspan="3" class="tight">Synchronous Hybrid</td>
    <td class="tight">${effort.syncHybridHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="tight">${effort.syncHybridHours || ""}</td>
  </tr>
  <tr>
    <td colspan="3" class="subhdr tight">Indirect/Non-contact Hours</td>
    <td class="tight">&nbsp;</td>
    <td colspan="2" class="tight">&nbsp;</td>
  </tr>
  <tr>
    <td colspan="3" class="tight">Asynchronous</td>
    <td class="tight">${effort.asyncHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="tight">${effort.asyncHours || ""}</td>
  </tr>
  <tr>
    <td colspan="3" class="tight">Independent Learning</td>
    <td class="tight">${effort.independentHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="tight">${effort.independentHours || ""}</td>
  </tr>
  <tr>
    <td colspan="3" class="tight">Work Based</td>
    <td class="tight">${effort.workBasedHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="tight">${effort.workBasedHours || ""}</td>
  </tr>
  <tr>
    <td colspan="3" class="tight">Other (Identify)</td>
    <td class="tight">${effort.otherHours > 0 ? "✔" : ""}</td>
    <td colspan="2" class="tight">${effort.otherHours || ""}</td>
  </tr>
  <tr>
    <td colspan="4" class="subhdr tight">Total</td>
    <td colspan="2" class="tight">${effort.total || ""}</td>
  </tr>
</table>`;
}

/**
 * Renders the staffing requirements table.
 * @returns {string} HTML table
 */
function renderStaffTable() {
  return `
<table class="staff-table" aria-label="Staffing Requirements">
  <colgroup>
    <col style="width: 30%">
    <col style="width: 50%">
    <col style="width: 20%">
  </colgroup>
  <tr>
    <td class="grey" colspan="2">Pre-Requisite Module, if any. &nbsp;Module Number and Title</td>
    <td></td>
  </tr>
  <tr>
    <td class="blue" colspan="2">Co-Requisite Module, if any. &nbsp;Module Number and Title</td>
    <td></td>
  </tr>
  <tr>
    <td class="grey" colspan="2">Maximum number of learners per instance of the module</td>
    <td></td>
  </tr>
  <tr>
    <td class="grey center" colspan="3">Specification of the qualifications (academic, pedagogical and professional/occupational) and experience required of staff working in this module.</td>
  </tr>
  <tr class="blue center">
    <th>Role e.g.,<br>Tutor, Mentor,<br>Lecturer, Research<br>Supervisor, etc.</th>
    <th>Qualifications &amp; experience required</th>
    <th>Staff (X) : Learner (Y) Ratio<br>Express as X:Y</th>
  </tr>
  <tr><td>&nbsp;</td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td></tr>
</table>`;
}

/**
 * Renders the assessment techniques table.
 * @param {{ continuous: number, invigilated: number, proctored: number, project: number, practical: number, workBased: number }} asmPcts - Assessment percentages
 * @returns {string} HTML table
 */
function renderAssessmentTable(asmPcts) {
  return `
<table class="assessment-table" aria-label="Assessment Techniques Percentage Contribution">
  <colgroup>
    <col style="width: 22%">
    <col style="width: 11%">
    <col style="width: 22%">
    <col style="width: 11%">
    <col style="width: 22%">
    <col style="width: 12%">
  </colgroup>
  <tr>
    <th colspan="6" class="grey center">Assessment Techniques – percentage contribution</th>
  </tr>
  <tr>
    <td class="blue">Continuous Assessment</td>
    <td>${asmPcts.continuous || ""}</td>
    <td class="blue">Proctored Exam – in person</td>
    <td>${asmPcts.invigilated || ""}</td>
    <td class="blue">Practical Skills Based</td>
    <td>${asmPcts.practical || ""}</td>
  </tr>
  <tr>
    <td class="blue">Project</td>
    <td>${asmPcts.project || ""}</td>
    <td class="blue">Proctored Exam - online</td>
    <td>${asmPcts.proctored || ""}</td>
    <td class="blue">Work Based</td>
    <td>${asmPcts.workBased || ""}</td>
  </tr>
  <tr>
    <td class="blue">Capstone modules (Yes/No)?</td>
    <td></td>
    <td class="blue">If <span style="text-decoration: underline; color: #0000ee">Yes</span>, provide details</td>
    <td colspan="3"></td>
  </tr>
</table>`;
}

/**
 * Renders the MIMLOs table (Section 7.2).
 * @param {Programme} programme - Programme data
 * @param {Module} mod - Module data
 * @returns {string} HTML table
 */
function renderMimloTable(programme, mod) {
  const mimlos = mod.mimlos ?? [];
  const relatedPLOs = getModuleRelatedPLOs(programme, mod.id);

  let rows = "";
  for (let i = 0; i < mimlos.length; i++) {
    const mimlo = mimlos[i];
    rows += `<tr>
      <td>${i + 1}. ${mimlo ? escapeHtml(mimlo.text) : ""}</td>
      <td>${mimlo ? relatedPLOs : ""}</td>
    </tr>`;
  }

  return `
<table class="mimlo-table" aria-label="Minimum Intended Module Learning Outcomes">
  <colgroup>
    <col style="width: 83%">
    <col style="width: 17%">
  </colgroup>
  <tr>
    <th colspan="2" class="grey">7.2 &nbsp;&nbsp;Minimum Intended Module Learning Outcomes (MIMLOs)</th>
  </tr>
  <tr class="blue">
    <th>MIMLO<br><span style="font-weight: normal">On successful completion of this module a learner will be able to:</span></th>
    <th>Related MIPLO #</th>
  </tr>
  ${rows}
</table>`;
}

/**
 * Renders a content section table (7.3, 7.4, 7.5, 7.6, 7.8, 7.9).
 * @param {string} sectionNum - Section number
 * @param {string} title - Section title
 * @param {string} [content] - Optional content
 * @param {string} [note] - Optional note text
 * @returns {string} HTML table
 */
function renderContentTable(sectionNum, title, content = "", note = "") {
  const noteHtml = note ? ` <span class="note">${note}</span>` : "";
  return `
<table class="content-table" aria-label="${title}">
  <tr>
    <th class="grey">${sectionNum} &nbsp;&nbsp;${title}${noteHtml}</th>
  </tr>
  <tr>
    <td class="content-area">${content}</td>
  </tr>
</table>`;
}

/**
 * Renders the summative assessment strategy table (Section 7.7).
 * @param {Module} mod - Module data
 * @returns {string} HTML table
 */
function renderSummativeTable(mod) {
  const mimlos = mod.mimlos ?? [];
  const assessments = mod.assessments ?? [];

  let rows = "";
  assessments.forEach((a) => {
    const mimloNums = (a.mimloIds ?? [])
      .map((id) => {
        const idx = mimlos.findIndex((m) => m.id === id);
        return idx >= 0 ? idx + 1 : "";
      })
      .filter((n) => n !== "")
      .join(", ");

    rows += `<tr>
      <td>${mimloNums}</td>
      <td>${escapeHtml(a.title ?? a.type ?? "")}</td>
      <td>${a.weighting ?? ""}%</td>
    </tr>`;
  });

  // Add empty rows if few assessments
  const emptyRows = Math.max(0, 3 - assessments.length);
  for (let i = 0; i < emptyRows; i++) {
    rows += `<tr><td></td><td></td><td></td></tr>`;
  }

  return `
<table class="summative-table" aria-label="Summative Assessment Strategy">
  <colgroup>
    <col style="width: 35%">
    <col style="width: 40%">
    <col style="width: 25%">
  </colgroup>
  <tr>
    <th colspan="3" class="grey">7.7 &nbsp;&nbsp;Summative Assessment Strategy for this module</th>
  </tr>
  <tr class="blue">
    <th>MIMLOs</th>
    <th>Technique(s)</th>
    <th>Weighting</th>
  </tr>
  ${rows}
</table>`;
}

/**
 * Renders the reading list table (Section 7.9).
 * @param {Module} mod - Module data
 * @returns {string} HTML table
 */
function renderReadingListTable(mod) {
  const readingList = mod.readingList ?? [];

  let content = "";
  if (readingList.length > 0) {
    content = readingList
      .map((item) => {
        const citation =
          item.citation ??
          `${item.author ?? ""} (${item.year ?? ""}). ${item.title ?? ""}. ${item.publisher ?? ""}.`;
        return escapeHtml(citation);
      })
      .join("<br><br>");
  }

  return `
<table class="content-table" aria-label="Indicative reading lists">
  <tr>
    <th class="grey">7.9 &nbsp;&nbsp;Indicative reading lists and other information resources</th>
  </tr>
  <tr>
    <td class="content-area">${content}</td>
  </tr>
</table>`;
}

/**
 * Renders a single module descriptor (Section 7).
 *
 * @param {Programme} programme - Programme data
 * @param {Module} mod - Module data
 * @param {ProgrammeVersion} version - Programme version
 * @param {Stage} stage - Stage containing this module
 * @param {{ semester?: string }} stageModule - Stage module reference
 * @returns {string} HTML markup
 */
export function renderModuleDescriptor(programme, mod, version, stage, stageModule) {
  const versionKey = `${version.id}_${version.deliveryModality}`;
  const effort = getEffortHours(mod, versionKey);
  const asmPcts = getAssessmentPercentages(mod);

  let html = "";

  // 7.1 Module Overview
  html += renderModuleOverviewTable(mod, stage, stageModule, version, effort);

  // Staffing requirements (Pre-requisites, Co-requisites, Max learners, Staff qualifications)
  html += renderStaffTable();

  // Assessment Techniques percentage contribution
  html += renderAssessmentTable(asmPcts);

  // 7.2 MIMLOs
  html += renderMimloTable(programme, mod);

  // 7.3 Indicative Module Content
  html += renderContentTable("7.3", "Indicative Module Content, Organisation and Structure");

  // 7.4 Work based learning
  html += renderContentTable(
    "7.4",
    "Work based learning and practice-placement",
    "",
    "(if applicable)",
  );

  // 7.5 Specific module resources
  html += renderContentTable("7.5", "Specific module resources required", "", "(if applicable)");

  // 7.6 Application of programme teaching
  html += renderContentTable(
    "7.6",
    "Application of programme teaching, learning and assessment strategies to this module",
  );

  // 7.7 Summative Assessment Strategy
  html += renderSummativeTable(mod);

  // 7.8 Sample Assessment Materials
  html += renderContentTable(
    "7.8",
    "Sample Assessment Materials",
    '<span class="note" style="font-style: italic;">List sample assessment materials as supporting documentation and supply in separate document.</span>',
  );

  // 7.9 Indicative reading lists
  html += renderReadingListTable(mod);

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
