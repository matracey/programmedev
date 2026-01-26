/**
 * QQI Flags Component (Preact + Legacy)
 * 
 * Renders the validation flags panel showing errors and warnings.
 * Includes both Preact component and legacy render function for incremental migration.
 */

import { html } from '../lib/htm.js';
import { activeStepsSignal, activeSteps } from '../state/store.js';
import { escapeHtml, tagHtml } from '../utils/dom.js';

/**
 * Single Flag Item Preact component
 */
function FlagItem({ flag, stepTitle, stepIdx, goToStep }) {
  const isClickable = stepIdx >= 0 && goToStep;
  
  const handleClick = () => {
    if (isClickable) {
      goToStep(flag.step);
      const content = document.getElementById("content");
      if (content) content.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Use dangerouslySetInnerHTML for the tag since it contains HTML
  const tagContent = flag.type === "error" 
    ? '<span class="tag tag-error">ERROR</span>'
    : flag.type === "warn"
    ? '<span class="tag tag-warn">WARN</span>'
    : '<span class="tag tag-ok">OK</span>';

  return html`
    <div 
      class="flag-item flag-${flag.type}"
      style="cursor: ${isClickable ? 'pointer' : 'default'}"
      onClick=${handleClick}
    >
      <div class="d-flex align-items-start gap-2">
        <span dangerouslySetInnerHTML=${{ __html: tagContent }}></span>
        <div class="flex-grow-1">
          <div class="small">${flag.msg}</div>
          ${stepTitle ? html`<div class="flag-step-link small text-muted">→ ${stepTitle}</div>` : null}
        </div>
      </div>
    </div>
  `;
}

/**
 * Flags Preact component - displays validation flags
 * 
 * @param {Object} props
 * @param {Array} props.flags - Array of validation flags
 * @param {Function} props.goToStep - Callback when a flag is clicked (receives step key)
 */
export function Flags({ flags, goToStep }) {
  const aSteps = activeStepsSignal.value;
  
  if (!flags || !flags.length) {
    return html`
      <div class="flag-item flag-ok">
        <span dangerouslySetInnerHTML=${{ __html: tagHtml("ok") }}></span>
        <div class="small">No flags — programme looks good!</div>
      </div>
    `;
  }
  
  // Group flags by type for display
  const errors = flags.filter(f => f.type === "error");
  const warnings = flags.filter(f => f.type === "warn");
  
  // Summary parts
  const summaryParts = [];
  if (errors.length) summaryParts.push(html`<span class="text-danger fw-bold">${errors.length} error${errors.length > 1 ? 's' : ''}</span>`);
  if (warnings.length) summaryParts.push(html`<span class="text-warning fw-bold">${warnings.length} warning${warnings.length > 1 ? 's' : ''}</span>`);

  return html`
    <div class="flags-summary mb-2 small">
      ${summaryParts.map((part, i) => html`${i > 0 ? ' · ' : ''}${part}`)}
    </div>
    ${flags.map(f => {
      const stepIdx = aSteps.findIndex(s => s.key === f.step);
      const stepTitle = stepIdx >= 0 ? aSteps[stepIdx].title : "";
      return html`<${FlagItem} flag=${f} stepTitle=${stepTitle} stepIdx=${stepIdx} goToStep=${goToStep} />`;
    })}
  `;
}

// ============================================================================
// LEGACY FUNCTIONS (for backward compatibility during migration)
// ============================================================================

/**
 * Legacy render function - updates DOM directly
 * @param {Array} flags - Array of validation flags
 * @param {Function} goToStep - Callback when a flag is clicked (receives step key)
 */
export function renderFlags(flags, goToStep) {
  const box = document.getElementById("flagsBox");
  if (!box) return;
  
  box.innerHTML = "";
  
  if (!flags.length) {
    box.innerHTML = `<div class="flag-item flag-ok">${tagHtml("ok")} <div class="small">No flags — programme looks good!</div></div>`;
    return;
  }
  
  // Group flags by type for display
  const errors = flags.filter(f => f.type === "error");
  const warnings = flags.filter(f => f.type === "warn");
  
  // Summary header
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "flags-summary mb-2 small";
  const parts = [];
  if (errors.length) parts.push(`<span class="text-danger fw-bold">${errors.length} error${errors.length > 1 ? 's' : ''}</span>`);
  if (warnings.length) parts.push(`<span class="text-warning fw-bold">${warnings.length} warning${warnings.length > 1 ? 's' : ''}</span>`);
  summaryDiv.innerHTML = parts.join(' · ');
  box.appendChild(summaryDiv);
  
  const aSteps = activeSteps();
  
  flags.forEach(f => {
    const div = document.createElement("div");
    div.className = `flag-item flag-${f.type}`;
    
    // Find step index for navigation
    const stepIdx = aSteps.findIndex(s => s.key === f.step);
    const stepTitle = stepIdx >= 0 ? aSteps[stepIdx].title : "";
    
    div.innerHTML = `
      <div class="d-flex align-items-start gap-2">
        ${tagHtml(f.type)}
        <div class="flex-grow-1">
          <div class="small">${escapeHtml(f.msg)}</div>
          ${stepTitle ? `<div class="flag-step-link small text-muted">→ ${escapeHtml(stepTitle)}</div>` : ''}
        </div>
      </div>
    `;
    
    // Make clickable if step is accessible
    if (stepIdx >= 0 && goToStep) {
      div.style.cursor = "pointer";
      div.onclick = () => {
        goToStep(f.step);
        // Scroll to content area
        const content = document.getElementById("content");
        if (content) content.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    }
    
    box.appendChild(div);
  });
}
