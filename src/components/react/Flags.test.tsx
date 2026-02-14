/**
 * Unit tests for Flags React component.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../state/store.js";
import { Flags } from "./Flags";

// Mock the store module
vi.mock("../../state/store.js", async () => {
  const actual = await vi.importActual("../../state/store.js");
  return {
    ...actual,
    activeSteps: vi.fn().mockReturnValue([
      { key: "identity", title: "Identity" },
      { key: "outcomes", title: "PLOs" },
      { key: "versions", title: "Programme Versions" },
      { key: "structure", title: "Credits & Modules" },
      { key: "mapping", title: "Mapping" },
      { key: "mimlos", title: "MIMLOs" },
      { key: "stages", title: "Stage Structure" },
    ]),
  };
});

describe("Flags", () => {
  const mockGoToStep = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset state to minimal valid programme (no validation errors)
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
      totalCredits: 60,
      electiveDefinitions: [],
      intakeMonths: ["Sep"],
      modules: [
        {
          id: "mod_1",
          title: "Module 1",
          code: "MOD101",
          credits: 30,
          mimlos: [{ id: "mimlo_1" }],
        },
        {
          id: "mod_2",
          title: "Module 2",
          code: "MOD102",
          credits: 30,
          mimlos: [{ id: "mimlo_2" }],
        },
      ],
      plos: [
        { id: "plo_1", text: "PLO 1" },
        { id: "plo_2", text: "PLO 2" },
        { id: "plo_3", text: "PLO 3" },
        { id: "plo_4", text: "PLO 4" },
        { id: "plo_5", text: "PLO 5" },
        { id: "plo_6", text: "PLO 6" },
      ],
      ploToMimlos: {
        plo_1: ["mimlo_1"],
        plo_2: ["mimlo_2"],
        plo_3: ["mimlo_1"],
        plo_4: ["mimlo_2"],
        plo_5: ["mimlo_1"],
        plo_6: ["mimlo_2"],
      },
      versions: [
        {
          id: "v1",
          label: "Full-time",
          targetCohortSize: 30,
          stages: [
            {
              id: "s1",
              name: "Stage 1",
              creditsTarget: 60,
              modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
            },
          ],
        },
      ],
    } as unknown as Programme;
  });

  describe("Rendering", () => {
    it("renders flags container with alert role", () => {
      render(<Flags onGoToStep={mockGoToStep} />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("shows success message when no validation errors", () => {
      render(<Flags onGoToStep={mockGoToStep} />);

      expect(screen.getByTestId("flag-ok")).toBeInTheDocument();
      expect(screen.getByText(/No flags — programme looks good!/i)).toBeInTheDocument();
    });

    it("shows error count in summary", () => {
      // Remove required field to trigger error
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      expect(screen.getByTestId("flags-summary")).toBeInTheDocument();
      expect(screen.getByText(/1 error/i)).toBeInTheDocument();
    });

    it("shows warning count in summary", () => {
      // Trigger a warning by having too few PLOs (validation rule: less than 6 is a warning)
      state.programme.plos = [
        { id: "plo_1", text: "PLO 1" },
        { id: "plo_2", text: "PLO 2" },
      ];
      state.programme.ploToMimlos = {
        plo_1: ["mimlo_1"],
        plo_2: ["mimlo_2"],
      };

      render(<Flags onGoToStep={mockGoToStep} />);

      // Should show at least one warning (too few PLOs)
      expect(screen.getByText(/\d+ warning/i)).toBeInTheDocument();
    });

    it("shows both error and warning counts", () => {
      // Missing title (error) and few PLOs (warning)
      state.programme.title = "";
      state.programme.plos = [
        { id: "plo_1", text: "PLO 1" },
        { id: "plo_2", text: "PLO 2" },
      ];
      state.programme.ploToMimlos = {
        plo_1: ["mimlo_1"],
        plo_2: ["mimlo_2"],
      };

      render(<Flags onGoToStep={mockGoToStep} />);

      // Should show at least one error and at least one warning
      expect(screen.getByText(/\d+ error/i)).toBeInTheDocument();
      expect(screen.getByText(/\d+ warning/i)).toBeInTheDocument();
    });
  });

  describe("Error flags", () => {
    it("displays error flag with correct styling", () => {
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      const flagItem = screen.getByTestId("flag-error-0");
      expect(flagItem).toHaveClass("flag-error");
      expect(screen.getByText("ERROR")).toBeInTheDocument();
    });

    it("displays error message", () => {
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      expect(screen.getByText(/Programme title is missing/i)).toBeInTheDocument();
    });

    it("displays step link for error", () => {
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      expect(screen.getByText("Identity")).toBeInTheDocument();
    });
  });

  describe("Warning flags", () => {
    it("displays warning flag with correct styling", () => {
      state.programme.plos = [
        { id: "plo_1", text: "PLO 1" },
        { id: "plo_2", text: "PLO 2" },
      ];
      state.programme.ploToMimlos = {
        plo_1: ["mimlo_1"],
        plo_2: ["mimlo_2"],
      };

      render(<Flags onGoToStep={mockGoToStep} />);

      const flagItem = screen.getByTestId("flag-warn-0");
      expect(flagItem).toHaveClass("flag-warn");
      expect(screen.getByText("WARN")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("calls onGoToStep when clicking a flag", () => {
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      const flagItem = screen.getByTestId("flag-error-0");
      fireEvent.click(flagItem);

      expect(mockGoToStep).toHaveBeenCalledWith("identity");
    });

    it("calls onGoToStep on Enter key press", () => {
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      const flagItem = screen.getByTestId("flag-error-0");
      fireEvent.keyDown(flagItem, { key: "Enter" });

      expect(mockGoToStep).toHaveBeenCalledWith("identity");
    });

    it("calls onGoToStep on Space key press", () => {
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      const flagItem = screen.getByTestId("flag-error-0");
      fireEvent.keyDown(flagItem, { key: " " });

      expect(mockGoToStep).toHaveBeenCalledWith("identity");
    });

    it("does not navigate on other key press", () => {
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      const flagItem = screen.getByTestId("flag-error-0");
      fireEvent.keyDown(flagItem, { key: "Tab" });

      expect(mockGoToStep).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has button role for clickable flags", () => {
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      const flagItem = screen.getByTestId("flag-error-0");
      expect(flagItem).toHaveAttribute("role", "button");
    });

    it("has tabindex for keyboard navigation", () => {
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      const flagItem = screen.getByTestId("flag-error-0");
      expect(flagItem).toHaveAttribute("tabindex", "0");
    });

    it("has accessible aria-label for error flags", () => {
      state.programme.title = "";

      render(<Flags onGoToStep={mockGoToStep} />);

      const flagItem = screen.getByTestId("flag-error-0");
      expect(flagItem).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Error: Programme title is missing"),
      );
      expect(flagItem).toHaveAttribute("aria-label", expect.stringContaining("Identity"));
    });

    it("has accessible aria-label for warning flags", () => {
      state.programme.plos = [
        { id: "plo_1", text: "PLO 1" },
        { id: "plo_2", text: "PLO 2" },
      ];
      state.programme.ploToMimlos = {
        plo_1: ["mimlo_1"],
        plo_2: ["mimlo_2"],
      };

      render(<Flags onGoToStep={mockGoToStep} />);

      const flagItem = screen.getByTestId("flag-warn-0");
      expect(flagItem).toHaveAttribute("aria-label", expect.stringContaining("Warning:"));
    });
  });

  describe("Multiple flags", () => {
    it("renders multiple error flags", () => {
      // Missing title and NFQ level
      state.programme.title = "";
      state.programme.nfqLevel = null;

      render(<Flags onGoToStep={mockGoToStep} />);

      expect(screen.getByTestId("flag-error-0")).toBeInTheDocument();
      expect(screen.getByTestId("flag-error-1")).toBeInTheDocument();
      expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
    });

    it("navigates to correct step for each flag", () => {
      state.programme.title = "";
      state.programme.nfqLevel = null;

      render(<Flags onGoToStep={mockGoToStep} />);

      const firstFlag = screen.getByTestId("flag-error-0");
      fireEvent.click(firstFlag);
      expect(mockGoToStep).toHaveBeenLastCalledWith("identity");

      const secondFlag = screen.getByTestId("flag-error-1");
      fireEvent.click(secondFlag);
      expect(mockGoToStep).toHaveBeenLastCalledWith("identity");
    });
  });
});
