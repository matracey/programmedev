/**
 * Unit tests for OutcomesStep React component.
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OutcomesStep } from "./OutcomesStep";

// Mock the store module
const mockProgramme = {
  title: "Test Programme",
  nfqLevel: 8,
  plos: [
    {
      id: "plo_test1",
      text: "Analyse complex systems",
      standardMappings: [{ criteria: "Knowledge", thread: "General", standardId: "computing" }],
    },
  ],
  awardStandardIds: ["computing"],
  awardStandardNames: ["Computing"],
  ploToMimlos: {},
};

let mockState = { programme: { ...mockProgramme } };

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
  getAwardStandard: vi.fn(() =>
    Promise.resolve({
      id: "computing",
      name: "Computing",
      levels: {
        8: [
          { criteria: "Knowledge", threads: ["General", "Specific"] },
          { criteria: "Skills", threads: ["Applied", "Theoretical"] },
        ],
      },
    }),
  ),
  getCriteriaList: vi.fn(() => ["Knowledge", "Skills"]),
  getThreadList: vi.fn(() => ["General", "Specific"]),
  getDescriptor: vi.fn(() => "A detailed descriptor for this mapping."),
}));

vi.mock("../../../hooks/useStore", () => ({
  useProgramme: vi.fn(() => ({ programme: mockState.programme, revision: 1 })),
  useSaveDebounced: vi.fn(() => vi.fn()),
  useUpdateProgramme: vi.fn(() => (updates: Record<string, unknown>) => {
    mockState.programme = { ...mockState.programme, ...updates };
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

describe("OutcomesStep", () => {
  beforeEach(() => {
    mockState = {
      programme: {
        ...mockProgramme,
        plos: [
          {
            id: "plo_test1",
            text: "Analyse complex systems",
            standardMappings: [
              { criteria: "Knowledge", thread: "General", standardId: "computing" },
            ],
          },
        ],
      },
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render the step title", () => {
      render(<OutcomesStep />);
      expect(screen.getByText(/Programme Learning Outcomes \(PLOs\)/i)).toBeInTheDocument();
    });

    it("should render the Add PLO button", () => {
      render(<OutcomesStep />);
      expect(screen.getByTestId("add-plo-btn")).toBeInTheDocument();
    });

    it("should render Blooms guidance section", () => {
      render(<OutcomesStep />);
      expect(screen.getByText(/Bloom helper/i)).toBeInTheDocument();
    });

    it("should show empty state when no PLOs exist", () => {
      mockState.programme.plos = [];
      render(<OutcomesStep />);
      expect(screen.getByText(/No PLOs added yet/i)).toBeInTheDocument();
    });

    it("should render existing PLOs", () => {
      render(<OutcomesStep />);
      expect(screen.getAllByText(/PLO 1/i).length).toBeGreaterThan(0);
    });
  });

  describe("Adding PLOs", () => {
    it("should add a new PLO when Add PLO button is clicked", async () => {
      render(<OutcomesStep />);
      const addButton = screen.getByTestId("add-plo-btn");

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(mockState.programme.plos).toHaveLength(2);
    });
  });

  describe("Removing PLOs", () => {
    it("should remove PLO when remove button is clicked", async () => {
      render(<OutcomesStep />);
      const removeButton = screen.getByTestId("remove-plo-plo_test1");

      await act(async () => {
        fireEvent.click(removeButton);
      });

      expect(mockState.programme.plos).toHaveLength(0);
    });
  });

  describe("Editing PLO Text", () => {
    it("should display PLO text in textarea", async () => {
      render(<OutcomesStep />);
      const textarea = screen.getByTestId("plo-textarea-plo_test1");
      expect(textarea).toHaveValue("Analyse complex systems");
    });

    it("should update PLO text on input", async () => {
      render(<OutcomesStep />);
      const textarea = screen.getByTestId("plo-textarea-plo_test1");

      await act(async () => {
        fireEvent.change(textarea, { target: { value: "Design and implement new systems" } });
      });

      expect(mockState.programme.plos[0].text).toBe("Design and implement new systems");
    });
  });

  describe("Linting", () => {
    it("should show lint warnings for vague terms", async () => {
      mockState.programme.plos[0].text = "Understand the system";
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

      const { rerender } = render(<OutcomesStep />);

      await act(async () => {
        const textarea = screen.getByTestId("plo-textarea-plo_test1");
        fireEvent.change(textarea, { target: { value: "Understand the system" } });
      });

      rerender(<OutcomesStep />);
      await waitFor(() => {
        const warnings = document.querySelectorAll(".plo-lint-warnings");
        expect(warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Bloom's Guidance", () => {
    it("should show NFQ 8 verbs", () => {
      render(<OutcomesStep />);
      expect(screen.getByText("analyse")).toBeInTheDocument();
      expect(screen.getByText("evaluate")).toBeInTheDocument();
    });

    it("should show guidance for no NFQ level", () => {
      mockState.programme.nfqLevel = null;
      render(<OutcomesStep />);
      expect(screen.getByText(/choose NFQ level first/i)).toBeInTheDocument();
    });
  });

  describe("Accordion Controls", () => {
    it("should render expand/collapse controls when PLOs exist", () => {
      render(<OutcomesStep />);
      expect(screen.getByText("Expand all")).toBeInTheDocument();
      expect(screen.getByText("Collapse all")).toBeInTheDocument();
    });

    it("should not render expand/collapse controls when no PLOs exist", () => {
      mockState.programme.plos = [];
      render(<OutcomesStep />);
      expect(screen.queryByText("Expand all")).not.toBeInTheDocument();
    });
  });

  describe("Mapping Snapshot", () => {
    it("should render the mapping snapshot section", () => {
      render(<OutcomesStep />);
      expect(screen.getByTestId("plo-mapping-snapshot")).toBeInTheDocument();
    });

    it("should show mapping snapshot table when PLOs exist", () => {
      render(<OutcomesStep />);
      expect(screen.getByText(/PLO Text/i)).toBeInTheDocument();
      expect(screen.getByText(/Mapped Standards/i)).toBeInTheDocument();
    });
  });

  describe("Mapping Controls", () => {
    it("should show mapping controls for each PLO", () => {
      render(<OutcomesStep />);
      expect(screen.getByText(/Map this PLO to QQI award standards/i)).toBeInTheDocument();
    });

    it("should display existing mappings", () => {
      render(<OutcomesStep />);
      // Multiple occurrences expected (badge and snapshot)
      expect(screen.getAllByText(/Knowledge \/ General/i).length).toBeGreaterThan(0);
    });
  });

  describe("Standard Selection", () => {
    it("should show criteria and thread dropdowns", () => {
      render(<OutcomesStep />);
      expect(screen.getByTestId("plo-criteria-plo_test1")).toBeInTheDocument();
      expect(screen.getByTestId("plo-thread-plo_test1")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible labels for form controls", () => {
      render(<OutcomesStep />);
      const textarea = screen.getByTestId("plo-textarea-plo_test1");
      expect(textarea).toHaveAccessibleName(/PLO 1 text/i);
    });

    it("should have accessible labels for buttons", () => {
      render(<OutcomesStep />);
      const addButton = screen.getByTestId("add-plo-btn");
      expect(addButton).toHaveAccessibleName(/Add new PLO/i);
    });

    it("should have live regions for lint warnings", () => {
      render(<OutcomesStep />);
      const lintContainer = document.getElementById("plo-lint-plo_test1");
      expect(lintContainer).toBeInTheDocument();
    });
  });

  describe("Empty Award Standard", () => {
    it("should show message when no award standard is selected", () => {
      mockState.programme.awardStandardIds = [];
      mockState.programme.awardStandardNames = [];
      render(<OutcomesStep />);
      expect(screen.getByText(/Select a QQI award standard/i)).toBeInTheDocument();
    });
  });
});
