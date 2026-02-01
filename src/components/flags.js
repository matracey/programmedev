// @ts-check
/**
 * Validation flags component.
 * Displays programme validation errors and warnings with navigation links.
 * @module components/flags
 */

import { activeSteps, state } from "../state/store.js";
import { escapeHtml, tagHtml } from "../utils/dom.js";

/**
 * Renders the validation flags panel showing errors and warnings.
 * Clicking a flag navigates to the associated step.
 *
 * @param {Array<{type: string, msg: string, step: string}>} flags - Validation flags to display
 * @param {Function} goToStep - Callback invoked with step key when a flag is clicked
 */
export function renderFlags(flags, goToStep) {
  const box = document.getElementById("flagsBox");
  if (!box) {
    return;
  }

  box.innerHTML = "";

  if (!flags.length) {
    box.innerHTML = `<div class="flag-item flag-ok" data-testid="flag-ok">${tagHtml("ok")} <div class="small">No flags — programme looks good!</div></div>`;
    return;
  }

  // Group flags by type for display
  const errors = flags.filter((f) => f.type === "error");
  const warnings = flags.filter((f) => f.type === "warn");

  // Summary header
  const summaryDiv = document.createElement("div");
  summaryDiv.className = "flags-summary mb-2 small";
  summaryDiv.setAttribute("data-testid", "flags-summary");
  const parts = [];
  if (errors.length) {
    parts.push(
      `<span class="text-danger fw-bold">${errors.length} error${errors.length > 1 ? "s" : ""}</span>`,
    );
  }
  if (warnings.length) {
    parts.push(
      `<span class="text-warning fw-bold">${warnings.length} warning${warnings.length > 1 ? "s" : ""}</span>`,
    );
  }
  summaryDiv.innerHTML = parts.join(" · ");
  box.appendChild(summaryDiv);

  const aSteps = activeSteps();

  flags.forEach((f, idx) => {
    const div = document.createElement("div");
    div.className = `flag-item flag-${f.type}`;
    div.setAttribute("data-testid", `flag-${f.type}-${idx}`);

    // Find step index for navigation
    const stepIdx = aSteps.findIndex((s) => s.key === f.step);
    const stepTitle = stepIdx >= 0 ? aSteps[stepIdx].title : "";

    div.innerHTML = `
      <div class="d-flex align-items-start gap-2">
        ${tagHtml(f.type)}
        <div class="flex-grow-1">
          <div class="small">${escapeHtml(f.msg)}</div>
          ${stepTitle ? `<div class="flag-step-link small text-muted"><i class="ph ph-arrow-right" aria-hidden="true"></i> ${escapeHtml(stepTitle)}</div>` : ""}
        </div>
      </div>
    `;

    // Make clickable if step is accessible
    if (stepIdx >= 0 && goToStep) {
      div.style.cursor = "pointer";
      div.setAttribute("role", "button");
      div.setAttribute("tabindex", "0");
      div.setAttribute(
        "aria-label",
        `${f.type === "error" ? "Error" : "Warning"}: ${f.msg}. Click to go to ${stepTitle}`,
      );
      div.onclick = () => {
        goToStep(f.step);
        // Scroll to content area
        const content = document.getElementById("content");
        if (content) {
          content.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };
      div.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToStep(f.step);
          const content = document.getElementById("content");
          if (content) {
            content.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      };
    }

    box.appendChild(div);
  });
}
