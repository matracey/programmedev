// @ts-check
/**
 * Programme Schedule DOCX export using docx.js library.
 * Generates Word documents with proper vertical text headers.
 * @module export/schedule-docx
 */

import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextDirection,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

const HEADER_SHADING = "D9E1F2";
const LABEL_SHADING = "E7E6E6";
const SUBTLE_SHADING = "F2F2F2";

/**
 * Creates a table cell with common styling.
 * @param {string} text - Cell text
 * @param {Object} [opts] - Options
 * @param {number} [opts.columnSpan] - Column span
 * @param {string} [opts.shading] - Background color hex
 * @param {boolean} [opts.bold] - Bold text
 * @param {boolean} [opts.vertical] - Vertical text
 * @param {boolean} [opts.small] - Smaller font
 * @param {number} [opts.width] - Width in twips
 * @returns {TableCell}
 */
function cell(text, opts = {}) {
  const { columnSpan, shading, bold, vertical, small, width } = opts;

  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: text,
            bold: bold,
            size: small ? 12 : 16,
            font: "Calibri",
          }),
        ],
        alignment: vertical ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 240 },
      }),
    ],
    verticalAlign: vertical ? VerticalAlign.CENTER : VerticalAlign.TOP,
    margins: {
      top: convertInchesToTwip(0.02),
      bottom: convertInchesToTwip(0.02),
      left: convertInchesToTwip(0.04),
      right: convertInchesToTwip(0.04),
    },
    columnSpan: columnSpan && columnSpan > 1 ? columnSpan : undefined,
    shading: shading ? { fill: shading } : undefined,
    textDirection: vertical ? TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT : undefined,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
  });
}

/**
 * Creates a table row.
 * @param {TableCell[]} cells - Cells in the row
 * @param {Object} [opts] - Options
 * @param {number} [opts.height] - Row height in twips
 * @returns {TableRow}
 */
function row(cells, opts = {}) {
  const { height } = opts;
  return new TableRow({
    children: cells,
    height: height ? { value: height, rule: "atLeast" } : undefined,
  });
}

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
        if (t.includes("exam") && t.includes("campus")) {
          types.invigilated = true;
        } else if (t.includes("exam") && t.includes("online")) {
          types.proctored = true;
        } else if (t.includes("project")) {
          types.project = true;
        } else if (t.includes("practical") || t.includes("lab")) {
          types.practical = true;
        } else if (t.includes("work")) {
          types.workBased = true;
        } else {
          types.continuous = true;
        }
      });
    }
  });

  return types;
}

/**
 * Generates a schedule table for a version/stage.
 * @param {Programme} programme - Programme data
 * @param {ProgrammeVersion} version - Programme version
 * @param {Stage} stage - Stage data
 * @returns {Table}
 */
function generateScheduleTable(programme, version, stage) {
  const stageModules = stage.modules ?? [];
  const deliveryKey = `${version.id}_${version.deliveryModality}`;
  const dm = version.deliveryModality ?? "";

  const assessmentTypes = getAssessmentTypes(programme, stageModules);
  const exitAwardTitle = stage.exitAward?.enabled
    ? stage.exitAward.awardTitle || "Exit Award Available"
    : "";

  const rows = [];

  // Row 1: Title
  rows.push(
    row([
      cell(`Proposed Programme Schedule(s) - ${version.label ?? ""} / ${stage.name ?? ""}`, {
        columnSpan: 29,
        shading: HEADER_SHADING,
        bold: true,
      }),
    ]),
  );

  // Row 2: Provider
  rows.push(
    row([
      cell("Name of Provider:", {
        columnSpan: 3,
        shading: LABEL_SHADING,
        bold: true,
      }),
      cell("", { columnSpan: 26 }),
    ]),
  );

  // Row 3: Programme Title
  rows.push(
    row([
      cell("Programme Title (Principal)", {
        columnSpan: 3,
        shading: LABEL_SHADING,
        bold: true,
      }),
      cell(programme.title ?? "", { columnSpan: 20 }),
      cell("ECTS", { columnSpan: 2, shading: LABEL_SHADING, bold: true }),
      cell(String(programme.totalCredits ?? ""), { columnSpan: 4 }),
    ]),
  );

  // Row 4: Stage
  rows.push(
    row([
      cell("Stage (1,2,3, Award etc)", {
        columnSpan: 3,
        shading: LABEL_SHADING,
        bold: true,
      }),
      cell(stage.name ?? "", { columnSpan: 2 }),
      cell("Exit Award Title (if relevant)", {
        columnSpan: 5,
        shading: LABEL_SHADING,
        bold: true,
      }),
      cell(exitAwardTitle, { columnSpan: 11 }),
      cell("Stage ECTS", { columnSpan: 2, shading: LABEL_SHADING, bold: true }),
      cell(String(stage.creditsTarget ?? ""), { columnSpan: 6 }),
    ]),
  );

  // Row 5: Delivery Mode Header
  rows.push(
    row([
      cell("Programme Delivery Mode ✔ one as appropriate.", {
        columnSpan: 3,
        shading: SUBTLE_SHADING,
        bold: true,
      }),
      cell("On-site Face-to-Face", {
        columnSpan: 5,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Blended", { columnSpan: 6, shading: HEADER_SHADING, bold: true }),
      cell("Online", { columnSpan: 6, shading: HEADER_SHADING, bold: true }),
      cell("Apprenticeship", {
        columnSpan: 9,
        shading: HEADER_SHADING,
        bold: true,
      }),
    ]),
  );

  // Row 6: Delivery Mode Values
  rows.push(
    row([
      cell("", { columnSpan: 3 }),
      cell(dm === "F2F" ? "✔" : "", { columnSpan: 5 }),
      cell(dm === "BLENDED" ? "✔" : "", { columnSpan: 6 }),
      cell(dm === "ONLINE" ? "✔" : "", { columnSpan: 6 }),
      cell(dm === "APPRENTICESHIP" ? "✔" : "", { columnSpan: 9 }),
    ]),
  );

  // Row 7: Teaching Modalities Header
  rows.push(
    row([
      cell("Teaching and Learning Modalities ✔ one or more as appropriate.", {
        columnSpan: 3,
        shading: SUBTLE_SHADING,
        bold: true,
      }),
      cell("On-site Face-to-Face", {
        columnSpan: 4,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Synchronous Hybrid", {
        columnSpan: 4,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Synchronous Online", {
        columnSpan: 6,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Asynchronous", {
        columnSpan: 4,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Independent", {
        columnSpan: 3,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Work Based", {
        columnSpan: 5,
        shading: HEADER_SHADING,
        bold: true,
      }),
    ]),
  );

  // Row 8: Teaching Modalities Values
  rows.push(
    row([
      cell("", { columnSpan: 3 }),
      cell(dm === "F2F" ? "✔" : "", { columnSpan: 4 }),
      cell(dm === "BLENDED" ? "✔" : "", { columnSpan: 4 }),
      cell(dm === "ONLINE" ? "✔" : "", { columnSpan: 6 }),
      cell("✔", { columnSpan: 4 }),
      cell("✔", { columnSpan: 3 }),
      cell("", { columnSpan: 5 }),
    ]),
  );

  // Row 9: Assessment Techniques Header
  rows.push(
    row([
      cell("Assessment Techniques Utilised in Stage ✔ one or more as appropriate.", {
        columnSpan: 3,
        shading: SUBTLE_SHADING,
        bold: true,
      }),
      cell("Continuous Assessment", {
        columnSpan: 4,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Invigilated Exam – in person", {
        columnSpan: 4,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Proctored Exam - online", {
        columnSpan: 6,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Project", { columnSpan: 4, shading: HEADER_SHADING, bold: true }),
      cell("Practical Skills Demonstration", {
        columnSpan: 3,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Work Based", {
        columnSpan: 5,
        shading: HEADER_SHADING,
        bold: true,
      }),
    ]),
  );

  // Row 10: Assessment Techniques Values
  rows.push(
    row([
      cell("", { columnSpan: 3 }),
      cell(assessmentTypes.continuous ? "✔" : "", { columnSpan: 4 }),
      cell(assessmentTypes.invigilated ? "✔" : "", { columnSpan: 4 }),
      cell(assessmentTypes.proctored ? "✔" : "", { columnSpan: 6 }),
      cell(assessmentTypes.project ? "✔" : "", { columnSpan: 4 }),
      cell(assessmentTypes.practical ? "✔" : "", { columnSpan: 3 }),
      cell(assessmentTypes.workBased ? "✔" : "", { columnSpan: 5 }),
    ]),
  );

  // Row 11: Modules Section Header
  rows.push(
    row([
      cell("Modules in this stage (add rows as required)", {
        columnSpan: 29,
        shading: HEADER_SHADING,
        bold: true,
      }),
    ]),
  );

  // Row 12: Effort/Assessment Group Headers
  rows.push(
    row([
      cell("", { columnSpan: 8, shading: LABEL_SHADING }),
      cell("Total Student Effort Module (hours)", {
        columnSpan: 10,
        shading: HEADER_SHADING,
        bold: true,
      }),
      cell("Assessment – Allocation of Marks", {
        columnSpan: 11,
        shading: HEADER_SHADING,
        bold: true,
      }),
    ]),
  );

  // Row 13: Column Headers (vertical text)
  rows.push(
    row(
      [
        cell("Module Title", { shading: HEADER_SHADING, bold: true }),
        cell("Semester", {
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Mandatory (M) or Elective (E)", {
          columnSpan: 2,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Credits (ECTS)", {
          columnSpan: 2,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Total Hours", {
          columnSpan: 2,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("On-site Face-to-Face", {
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Synchronous", {
          columnSpan: 3,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Asynchronous", {
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Independent", {
          columnSpan: 3,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Work Based", {
          columnSpan: 2,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Continuous Assessment %", {
          columnSpan: 2,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Invigilated Exam – in person %", {
          columnSpan: 2,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Proctored Exam – online %", {
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Project", {
          columnSpan: 2,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Practical Skills Demonstration %", {
          columnSpan: 2,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
        cell("Work Based %", {
          columnSpan: 2,
          shading: HEADER_SHADING,
          bold: true,
          vertical: true,
          small: true,
        }),
      ],
      { height: 1440 },
    ),
  );

  // Module rows
  stageModules.forEach((sm) => {
    const mod = (programme.modules ?? []).find((m) => m.id === sm.moduleId);
    if (!mod) {
      return;
    }

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
      if (t.includes("exam") && t.includes("campus")) {
        asmPcts.invigilated += w;
      } else if (t.includes("exam") && t.includes("online")) {
        asmPcts.proctored += w;
      } else if (t.includes("project")) {
        asmPcts.project += w;
      } else if (t.includes("practical") || t.includes("lab")) {
        asmPcts.practical += w;
      } else if (t.includes("work")) {
        asmPcts.workBased += w;
      } else {
        asmPcts.continuous += w;
      }
    });

    rows.push(
      row([
        cell(mod.title ?? ""),
        cell(sm.semester ?? ""),
        cell(mod.isElective ? "E" : "M", { columnSpan: 2 }),
        cell(String(mod.credits ?? ""), { columnSpan: 2 }),
        cell(String(totalHours), { columnSpan: 2 }),
        cell(String(effort.classroomHours ?? "")),
        cell(String(effort.mentoringHours ?? ""), { columnSpan: 3 }),
        cell(String(effort.directedElearningHours ?? "")),
        cell(String(effort.independentLearningHours ?? ""), { columnSpan: 3 }),
        cell(String(effort.workBasedHours ?? ""), { columnSpan: 2 }),
        cell(asmPcts.continuous ? String(asmPcts.continuous) : "", {
          columnSpan: 2,
        }),
        cell(asmPcts.invigilated ? String(asmPcts.invigilated) : "", {
          columnSpan: 2,
        }),
        cell(asmPcts.proctored ? String(asmPcts.proctored) : ""),
        cell(asmPcts.project ? String(asmPcts.project) : "", { columnSpan: 2 }),
        cell(asmPcts.practical ? String(asmPcts.practical) : "", {
          columnSpan: 2,
        }),
        cell(asmPcts.workBased ? String(asmPcts.workBased) : "", {
          columnSpan: 2,
        }),
      ]),
    );
  });

  // Empty rows if no modules
  if (stageModules.length === 0) {
    for (let i = 0; i < 2; i++) {
      rows.push(
        row([
          cell(""),
          cell(""),
          cell("", { columnSpan: 2 }),
          cell("", { columnSpan: 2 }),
          cell("", { columnSpan: 2 }),
          cell(""),
          cell("", { columnSpan: 3 }),
          cell(""),
          cell("", { columnSpan: 3 }),
          cell("", { columnSpan: 2 }),
          cell("", { columnSpan: 2 }),
          cell("", { columnSpan: 2 }),
          cell(""),
          cell("", { columnSpan: 2 }),
          cell("", { columnSpan: 2 }),
          cell("", { columnSpan: 2 }),
        ]),
      );
    }
  }

  return new Table({
    rows: rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4 },
      bottom: { style: BorderStyle.SINGLE, size: 4 },
      left: { style: BorderStyle.SINGLE, size: 4 },
      right: { style: BorderStyle.SINGLE, size: 4 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4 },
      insideVertical: { style: BorderStyle.SINGLE, size: 4 },
    },
  });
}

/**
 * Generates and downloads a DOCX file for programme schedules.
 *
 * @param {Programme} data - Programme data
 * @param {string} [filename] - Output filename (default: programme-schedule.docx)
 * @returns {Promise<void>}
 */
export async function downloadScheduleDocx(data, filename = "programme-schedule.docx") {
  /** @type {(Table | Paragraph)[]} */
  const children = [];

  (data.versions ?? []).forEach((version, vIdx) => {
    (version.stages ?? []).forEach((stage, sIdx) => {
      if (vIdx > 0 || sIdx > 0) {
        // Page break between tables
        children.push(new Paragraph({ pageBreakBefore: true }));
      }
      children.push(generateScheduleTable(data, version, stage));
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              // A4 landscape: 29.7cm x 21cm
              // width: '29.7cm',
              // height: '21cm',
            },
            margin: {
              top: "0.5in",
              right: "0.5in",
              bottom: "0.5in",
              left: "0.5in",
            },
          },
        },
        children: children,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 12,
          },
          paragraph: {
            spacing: { before: 0, after: 0, line: 240 },
          },
        },
      },
    },
  });

  const blob = await Packer.toBlob(doc);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
