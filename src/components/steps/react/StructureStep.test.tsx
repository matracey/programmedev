/**
 * Unit tests for StructureStep React component.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../../state/store.js";
import { StructureStep } from "./StructureStep";

// Mock the store module
vi.mock("../../../state/store.js", async () => {
  const actual = await vi.importActual("../../../state/store.js");
  return {
    ...actual,
    saveNow: vi.fn(),
  };
});

// Mock uid to return predictable IDs
vi.mock("../../../utils/uid.js", () => ({
  uid: vi.fn((prefix: string) => `${prefix}_test_${Math.random().toString(36).slice(2, 8)}`),
}));

// Mock validation and rendering functions
vi.mock("../../../utils/validation.js", () => ({
  validateProgramme: vi.fn().mockReturnValue([]),
}));

vi.mock("../../flags.js", () => ({
  renderFlags: vi.fn(),
}));

vi.mock("../../header.js", () => ({
  renderHeader: vi.fn(),
}));

describe("StructureStep", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Reset state to default
    state.programme = {
      schemaVersion: 3,
      id: "test",
      title: "Test Programme",
      awardType: "",
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
    } as Programme;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the Structure card with heading", () => {
      render(<StructureStep />);

      expect(screen.getByText("Credits & modules (QQI-critical)")).toBeInTheDocument();
    });

    it("renders the Add module button", () => {
      render(<StructureStep />);

      expect(screen.getByTestId("add-module-btn")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Add new module/i })).toBeInTheDocument();
    });

    it("shows empty state message when no modules", () => {
      render(<StructureStep />);

      expect(screen.getByText(/No modules added yet/i)).toBeInTheDocument();
    });

    it("displays total programme credits", () => {
      state.programme.totalCredits = 180;
      render(<StructureStep />);

      expect(screen.getByTestId("total-credits-display")).toHaveValue(180);
    });

    it("displays tip about mandatory and elective modules", () => {
      render(<StructureStep />);

      expect(screen.getByText(/Tip:/i)).toBeInTheDocument();
      expect(screen.getByText(/Mark modules as/i)).toBeInTheDocument();
    });
  });

  describe("Credit summary", () => {
    it("displays credit summary with correct values", () => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Intro to CS", credits: 10, isElective: false },
        { id: "mod_2", code: "CS102", title: "Data Structures", credits: 10, isElective: false },
        { id: "mod_3", code: "CS201", title: "Elective Module", credits: 5, isElective: true },
      ];
      state.programme.totalCredits = 25;
      render(<StructureStep />);

      const summary = screen.getByTestId("credit-summary");
      expect(summary).toHaveTextContent("20 cr (2 modules)"); // Mandatory
      expect(summary).toHaveTextContent("5 cr (1 modules)"); // Elective
      expect(summary).toHaveTextContent("Sum: 25 / 25");
    });

    it("shows warning badge when credits don't match", () => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Intro to CS", credits: 10, isElective: false },
      ];
      state.programme.totalCredits = 60;
      render(<StructureStep />);

      const summary = screen.getByTestId("credit-summary");
      expect(summary).toHaveTextContent("Sum: 10 / 60");
    });

    it("includes elective definitions in summary", () => {
      state.programme.electiveDefinitions = [
        { id: "edef_1", name: "Electives", code: "ELEC1", credits: 15, groups: [] },
      ];
      render(<StructureStep />);

      const summary = screen.getByTestId("credit-summary");
      expect(summary).toHaveTextContent("1 elective def(s) = 15 cr");
    });
  });

  describe("Adding modules", () => {
    it("adds a new module when clicking Add module button", async () => {
      render(<StructureStep />);

      const addBtn = screen.getByTestId("add-module-btn");
      await act(async () => {
        fireEvent.click(addBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules.length).toBe(1);
      expect(state.programme.modules[0].title).toBe("New module");
      expect(state.programme.modules[0].isElective).toBe(false);
    });

    it("new module is visible after adding", async () => {
      render(<StructureStep />);

      await act(async () => {
        fireEvent.click(screen.getByTestId("add-module-btn"));
        vi.advanceTimersByTime(400);
      });

      // The module count should have increased
      expect(state.programme.modules.length).toBeGreaterThan(0);
    });
  });

  describe("Displaying modules", () => {
    it("displays existing modules in accordion", () => {
      state.programme.modules = [
        {
          id: "mod_1",
          code: "CS101",
          title: "Introduction to Computing",
          credits: 10,
          isElective: false,
        },
        {
          id: "mod_2",
          code: "CS102",
          title: "Programming Fundamentals",
          credits: 10,
          isElective: true,
        },
      ];
      render(<StructureStep />);

      expect(screen.getByTestId("module-item-mod_1")).toBeInTheDocument();
      expect(screen.getByTestId("module-item-mod_2")).toBeInTheDocument();
      expect(screen.getByText(/Module 1: CS101/)).toBeInTheDocument();
      expect(screen.getByText(/Module 2: CS102/)).toBeInTheDocument();
    });

    it("displays mandatory badge for mandatory modules", () => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Intro", credits: 10, isElective: false },
      ];
      render(<StructureStep />);

      expect(screen.getByTitle("Mandatory")).toBeInTheDocument();
    });

    it("displays elective badge for elective modules", () => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Elective", credits: 10, isElective: true },
      ];
      render(<StructureStep />);

      expect(screen.getByTitle("Elective")).toBeInTheDocument();
    });

    it("shows module subtitle with title and credits", () => {
      state.programme.modules = [
        {
          id: "mod_1",
          code: "CS101",
          title: "Introduction to Computing",
          credits: 15,
          isElective: false,
        },
      ];
      render(<StructureStep />);

      expect(screen.getByText(/Introduction to Computing • 15 cr/)).toBeInTheDocument();
    });
  });

  describe("Editing modules", () => {
    beforeEach(() => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Original Title", credits: 10, isElective: false },
      ];
    });

    it("updates module title on input change", async () => {
      render(<StructureStep />);

      const titleInput = screen.getByTestId("module-title-mod_1");
      await act(async () => {
        fireEvent.change(titleInput, { target: { value: "Updated Title" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules[0].title).toBe("Updated Title");
    });

    it("updates module code on input change", async () => {
      render(<StructureStep />);

      const codeInput = screen.getByTestId("module-code-mod_1");
      await act(async () => {
        fireEvent.change(codeInput, { target: { value: "CS999" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules[0].code).toBe("CS999");
    });

    it("updates module credits on input change", async () => {
      render(<StructureStep />);

      const creditsInput = screen.getByTestId("module-credits-mod_1");
      await act(async () => {
        fireEvent.change(creditsInput, { target: { value: "20" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules[0].credits).toBe(20);
    });

    it("updates module type from mandatory to elective", async () => {
      render(<StructureStep />);

      const typeSelect = screen.getByTestId("module-type-mod_1");
      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: "E" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules[0].isElective).toBe(true);
    });

    it("updates module type from elective to mandatory", async () => {
      state.programme.modules[0].isElective = true;
      render(<StructureStep />);

      const typeSelect = screen.getByTestId("module-type-mod_1");
      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: "M" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules[0].isElective).toBe(false);
    });
  });

  describe("Removing modules", () => {
    it("removes a module when clicking Remove button", async () => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Module 1", credits: 10, isElective: false },
        { id: "mod_2", code: "CS102", title: "Module 2", credits: 10, isElective: false },
      ];
      render(<StructureStep />);

      const removeBtn = screen.getByTestId("remove-module-mod_1");
      await act(async () => {
        fireEvent.click(removeBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.modules.length).toBe(1);
      expect(state.programme.modules[0].id).toBe("mod_2");
    });

    it("cleans up MIMLO mappings when removing module", async () => {
      state.programme.modules = [
        {
          id: "mod_1",
          code: "CS101",
          title: "Module 1",
          credits: 10,
          isElective: false,
          mimlos: [{ id: "mimlo_1" }, { id: "mimlo_2" }],
        },
      ];
      state.programme.ploToMimlos = {
        plo_1: ["mimlo_1", "mimlo_other"],
        plo_2: ["mimlo_2"],
      };
      render(<StructureStep />);

      const removeBtn = screen.getByTestId("remove-module-mod_1");
      await act(async () => {
        fireEvent.click(removeBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.ploToMimlos.plo_1).toEqual(["mimlo_other"]);
      expect(state.programme.ploToMimlos.plo_2).toEqual([]);
    });

    it("removes module from elective groups when removing", async () => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Module 1", credits: 10, isElective: true },
      ];
      state.programme.electiveDefinitions = [
        {
          id: "edef_1",
          name: "Electives",
          code: "ELEC1",
          credits: 10,
          groups: [
            { id: "egrp_1", name: "Group A", code: "ELEC1-A", moduleIds: ["mod_1", "mod_other"] },
          ],
        },
      ];
      render(<StructureStep />);

      const removeBtn = screen.getByTestId("remove-module-mod_1");
      await act(async () => {
        fireEvent.click(removeBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.electiveDefinitions[0].groups[0].moduleIds).toEqual(["mod_other"]);
    });
  });

  describe("Accessibility", () => {
    it("has proper form labels for module fields", () => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Module 1", credits: 10, isElective: false },
      ];
      render(<StructureStep />);

      expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Code \(opt\.\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      expect(screen.getAllByLabelText(/Credits/i).length).toBeGreaterThan(0);
    });

    it("has aria-label on Add module button", () => {
      render(<StructureStep />);

      expect(screen.getByRole("button", { name: /Add new module/i })).toBeInTheDocument();
    });

    it("has aria-label on Remove module buttons", () => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Test Module", credits: 10, isElective: false },
      ];
      render(<StructureStep />);

      expect(
        screen.getByRole("button", { name: /Remove module Test Module/i }),
      ).toBeInTheDocument();
    });
  });
});
