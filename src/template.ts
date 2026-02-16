/**
 * Programme Schedule Template - Entry point.
 * Handles file upload, rendering, and export functionality.
 * @module template
 */

import { downloadScheduleDocx } from "./export/schedule-docx";
import { renderAllModuleDescriptors } from "./template/module-descriptors-html";
import { renderAllSchedules } from "./template/schedule-html";

let currentProgrammeData: Programme | null = null;

function copyToClipboard(
  container: HTMLElement,
  button: HTMLButtonElement,
  statusEl: HTMLElement,
): void {
  // Temporarily set font size to 11pt for copying
  document.documentElement.style.setProperty("--display-font-size", "11pt");

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
  } catch {
    statusEl.textContent = "Copy failed - please select manually";
    statusEl.className = "error";
  }

  // Restore display font size to 9pt
  document.documentElement.style.setProperty("--display-font-size", "9pt");
  selection?.removeAllRanges();
}

async function handleFileUpload(
  file: File,
  statusEl: HTMLElement,
  schedulesContainer: HTMLElement,
  moduleDescriptorsContainer: HTMLElement,
  schedulesHeader: HTMLElement,
  moduleDescriptorsHeader: HTMLElement,
): Promise<void> {
  statusEl.textContent = "Loading...";
  statusEl.className = "";

  try {
    const text = await file.text();
    const data: Programme = JSON.parse(text);

    // Basic validation
    if (!data.modules || !data.versions) {
      throw new Error("Invalid programme JSON: missing required fields (modules, versions)");
    }

    statusEl.textContent = `✓ Loaded: ${data.title || file.name}`;
    statusEl.className = "success";
    currentProgrammeData = data;
    schedulesContainer.innerHTML = renderAllSchedules(data);
    moduleDescriptorsContainer.innerHTML = renderAllModuleDescriptors(data);

    // Show section headers
    schedulesHeader.style.display = "flex";
    moduleDescriptorsHeader.style.display = "flex";
  } catch (error) {
    const err = error as Error;
    statusEl.textContent = `✗ Error: ${err.message}`;
    statusEl.className = "error";
  }
}

async function handleDownloadDocx(button: HTMLButtonElement, statusEl: HTMLElement): Promise<void> {
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
    const err = error as Error;
    statusEl.textContent = `✗ DOCX Error: ${err.message}`;
    statusEl.className = "error";
    button.textContent = "Download DOCX";
  }
}

function init(): void {
  const uploadSection = document.getElementById("upload-section") as HTMLElement;
  const fileUpload = document.getElementById("file-upload") as HTMLInputElement;
  const uploadStatus = document.getElementById("upload-status") as HTMLElement;
  const schedulesContainer = document.getElementById("schedules-container") as HTMLElement;
  const moduleDescriptorsContainer = document.getElementById(
    "module-descriptors-container",
  ) as HTMLElement;
  const schedulesHeader = document.getElementById("schedules-header") as HTMLElement;
  const moduleDescriptorsHeader = document.getElementById(
    "module-descriptors-header",
  ) as HTMLElement;
  const copySchedulesBtn = document.getElementById("copy-schedules-btn") as HTMLButtonElement;
  const copyModuleDescriptorsBtn = document.getElementById(
    "copy-module-descriptors-btn",
  ) as HTMLButtonElement;
  const downloadDocxBtn = document.getElementById("download-docx-btn") as HTMLButtonElement;

  // Wire up event handlers
  copySchedulesBtn?.addEventListener("click", () => {
    copyToClipboard(schedulesContainer, copySchedulesBtn, uploadStatus);
  });

  copyModuleDescriptorsBtn?.addEventListener("click", () => {
    copyToClipboard(moduleDescriptorsContainer, copyModuleDescriptorsBtn, uploadStatus);
  });

  downloadDocxBtn?.addEventListener("click", () => {
    handleDownloadDocx(downloadDocxBtn, uploadStatus);
  });

  fileUpload?.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handleFileUpload(
        file,
        uploadStatus,
        schedulesContainer,
        moduleDescriptorsContainer,
        schedulesHeader,
        moduleDescriptorsHeader,
      );
    }
  });

  // Drag and drop handlers
  uploadSection?.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadSection.classList.add("drag-over");
  });

  uploadSection?.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadSection.classList.remove("drag-over");
  });

  uploadSection?.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadSection.classList.remove("drag-over");

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".json")) {
        handleFileUpload(
          file,
          uploadStatus,
          schedulesContainer,
          moduleDescriptorsContainer,
          schedulesHeader,
          moduleDescriptorsHeader,
        );
      } else {
        uploadStatus.textContent = "✗ Please drop a JSON file";
        uploadStatus.className = "error";
      }
    }
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);
