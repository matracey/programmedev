/**
 * Unit tests for MimlosStep React component.
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MimlosStep } from "./MimlosStep";

// Mock the store module
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
    },
    {
      id: "mod_test2",
      title: "Database Systems",
      code: "COMP201",
      credits: 10,
      mimlos: [],
    },
  ],
  moduleEditor: { assignedModuleIds: [] },
};

let mockState: { programme: typeof mockProgramme; selectedModuleId: string | null } = {
  programme: { ...mockProgramme },
  selectedModuleId: null,
};

vi.mock("../../../state/store.js", () => ({
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

vi.mock("../../../lib/lo-lint.js", () => ({
  lintLearningOutcome: vi.fn((text: string) => ({
    issues: text.toLowerCase().includes("understand")
      ? [
          {
            severity: "warn",
            match: "understand",
            message: "Avoid vague terms",
            suggestions: ["analyse"],
          },
        ]
      : [],
  })),
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
  mimloText: vi.fn((x: unknown) =>
    typeof x === "string"
      ? x
      : x && typeof x === "object"
        ? ((x as { text?: string }).text ?? "")
        : "",
  ),
}));

describe("MimlosStep", () => {
  beforeEach(() => {
    mockState = {
      programme: {
        ...mockProgramme,
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
          },
          {
            id: "mod_test2",
            title: "Database Systems",
            code: "COMP201",
            credits: 10,
            mimlos: [],
          },
        ],
      },
      selectedModuleId: null,
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render the step title", () => {
      render(<MimlosStep />);
      expect(
        screen.getByText(/MIMLOs \(Minimum Intended Module Learning Outcomes\)/i),
      ).toBeInTheDocument();
    });

    it("should render Blooms guidance section", () => {
      render(<MimlosStep />);
      expect(screen.getByText(/Bloom helper/i)).toBeInTheDocument();
    });

    it("should show empty state when no modules exist", () => {
      mockState.programme.modules = [];
      render(<MimlosStep />);
      expect(screen.getByText(/Add modules first/i)).toBeInTheDocument();
    });

    it("should render existing modules", () => {
      render(<MimlosStep />);
      expect(screen.getByText(/COMP101 — Introduction to Computing/i)).toBeInTheDocument();
      expect(screen.getByText(/COMP201 — Database Systems/i)).toBeInTheDocument();
    });

    it("should show MIMLO count badges", () => {
      render(<MimlosStep />);
      expect(screen.getByText("2 items")).toBeInTheDocument();
      expect(screen.getByText("0 items")).toBeInTheDocument();
    });
  });

  describe("Adding MIMLOs", () => {
    it("should have Add MIMLO buttons for each module", () => {
      render(<MimlosStep />);
      expect(screen.getByTestId("add-mimlo-mod_test1")).toBeInTheDocument();
      expect(screen.getByTestId("add-mimlo-mod_test2")).toBeInTheDocument();
    });

    it("should add a new MIMLO when Add MIMLO button is clicked", async () => {
      render(<MimlosStep />);
      const addButton = screen.getByTestId("add-mimlo-mod_test1");

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(mockState.programme.modules[0].mimlos).toHaveLength(3);
    });
  });

  describe("Removing MIMLOs", () => {
    it("should remove MIMLO when remove button is clicked", async () => {
      render(<MimlosStep />);
      const removeButton = screen.getByTestId("remove-mimlo-mod_test1-0");

      await act(async () => {
        fireEvent.click(removeButton);
      });

      expect(mockState.programme.modules[0].mimlos).toHaveLength(1);
    });
  });

  describe("Editing MIMLO Text", () => {
    it("should display MIMLO text in inputs", () => {
      render(<MimlosStep />);
      const input = screen.getByTestId("mimlo-input-mod_test1-0");
      expect(input).toHaveValue("Analyse basic computing concepts");
    });

    it("should update MIMLO text on input", async () => {
      render(<MimlosStep />);
      const input = screen.getByTestId("mimlo-input-mod_test1-0");

      await act(async () => {
        fireEvent.change(input, { target: { value: "Evaluate computing architectures" } });
      });

      expect(mockState.programme.modules[0].mimlos[0].text).toBe(
        "Evaluate computing architectures",
      );
    });
  });

  describe("Linting", () => {
    it("should show lint warnings for vague terms", async () => {
      mockState.programme.modules[0].mimlos[0].text = "Understand the system";
      const { lintLearningOutcome } = await import("../../../lib/lo-lint.js");
      vi.mocked(lintLearningOutcome).mockReturnValue({
        issues: [
          {
            severity: "warn",
            match: "understand",
            message: "Avoid vague terms",
            suggestions: ["analyse"],
          },
        ],
      });

      const { rerender } = render(<MimlosStep />);

      await act(async () => {
        const input = screen.getByTestId("mimlo-input-mod_test1-0");
        fireEvent.change(input, { target: { value: "Understand the system" } });
      });

      rerender(<MimlosStep />);
      await waitFor(() => {
        const warnings = document.querySelectorAll(".mimlo-lint-warnings");
        expect(warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Bloom's Guidance", () => {
    it("should show NFQ 8 verbs", () => {
      render(<MimlosStep />);
      expect(screen.getByText("analyse")).toBeInTheDocument();
      expect(screen.getByText("evaluate")).toBeInTheDocument();
    });

    it("should show guidance for no NFQ level", () => {
      mockState.programme.nfqLevel = null;
      render(<MimlosStep />);
      expect(screen.getByText(/choose NFQ level first/i)).toBeInTheDocument();
    });
  });

  describe("Accordion Controls", () => {
    it("should render expand/collapse controls when modules exist", () => {
      render(<MimlosStep />);
      expect(screen.getByText("Expand all")).toBeInTheDocument();
      expect(screen.getByText("Collapse all")).toBeInTheDocument();
    });

    it("should not render expand/collapse controls when no modules exist", () => {
      mockState.programme.modules = [];
      render(<MimlosStep />);
      expect(screen.queryByText("Expand all")).not.toBeInTheDocument();
    });
  });

  describe("Module Editor Mode", () => {
    it("should not show module picker in PROGRAMME_OWNER mode", () => {
      render(<MimlosStep />);
      expect(screen.queryByTestId("mimlo-module-picker")).not.toBeInTheDocument();
    });

    it("should not show module picker when only one assigned module", () => {
      // Only one module assigned means no picker needed
      mockState.programme.mode = "MODULE_EDITOR";
      mockState.programme.modules = [mockState.programme.modules[0]];

      render(<MimlosStep />);
      expect(screen.queryByTestId("mimlo-module-picker")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible labels for MIMLO inputs", () => {
      render(<MimlosStep />);
      const input = screen.getByTestId("mimlo-input-mod_test1-0");
      expect(input).toHaveAccessibleName(/MIMLO 1 for Introduction to Computing/i);
    });

    it("should have accessible labels for Add MIMLO buttons", () => {
      render(<MimlosStep />);
      const addButton = screen.getByTestId("add-mimlo-mod_test1");
      expect(addButton).toHaveAccessibleName(/Add MIMLO to Introduction to Computing/i);
    });

    it("should have accessible labels for Remove buttons", () => {
      render(<MimlosStep />);
      const removeButton = screen.getByTestId("remove-mimlo-mod_test1-0");
      expect(removeButton).toHaveAccessibleName(/Remove MIMLO 1/i);
    });

    it("should have live regions for lint warnings", () => {
      render(<MimlosStep />);
      const lintContainers = document.querySelectorAll(".mimlo-lint-warnings");
      lintContainers.forEach((container) => {
        expect(container).toHaveAttribute("role", "status");
        expect(container).toHaveAttribute("aria-live", "polite");
      });
    });
  });

  describe("Empty Module MIMLOs", () => {
    it("should show empty state message for module with no MIMLOs", () => {
      render(<MimlosStep />);
      expect(screen.getByText(/No MIMLOs yet/i)).toBeInTheDocument();
    });

    it("should show guidance text for adding MIMLOs", () => {
      render(<MimlosStep />);
      expect(screen.getAllByText(/Add 3–6 MIMLOs per module/i).length).toBeGreaterThan(0);
    });
  });
});
