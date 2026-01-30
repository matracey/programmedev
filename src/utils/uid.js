// @ts-check
/**
 * Unique ID generation utilities.
 * @module utils/uid
 */

/**
 * Generates a unique identifier string with an optional prefix.
 * Uses crypto.randomUUID() when available, falls back to random+timestamp.
 *
 * @param {string} [prefix="id"] - Prefix to prepend to the generated ID
 * @returns {string} A unique identifier in the format "prefix_uuid" or "prefix_random_timestamp"
 * @example
 * uid();          // "id_550e8400-e29b-41d4-a716-446655440000"
 * uid("module");  // "module_550e8400-e29b-41d4-a716-446655440000"
 */
export function uid(prefix = "id") {
  if (crypto?.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}
