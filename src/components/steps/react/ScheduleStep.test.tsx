/**
 * Unit tests for ScheduleStep React component.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../../state/store.js";
import { ScheduleStep } from "./ScheduleStep";

// Mock the store module
vi.mock("../../../state/store.js", async () => {
  const actual = await vi.importActual("../../../state/store.js");
  return {
    ...actual,
    saveNow: vi.fn(),
  };
});

// Mock validation and rendering functions
vi.mock("../../../utils/validation.js", () => ({
  validateProgramme: vi.fn(() => []),
}));

vi.mock("../../flags.js", () => ({
  renderFlags: vi.fn(),
}));

vi.mock("../../header.js", () => ({
  renderHeader: vi.fn(),
}));

describe("ScheduleStep", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Reset state to default
    state.programme = {
      schemaVersion: 3,
      id: "test",
      title: "Test Programme",
      awardType: "Higher Diploma",
      awardTypeIsOther: false,
      nfqLevel: 8,
      school: "",
      awardStandardIds: [],
      awardStandardNames: [],
      totalCredits: 60,
      electiveDefinitions: [],
      intakeMonths: [],
      modules: [],
      plos: [],
      ploToMimlos: {},
      versions: [],
    } as Programme;
    state.selectedVersionId = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("shows warning when no versions exist", () => {
      render(<ScheduleStep />);

      expect(screen.getByText(/Add at least one Programme Version first/i)).toBeInTheDocument();
    });

    it("renders the Programme Schedule card when versions exist", () => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          duration: "1 year",
          stages: [],
        },
      ];
      render(<ScheduleStep />);

      expect(screen.getByText("Programme Schedule")).toBeInTheDocument();
      expect(screen.getByTestId("schedule-step")).toBeInTheDocument();
    });

    it("displays version selector", () => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          stages: [],
        },
      ];
      render(<ScheduleStep />);

      const select = screen.getByTestId("schedule-version-select");
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue("ver_1");
    });

    it("displays print button", () => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          stages: [],
        },
      ];
      render(<ScheduleStep />);

      expect(screen.getByTestId("schedule-print-btn")).toBeInTheDocument();
    });
  });

  describe("Programme Info Card", () => {
    beforeEach(() => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          duration: "1 year",
          stages: [],
        },
      ];
    });

    it("displays programme title", () => {
      render(<ScheduleStep />);

      expect(screen.getByText("Test Programme")).toBeInTheDocument();
    });

    it("displays award type", () => {
      render(<ScheduleStep />);

      expect(screen.getByText("Higher Diploma")).toBeInTheDocument();
    });

    it("displays NFQ level", () => {
      render(<ScheduleStep />);

      expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("displays total credits", () => {
      render(<ScheduleStep />);

      expect(screen.getByText("60 ECTS")).toBeInTheDocument();
    });

    it("displays delivery mode label", () => {
      render(<ScheduleStep />);

      expect(screen.getByText("Face-to-face")).toBeInTheDocument();
    });

    it("displays version duration", () => {
      render(<ScheduleStep />);

      expect(screen.getByText("1 year")).toBeInTheDocument();
    });
  });

  describe("Version Selection", () => {
    beforeEach(() => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          stages: [],
        },
        {
          id: "ver_2",
          label: "Part-time",
          code: "PT",
          deliveryModality: "BLENDED",
          stages: [],
        },
      ];
    });

    it("displays all versions in selector", () => {
      render(<ScheduleStep />);

      const select = screen.getByTestId("schedule-version-select");
      const options = select.querySelectorAll("option");

      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent("FT — Full-time");
      expect(options[1]).toHaveTextContent("PT — Part-time");
    });

    it("changes selected version on select change", () => {
      render(<ScheduleStep />);

      const select = screen.getByTestId("schedule-version-select");
      fireEvent.change(select, { target: { value: "ver_2" } });

      expect(state.selectedVersionId).toBe("ver_2");
    });
  });

  describe("Stages Display", () => {
    beforeEach(() => {
      state.programme.modules = [
        {
          id: "mod_1",
          title: "Introduction to Programming",
          code: "PROG101",
          credits: 10,
          assessments: [{ id: "asm_1", type: "Assignment", weighting: 50 }],
          effortHours: {},
        },
        {
          id: "mod_2",
          title: "Database Systems",
          code: "DB101",
          credits: 10,
          assessments: [{ id: "asm_2", type: "Exam", weighting: 60 }],
          effortHours: {},
        },
      ];
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          stages: [
            {
              id: "stg_1",
              name: "Year 1",
              sequence: 1,
              creditsTarget: 60,
              modules: [
                { moduleId: "mod_1", semester: "S1" },
                { moduleId: "mod_2", semester: "S2" },
              ],
            },
          ],
        },
      ];
    });

    it("shows no stages message when version has no stages", () => {
      state.programme.versions[0].stages = [];
      render(<ScheduleStep />);

      expect(screen.getByTestId("schedule-no-stages")).toBeInTheDocument();
      expect(screen.getByText(/No stages defined for this version/i)).toBeInTheDocument();
    });

    it("renders stage accordion when stages exist", () => {
      render(<ScheduleStep />);

      expect(screen.getByTestId("schedule-accordion")).toBeInTheDocument();
      expect(screen.getByTestId("schedule-stage-1")).toBeInTheDocument();
    });

    it("displays stage name in accordion header", () => {
      render(<ScheduleStep />);

      expect(screen.getByText("Year 1")).toBeInTheDocument();
    });

    it("displays credits target in accordion header", () => {
      render(<ScheduleStep />);

      expect(screen.getByText(/Target: 60 ECTS/)).toBeInTheDocument();
    });

    it("renders schedule table for stage", () => {
      render(<ScheduleStep />);

      expect(screen.getByTestId("schedule-table-1")).toBeInTheDocument();
    });

    it("displays module titles in table", () => {
      render(<ScheduleStep />);

      expect(screen.getByText("Introduction to Programming")).toBeInTheDocument();
      expect(screen.getByText("Database Systems")).toBeInTheDocument();
    });

    it("displays module semesters", () => {
      render(<ScheduleStep />);

      expect(screen.getByText("S1")).toBeInTheDocument();
      expect(screen.getByText("S2")).toBeInTheDocument();
    });

    it("displays module credits", () => {
      render(<ScheduleStep />);

      // Both modules have 10 credits
      const creditCells = screen.getAllByText("10");
      expect(creditCells.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Assessment Strategy Calculation", () => {
    beforeEach(() => {
      state.programme.modules = [
        {
          id: "mod_1",
          title: "Test Module",
          code: "TEST101",
          credits: 10,
          assessments: [
            { id: "asm_1", type: "Assignment", weighting: 40 },
            { id: "asm_2", type: "Exam", weighting: 60 },
          ],
          effortHours: {},
        },
      ];
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          stages: [
            {
              id: "stg_1",
              name: "Year 1",
              sequence: 1,
              creditsTarget: 10,
              modules: [{ moduleId: "mod_1", semester: "S1" }],
            },
          ],
        },
      ];
    });

    it("calculates CA percentage from assignments", () => {
      render(<ScheduleStep />);

      const row = screen.getByTestId("schedule-row-mod_1");
      expect(row).toHaveTextContent("40");
    });

    it("calculates exam percentage", () => {
      render(<ScheduleStep />);

      const row = screen.getByTestId("schedule-row-mod_1");
      expect(row).toHaveTextContent("60");
    });
  });

  describe("Legend", () => {
    beforeEach(() => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          stages: [],
        },
      ];
    });

    it("displays the legend", () => {
      render(<ScheduleStep />);

      expect(screen.getByTestId("schedule-legend")).toBeInTheDocument();
      expect(screen.getByText(/Status: M = Mandatory/)).toBeInTheDocument();
    });
  });

  describe("Accordion Controls", () => {
    beforeEach(() => {
      state.programme.modules = [
        {
          id: "mod_1",
          title: "Module 1",
          code: "MOD1",
          credits: 10,
        },
      ];
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          stages: [
            {
              id: "stg_1",
              name: "Year 1",
              sequence: 1,
              creditsTarget: 30,
              modules: [{ moduleId: "mod_1" }],
            },
            {
              id: "stg_2",
              name: "Year 2",
              sequence: 2,
              creditsTarget: 30,
              modules: [],
            },
          ],
        },
      ];
    });

    it("renders expand/collapse all buttons when stages exist", () => {
      render(<ScheduleStep />);

      expect(screen.getByRole("button", { name: /Expand all/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Collapse all/i })).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          deliveryModality: "F2F",
          stages: [],
        },
      ];
    });

    it("has proper aria-label on version selector", () => {
      render(<ScheduleStep />);

      expect(screen.getByLabelText(/Select programme version/i)).toBeInTheDocument();
    });

    it("has proper aria-label on print button", () => {
      render(<ScheduleStep />);

      expect(screen.getByRole("button", { name: /Print schedule/i })).toBeInTheDocument();
    });

    it("has visually-hidden label for version selector", () => {
      render(<ScheduleStep />);

      const label = screen.getByText("Select programme version");
      expect(label).toHaveClass("visually-hidden");
    });
  });
});
