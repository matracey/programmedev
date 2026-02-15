/**
 * Unit tests for StagesStep React component.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../../state/store";
import { StagesStep } from "./StagesStep";

// Mock the store module
vi.mock("../../../state/store", async () => {
  const actual = await vi.importActual("../../../state/store");
  return {
    ...actual,
    saveNow: vi.fn(),
    defaultStage: (sequence: number = 1) => ({
      id: `stage_test_${sequence}`,
      name: `Stage ${sequence}`,
      sequence,
      creditsTarget: 0,
      exitAward: { enabled: false, awardTitle: "" },
      modules: [],
    }),
  };
});

// Mock uid to return predictable IDs
vi.mock("../../../utils/uid.js", () => ({
  uid: vi.fn((prefix: string) => `${prefix}_test_${Math.random().toString(36).slice(2, 8)}`),
}));

describe("StagesStep", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Reset state to default with at least one version
    state.programme = {
      schemaVersion: 3,
      id: "test",
      title: "Test Programme",
      awardType: "",
      awardTypeIsOther: false,
      nfqLevel: null,
      school: "",
      awardStandardIds: [],
      awardStandardNames: [],
      totalCredits: 180,
      electiveDefinitions: [],
      intakeMonths: [],
      modules: [],
      plos: [],
      ploToMimlos: {},
      versions: [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          stages: [],
        },
      ],
    } as Programme;
    state.selectedVersionId = "ver_1";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the Stage Structure card with title", () => {
      render(<StagesStep />);

      expect(screen.getByText("Stage Structure")).toBeInTheDocument();
    });

    it("renders the version selector", () => {
      render(<StagesStep />);

      expect(screen.getByTestId("stage-version-select")).toBeInTheDocument();
    });

    it("renders the add stage button", () => {
      render(<StagesStep />);

      expect(screen.getByTestId("add-stage-btn")).toBeInTheDocument();
    });

    it("shows empty state message when no stages", () => {
      render(<StagesStep />);

      expect(
        screen.getByText(/No stages yet for this version. Add a stage to begin./i),
      ).toBeInTheDocument();
    });

    it("shows warning when no versions exist", () => {
      state.programme.versions = [];
      render(<StagesStep />);

      expect(screen.getByText(/Add at least one Programme Version first./i)).toBeInTheDocument();
    });
  });

  describe("Version selector", () => {
    it("displays current version options", () => {
      state.programme.versions = [
        { id: "ver_1", label: "Full-time", code: "FT", stages: [] },
        { id: "ver_2", label: "Part-time", code: "PT", stages: [] },
      ];
      render(<StagesStep />);

      const select = screen.getByTestId("stage-version-select");
      expect(select).toHaveValue("ver_1");
      expect(screen.getByRole("option", { name: /FT — Full-time/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /PT — Part-time/i })).toBeInTheDocument();
    });
  });

  describe("Stage management", () => {
    it("adds a new stage when clicking add button", async () => {
      render(<StagesStep />);

      const addBtn = screen.getByTestId("add-stage-btn");
      await act(async () => {
        fireEvent.click(addBtn);
        vi.advanceTimersByTime(400);
      });

      const version = state.programme.versions.find((v: any) => v.id === "ver_1");
      expect(version?.stages.length).toBe(1);
    });

    it("displays existing stages", () => {
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      expect(screen.getByText("Year 1")).toBeInTheDocument();
      expect(screen.getByText(/Sequence 1 • Target 60cr • Assigned 0cr/i)).toBeInTheDocument();
    });

    it("updates stage name", async () => {
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      const nameInput = screen.getByTestId("stage-name-stage_1");
      await act(async () => {
        fireEvent.change(nameInput, { target: { value: "First Year" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].stages[0].name).toBe("First Year");
    });

    it("updates stage sequence", async () => {
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      const seqInput = screen.getByTestId("stage-sequence-stage_1");
      await act(async () => {
        fireEvent.change(seqInput, { target: { value: "2" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].stages[0].sequence).toBe(2);
    });

    it("updates stage credits target", async () => {
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      const creditsInput = screen.getByTestId("stage-credits-stage_1");
      await act(async () => {
        fireEvent.change(creditsInput, { target: { value: "90" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].stages[0].creditsTarget).toBe(90);
    });

    it("removes a stage", async () => {
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      const removeBtn = screen.getByTestId("remove-stage-stage_1");
      await act(async () => {
        fireEvent.click(removeBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].stages.length).toBe(0);
    });
  });

  describe("Exit award", () => {
    it("toggles exit award enabled", async () => {
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      const exitCheckbox = screen.getByTestId("stage-exit-stage_1");
      await act(async () => {
        fireEvent.click(exitCheckbox);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].stages[0].exitAward.enabled).toBe(true);
    });

    it("shows exit title field when exit award is enabled", () => {
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: true, awardTitle: "Certificate of Achievement" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      const exitTitleInput = screen.getByTestId("stage-exit-title-stage_1");
      expect(exitTitleInput).toBeInTheDocument();
      expect(exitTitleInput).toHaveValue("Certificate of Achievement");
    });
  });

  describe("Module assignment", () => {
    it("displays modules for assignment", () => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Introduction to Computing", credits: 10 },
        { id: "mod_2", code: "CS102", title: "Programming Fundamentals", credits: 10 },
      ];
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      expect(screen.getByText(/CS101 — Introduction to Computing/i)).toBeInTheDocument();
      expect(screen.getByText(/CS102 — Programming Fundamentals/i)).toBeInTheDocument();
    });

    it("shows message when no modules defined", () => {
      state.programme.modules = [];
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      expect(
        screen.getByText(/No modules defined yet \(add modules in Credits & Modules\)./i),
      ).toBeInTheDocument();
    });

    it("calculates assigned credits correctly", () => {
      state.programme.modules = [
        { id: "mod_1", code: "CS101", title: "Introduction to Computing", credits: 10 },
        { id: "mod_2", code: "CS102", title: "Programming Fundamentals", credits: 15 },
      ];
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [
            { moduleId: "mod_1", semester: "" },
            { moduleId: "mod_2", semester: "" },
          ],
        },
      ];
      render(<StagesStep />);

      // Should show 25 credits assigned (10 + 15)
      expect(screen.getByText(/Assigned 25cr/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper form labels", () => {
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      expect(screen.getByLabelText(/Stage name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Sequence/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Credits target/i)).toBeInTheDocument();
    });

    it("has hidden legend for accessibility", () => {
      state.programme.versions[0].stages = [
        {
          id: "stage_1",
          name: "Year 1",
          sequence: 1,
          creditsTarget: 60,
          exitAward: { enabled: false, awardTitle: "" },
          modules: [],
        },
      ];
      render(<StagesStep />);

      expect(screen.getByText(/Stage 1 details/i)).toHaveClass("visually-hidden");
    });
  });
});
