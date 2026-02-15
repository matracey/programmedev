/**
 * Miscellaneous helper functions for formatting and data transformation.
 * @module utils/helpers
 */

import { escapeHtml } from "./dom";

/**
 * Formats a numeric value as a percentage string with the "%" suffix.
 *
 * @example
 * formatPct(75);    // "75%"
 * formatPct("50");  // "50%"
 * formatPct();      // "0%"
 */
export function formatPct(n?: number | string): string {
  const x = Number(n ?? 0);
  return `${x}%`;
}

/**
 * Returns the default delivery pattern percentages for a given modality.
 *
 * @example
 * defaultPatternFor("F2F");     // { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 }
 * defaultPatternFor("ONLINE");  // { syncOnlinePct: 40, asyncDirectedPct: 60, onCampusPct: 0 }
 */
export function defaultPatternFor(mod: string): {
  syncOnlinePct: number;
  asyncDirectedPct: number;
  onCampusPct: number;
} {
  if (mod === "F2F") {
    return { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 };
  }
  if (mod === "ONLINE") {
    return { syncOnlinePct: 40, asyncDirectedPct: 60, onCampusPct: 0 };
  }
  // BLENDED default
  return { syncOnlinePct: 30, asyncDirectedPct: 40, onCampusPct: 30 };
}

/** Calculates the total of all delivery pattern percentages. */
export function sumPattern(pat: {
  syncOnlinePct?: number;
  asyncDirectedPct?: number;
  onCampusPct?: number;
}): number {
  return (
    Number(pat.syncOnlinePct ?? 0) +
    Number(pat.asyncDirectedPct ?? 0) +
    Number(pat.onCampusPct ?? 0)
  );
}

/** Calculates the total credits for modules assigned to a stage. */
export function sumStageCredits(
  allModules: Module[],
  stageModules: Array<{ moduleId: string }>,
): number {
  const ids = (stageModules ?? []).map((x) => x.moduleId);
  return (allModules ?? [])
    .filter((m) => ids.includes(m.id))
    .reduce((acc, m) => acc + Number(m.credits ?? 0), 0);
}

/**
 * Generates an HTML summary of delivery pattern percentages for display.
 * Returns an em-dash span if no modality is set.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deliveryPatternsHtml(p: any): string {
  const mod = p.deliveryModality;
  const patterns =
    p.deliveryPatterns && typeof p.deliveryPatterns === "object" ? p.deliveryPatterns : {};
  if (!mod) {
    return '<span class="text-muted">—</span>';
  }

  const label = (k: string) =>
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
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mimloText(x: any): string {
  return typeof x === "string" ? x : x && typeof x === "object" ? (x.text ?? "") : "";
}

/**
 * Extracts the text content from a PLO (Programme Learning Outcome).
 * Handles both legacy string format and current object format.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ploText(x: any): string {
  return typeof x === "string" ? x : x && typeof x === "object" ? (x.text ?? "") : "";
}

/**
 * Migrates module MIMLOs from legacy string array format to object format.
 * Modifies the module in place, converting string[] to {id, text}[].
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ensureMimloObjects(module: Module & { mimlos?: any[] }): void {
  module.mimlos ??= [];
  if (module.mimlos.length && typeof module.mimlos[0] === "string") {
    module.mimlos = module.mimlos.map((t: unknown) => ({
      id: "mimlo_" + crypto.randomUUID(),
      text: String(t ?? ""),
    }));
  }
}

/**
 * Migrates programme PLOs from legacy string array format to object format.
 * Modifies the programme in place, converting string[] to {id, text, standardId}[].
 */
export function ensurePloObjects(programme: Programme): void {
  programme.plos ??= [];
  if (programme.plos.length && typeof programme.plos[0] === "string") {
    programme.plos = (programme.plos as unknown as unknown[]).map((t: unknown) => ({
      id: "plo_" + crypto.randomUUID(),
      text: String(t ?? ""),
      standardId: null,
    })) as PLO[];
  }
}
