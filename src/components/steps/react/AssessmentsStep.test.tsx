/**
 * Unit tests for AssessmentsStep React component.
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AssessmentsStep } from "./AssessmentsStep";

// Mock programme data
const mockProgramme = {
  title: "Test Programme",
  nfqLevel: 8,
  mode: "PROGRAMME_OWNER",
  modules: [
    {
      id: "mod_test1",
      title: "Introduction to Computing",
      code: "COMP101",
      credits: 10,
      mimlos: [
        { id: "mimlo_test1", text: "Analyse basic computing concepts" },
        { id: "mimlo_test2", text: "Design simple algorithms" },
      ],
      assessments: [
        {
          id: "asm_test1",
          title: "Assignment 1",
          type: "Report/Essay",
          weighting: 50,
          mode: "Online",
          integrity: { originalityCheck: true, aiDeclaration: true },
          mimloIds: ["mimlo_test1"],
          notes: "",
        },
        {
          id: "asm_test2",
          title: "Final Exam",
          type: "Exam (On campus)",
          weighting: 50,
          mode: "OnCampus",
          integrity: { proctored: true },
          mimloIds: ["mimlo_test2"],
          notes: "",
        },
      ],
    },
    {
      id: "mod_test2",
      title: "Database Systems",
      code: "COMP201",
      credits: 10,
      mimlos: [{ id: "mimlo_test3", text: "Evaluate database designs" }],
      assessments: [],
    },
  ],
  versions: [
    {
      id: "ver_test1",
      label: "Version 1.0",
      stages: [
        {
          name: "Stage 1",
          modules: [{ moduleId: "mod_test1" }, { moduleId: "mod_test2" }],
        },
      ],
    },
  ],
  moduleEditor: { assignedModuleIds: [] },
};

let mockState: {
  programme: typeof mockProgramme;
  selectedModuleId: string | null;
  reportTypeId?: string;
  reportVersionId?: string;
} = {
  programme: { ...mockProgramme },
  selectedModuleId: null,
};

vi.mock("../../../state/store", () => ({
  state: {
    get programme() {
      return mockState.programme;
    },
    get selectedModuleId() {
      return mockState.selectedModuleId;
    },
    set selectedModuleId(val: string | null) {
      mockState.selectedModuleId = val;
    },
    get reportTypeId() {
      return mockState.reportTypeId;
    },
    set reportTypeId(val: string | undefined) {
      mockState.reportTypeId = val;
    },
    get reportVersionId() {
      return mockState.reportVersionId;
    },
    set reportVersionId(val: string | undefined) {
      mockState.reportVersionId = val;
    },
  },
  saveDebounced: vi.fn((cb) => {
    if (cb) {
      cb();
    }
  }),
  editableModuleIds: vi.fn(() => mockState.programme.modules.map((m) => m.id)),
  getSelectedModuleId: vi.fn(() => mockState.programme.modules[0]?.id ?? ""),
}));

vi.mock("../../../hooks/useStore", () => ({
  useProgramme: vi.fn(() => ({ programme: mockState.programme, revision: 1 })),
  useSaveDebounced: vi.fn(() => vi.fn()),
  useUpdateProgramme: vi.fn(() => (updates: Record<string, unknown>) => {
    mockState.programme = { ...mockState.programme, ...updates } as typeof mockProgramme;
  }),
}));

vi.mock("../../flags.js", () => ({
  renderFlags: vi.fn(),
}));

vi.mock("../../header.js", () => ({
  renderHeader: vi.fn(),
}));

vi.mock("../../../utils/validation.js", () => ({
  validateProgramme: vi.fn(() => []),
}));

vi.mock("../../../utils/uid.js", () => ({
  uid: vi.fn((prefix: string) => `${prefix}_generated`),
}));

vi.mock("../../../utils/helpers.js", () => ({
  ensureMimloObjects: vi.fn((module: { mimlos?: unknown[] }) => {
    module.mimlos = module.mimlos ?? [];
  }),
  formatPct: vi.fn((val: number) => `${val}%`),
  mimloText: vi.fn((x: unknown) =>
    typeof x === "string"
      ? x
      : x && typeof x === "object"
        ? ((x as { text?: string }).text ?? "")
        : "",
  ),
}));

vi.mock("../../../utils/dom.js", () => ({
  escapeHtml: vi.fn((str: string) => str),
}));

describe("AssessmentsStep", () => {
  beforeEach(() => {
    mockState = {
      programme: JSON.parse(JSON.stringify(mockProgramme)),
      selectedModuleId: null,
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render the step title", () => {
      render(<AssessmentsStep />);
      expect(screen.getByText("Assessments")).toBeInTheDocument();
    });

    it("should render the help text", () => {
      render(<AssessmentsStep />);
      expect(
        screen.getByText(/Create assessments per module, set weightings, and map to MIMLOs/i),
      ).toBeInTheDocument();
    });

    it("should show empty state when no modules exist", () => {
      mockState.programme.modules = [];
      render(<AssessmentsStep />);
      expect(screen.getByText(/No modules available to edit/i)).toBeInTheDocument();
    });

    it("should render existing modules", () => {
      render(<AssessmentsStep />);
      expect(screen.getByText(/COMP101 — Introduction to Computing/i)).toBeInTheDocument();
      expect(screen.getByText(/COMP201 — Database Systems/i)).toBeInTheDocument();
    });

    it("should show assessment counts", () => {
      render(<AssessmentsStep />);
      expect(screen.getByText("2 assessments")).toBeInTheDocument();
      expect(screen.getByText("0 assessments")).toBeInTheDocument();
    });
  });

  describe("Weighting Validation", () => {
    it("should show success badge when weighting totals 100%", () => {
      render(<AssessmentsStep />);
      expect(screen.getByText("Total 100%")).toBeInTheDocument();
    });

    it("should show warning badge when weighting does not total 100%", () => {
      mockState.programme.modules[0].assessments[0].weighting = 30;
      render(<AssessmentsStep />);
      expect(screen.getByText(/Total 80%.*should be 100/i)).toBeInTheDocument();
    });
  });

  describe("Adding Assessments", () => {
    it("should have Add buttons for each module", () => {
      render(<AssessmentsStep />);
      expect(screen.getByTestId("add-asm-mod_test1")).toBeInTheDocument();
      expect(screen.getByTestId("add-asm-mod_test2")).toBeInTheDocument();
    });

    it("should add a new assessment when Add button is clicked", async () => {
      render(<AssessmentsStep />);
      const addButton = screen.getByTestId("add-asm-mod_test2");

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(mockState.programme.modules[1].assessments).toHaveLength(1);
    });
  });

  describe("Removing Assessments", () => {
    it("should remove assessment when remove button is clicked", async () => {
      render(<AssessmentsStep />);
      const removeButton = screen.getByTestId("remove-asm-asm_test1");

      await act(async () => {
        fireEvent.click(removeButton);
      });

      expect(mockState.programme.modules[0].assessments).toHaveLength(1);
    });
  });

  describe("Report Controls", () => {
    it("should render report type select", () => {
      render(<AssessmentsStep />);
      expect(screen.getByTestId("report-type-select")).toBeInTheDocument();
    });

    it("should render report version select", () => {
      render(<AssessmentsStep />);
      expect(screen.getByTestId("report-version-select")).toBeInTheDocument();
    });

    it("should have show inline button with correct label", () => {
      render(<AssessmentsStep />);
      expect(screen.getByTestId("run-report-inline")).toHaveTextContent("Show Report Below");
    });

    it("should have new tab button with correct label", () => {
      render(<AssessmentsStep />);
      expect(screen.getByTestId("run-report-newtab")).toHaveTextContent("Open Report in New Tab");
    });

    it("should show report when Show Report Below is clicked", async () => {
      render(<AssessmentsStep />);
      const showButton = screen.getByTestId("run-report-inline");

      await act(async () => {
        fireEvent.click(showButton);
      });

      expect(screen.getByTestId("report-output")).toBeInTheDocument();
    });

    it("should toggle button label to Hide Report when report is shown", async () => {
      render(<AssessmentsStep />);
      const showButton = screen.getByTestId("run-report-inline");
      expect(showButton).toHaveTextContent("Show Report Below");

      await act(async () => {
        fireEvent.click(showButton);
      });

      expect(showButton).toHaveTextContent("Hide Report");
    });

    it("should hide report when Hide Report is clicked", async () => {
      render(<AssessmentsStep />);
      const showButton = screen.getByTestId("run-report-inline");

      // Show report
      await act(async () => {
        fireEvent.click(showButton);
      });
      expect(screen.getByTestId("report-output")).toBeInTheDocument();

      // Hide report
      await act(async () => {
        fireEvent.click(showButton);
      });
      expect(screen.queryByTestId("report-output")).not.toBeInTheDocument();
    });

    it("should render report buttons in a button group", () => {
      render(<AssessmentsStep />);
      const inlineBtn = screen.getByTestId("run-report-inline");
      const newTabBtn = screen.getByTestId("run-report-newtab");
      const group = inlineBtn.closest(".btn-group");
      expect(group).toBeTruthy();
      expect(group).toContainElement(newTabBtn);
    });
  });

  describe("Accordion Controls", () => {
    it("should render expand/collapse controls when modules exist", () => {
      render(<AssessmentsStep />);
      expect(screen.getByText("Expand all")).toBeInTheDocument();
      expect(screen.getByText("Collapse all")).toBeInTheDocument();
    });

    it("should not render expand/collapse controls when no modules exist", () => {
      mockState.programme.modules = [];
      render(<AssessmentsStep />);
      expect(screen.queryByText("Expand all")).not.toBeInTheDocument();
    });
  });

  describe("Module Editor Mode", () => {
    it("should not show module picker in PROGRAMME_OWNER mode", () => {
      render(<AssessmentsStep />);
      expect(screen.queryByTestId("assessment-module-picker")).not.toBeInTheDocument();
    });

    it("should not show module picker when only one assigned module", () => {
      mockState.programme.mode = "MODULE_EDITOR";
      mockState.programme.modules = [mockState.programme.modules[0]];
      render(<AssessmentsStep />);
      expect(screen.queryByTestId("assessment-module-picker")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible labels for Add buttons", () => {
      render(<AssessmentsStep />);
      const addButton = screen.getByTestId("add-asm-mod_test1");
      expect(addButton).toHaveAccessibleName(/Add assessment to Introduction to Computing/i);
    });

    it("should have accessible labels for Remove buttons", () => {
      render(<AssessmentsStep />);
      const removeButton = screen.getByTestId("remove-asm-asm_test1");
      expect(removeButton).toHaveAccessibleName(/Remove assessment Assignment 1/i);
    });
  });

  describe("Empty Module Assessments", () => {
    it("should show empty state message for module with no assessments", () => {
      render(<AssessmentsStep />);
      expect(screen.getByText(/No assessments yet/i)).toBeInTheDocument();
    });
  });
});
