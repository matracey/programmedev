/**
 * Bootstrap integration hooks for Preact components
 * 
 * These hooks handle Bootstrap JS component initialization and cleanup
 * when used within Preact's component lifecycle.
 */

import { useEffect, useRef } from 'preact/hooks';

/**
 * Hook to initialize and manage a Bootstrap Popover
 * 
 * @param {Object} options - Popover options
 * @param {string} options.content - Popover content (can be HTML if html: true)
 * @param {string} options.title - Popover title
 * @param {string} options.trigger - Trigger type ('hover', 'click', 'focus', 'manual')
 * @param {string} options.placement - Placement ('top', 'bottom', 'left', 'right')
 * @param {boolean} options.html - Allow HTML in content
 * @returns {Object} ref - Ref to attach to the element
 */
export function useBootstrapPopover(options = {}) {
  const ref = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!ref.current || !window.bootstrap?.Popover) return;

    // Dispose existing popover if any
    if (popoverRef.current) {
      popoverRef.current.dispose();
    }

    // Create new popover
    popoverRef.current = new window.bootstrap.Popover(ref.current, {
      trigger: options.trigger || 'hover',
      placement: options.placement || 'bottom',
      html: options.html !== false,
      title: options.title || '',
      content: options.content || '',
    });

    return () => {
      if (popoverRef.current) {
        popoverRef.current.dispose();
        popoverRef.current = null;
      }
    };
  }, [options.content, options.title, options.trigger, options.placement, options.html]);

  return ref;
}

/**
 * Hook to initialize and manage a Bootstrap Tooltip
 * 
 * @param {Object} options - Tooltip options
 * @param {string} options.title - Tooltip text
 * @param {string} options.placement - Placement ('top', 'bottom', 'left', 'right')
 * @returns {Object} ref - Ref to attach to the element
 */
export function useBootstrapTooltip(options = {}) {
  const ref = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!ref.current || !window.bootstrap?.Tooltip) return;

    if (tooltipRef.current) {
      tooltipRef.current.dispose();
    }

    tooltipRef.current = new window.bootstrap.Tooltip(ref.current, {
      placement: options.placement || 'top',
      title: options.title || '',
    });

    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.dispose();
        tooltipRef.current = null;
      }
    };
  }, [options.title, options.placement]);

  return ref;
}

/**
 * Hook to manage Bootstrap Collapse state
 * Useful for accordion-style components
 * 
 * @param {boolean} isOpen - Whether the collapse should be open
 * @returns {Object} ref - Ref to attach to the collapsible element
 */
export function useBootstrapCollapse(isOpen) {
  const ref = useRef(null);
  const collapseRef = useRef(null);

  useEffect(() => {
    if (!ref.current || !window.bootstrap?.Collapse) return;

    if (!collapseRef.current) {
      collapseRef.current = new window.bootstrap.Collapse(ref.current, {
        toggle: false,
      });
    }

    if (isOpen) {
      collapseRef.current.show();
    } else {
      collapseRef.current.hide();
    }

    return () => {
      if (collapseRef.current) {
        collapseRef.current.dispose();
        collapseRef.current = null;
      }
    };
  }, [isOpen]);

  return ref;
}

/**
 * Hook to initialize Bootstrap Modal
 * 
 * @returns {Object} { ref, show, hide } - Ref and control functions
 */
export function useBootstrapModal() {
  const ref = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!ref.current || !window.bootstrap?.Modal) return;

    modalRef.current = new window.bootstrap.Modal(ref.current);

    return () => {
      if (modalRef.current) {
        modalRef.current.dispose();
        modalRef.current = null;
      }
    };
  }, []);

  const show = () => modalRef.current?.show();
  const hide = () => modalRef.current?.hide();

  return { ref, show, hide };
}

/**
 * Utility to generate popover content HTML for todo lists
 * 
 * @param {Array} flags - Validation flags
 * @param {Object} stepMap - Map of step keys to titles
 * @returns {string} HTML string for popover content
 */
export function generateTodoListHtml(flags, stepMap) {
  if (!flags || flags.length === 0) {
    return `<div class="small text-success"><strong>All requirements met!</strong></div>`;
  }

  const byStep = {};
  flags.forEach(f => {
    if (!byStep[f.step]) byStep[f.step] = [];
    byStep[f.step].push(f);
  });

  let html = `<div class="small" style="max-width: 300px; max-height: 300px; overflow-y: auto;">`;
  Object.entries(byStep).forEach(([step, items]) => {
    const stepTitle = stepMap[step] || step;
    html += `<div class="mb-2">`;
    html += `<div class="fw-semibold text-primary">${escapeHtmlForPopover(stepTitle)}</div>`;
    items.forEach(f => {
      const icon = f.type === "error" ? "!" : "i";
      const cls = f.type === "error" ? "text-danger" : "text-warning";
      html += `<div class="${cls} ms-2 small" style="margin-bottom: 4px;">${icon} ${escapeHtmlForPopover(f.msg)}</div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

// Local escape function for popover HTML generation
function escapeHtmlForPopover(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
