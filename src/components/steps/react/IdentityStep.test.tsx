/**
 * Unit tests for IdentityStep React component.
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../../state/store";
import { IdentityStep } from "./IdentityStep";

// Mock the store module
vi.mock("../../../state/store", async () => {
  const actual = await vi.importActual("../../../state/store");
  return {
    ...actual,
    saveNow: vi.fn(),
    getAwardStandards: vi.fn().mockResolvedValue([
      { id: "qqi-computing", name: "Computing" },
      { id: "qqi-business", name: "Business" },
    ]),
    getAwardStandard: vi.fn().mockImplementation((id: string) =>
      Promise.resolve({
        id,
        name: id === "qqi-computing" ? "Computing" : "Business",
      }),
    ),
  };
});

// Mock uid to return predictable IDs
vi.mock("../../../utils/uid.js", () => ({
  uid: vi.fn((prefix: string) => `${prefix}_test_${Math.random().toString(36).slice(2, 8)}`),
}));

describe("IdentityStep", () => {
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
    it("renders the Identity card with form fields", () => {
      render(<IdentityStep />);

      expect(screen.getByText("Identity (QQI-critical)")).toBeInTheDocument();
      expect(screen.getByLabelText(/Programme title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Award type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/NFQ level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Total credits/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/School \/ Discipline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Intake months/i)).toBeInTheDocument();
    });

    it("renders the Elective Definitions card", () => {
      render(<IdentityStep />);

      expect(screen.getByText("Elective Definitions")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Add new elective definition/i }),
      ).toBeInTheDocument();
    });

    it("shows empty state message when no elective definitions", () => {
      render(<IdentityStep />);

      expect(
        screen.getByText(
          /No elective definitions yet. Add definitions to create specialization tracks./i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Programme title", () => {
    it("displays the current title", () => {
      state.programme.title = "Test Programme";
      render(<IdentityStep />);

      expect(screen.getByTestId("title-input")).toHaveValue("Test Programme");
    });

    it("updates title on input change", async () => {
      render(<IdentityStep />);

      const input = screen.getByTestId("title-input");
      await act(async () => {
        fireEvent.change(input, { target: { value: "New Programme Title" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.title).toBe("New Programme Title");
    });
  });

  describe("Award type", () => {
    it("displays available award type options", async () => {
      render(<IdentityStep />);

      const select = screen.getByTestId("award-select");
      expect(select).toBeInTheDocument();

      // Check some options exist
      expect(screen.getByRole("option", { name: /Higher Certificate/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Honours Bachelor Degree/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Other \(type below\)/i })).toBeInTheDocument();
    });

    it("shows custom input when Other is selected", async () => {
      render(<IdentityStep />);

      const select = screen.getByTestId("award-select");
      await act(async () => {
        fireEvent.change(select, { target: { value: "Other" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.awardTypeIsOther).toBe(true);
      expect(screen.getByTestId("award-other-input")).toBeInTheDocument();
    });

    it("updates awardType when selecting from dropdown", async () => {
      render(<IdentityStep />);

      const select = screen.getByTestId("award-select");
      await act(async () => {
        fireEvent.change(select, { target: { value: "Higher Diploma" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.awardType).toBe("Higher Diploma");
      expect(state.programme.awardTypeIsOther).toBe(false);
    });
  });

  describe("NFQ Level", () => {
    it("displays the current NFQ level", () => {
      state.programme.nfqLevel = 8;
      render(<IdentityStep />);

      expect(screen.getByTestId("level-input")).toHaveValue(8);
    });

    it("updates NFQ level on change", async () => {
      render(<IdentityStep />);

      const input = screen.getByTestId("level-input");
      await act(async () => {
        fireEvent.change(input, { target: { value: "7" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.nfqLevel).toBe(7);
    });
  });

  describe("Total credits", () => {
    it("displays the current total credits", () => {
      state.programme.totalCredits = 180;
      render(<IdentityStep />);

      expect(screen.getByTestId("total-credits-input")).toHaveValue(180);
    });

    it("updates total credits on change", async () => {
      render(<IdentityStep />);

      const input = screen.getByTestId("total-credits-input");
      await act(async () => {
        fireEvent.change(input, { target: { value: "240" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.totalCredits).toBe(240);
    });
  });

  describe("School", () => {
    it("displays available school options", () => {
      render(<IdentityStep />);

      const select = screen.getByTestId("school-select");
      expect(select).toBeInTheDocument();

      expect(screen.getByRole("option", { name: "Computing" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Business" })).toBeInTheDocument();
    });

    it("updates school on change", async () => {
      render(<IdentityStep />);

      const select = screen.getByTestId("school-select");
      await act(async () => {
        fireEvent.change(select, { target: { value: "Computing" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.school).toBe("Computing");
    });
  });

  describe("Intake months", () => {
    it("displays the current intake months", () => {
      state.programme.intakeMonths = ["Sep", "Jan"];
      render(<IdentityStep />);

      expect(screen.getByTestId("intake-input")).toHaveValue("Sep, Jan");
    });

    it("updates intake months on change", async () => {
      render(<IdentityStep />);

      const input = screen.getByTestId("intake-input");
      await act(async () => {
        fireEvent.change(input, { target: { value: "Sep, Jan, May" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.intakeMonths).toEqual(["Sep", "Jan", "May"]);
    });
  });

  describe("Award standards", () => {
    it("renders standard selector", async () => {
      render(<IdentityStep />);

      // Wait for standards to load
      await waitFor(() => {
        expect(screen.getByLabelText(/Award standard 1/i)).toBeInTheDocument();
      });
    });

    it("allows selecting a standard", async () => {
      render(<IdentityStep />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Award standard 1/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/Award standard 1/i);
      await act(async () => {
        fireEvent.change(select, { target: { value: "qqi-computing" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.awardStandardIds).toContain("qqi-computing");
    });
  });

  describe("Elective definitions", () => {
    it("adds a new elective definition", async () => {
      render(<IdentityStep />);

      const addBtn = screen.getByTestId("add-elective-definition-btn");
      await act(async () => {
        fireEvent.click(addBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.electiveDefinitions.length).toBe(1);
      expect(state.programme.electiveDefinitions[0].code).toBe("ELEC1");
    });

    it("displays existing elective definitions", () => {
      state.programme.electiveDefinitions = [
        {
          id: "edef_1",
          name: "Year 3 Specialization",
          code: "ELEC1",
          credits: 30,
          groups: [{ id: "egrp_1", name: "Data Analytics", code: "ELEC1-A", moduleIds: [] }],
        },
      ];
      render(<IdentityStep />);

      expect(screen.getByText(/\[ELEC1\] Year 3 Specialization/i)).toBeInTheDocument();
      expect(screen.getByText(/30 cr/)).toBeInTheDocument();
    });

    it("updates definition name", async () => {
      state.programme.electiveDefinitions = [
        {
          id: "edef_1",
          name: "",
          code: "ELEC1",
          credits: 0,
          groups: [],
        },
      ];
      render(<IdentityStep />);

      const nameInput = screen.getByLabelText(/Definition name/i);
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "New Definition Name" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.electiveDefinitions[0].name).toBe("New Definition Name");
    });

    it("adds a group to a definition", async () => {
      state.programme.electiveDefinitions = [
        {
          id: "edef_1",
          name: "Test Def",
          code: "ELEC1",
          credits: 30,
          groups: [],
        },
      ];
      render(<IdentityStep />);

      const addGroupBtn = screen.getByRole("button", { name: /Add group to definition/i });
      await act(async () => {
        fireEvent.click(addGroupBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.electiveDefinitions[0].groups.length).toBe(1);
      expect(state.programme.electiveDefinitions[0].groups[0].code).toBe("ELEC1-A");
    });

    it("removes a definition", async () => {
      state.programme.electiveDefinitions = [
        {
          id: "edef_1",
          name: "Test Def",
          code: "ELEC1",
          credits: 30,
          groups: [],
        },
      ];
      render(<IdentityStep />);

      const removeBtn = screen.getByTestId("remove-elective-definition-edef_1");
      await act(async () => {
        fireEvent.click(removeBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.electiveDefinitions.length).toBe(0);
    });
  });

  describe("Accessibility", () => {
    it("has proper form labels", () => {
      render(<IdentityStep />);

      // Verify labels are associated with inputs
      expect(screen.getByLabelText(/Programme title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Award type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/NFQ level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Total credits/i)).toBeInTheDocument();
    });

    it("has help text visible on page", () => {
      render(<IdentityStep />);

      // The help text should be visible somewhere in the document
      expect(screen.getByText(/Enter a value between 6 and 9/i)).toBeInTheDocument();
    });
  });
});
