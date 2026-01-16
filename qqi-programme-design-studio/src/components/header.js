/**
 * Header rendering component
 */

import { state } from '../state/store.js';
import { completionPercent } from '../utils/validation.js';

/**
 * Render the header (programme title, completion badge, save status)
 */
export function renderHeader() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';
  
  const titleEl = document.getElementById("programmeTitleNav");
  if (titleEl) {
    titleEl.textContent = p.title.trim() ? p.title : "New Programme (Draft)";
  }
  
  const comp = completionPercent(p);
  const badge = document.getElementById("completionBadge");
  if (badge) {
    badge.textContent = `${comp}% complete`;
    badge.className = "badge " + (comp >= 75 ? "text-bg-success" : comp >= 40 ? "text-bg-warning" : "text-bg-secondary");
  }
  
  const ss = document.getElementById("saveStatus");
  if (ss) {
    ss.textContent = state.saving 
      ? "Saving…" 
      : (state.lastSaved ? `Saved ${new Date(state.lastSaved).toLocaleString()}` : "Not saved yet");
  }
}
