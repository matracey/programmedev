/**
 * Unit tests for MappingStep React component.
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MappingStep } from "./MappingStep";

// Mock programme data
const mockProgramme = {
  title: "Test Programme",
  nfqLevel: 8,
  mode: "PROGRAMME_OWNER",
  plos: [
    { id: "plo_test1", text: "Analyse computing systems and architectures" },
    { id: "plo_test2", text: "Design and implement software solutions" },
  ],
  modules: [
    {
      id: "mod_test1",
      title: "Introduction to Computing",
      code: "COMP101",
      credits: 10,
      mimlos: [
        { id: "mimlo_1a", text: "Identify components of computing systems" },
        { id: "mimlo_1b", text: "Explain basic algorithms" },
      ],
    },
    {
      id: "mod_test2",
      title: "Database Systems",
      code: "COMP201",
      credits: 10,
      mimlos: [
        { id: "mimlo_2a", text: "Design relational database schemas" },
        { id: "mimlo_2b", text: "Implement SQL queries" },
      ],
    },
    {
      id: "mod_test3",
      title: "Advanced Topics",
      code: "COMP301",
      credits: 5,
      mimlos: [],
    },
  ],
  ploToMimlos: {
    plo_test1: ["mimlo_1a"],
    plo_test2: [],
  },
  moduleEditor: { assignedModuleIds: [] },
};

let mockState: { programme: typeof mockProgramme } = {
  programme: JSON.parse(JSON.stringify(mockProgramme)),
};

vi.mock("../../../state/store", () => ({
  state: {
    get programme() {
      return mockState.programme;
    },
  },
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

describe("MappingStep", () => {
  beforeEach(() => {
    mockState = {
      programme: JSON.parse(JSON.stringify(mockProgramme)),
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render the step title", () => {
      render(<MappingStep />);
      expect(screen.getByText(/Map PLOs to MIMLOs \(QQI-critical\)/i)).toBeInTheDocument();
    });

    it("should render guidance text", () => {
      render(<MappingStep />);
      expect(
        screen.getByText(/For each PLO, select the module MIMLOs that address this outcome/i),
      ).toBeInTheDocument();
    });

    it("should show empty state when no PLOs exist", () => {
      mockState.programme.plos = [];
      render(<MappingStep />);
      expect(screen.getByText(/Add PLOs and modules first/i)).toBeInTheDocument();
    });

    it("should show empty state when no modules exist", () => {
      mockState.programme.modules = [];
      render(<MappingStep />);
      expect(screen.getByText(/Add PLOs and modules first/i)).toBeInTheDocument();
    });

    it("should render PLO accordion items", () => {
      render(<MappingStep />);
      expect(screen.getByText("PLO 1")).toBeInTheDocument();
      expect(screen.getByText("PLO 2")).toBeInTheDocument();
    });

    it("should show PLO text preview", () => {
      render(<MappingStep />);
      expect(screen.getByText(/Analyse computing systems/i)).toBeInTheDocument();
    });
  });

  describe("Mapping Summary", () => {
    it("should show warning for unmapped PLOs", () => {
      render(<MappingStep />);
      expect(screen.getByText(/1 PLO\(s\) not mapped to any MIMLO/i)).toBeInTheDocument();
    });

    it("should show success when all PLOs are mapped", () => {
      mockState.programme.ploToMimlos = {
        plo_test1: ["mimlo_1a"],
        plo_test2: ["mimlo_2a"],
      };
      render(<MappingStep />);
      expect(screen.getByText(/All PLOs mapped to at least one MIMLO/i)).toBeInTheDocument();
    });

    it("should show warning for modules with no mappings", () => {
      render(<MappingStep />);
      // Module COMP301 has no MIMLOs, and COMP201 has MIMLOs but none mapped
      expect(screen.getByText(/module\(s\) have no MIMLOs linked to any PLO/i)).toBeInTheDocument();
    });
  });

  describe("Module Mapping Groups", () => {
    it("should render module groups within PLO accordion", () => {
      render(<MappingStep />);
      expect(screen.getAllByText(/COMP101 — Introduction to Computing/i).length).toBeGreaterThan(0);
    });

    it("should show credit count for modules", () => {
      render(<MappingStep />);
      expect(screen.getAllByText(/\(10 cr\)/i).length).toBeGreaterThan(0);
    });

    it("should show No MIMLOs text for modules without MIMLOs", () => {
      render(<MappingStep />);
      expect(screen.getAllByText(/No MIMLOs/i).length).toBeGreaterThan(0);
    });

    it("should show selected count badge", () => {
      render(<MappingStep />);
      expect(screen.getByText("1 / 2 selected")).toBeInTheDocument();
    });
  });

  describe("Module Checkbox Interactions", () => {
    it("should have module-level checkboxes", () => {
      render(<MappingStep />);
      expect(screen.getByTestId("mapping-module-checkbox-plo_test1-mod_test1")).toBeInTheDocument();
    });

    it("should toggle all MIMLOs when module checkbox is clicked", async () => {
      render(<MappingStep />);
      const moduleCheckbox = screen.getByTestId("mapping-module-checkbox-plo_test1-mod_test2");

      await act(async () => {
        fireEvent.click(moduleCheckbox);
      });

      // Both MIMLOs from mod_test2 should now be mapped
      expect(mockState.programme.ploToMimlos?.plo_test1).toContain("mimlo_2a");
      expect(mockState.programme.ploToMimlos?.plo_test1).toContain("mimlo_2b");
    });

    it("should uncheck all MIMLOs when module checkbox is unchecked", async () => {
      // Set up state with all MIMLOs of a module checked
      mockState.programme.ploToMimlos = {
        plo_test1: ["mimlo_1a", "mimlo_1b"],
        plo_test2: [],
      };

      render(<MappingStep />);
      const moduleCheckbox = screen.getByTestId("mapping-module-checkbox-plo_test1-mod_test1");

      await act(async () => {
        fireEvent.click(moduleCheckbox);
      });

      // All MIMLOs from mod_test1 should be removed
      expect(mockState.programme.ploToMimlos?.plo_test1).not.toContain("mimlo_1a");
      expect(mockState.programme.ploToMimlos?.plo_test1).not.toContain("mimlo_1b");
    });
  });

  describe("Individual MIMLO Checkboxes", () => {
    it("should expand module to show individual MIMLO checkboxes", async () => {
      render(<MappingStep />);

      // Click on module name to expand
      const moduleLabels = screen.getAllByText(/COMP101 — Introduction to Computing/i);
      await act(async () => {
        fireEvent.click(moduleLabels[0]);
      });

      // Should now see individual MIMLO checkboxes
      expect(screen.getByTestId("mapping-checkbox-plo_test1-mimlo_1a")).toBeInTheDocument();
    });

    it("should toggle individual MIMLO mapping", async () => {
      render(<MappingStep />);

      // Expand module first
      const moduleLabels = screen.getAllByText(/COMP101 — Introduction to Computing/i);
      await act(async () => {
        fireEvent.click(moduleLabels[0]);
      });

      // Toggle mimlo_1b (not currently checked)
      const mimloCheckbox = screen.getByTestId("mapping-checkbox-plo_test1-mimlo_1b");
      await act(async () => {
        fireEvent.click(mimloCheckbox);
      });

      expect(mockState.programme.ploToMimlos?.plo_test1).toContain("mimlo_1b");
    });

    it("should remove MIMLO mapping when unchecked", async () => {
      render(<MappingStep />);

      // Expand module first
      const moduleLabels = screen.getAllByText(/COMP101 — Introduction to Computing/i);
      await act(async () => {
        fireEvent.click(moduleLabels[0]);
      });

      // Toggle mimlo_1a (currently checked)
      const mimloCheckbox = screen.getByTestId("mapping-checkbox-plo_test1-mimlo_1a");
      await act(async () => {
        fireEvent.click(mimloCheckbox);
      });

      expect(mockState.programme.ploToMimlos?.plo_test1).not.toContain("mimlo_1a");
    });
  });

  describe("Module Editor Mode", () => {
    it("should show module editor mode notice", () => {
      mockState.programme.mode = "MODULE_EDITOR";
      mockState.programme.moduleEditor = { assignedModuleIds: ["mod_test1"] };
      render(<MappingStep />);
      expect(screen.getByText(/Module Editor Mode/i)).toBeInTheDocument();
    });

    it("should disable checkboxes for non-assigned modules", () => {
      mockState.programme.mode = "MODULE_EDITOR";
      mockState.programme.moduleEditor = { assignedModuleIds: ["mod_test1"] };
      // Add a mapping so mod_test2 is visible
      mockState.programme.ploToMimlos = {
        plo_test1: ["mimlo_2a"],
        plo_test2: [],
      };

      render(<MappingStep />);

      const moduleCheckbox = screen.getByTestId("mapping-module-checkbox-plo_test1-mod_test2");
      expect(moduleCheckbox).toBeDisabled();
    });

    it("should enable checkboxes for assigned modules", () => {
      mockState.programme.mode = "MODULE_EDITOR";
      mockState.programme.moduleEditor = { assignedModuleIds: ["mod_test1"] };

      render(<MappingStep />);

      const moduleCheckbox = screen.getByTestId("mapping-module-checkbox-plo_test1-mod_test1");
      expect(moduleCheckbox).not.toBeDisabled();
    });

    it("should show read-only label for non-assigned modules", () => {
      mockState.programme.mode = "MODULE_EDITOR";
      mockState.programme.moduleEditor = { assignedModuleIds: ["mod_test1"] };
      // Add a mapping so mod_test2 is visible
      mockState.programme.ploToMimlos = {
        plo_test1: ["mimlo_2a"],
        plo_test2: [],
      };

      render(<MappingStep />);
      expect(screen.getByText(/\(read-only\)/i)).toBeInTheDocument();
    });
  });

  describe("Accordion Controls", () => {
    it("should render expand/collapse controls", () => {
      render(<MappingStep />);
      expect(screen.getByText("Expand all")).toBeInTheDocument();
      expect(screen.getByText("Collapse all")).toBeInTheDocument();
    });
  });

  describe("Badge Display", () => {
    it("should show MIMLO count badge in PLO header", () => {
      render(<MappingStep />);
      expect(screen.getByText("1 MIMLOs")).toBeInTheDocument();
      expect(screen.getByText("0 MIMLOs")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible labels for module checkboxes", () => {
      render(<MappingStep />);
      const checkbox = screen.getByTestId("mapping-module-checkbox-plo_test1-mod_test1");
      expect(checkbox).toHaveAccessibleName(
        /Map PLO 1 to all MIMLOs of Introduction to Computing/i,
      );
    });

    it("should have accessible labels for MIMLO checkboxes", async () => {
      render(<MappingStep />);

      // Expand module first using test id
      const moduleLabels = screen.getAllByText(/COMP101 — Introduction to Computing/i);
      await act(async () => {
        fireEvent.click(moduleLabels[0]);
      });

      const checkbox = screen.getByTestId("mapping-checkbox-plo_test1-mimlo_1a");
      expect(checkbox).toHaveAccessibleName(/Map PLO 1 to MIMLO/i);
    });

    it("should have proper heading structure", () => {
      render(<MappingStep />);
      expect(screen.getByRole("heading", { level: 5 })).toBeInTheDocument();
    });
  });
});
