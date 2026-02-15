/**
 * Unit tests for Header React component.
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../state/store";
import { Header } from "./Header";

// Mock the store module
vi.mock("../../state/store", async () => {
  const actual = await vi.importActual("../../state/store");
  return {
    ...actual,
    saveNow: vi.fn(),
    resetProgramme: vi.fn(),
    activeSteps: vi.fn(() => [
      { key: "identity", title: "Identity" },
      { key: "outcomes", title: "PLOs" },
      { key: "structure", title: "Credits & Modules" },
    ]),
  };
});

// Mock validation utilities
vi.mock("../../utils/validation.js", () => ({
  completionPercent: vi.fn(() => 50),
  validateProgramme: vi.fn(() => [
    { type: "error", msg: "Programme title is missing.", step: "identity" },
    { type: "warn", msg: "Award type is missing.", step: "identity" },
  ]),
}));

// Mock export/import functions
vi.mock("../../export/json.js", () => ({
  exportProgrammeToJson: vi.fn(),
  importProgrammeFromJson: vi.fn().mockResolvedValue({ success: true, programme: {} }),
}));

// Mock dom utilities
vi.mock("../../utils/dom.js", () => ({
  escapeHtml: vi.fn((str: string) => str),
}));

describe("Header", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Reset state to default
    state.programme = {
      schemaVersion: 3,
      id: "test",
      title: "",
      awardType: "",
      awardTypeIsOther: false,
      nfqLevel: null,
      school: "",
      awardStandardIds: [],
      awardStandardNames: [],
      totalCredits: 0,
      electiveDefinitions: [],
      modules: [],
      plos: [],
      ploToMimlos: {},
    } as Programme;
    state.saving = false;
    state.lastSaved = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the header component", () => {
      render(<Header />);

      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByText("NCI Programme Design Studio v2")).toBeInTheDocument();
    });

    it("displays the programme title", () => {
      state.programme.title = "Test Programme";
      render(<Header />);

      expect(screen.getByTestId("programme-title")).toHaveTextContent("Test Programme");
    });

    it("displays draft indicator when no title", () => {
      state.programme.title = "";
      render(<Header />);

      expect(screen.getByTestId("programme-title")).toHaveTextContent("New Programme (Draft)");
    });

    it("renders the completion badge", () => {
      render(<Header />);

      expect(screen.getByTestId("completion-badge")).toBeInTheDocument();
      expect(screen.getByTestId("completion-badge")).toHaveTextContent("50% complete");
    });

    it("renders the save status", () => {
      render(<Header />);

      expect(screen.getByTestId("save-status")).toBeInTheDocument();
      expect(screen.getByTestId("save-status")).toHaveTextContent("Not saved yet");
    });

    it("renders action buttons", () => {
      render(<Header />);

      expect(screen.getByTestId("export-btn")).toBeInTheDocument();
      expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    });
  });

  describe("Programme Title", () => {
    it("displays the programme title when set", () => {
      state.programme.title = "Higher Diploma in Computing";
      render(<Header />);

      expect(screen.getByTestId("programme-title")).toHaveTextContent(
        "Higher Diploma in Computing",
      );
    });

    it("shows draft indicator for empty title", () => {
      state.programme.title = "   "; // Whitespace only
      render(<Header />);

      expect(screen.getByTestId("programme-title")).toHaveTextContent("New Programme (Draft)");
    });
  });

  describe("Completion Badge", () => {
    it("shows completion percentage", () => {
      render(<Header />);

      const badge = screen.getByTestId("completion-badge");
      expect(badge).toHaveTextContent("50% complete");
    });

    it("has correct aria-label for accessibility", () => {
      render(<Header />);

      const badge = screen.getByTestId("completion-badge");
      expect(badge).toHaveAttribute("aria-label", "Programme 50% complete");
    });

    it("displays popover on hover", async () => {
      render(<Header />);

      const badge = screen.getByTestId("completion-badge");
      await act(async () => {
        fireEvent.mouseOver(badge);
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText("Items to complete")).toBeInTheDocument();
      });
    });
  });

  describe("Save Status", () => {
    it("shows 'Not saved yet' when never saved", () => {
      state.lastSaved = null;
      render(<Header />);

      expect(screen.getByTestId("save-status")).toHaveTextContent("Not saved yet");
    });
  });

  describe("Export Button", () => {
    it("calls export function on click", async () => {
      const { exportProgrammeToJson } = await import("../../export/json.js");
      render(<Header />);

      const exportBtn = screen.getByTestId("export-btn");
      await act(async () => {
        fireEvent.click(exportBtn);
      });

      expect(exportProgrammeToJson).toHaveBeenCalledWith(state.programme);
    });
  });

  describe("Theme Toggle", () => {
    it("renders theme toggle button", () => {
      render(<Header />);

      expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    });

    it("toggles theme on click", async () => {
      render(<Header />);

      const toggle = screen.getByTestId("theme-toggle");
      const initialTheme = document.documentElement.getAttribute("data-bs-theme");

      await act(async () => {
        fireEvent.click(toggle);
      });

      const newTheme = document.documentElement.getAttribute("data-bs-theme");
      expect(newTheme).not.toBe(initialTheme);
    });
  });

  describe("Import and Reset Buttons", () => {
    it("renders import button", () => {
      render(<Header />);

      // Import is now a label with hidden input
      expect(screen.getByTestId("import-input")).toBeInTheDocument();
    });

    it("calls importProgrammeFromJson when file is selected", async () => {
      const { importProgrammeFromJson } = await import("../../export/json.js");
      const { saveNow } = await import("../../state/store");

      render(<Header />);

      const input = screen.getByTestId("import-input") as HTMLInputElement;
      const file = new File(['{"title": "Test"}'], "test.json", { type: "application/json" });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(importProgrammeFromJson).toHaveBeenCalledWith(file);
      expect(saveNow).toHaveBeenCalled();
    });

    it("shows alert when import fails", async () => {
      const { importProgrammeFromJson } = await import("../../export/json.js");
      vi.mocked(importProgrammeFromJson).mockResolvedValueOnce({
        success: false,
        error: "Invalid JSON",
      });
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      render(<Header />);

      const input = screen.getByTestId("import-input") as HTMLInputElement;
      const file = new File(["invalid"], "test.json", { type: "application/json" });

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(alertSpy).toHaveBeenCalledWith("Import failed: Invalid JSON");
      alertSpy.mockRestore();
    });

    it("renders reset button", () => {
      render(<Header />);

      expect(screen.getByTestId("reset-btn")).toBeInTheDocument();
    });

    it("calls resetProgramme when reset button is clicked and confirmed", async () => {
      const { resetProgramme } = await import("../../state/store");
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      render(<Header />);

      const resetBtn = screen.getByTestId("reset-btn");
      await act(async () => {
        fireEvent.click(resetBtn);
      });

      expect(confirmSpy).toHaveBeenCalledWith(
        "Are you sure you want to reset? All data will be lost.",
      );
      expect(resetProgramme).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it("does not call resetProgramme when reset is cancelled", async () => {
      const { resetProgramme } = await import("../../state/store");
      vi.mocked(resetProgramme).mockClear();
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<Header />);

      const resetBtn = screen.getByTestId("reset-btn");
      await act(async () => {
        fireEvent.click(resetBtn);
      });

      expect(confirmSpy).toHaveBeenCalled();
      expect(resetProgramme).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe("Navigation callback", () => {
    it("calls onNavigateToStep when clicking step in popover", async () => {
      const onNavigateToStep = vi.fn();
      render(<Header onNavigateToStep={onNavigateToStep} />);

      const badge = screen.getByTestId("completion-badge");
      await act(async () => {
        fireEvent.mouseOver(badge);
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText("Identity")).toBeInTheDocument();
      });

      const stepLink = screen.getByText("Identity");
      await act(async () => {
        fireEvent.click(stepLink);
      });

      expect(onNavigateToStep).toHaveBeenCalledWith("identity");
    });
  });

  describe("Accessibility", () => {
    it("has proper role attributes", () => {
      render(<Header />);

      expect(screen.getByTestId("header")).toHaveAttribute("role", "banner");
      expect(screen.getByTestId("completion-badge")).toHaveAttribute("role", "status");
      expect(screen.getByTestId("save-status")).toHaveAttribute("role", "status");
    });

    it("theme toggle has aria-label", () => {
      render(<Header />);

      const toggle = screen.getByTestId("theme-toggle");
      expect(toggle).toHaveAttribute("aria-label");
    });
  });
});
