/**
 * DOM utility functions
 */

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Generate HTML for status tag badges
 */
export function tagHtml(type) {
  if (type === "error") return `<span class="tag tag-error">ERROR</span>`;
  if (type === "warn") return `<span class="tag tag-warn">WARN</span>`;
  return `<span class="tag tag-ok">OK</span>`;
}
