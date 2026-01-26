/**
 * Header Component (Preact + Legacy)
 * 
 * Renders the programme title, completion badge with popover, and save status.
 * Includes both Preact component and legacy render function for incremental migration.
 */

import { useEffect, useRef } from 'preact/hooks';
import { html } from '../lib/htm.js';
import { 
  programmeSignal, 
  savingSignal, 
  lastSavedSignal,
  activeStepsSignal,
  state,
  activeSteps,
} from '../state/store.js';
import { completionPercent, validateProgramme } from '../utils/validation.js';
import { escapeHtml } from '../utils/dom.js';
import { generateTodoListHtml } from '../lib/bootstrap-hooks.js';

/**
 * Header Preact component - displays programme title, completion badge, and save status
 */
export function Header() {
  const programme = programmeSignal.value;
  const saving = savingSignal.value;
  const lastSaved = lastSavedSignal.value;
  const aSteps = activeStepsSignal.value;
  
  // Ensure mode is set
  if (!programme.mode) programme.mode = 'PROGRAMME_OWNER';
  
  const title = programme.title?.trim() || "New Programme (Draft)";
  const comp = completionPercent(programme);
  
  // Badge styling based on completion
  const badgeClass = comp >= 75 ? "text-bg-success" : comp >= 40 ? "text-bg-warning" : "text-bg-secondary";
  
  // Save status text
  const saveStatusText = saving 
    ? "Saving…" 
    : (lastSaved ? `Saved ${new Date(lastSaved).toLocaleString()}` : "Not saved yet");

  // Generate popover content
  const flags = validateProgramme(programme);
  const stepMap = {};
  aSteps.forEach(s => { stepMap[s.key] = s.title; });
  const todoHtml = generateTodoListHtml(flags, stepMap);
  const popoverTitle = comp === 100 ? "All complete!" : "Items to complete";

  // Ref for Bootstrap popover
  const badgeRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!badgeRef.current || !window.bootstrap?.Popover) return;

    // Dispose existing popover
    if (popoverRef.current) {
      popoverRef.current.dispose();
    }

    // Create new popover
    popoverRef.current = new window.bootstrap.Popover(badgeRef.current, {
      trigger: 'hover',
      html: true,
      placement: 'bottom',
      title: popoverTitle,
      content: todoHtml,
    });

    return () => {
      if (popoverRef.current) {
        popoverRef.current.dispose();
        popoverRef.current = null;
      }
    };
  }, [todoHtml, popoverTitle]);

  return html`
    <span class="h5 mb-0" id="programmeTitleNav">${title}</span>
    <span 
      ref=${badgeRef}
      class="badge ${badgeClass}" 
      id="completionBadge"
      style="cursor: ${comp === 100 ? 'default' : 'pointer'}"
    >
      ${comp}% complete
    </span>
    <span class="small text-secondary" id="saveStatus">${saveStatusText}</span>
  `;
}

// ============================================================================
// LEGACY FUNCTIONS (for backward compatibility during migration)
// ============================================================================

/**
 * Legacy render function - updates DOM directly
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
