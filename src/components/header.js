/**
 * Header rendering component
 */

import { state, activeSteps } from '../state/store.js';
import { completionPercent, validateProgramme } from '../utils/validation.js';
import { escapeHtml } from '../utils/dom.js';

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

    const flags = validateProgramme(p);
    const todoHtml = generateTodoList(flags);

    badge.setAttribute("data-bs-toggle", "popover");
    badge.setAttribute("data-bs-trigger", "hover");
    badge.setAttribute("data-bs-html", "true");
    badge.setAttribute("data-bs-placement", "bottom");
    badge.setAttribute("data-bs-title", comp === 100 ? "All complete!" : "Items to complete");
    badge.setAttribute("data-bs-content", todoHtml);
    badge.style.cursor = comp === 100 ? "default" : "pointer";

    const existingPopover = window.bootstrap?.Popover?.getInstance?.(badge);
    if (existingPopover) existingPopover.dispose();
    if (window.bootstrap?.Popover) {
      new window.bootstrap.Popover(badge, { trigger: "hover", html: true, placement: "bottom" });
    }
  }
  
  const ss = document.getElementById("saveStatus");
  if (ss) {
    ss.textContent = state.saving 
      ? "Saving…" 
      : (state.lastSaved ? `Saved ${new Date(state.lastSaved).toLocaleString()}` : "Not saved yet");
  }
}

function generateTodoList(flags) {
  if (!flags || flags.length === 0) {
    return `<div class="small text-success"><strong>All requirements met!</strong></div>`;
  }

  const byStep = {};
  flags.forEach(f => {
    if (!byStep[f.step]) byStep[f.step] = [];
    byStep[f.step].push(f);
  });

  const stepMap = {};
  activeSteps().forEach(s => { stepMap[s.key] = s.title; });

  let html = `<div class="small" style="max-width: 300px; max-height: 300px; overflow-y: auto;">`;
  Object.entries(byStep).forEach(([step, items]) => {
    const stepTitle = stepMap[step] || step;
    html += `<div class="mb-2">`;
    html += `<div class="fw-semibold text-primary">${escapeHtml(stepTitle)}</div>`;
    items.forEach(f => {
      const icon = f.type === "error" ? "!" : "i";
      const cls = f.type === "error" ? "text-danger" : "text-warning";
      html += `<div class="${cls} ms-2 small" style="margin-bottom: 4px;">${icon} ${escapeHtml(f.msg)}</div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}
