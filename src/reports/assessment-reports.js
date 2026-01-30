// @ts-check
/**
 * Assessment reports module.
 * Generates HTML reports analyzing assessment distribution across modules and stages.
 * @module reports/assessment-reports
 */

import { escapeHtml } from '../utils/dom.js';
import { formatPct } from '../utils/helpers.js';
import { ensureMimloObjects } from '../utils/helpers.js';

/** Available assessment report types */
export const ASSESSMENT_REPORT_TYPES = [
  { id: "byStageType", label: "By stage: assessment types + weighting" },
  { id: "byModule", label: "By module: assessment types + weighting" },
  { id: "coverage", label: "MIMLO coverage (unassessed outcomes)" }
];

/**
 * Finds a programme version by ID.
 *
 * @param {Programme} p - The programme data
 * @param {string} versionId - The version ID to find
 * @returns {ProgrammeVersion|null} The matching version or first version
 * @private
 */
function getVersionById(p, versionId) {
  return (p.versions ?? []).find((/** @type {ProgrammeVersion} */ v) => v.id === versionId) ?? (p.versions ?? [])[0] ?? null;
}

/**
 * Generates a report showing assessment distribution by stage and type.
 *
 * @param {Programme} p - The programme data
 * @param {string} versionId - The version ID to report on
 * @returns {string} HTML string containing the report table
 */
export function reportByStageType(p, versionId) {
  const v = getVersionById(p, versionId);
  if (!v) return `<div class="alert alert-warning mb-0">No versions found.</div>`;

  const modMap = new Map((p.modules ?? []).map((/** @type {Module} */ m) => [m.id, m]));

  /** @type {string[]} */
  const stageAgg = [];
  (v.stages ?? []).forEach((/** @type {Stage} */ stg) => {
    /** @type {Map<string, {weight: number, count: number}>} */
    const typeMap = new Map();
    (stg.modules ?? []).forEach((/** @type {any} */ ref) => {
      const m = modMap.get(ref.moduleId);
      if (!m) return;
      (m.assessments ?? []).forEach((/** @type {ModuleAssessment} */ a) => {
        const t = a.type || "Unspecified";
        const rec = typeMap.get(t) ?? { weight: 0, count: 0 };
        rec.weight += Number(a.weighting ?? 0);
        rec.count += 1;
        typeMap.set(t, rec);
      });
    });

    const rows = Array.from(typeMap.entries())
      .sort((a, b) => (b[1].weight - a[1].weight))
      .map(([type, rec]) => `
        <tr>
          <td>${escapeHtml(type)}</td>
          <td>${rec.count}</td>
          <td>${formatPct(rec.weight)}</td>
        </tr>
      `).join("") || `<tr><td colspan="3" class="text-muted">No assessments found in this stage.</td></tr>`;

    stageAgg.push(`
      <div class="card border-0 bg-white shadow-sm mb-3">
        <div class="card-body">
          <div class="fw-semibold mb-2">${escapeHtml(stg.name || "Stage")}</div>
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Assessment type</th>
                  <th class="text-nowrap">Count</th>
                  <th class="text-nowrap">Total weighting</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  });

  return stageAgg.join("") || `<div class="text-muted">No stages configured.</div>`;
}

/**
 * Report: By module
 * @param {Programme} p - The programme data
 * @returns {string} HTML string containing the report
 */
export function reportByModule(p) {
  const rows = (p.modules ?? []).map((/** @type {Module} */ m) => {
    /** @type {Map<string, {weight: number, count: number}>} */
    const typeMap = new Map();
    (m.assessments ?? []).forEach((/** @type {ModuleAssessment} */ a) => {
      const t = a.type || "Unspecified";
      const rec = typeMap.get(t) ?? { weight: 0, count: 0 };
      rec.weight += Number(a.weighting ?? 0);
      rec.count += 1;
      typeMap.set(t, rec);
    });

    const summary = Array.from(typeMap.entries())
      .sort((a, b) => b[1].weight - a[1].weight)
      .map(([t, rec]) => `${t} (${rec.count}, ${rec.weight}%)`)
      .join("; ");

    return `
      <tr>
        <td class="text-nowrap">${escapeHtml(m.code || "")}</td>
        <td>${escapeHtml(m.title || "")}</td>
        <td class="text-nowrap">${escapeHtml(summary || "—")}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="3" class="text-muted">No modules.</td></tr>`;

  return `
    <div class="card border-0 bg-white shadow-sm">
      <div class="card-body">
        <div class="fw-semibold mb-2">By module</div>
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Code</th>
                <th>Module</th>
                <th>Assessment mix</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/**
 * Report: MIMLO coverage (unassessed outcomes)
 * @param {Programme} p - The programme data
 * @returns {string} HTML string containing the report
 */
export function reportCoverage(p) {
  const items = (p.modules ?? []).map((/** @type {Module} */ m) => {
    ensureMimloObjects(m);
    const mimlos = m.mimlos ?? [];
    /** @type {Set<string>} */
    const assessed = new Set();
    (m.assessments ?? []).forEach((/** @type {ModuleAssessment} */ a) => (a.mimloIds ?? []).forEach((/** @type {string} */ id) => assessed.add(id)));

    const unassessed = mimlos.filter((/** @type {any} */ mi) => !assessed.has(mi.id));
    if (!unassessed.length) {
      return `
        <div class="card border-0 bg-white shadow-sm mb-2">
          <div class="card-body">
            <div class="fw-semibold">${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</div>
            <div class="small text-success">All MIMLOs assessed ✓</div>
          </div>
        </div>
      `;
    }
    return `
      <div class="card border-0 bg-white shadow-sm mb-2">
        <div class="card-body">
          <div class="fw-semibold">${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</div>
          <div class="small text-warning mb-2">Unassessed MIMLOs (${unassessed.length}):</div>
          <ul class="small mb-0">
            ${unassessed.map((/** @type {any} */ mi) => `<li>${escapeHtml(mi.text || "")}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;
  }).join("");

  return items || `<div class="text-muted">No modules.</div>`;
}

/**
 * Build report HTML based on type
 * @param {Programme} p - The programme data
 * @param {string} reportId - The report type ID
 * @param {string} versionId - The version ID
 * @returns {string} HTML string containing the report
 */
export function buildAssessmentReportHtml(p, reportId, versionId) {
  switch (reportId) {
    case "byStageType": return reportByStageType(p, versionId);
    case "byModule": return reportByModule(p);
    case "coverage": return reportCoverage(p);
    default: return `<div class="text-muted">Select a report.</div>`;
  }
}

/**
 * Open report in new tab
 * @param {string} html - The HTML content to display
 * @param {string} [title="Report"] - The window title
 */
export function openReportInNewTab(html, title = "Report") {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Allow popups to open report in a new tab.");
    return;
  }
  w.document.open();
  w.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${title}</title>
        <link rel="stylesheet" href="./assets/styles.css">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="p-3">
        <h4 class="mb-3">${title}</h4>
        ${html}
      </body>
    </html>
  `);
  w.document.close();
}
