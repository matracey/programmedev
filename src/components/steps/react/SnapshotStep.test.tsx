/**
 * Unit tests for SnapshotStep React component.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../../state/store.js";
import { SnapshotStep } from "./SnapshotStep";

// Mock the store module
vi.mock("../../../state/store.js", async () => {
  const actual = await vi.importActual("../../../state/store.js");
  return {
    ...actual,
    saveNow: vi.fn(),
  };
});

// Mock the word export module
vi.mock("../../../export/word.js", () => ({
  exportProgrammeToWord: vi.fn().mockResolvedValue(undefined),
}));

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};
Object.assign(navigator, { clipboard: mockClipboard });

describe("SnapshotStep", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Reset state to default
    state.programme = {
      schemaVersion: 3,
      id: "test",
      title: "Test Programme",
      awardType: "Honours Bachelor Degree",
      awardTypeIsOther: false,
      nfqLevel: 8,
      school: "Computing",
      awardStandardIds: [],
      awardStandardNames: [],
      totalCredits: 180,
      electiveDefinitions: [],
      intakeMonths: ["Sep"],
      modules: [],
      plos: [],
      ploToMimlos: {},
      versions: [],
    } as Programme;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the snapshot card", () => {
      render(<SnapshotStep />);

      expect(screen.getByTestId("snapshot-card")).toBeInTheDocument();
      expect(screen.getByText("QQI Snapshot (copy/paste-ready)")).toBeInTheDocument();
    });

    it("displays programme summary", () => {
      render(<SnapshotStep />);

      expect(screen.getByText("Programme summary")).toBeInTheDocument();
      expect(screen.getByText("Test Programme")).toBeInTheDocument();
      expect(screen.getByText("Honours Bachelor Degree")).toBeInTheDocument();
      expect(screen.getByText("Computing")).toBeInTheDocument();
    });

    it("displays PLOs section", () => {
      state.programme.plos = [
        { id: "plo_1", text: "Analyse complex problems", standardMappings: [] },
        { id: "plo_2", text: "Design software solutions", standardMappings: [] },
      ];
      render(<SnapshotStep />);

      expect(screen.getByText("Programme Learning Outcomes (PLOs)")).toBeInTheDocument();
      expect(screen.getByText("Analyse complex problems")).toBeInTheDocument();
      expect(screen.getByText("Design software solutions")).toBeInTheDocument();
    });

    it("shows empty state for PLOs when none exist", () => {
      render(<SnapshotStep />);

      // Just verify the PLOs section renders without crashing when no PLOs
      expect(screen.getByText("Programme Learning Outcomes (PLOs)")).toBeInTheDocument();
    });

    it("displays modules when present", () => {
      state.programme.modules = [
        {
          id: "mod_1",
          title: "Introduction to Programming",
          code: "COMP101",
          credits: 10,
          mimlos: [],
        },
        {
          id: "mod_2",
          title: "Data Structures",
          code: "COMP102",
          credits: 10,
          mimlos: [],
        },
      ];
      render(<SnapshotStep />);

      expect(screen.getByText(/COMP101 — Introduction to Programming/)).toBeInTheDocument();
      expect(screen.getByText(/COMP102 — Data Structures/)).toBeInTheDocument();
    });

    it("shows no versions alert when none exist", () => {
      render(<SnapshotStep />);

      expect(screen.getByTestId("snapshot-no-versions")).toBeInTheDocument();
      expect(screen.getByText("No versions added yet.")).toBeInTheDocument();
    });
  });

  describe("Programme versions", () => {
    it("displays version accordion when versions exist", () => {
      state.programme.versions = [
        {
          id: "ver_1",
          code: "FT",
          label: "Full-time",
          duration: "4 years",
          intakes: ["Sep"],
          targetCohortSize: 50,
          numberOfGroups: 2,
          deliveryModalities: ["F2F"],
          deliveryPatterns: {
            F2F: { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 },
          },
          stages: [],
          onlineProctoredExams: "NO",
        },
      ] as any;
      render(<SnapshotStep />);

      expect(screen.getByText("Version 1")).toBeInTheDocument();
      expect(screen.getByText(/Full-time/)).toBeInTheDocument();
    });

    it("displays version delivery patterns", () => {
      state.programme.versions = [
        {
          id: "ver_1",
          code: "FT",
          label: "Full-time",
          deliveryModalities: ["F2F"],
          deliveryPatterns: {
            F2F: { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 },
          },
          stages: [],
        },
      ] as any;
      render(<SnapshotStep />);

      expect(screen.getByText("Delivery patterns")).toBeInTheDocument();
      expect(screen.getByText(/F2F/)).toBeInTheDocument();
      expect(screen.getByText(/100% on-campus/)).toBeInTheDocument();
    });
  });

  describe("Mapping matrix", () => {
    it("shows empty state when no PLOs or modules", () => {
      render(<SnapshotStep />);

      expect(
        screen.getByText("Add PLOs and modules to generate a mapping matrix."),
      ).toBeInTheDocument();
    });

    it("displays mapping matrix when PLOs and modules exist", () => {
      state.programme.plos = [{ id: "plo_1", text: "PLO One", standardMappings: [] }];
      state.programme.modules = [
        {
          id: "mod_1",
          title: "Module One",
          code: "M1",
          credits: 10,
          mimlos: [{ id: "mimlo_1", text: "MIMLO One" }],
        },
      ];
      state.programme.ploToMimlos = { plo_1: ["mimlo_1"] };
      render(<SnapshotStep />);

      expect(screen.getByTestId("snapshot-mapping-matrix")).toBeInTheDocument();
      expect(screen.getByText("PLO ↔ Module Mapping Matrix")).toBeInTheDocument();
      expect(screen.getByText("PLO 1")).toBeInTheDocument();
      expect(screen.getByText("M1")).toBeInTheDocument();
      // Check for the checkmark indicating mapping
      expect(screen.getByText("✓")).toBeInTheDocument();
    });
  });

  describe("Export actions", () => {
    it("disables Word export button when programme is incomplete", () => {
      state.programme.title = ""; // Missing required field
      render(<SnapshotStep />);

      const exportBtn = screen.getByTestId("snapshot-export-word");
      expect(exportBtn).toBeDisabled();
    });

    it("enables Word export button when programme is complete", () => {
      // Set up complete programme
      state.programme.title = "Test Programme";
      state.programme.awardType = "Higher Diploma";
      state.programme.nfqLevel = 8;
      state.programme.school = "Computing";
      state.programme.totalCredits = 60;
      state.programme.modules = [
        {
          id: "mod_1",
          code: "M1",
          title: "Module 1",
          credits: 60,
          mimlos: [{ id: "mimlo_1", text: "Test MIMLO" }],
          assessments: [
            {
              id: "asm_1",
              type: "CA",
              weighting: 100,
              title: "Test Assessment",
            },
          ],
        },
      ];
      // Need at least 6 PLOs for 100% completion
      state.programme.plos = [
        { id: "plo_1", text: "PLO 1", mappings: [] },
        { id: "plo_2", text: "PLO 2", mappings: [] },
        { id: "plo_3", text: "PLO 3", mappings: [] },
        { id: "plo_4", text: "PLO 4", mappings: [] },
        { id: "plo_5", text: "PLO 5", mappings: [] },
        { id: "plo_6", text: "PLO 6", mappings: [] },
      ];
      state.programme.versions = [
        {
          id: "ver_1",
          label: "FT",
          code: "FT",
          duration: "1 year",
          intakes: ["Sep"],
          stages: [
            {
              id: "stage_1",
              name: "Stage 1",
              sequence: 1,
              creditsTarget: 60,
              modules: [{ moduleId: "mod_1" }],
            },
          ],
        },
      ];
      state.programme.ploToMimlos = { plo_1: ["mimlo_1"] };

      render(<SnapshotStep />);

      const exportBtn = screen.getByTestId("snapshot-export-word");
      expect(exportBtn).not.toBeDisabled();
    });

    it("renders JSON copy button", () => {
      render(<SnapshotStep />);

      expect(screen.getByTestId("snapshot-copy-json")).toBeInTheDocument();
      expect(screen.getByText("Copy JSON")).toBeInTheDocument();
    });

    it("renders JSON download button", () => {
      render(<SnapshotStep />);

      expect(screen.getByTestId("snapshot-download-json")).toBeInTheDocument();
      expect(screen.getByText("Download JSON")).toBeInTheDocument();
    });

    it("copies JSON to clipboard when copy button is clicked", async () => {
      render(<SnapshotStep />);

      const copyBtn = screen.getByTestId("snapshot-copy-json");
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
    });

    it("shows success state after copying", async () => {
      render(<SnapshotStep />);

      const copyBtn = screen.getByTestId("snapshot-copy-json");
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper aria labels on export buttons", () => {
      render(<SnapshotStep />);

      expect(
        screen.getByRole("button", { name: /Copy programme JSON to clipboard/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Download programme JSON file/i }),
      ).toBeInTheDocument();
    });

    it("has heading for snapshot card", () => {
      render(<SnapshotStep />);

      expect(screen.getByRole("heading", { name: /QQI Snapshot/i })).toBeInTheDocument();
    });
  });
});
