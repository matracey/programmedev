// @ts-check
/**
 * Miscellaneous helper functions for formatting and data transformation.
 * @module utils/helpers
 */

import { escapeHtml } from "./dom.js";

/**
 * Formats a numeric value as a percentage string with the "%" suffix.
 *
 * @param {number|string|undefined} n - The value to format (coerced to number, defaults to 0)
 * @returns {string} Formatted percentage string (e.g., "75%")
 * @example
 * formatPct(75);    // "75%"
 * formatPct("50");  // "50%"
 * formatPct();      // "0%"
 */
export function formatPct(n) {
  const x = Number(n ?? 0);
  return `${x}%`;
}

/**
 * Returns the default delivery pattern percentages for a given modality.
 *
 * @param {string} mod - The delivery modality: "F2F", "ONLINE", or "BLENDED"
 * @returns {{syncOnlinePct: number, asyncDirectedPct: number, onCampusPct: number}} Default percentage breakdown for the modality
 * @example
 * defaultPatternFor("F2F");     // { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 }
 * defaultPatternFor("ONLINE");  // { syncOnlinePct: 40, asyncDirectedPct: 60, onCampusPct: 0 }
 */
export function defaultPatternFor(mod) {
  if (mod === "F2F") {
    return { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 };
  }
  if (mod === "ONLINE") {
    return { syncOnlinePct: 40, asyncDirectedPct: 60, onCampusPct: 0 };
  }
  // BLENDED default
  return { syncOnlinePct: 30, asyncDirectedPct: 40, onCampusPct: 30 };
}

/**
 * Calculates the total of all delivery pattern percentages.
 *
 * @param {{syncOnlinePct?: number, asyncDirectedPct?: number, onCampusPct?: number}} pat - The delivery pattern object
 * @returns {number} Sum of all percentage values (should equal 100 for valid patterns)
 */
export function sumPattern(pat) {
  return (
    Number(pat.syncOnlinePct ?? 0) +
    Number(pat.asyncDirectedPct ?? 0) +
    Number(pat.onCampusPct ?? 0)
  );
}

/**
 * Calculates the total credits for modules assigned to a stage.
 *
 * @param {Module[]} allModules - All modules in the programme
 * @param {Array<{moduleId: string}>} stageModules - Module references assigned to the stage
 * @returns {number} Sum of credits for all modules in the stage
 */
export function sumStageCredits(allModules, stageModules) {
  const ids = (stageModules ?? []).map((/** @type {{moduleId: string}} */ x) => x.moduleId);
  return (allModules ?? [])
    .filter((/** @type {Module} */ m) => ids.includes(m.id))
    .reduce(
      (/** @type {number} */ acc, /** @type {Module} */ m) => acc + Number(m.credits ?? 0),
      0,
    );
}

/**
 * Generates an HTML summary of delivery pattern percentages for display.
 *
 * @param {any} p - Object containing deliveryModality and deliveryPatterns properties
 * @returns {string} HTML string showing the delivery breakdown, or em-dash if no modality set
 */
export function deliveryPatternsHtml(p) {
  const mod = p.deliveryModality;
  const patterns =
    p.deliveryPatterns && typeof p.deliveryPatterns === "object" ? p.deliveryPatterns : {};
  if (!mod) {
    return '<span class="text-muted">—</span>';
  }

  /** @param {string} k */
  const label = (k) =>
    k === "F2F"
      ? "Face-to-face"
      : k === "BLENDED"
        ? "Blended"
        : k === "ONLINE"
          ? "Fully online"
          : k;
  const pat = patterns[mod] ?? defaultPatternFor(mod);
  const a = Number(pat.syncOnlinePct ?? 0);
  const b = Number(pat.asyncDirectedPct ?? 0);
  const c = Number(pat.onCampusPct ?? 0);
  return `<div><span class="fw-semibold">${escapeHtml(label(mod))}:</span> ${a}% sync online, ${b}% async directed, ${c}% on campus</div>`;
}

/**
 * Extracts the text content from a MIMLO (Module Intended Minimum Learning Outcome).
 * Handles both legacy string format and current object format.
 *
 * @param {any} x - MIMLO value (string or object with text property)
 * @returns {string} The MIMLO text content
 */
export function mimloText(x) {
  return typeof x === "string" ? x : x && typeof x === "object" ? (x.text ?? "") : "";
}

/**
 * Extracts the text content from a PLO (Programme Learning Outcome).
 * Handles both legacy string format and current object format.
 *
 * @param {any} x - PLO value (string or object with text property)
 * @returns {string} The PLO text content
 */
export function ploText(x) {
  return typeof x === "string" ? x : x && typeof x === "object" ? (x.text ?? "") : "";
}

/**
 * Migrates module MIMLOs from legacy string array format to object format.
 * Modifies the module in place, converting string[] to {id, text}[].
 *
 * @param {Module & {mimlos?: any[]}} module - The module to migrate
 */
export function ensureMimloObjects(module) {
  module.mimlos ??= [];
  if (module.mimlos.length && typeof module.mimlos[0] === "string") {
    module.mimlos = module.mimlos.map((/** @type {any} */ t) => ({
      id: "mimlo_" + crypto.randomUUID(),
      text: String(t ?? ""),
    }));
  }
}

/**
 * Migrates programme PLOs from legacy string array format to object format.
 * Modifies the programme in place, converting string[] to {id, text, standardId}[].
 *
 * @param {Programme} programme - The programme to migrate
 */
export function ensurePloObjects(programme) {
  programme.plos ??= [];
  if (programme.plos.length && typeof programme.plos[0] === "string") {
    programme.plos = /** @type {PLO[]} */ (
      /** @type {unknown} */ (
        programme.plos.map((/** @type {any} */ t) => ({
          id: "plo_" + crypto.randomUUID(),
          text: String(t ?? ""),
          standardId: null,
        }))
      )
    );
  }
}
