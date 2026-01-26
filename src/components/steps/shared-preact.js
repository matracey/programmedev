/**
 * Shared Preact components and hooks for step components
 * 
 * Provides reusable UI patterns like accordions, Bloom's guidance, etc.
 */

import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { html } from '../../lib/htm.js';
import { escapeHtml } from '../../utils/dom.js';

/**
 * Module-level cache for accordion states to persist across re-renders
 * Key: accordionId, Value: Set of open item IDs
 */
const accordionStateCache = new Map();

/**
 * Hook for managing accordion open/close state
 * Preserves which items are open across re-renders using module-level cache
 * 
 * @param {string} accordionId - The accordion container ID
 * @returns {Object} { openIds, setOpenIds, isOpen, toggle, expandAll, collapseAll }
 */
export function useAccordionState(accordionId) {
  // Initialize from cache or create new Set
  const [openIds, setOpenIds] = useState(() => {
    if (accordionStateCache.has(accordionId)) {
      return new Set(accordionStateCache.get(accordionId));
    }
    return new Set();
  });
  
  const isOpen = useCallback((id) => openIds.has(id), [openIds]);
  
  // Wrapper that updates cache synchronously before state update
  const updateAndCache = useCallback((updater) => {
    setOpenIds(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Update cache synchronously so it's available before component unmounts
      accordionStateCache.set(accordionId, new Set(next));
      return next;
    });
  }, [accordionId]);
  
  const toggle = useCallback((id) => {
    updateAndCache(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [updateAndCache]);
  
  const expandAll = useCallback((ids) => {
    updateAndCache(new Set(ids));
  }, [updateAndCache]);
  
  const collapseAll = useCallback(() => {
    updateAndCache(new Set());
  }, [updateAndCache]);
  
  return { openIds, setOpenIds, isOpen, toggle, expandAll, collapseAll };
}

/**
 * AccordionControls component - Expand/Collapse all buttons
 */
export function AccordionControls({ accordionId, onExpandAll, onCollapseAll }) {
  return html`
    <div class="d-flex justify-content-end gap-2 mb-2">
      <button 
        type="button"
        class="btn btn-link btn-sm p-0 m-0 text-decoration-none" 
        data-accordion-expand-all=${accordionId}
        onClick=${onExpandAll}
      >
        Expand all
      </button>
      <span class="text-secondary opacity-50">|</span>
      <button 
        type="button"
        class="btn btn-link btn-sm p-0 m-0 text-decoration-none" 
        data-accordion-collapse-all=${accordionId}
        onClick=${onCollapseAll}
      >
        Collapse all
      </button>
    </div>
  `;
}

/**
 * AccordionItem component - A single collapsible accordion item
 */
export function AccordionItem({ 
  id, 
  isOpen, 
  onToggle, 
  headerContent, 
  headerActions,
  children 
}) {
  const headingId = `${id}_heading`;
  const collapseId = `${id}_collapse`;
  
  return html`
    <div class="accordion-item">
      <h2 class="accordion-header" id=${headingId}>
        <button 
          class="accordion-button ${isOpen ? '' : 'collapsed'} w-100" 
          type="button" 
          onClick=${() => onToggle(id)}
          aria-expanded=${isOpen}
          aria-controls=${collapseId}
        >
          <div class="d-flex w-100 align-items-center gap-2">
            <div class="flex-grow-1">
              ${headerContent}
            </div>
            ${headerActions && html`
              <div class="header-actions d-flex align-items-center gap-2 me-2" onClick=${(e) => e.stopPropagation()}>
                ${headerActions}
              </div>
            `}
          </div>
        </button>
      </h2>
      <div 
        id=${collapseId} 
        class="accordion-collapse collapse ${isOpen ? 'show' : ''}" 
        aria-labelledby=${headingId}
      >
        <div class="accordion-body">
          ${children}
        </div>
      </div>
    </div>
  `;
}

/**
 * BloomsGuidance component - Shows Bloom's taxonomy verb suggestions
 */
export function BloomsGuidance({ level, contextLabel }) {
  const lvl = Number(level || 0);
  const title = lvl 
    ? `Bloom helper (aligned to NFQ level ${lvl})` 
    : "Bloom helper (choose NFQ level first)";

  let focus, verbs;

  if (!lvl) {
    focus = "Pick the programme NFQ level in Identity, then come back here for tailored verb suggestions.";
    verbs = ["describe", "explain", "apply", "analyse", "evaluate", "design"];
  } else if (lvl <= 6) {
    focus = "Emphasise foundational knowledge and applied skills (remember/understand/apply), with some analysis.";
    verbs = ["identify", "describe", "explain", "apply", "demonstrate", "use", "outline", "compare"];
  } else if (lvl === 7) {
    focus = "Balance application and analysis. Show problem-solving and autonomy.";
    verbs = ["apply", "analyse", "interpret", "solve", "integrate", "evaluate", "justify", "develop"];
  } else if (lvl === 8) {
    focus = "Push beyond application: critical analysis, evaluation, and creation/design.";
    verbs = ["analyse", "evaluate", "synthesise", "design", "develop", "critique", "justify", "implement"];
  } else if (lvl === 9) {
    focus = "Emphasise advanced evaluation and creation: originality, research-informed practice.";
    verbs = ["critically evaluate", "synthesise", "design", "develop", "formulate", "lead", "innovate", "apply research to"];
  } else {
    focus = "Emphasise original contribution, research leadership, and creation.";
    verbs = ["originate", "advance", "formulate", "innovate", "lead", "produce", "contribute", "critically appraise"];
  }

  return html`
    <div class="p-3 bg-light border rounded-4 mb-3">
      <div class="fw-semibold mb-1">${title} — for ${contextLabel}</div>
      <div class="small text-secondary mb-2">${focus}</div>
      <div>
        ${verbs.map(v => html`
          <span class="badge text-bg-light border me-1 mb-1">${v}</span>
        `)}
      </div>
      <div class="small text-secondary mt-2">
        Tip: start outcomes with a verb + object + standard (e.g., "Analyse X using Y to produce Z").
      </div>
    </div>
  `;
}

/**
 * Card component - Bootstrap card wrapper
 */
export function Card({ title, children, className = '', headerActions }) {
  return html`
    <div class="card shadow-sm ${className}">
      <div class="card-body">
        ${title && html`
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-title mb-0">${title}</h5>
            ${headerActions}
          </div>
        `}
        ${children}
      </div>
    </div>
  `;
}

/**
 * FormField component - Reusable form field with label
 */
export function FormField({ label, required, children, className = '' }) {
  return html`
    <div class=${className}>
      <label class="form-label fw-semibold">
        ${label}${required && html`<span class="text-danger">*</span>`}
      </label>
      ${children}
    </div>
  `;
}

/**
 * Hook for debounced save
 */
export function useDebouncedSave(saveNow, delay = 400) {
  const timerRef = useRef(null);
  
  const saveDebounced = useCallback((onSaved) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveNow();
      if (onSaved) onSaved();
    }, delay);
  }, [saveNow, delay]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  
  return saveDebounced;
}

/**
 * Hook for auto-saving on input changes
 */
export function useAutoSave(saveDebounced, render) {
  return useCallback((mutator) => {
    mutator();
    if (render) render();
    saveDebounced(() => {
      if (render) render();
    });
  }, [saveDebounced, render]);
}
