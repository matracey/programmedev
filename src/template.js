// @ts-check
/**
 * Programme Schedule Template - Entry point.
 * Handles file upload, rendering, and export functionality.
 * @module template
 */

import { downloadScheduleDocx } from "./export/schedule-docx.js";
import { renderAllModuleDescriptors } from "./template/module-descriptors-html.js";
import { renderAllSchedules } from "./template/schedule-html.js";

/** @type {Programme | null} */
let currentProgrammeData = null;

/**
 * Copies content to clipboard by selecting and executing copy command.
 * @param {HTMLElement} container - Element to copy content from
 * @param {HTMLButtonElement} button - Button to show feedback on
 * @param {HTMLElement} statusEl - Status element for error messages
 */
function copyToClipboard(container, button, statusEl) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  try {
    document.execCommand("copy");
    const originalText = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = originalText;
    }, 1500);
  } catch (err) {
    statusEl.textContent = "Copy failed - please select manually";
    statusEl.className = "error";
  }
}

/**
 * Handles file upload and parsing.
 * @param {File} file - Uploaded file
 * @param {HTMLElement} statusEl - Status element
 * @param {HTMLElement} schedulesContainer - Container for schedule tables
 * @param {HTMLElement} moduleDescriptorsContainer - Container for module descriptors
 */
async function handleFileUpload(file, statusEl, schedulesContainer, moduleDescriptorsContainer) {
  statusEl.textContent = "Loading...";
  statusEl.className = "";

  try {
    const text = await file.text();
    /** @type {Programme} */
    const data = JSON.parse(text);

    // Basic validation
    if (!data.modules || !data.versions) {
      throw new Error("Invalid programme JSON: missing required fields (modules, versions)");
    }

    statusEl.textContent = `✓ Loaded: ${data.title || file.name}`;
    statusEl.className = "success";
    currentProgrammeData = data;
    schedulesContainer.innerHTML = renderAllSchedules(data);
    moduleDescriptorsContainer.innerHTML = renderAllModuleDescriptors(data);
  } catch (error) {
    const err = /** @type {Error} */ (error);
    statusEl.textContent = `✗ Error: ${err.message}`;
    statusEl.className = "error";
  }
}

/**
 * Handles DOCX download.
 * @param {HTMLButtonElement} button - Download button
 * @param {HTMLElement} statusEl - Status element
 */
async function handleDownloadDocx(button, statusEl) {
  if (!currentProgrammeData) {
    statusEl.textContent = "Please upload a programme JSON first";
    statusEl.className = "error";
    return;
  }

  try {
    button.textContent = "Generating...";
    await downloadScheduleDocx(currentProgrammeData);
    button.textContent = "Download DOCX";
  } catch (error) {
    const err = /** @type {Error} */ (error);
    statusEl.textContent = `✗ DOCX Error: ${err.message}`;
    statusEl.className = "error";
    button.textContent = "Download DOCX";
  }
}

/**
 * Initializes the template page.
 */
function init() {
  const fileUpload = /** @type {HTMLInputElement} */ (document.getElementById("file-upload"));
  const uploadStatus = /** @type {HTMLElement} */ (document.getElementById("upload-status"));
  const schedulesContainer = /** @type {HTMLElement} */ (
    document.getElementById("schedules-container")
  );
  const moduleDescriptorsContainer = /** @type {HTMLElement} */ (
    document.getElementById("module-descriptors-container")
  );
  const copyBtn = /** @type {HTMLButtonElement} */ (document.getElementById("copy-btn"));
  const downloadDocxBtn = /** @type {HTMLButtonElement} */ (
    document.getElementById("download-docx-btn")
  );

  // Wire up event handlers
  copyBtn?.addEventListener("click", () => {
    copyToClipboard(schedulesContainer, copyBtn, uploadStatus);
  });

  downloadDocxBtn?.addEventListener("click", () => {
    handleDownloadDocx(downloadDocxBtn, uploadStatus);
  });

  fileUpload?.addEventListener("change", (e) => {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const file = target.files?.[0];
    if (file) {
      handleFileUpload(file, uploadStatus, schedulesContainer, moduleDescriptorsContainer);
    }
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);
