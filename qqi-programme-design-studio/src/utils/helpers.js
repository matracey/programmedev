/**
 * Miscellaneous helper functions
 */

import { escapeHtml } from './dom.js';

/**
 * Format a number as percentage string
 */
export function formatPct(n) {
  const x = Number(n || 0);
  return `${x}%`;
}

/**
 * Get default delivery pattern for a modality
 */
export function defaultPatternFor(mod) {
  if (mod === "F2F") return { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 };
  if (mod === "ONLINE") return { syncOnlinePct: 40, asyncDirectedPct: 60, onCampusPct: 0 };
  // BLENDED default
  return { syncOnlinePct: 30, asyncDirectedPct: 40, onCampusPct: 30 };
}

/**
 * Sum delivery pattern percentages
 */
export function sumPattern(pat) {
  return Number(pat.syncOnlinePct || 0) + Number(pat.asyncDirectedPct || 0) + Number(pat.onCampusPct || 0);
}

/**
 * Sum credits for modules in a stage
 */
export function sumStageCredits(allModules, stageModules) {
  const ids = (stageModules || []).map(x => x.moduleId);
  return (allModules || []).filter(m => ids.includes(m.id)).reduce((acc, m) => acc + Number(m.credits || 0), 0);
}

/**
 * Generate delivery patterns HTML summary
 */
export function deliveryPatternsHtml(p) {
  const mods = Array.isArray(p.deliveryModalities) ? p.deliveryModalities : [];
  const patterns = (p.deliveryPatterns && typeof p.deliveryPatterns === "object") ? p.deliveryPatterns : {};
  if (mods.length === 0) return '<span class="text-muted">—</span>';
  
  const label = (k) => (k === "F2F" ? "Face-to-face" : k === "BLENDED" ? "Blended" : k === "ONLINE" ? "Fully online" : k);
  const rows = mods.map((m) => {
    const pat = patterns[m] || defaultPatternFor(m);
    const a = Number(pat.syncOnlinePct ?? 0);
    const b = Number(pat.asyncDirectedPct ?? 0);
    const c = Number(pat.onCampusPct ?? 0);
    return `<div><span class="fw-semibold">${escapeHtml(label(m))}:</span> ${a}% sync online, ${b}% async directed, ${c}% on campus</div>`;
  }).join("");
  return rows;
}

/**
 * Extract text from a MIMLO object (handles legacy string format)
 */
export function mimloText(x) {
  return (typeof x === "string") ? x : (x && typeof x === "object" ? (x.text || "") : "");
}

/**
 * Extract text from a PLO object (handles legacy string format)
 */
export function ploText(x) {
  return (typeof x === "string") ? x : (x && typeof x === "object" ? (x.text || "") : "");
}

/**
 * Ensure module MIMLOs are in object format (migrate from string[])
 */
export function ensureMimloObjects(module) {
  module.mimlos = module.mimlos || [];
  if (module.mimlos.length && typeof module.mimlos[0] === "string") {
    module.mimlos = module.mimlos.map(t => ({ 
      id: "mimlo_" + crypto.randomUUID(), 
      text: String(t || "") 
    }));
  }
}

/**
 * Ensure PLOs are in object format (migrate from string[])
 */
export function ensurePloObjects(programme) {
  programme.plos = programme.plos || [];
  if (programme.plos.length && typeof programme.plos[0] === "string") {
    programme.plos = programme.plos.map(t => ({ 
      id: "plo_" + crypto.randomUUID(), 
      text: String(t || ""),
      standardId: null
    }));
  }
}
