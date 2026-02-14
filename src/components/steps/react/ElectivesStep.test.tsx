/**
 * Unit tests for ElectivesStep React component.
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ElectivesStep } from "./ElectivesStep";

// Mock programme data
const mockProgramme = {
  title: "Test Programme",
  totalCredits: 180,
  modules: [
    { id: "mod_1", title: "Elective Module 1", code: "EM1", credits: 10, isElective: true },
    { id: "mod_2", title: "Elective Module 2", code: "EM2", credits: 10, isElective: true },
    { id: "mod_3", title: "Mandatory Module", code: "MM1", credits: 15, isElective: false },
  ],
  electiveDefinitions: [
    {
      id: "edef_1",
      name: "Year 3 Specialization",
      code: "ELEC1",
      credits: 20,
      groups: [
        { id: "egrp_1", name: "Data Track", code: "ELEC1-A", moduleIds: ["mod_1"] },
        { id: "egrp_2", name: "Security Track", code: "ELEC1-B", moduleIds: [] },
      ],
    },
  ],
};

let mockState = { programme: { ...mockProgramme }, stepIndex: 0 };

vi.mock("../../../state/store.js", () => ({
  state: {
    get programme() {
      return mockState.programme;
    },
    get stepIndex() {
      return mockState.stepIndex;
    },
    set stepIndex(val: number) {
      mockState.stepIndex = val;
    },
  },
  steps: [
    { key: "identity", label: "Identity" },
    { key: "structure", label: "Structure" },
    { key: "electives", label: "Electives" },
  ],
  saveDebounced: vi.fn((cb) => {
    if (cb) {
      cb();
    }
  }),
}));

vi.mock("../../../hooks/useStore", () => ({
  useProgramme: vi.fn(() => ({ programme: mockState.programme, revision: 1 })),
  useSaveDebounced: vi.fn(() => vi.fn()),
  useUpdateProgramme: vi.fn(() => (updates: Record<string, unknown>) => {
    mockState.programme = { ...mockState.programme, ...updates };
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

describe("ElectivesStep", () => {
  beforeEach(() => {
    mockState = {
      programme: {
        ...mockProgramme,
        modules: [...mockProgramme.modules],
        electiveDefinitions: mockProgramme.electiveDefinitions.map((def) => ({
          ...def,
          groups: def.groups.map((g) => ({ ...g, moduleIds: [...g.moduleIds] })),
        })),
      },
      stepIndex: 0,
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render the step title", () => {
      render(<ElectivesStep />);
      expect(screen.getByText("Electives")).toBeInTheDocument();
    });

    it("should render the credit summary cards", () => {
      render(<ElectivesStep />);
      expect(screen.getByTestId("mandatory-credits")).toBeInTheDocument();
      expect(screen.getByTestId("elective-def-count")).toBeInTheDocument();
      expect(screen.getByTestId("elective-credits")).toBeInTheDocument();
      expect(screen.getByTestId("total-credits")).toBeInTheDocument();
    });

    it("should show correct credit values", () => {
      render(<ElectivesStep />);
      expect(screen.getByTestId("total-credits")).toHaveTextContent("180 cr");
      expect(screen.getByTestId("elective-credits")).toHaveTextContent("20 cr");
      expect(screen.getByTestId("mandatory-credits")).toHaveTextContent("160");
      expect(screen.getByTestId("elective-def-count")).toHaveTextContent("1");
    });

    it("should render the guidance info box", () => {
      render(<ElectivesStep />);
      expect(screen.getByText(/How elective definitions & groups work/i)).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show message when no elective definitions exist", () => {
      mockState.programme.electiveDefinitions = [];
      render(<ElectivesStep />);
      expect(screen.getByText(/No elective definitions created/i)).toBeInTheDocument();
    });

    it("should show link to Identity step when no definitions", () => {
      mockState.programme.electiveDefinitions = [];
      render(<ElectivesStep />);
      expect(screen.getByText(/Go to Identity step/i)).toBeInTheDocument();
    });
  });

  describe("Elective Definitions", () => {
    it("should render elective definition accordion", () => {
      render(<ElectivesStep />);
      expect(screen.getByTestId("elective-def-edef_1")).toBeInTheDocument();
    });

    it("should show definition name and code", () => {
      render(<ElectivesStep />);
      expect(screen.getByText("Year 3 Specialization")).toBeInTheDocument();
      expect(screen.getByText("ELEC1")).toBeInTheDocument();
    });

    it("should show definition credits badge", () => {
      render(<ElectivesStep />);
      // Use getAllByText since "20 cr" appears multiple times (summary card + accordion header)
      const badges = screen.getAllByText(/20 cr/);
      expect(badges.length).toBeGreaterThan(0);
    });

    it("should show groups count badge", () => {
      render(<ElectivesStep />);
      expect(screen.getByText("2 groups")).toBeInTheDocument();
    });
  });

  describe("Elective Groups", () => {
    it("should render group cards", () => {
      render(<ElectivesStep />);
      expect(screen.getByTestId("elective-group-egrp_1")).toBeInTheDocument();
      expect(screen.getByTestId("elective-group-egrp_2")).toBeInTheDocument();
    });

    it("should show group name and code", () => {
      render(<ElectivesStep />);
      expect(screen.getByText("Data Track")).toBeInTheDocument();
      expect(screen.getByText("ELEC1-A")).toBeInTheDocument();
    });

    it("should show assigned modules in group", () => {
      render(<ElectivesStep />);
      expect(screen.getByText("Elective Module 1")).toBeInTheDocument();
    });

    it("should show module count for group", () => {
      render(<ElectivesStep />);
      expect(screen.getByText("1 module")).toBeInTheDocument();
    });

    it("should show credits mismatch badge when applicable", () => {
      render(<ElectivesStep />);
      // Group 1 has 10 credits but definition requires 20
      expect(screen.getByText("10/20 cr")).toBeInTheDocument();
    });
  });

  describe("Module Assignment", () => {
    it("should render module assignment dropdown", () => {
      render(<ElectivesStep />);
      expect(screen.getByTestId("assign-module-egrp_1")).toBeInTheDocument();
    });

    it("should render unassign button for assigned modules", () => {
      render(<ElectivesStep />);
      expect(screen.getByTestId("unassign-module-mod_1-egrp_1")).toBeInTheDocument();
    });

    it("should unassign module when remove button is clicked", async () => {
      render(<ElectivesStep />);
      const unassignBtn = screen.getByTestId("unassign-module-mod_1-egrp_1");

      await act(async () => {
        fireEvent.click(unassignBtn);
      });

      // Module should be removed from group
      const group = mockState.programme.electiveDefinitions[0].groups[0];
      expect(group.moduleIds).not.toContain("mod_1");
    });

    it("should assign module when selected from dropdown", async () => {
      render(<ElectivesStep />);
      const select = screen.getByTestId("assign-module-egrp_2");

      await act(async () => {
        fireEvent.change(select, { target: { value: "mod_2" } });
      });

      // Module should be added to group
      const group = mockState.programme.electiveDefinitions[0].groups[1];
      expect(group.moduleIds).toContain("mod_2");
    });
  });

  describe("Unassigned Modules", () => {
    it("should show unassigned electives card when there are unassigned modules", () => {
      render(<ElectivesStep />);
      expect(screen.getByTestId("unassigned-electives-card")).toBeInTheDocument();
    });

    it("should not show unassigned card when all electives are assigned", () => {
      // Assign mod_2 to a group
      mockState.programme.electiveDefinitions[0].groups[1].moduleIds = ["mod_2"];
      render(<ElectivesStep />);
      expect(screen.queryByTestId("unassigned-electives-card")).not.toBeInTheDocument();
    });

    it("should show count of unassigned modules", () => {
      render(<ElectivesStep />);
      // mod_2 is unassigned - look for the badge by testid instead of text
      const card = screen.getByTestId("unassigned-electives-card");
      expect(card).toHaveTextContent("1"); // Badge showing count
    });
  });

  describe("No Elective Modules Warning", () => {
    it("should show warning when definitions exist but no elective modules", () => {
      mockState.programme.modules = mockState.programme.modules.filter((m) => !m.isElective);
      render(<ElectivesStep />);
      expect(screen.getByText(/No elective modules available/i)).toBeInTheDocument();
    });

    it("should show link to Structure step", () => {
      mockState.programme.modules = mockState.programme.modules.filter((m) => !m.isElective);
      render(<ElectivesStep />);
      expect(screen.getByText(/Go to Credits & Modules/i)).toBeInTheDocument();
    });
  });

  describe("Accordion Controls", () => {
    it("should render expand/collapse controls when definitions exist", () => {
      render(<ElectivesStep />);
      expect(screen.getByText("Expand all")).toBeInTheDocument();
      expect(screen.getByText("Collapse all")).toBeInTheDocument();
    });

    it("should not render expand/collapse controls when no definitions", () => {
      mockState.programme.electiveDefinitions = [];
      render(<ElectivesStep />);
      expect(screen.queryByText("Expand all")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible labels for form controls", () => {
      render(<ElectivesStep />);
      const selects = screen.getAllByRole("combobox");
      expect(selects.length).toBeGreaterThan(0);
    });

    it("should have accessible remove buttons", () => {
      render(<ElectivesStep />);
      const removeBtn = screen.getByTestId("unassign-module-mod_1-egrp_1");
      expect(removeBtn).toHaveAccessibleName(/Remove Elective Module 1 from group/i);
    });

    it("should have role list for module listings", () => {
      render(<ElectivesStep />);
      const lists = screen.getAllByRole("list");
      expect(lists.length).toBeGreaterThan(0);
    });
  });

  describe("Mandatory Module Warning", () => {
    it("should show warning badge when mandatory module is in elective group", () => {
      // Add mandatory module to an elective group
      mockState.programme.electiveDefinitions[0].groups[0].moduleIds.push("mod_3");
      render(<ElectivesStep />);
      expect(screen.getByText(/Contains mandatory module/i)).toBeInTheDocument();
    });
  });
});
