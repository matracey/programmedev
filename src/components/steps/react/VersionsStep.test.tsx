/**
 * Unit tests for VersionsStep React component.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../../state/store.js";
import { VersionsStep } from "./VersionsStep";

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

describe("VersionsStep", () => {
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
      versions: [],
    } as Programme;
    state.selectedVersionId = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the Programme Versions card", () => {
      render(<VersionsStep />);

      expect(screen.getByText("Programme Versions")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Add new version/i })).toBeInTheDocument();
    });

    it("shows empty state message when no versions", () => {
      render(<VersionsStep />);

      expect(
        screen.getByText(/No versions yet. Add at least one version to continue./i),
      ).toBeInTheDocument();
    });

    it("displays existing versions", () => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          duration: "1 year",
          intakes: ["Sep", "Jan"],
          targetCohortSize: 30,
          numberOfGroups: 2,
          deliveryModality: "F2F",
          deliveryPatterns: {},
          deliveryNotes: "",
          onlineProctoredExams: "TBC",
          onlineProctoredExamsNotes: "",
          stages: [],
        },
      ];
      render(<VersionsStep />);

      expect(screen.getByText(/Version 1:/)).toBeInTheDocument();
      expect(screen.getByText("Full-time")).toBeInTheDocument();
    });
  });

  describe("Add version", () => {
    it("adds a new version when clicking add button", async () => {
      render(<VersionsStep />);

      const addBtn = screen.getByTestId("add-version-btn");
      await act(async () => {
        fireEvent.click(addBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions.length).toBe(1);
      expect(state.programme.versions[0].label).toBe("Full-time");
    });
  });

  describe("Version fields", () => {
    beforeEach(() => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Full-time",
          code: "FT",
          duration: "",
          intakes: [],
          targetCohortSize: 0,
          numberOfGroups: 0,
          deliveryModality: "F2F",
          deliveryPatterns: {},
          deliveryNotes: "",
          onlineProctoredExams: "TBC",
          onlineProctoredExamsNotes: "",
          stages: [],
        },
      ];
    });

    it("displays the version label", () => {
      render(<VersionsStep />);

      expect(screen.getByTestId("version-label-ver_1")).toHaveValue("Full-time");
    });

    it("updates version label on input change", async () => {
      render(<VersionsStep />);

      const input = screen.getByTestId("version-label-ver_1");
      await act(async () => {
        fireEvent.change(input, { target: { value: "Part-time" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].label).toBe("Part-time");
    });

    it("displays the version code", () => {
      render(<VersionsStep />);

      expect(screen.getByTestId("version-code-ver_1")).toHaveValue("FT");
    });

    it("updates version code on input change", async () => {
      render(<VersionsStep />);

      const input = screen.getByTestId("version-code-ver_1");
      await act(async () => {
        fireEvent.change(input, { target: { value: "PT" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].code).toBe("PT");
    });

    it("updates intakes on input change", async () => {
      render(<VersionsStep />);

      const input = screen.getByTestId("version-intakes-ver_1");
      await act(async () => {
        fireEvent.change(input, { target: { value: "Sep, Jan" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].intakes).toEqual(["Sep", "Jan"]);
    });

    it("updates target cohort size on input change", async () => {
      render(<VersionsStep />);

      const input = screen.getByTestId("version-cohort-ver_1");
      await act(async () => {
        fireEvent.change(input, { target: { value: "30" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].targetCohortSize).toBe(30);
    });

    it("updates number of groups on input change", async () => {
      render(<VersionsStep />);

      const input = screen.getByTestId("version-groups-ver_1");
      await act(async () => {
        fireEvent.change(input, { target: { value: "3" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].numberOfGroups).toBe(3);
    });
  });

  describe("Delivery modality", () => {
    beforeEach(() => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Test",
          code: "T",
          duration: "",
          intakes: [],
          targetCohortSize: 0,
          numberOfGroups: 0,
          deliveryModality: "",
          deliveryPatterns: {},
          deliveryNotes: "",
          onlineProctoredExams: "TBC",
          onlineProctoredExamsNotes: "",
          stages: [],
        },
      ];
    });

    it("displays modality radio buttons", () => {
      render(<VersionsStep />);

      expect(screen.getByTestId("version-modality-ver_1-F2F")).toBeInTheDocument();
      expect(screen.getByTestId("version-modality-ver_1-BLENDED")).toBeInTheDocument();
      expect(screen.getByTestId("version-modality-ver_1-ONLINE")).toBeInTheDocument();
    });

    it("updates modality when selecting a radio button", async () => {
      render(<VersionsStep />);

      const radio = screen.getByTestId("version-modality-ver_1-BLENDED");
      await act(async () => {
        fireEvent.click(radio);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].deliveryModality).toBe("BLENDED");
    });

    it("shows delivery pattern card when modality is selected", async () => {
      state.programme.versions[0].deliveryModality = "F2F";
      render(<VersionsStep />);

      expect(screen.getByText(/F2F delivery pattern/)).toBeInTheDocument();
    });
  });

  describe("Delivery pattern", () => {
    beforeEach(() => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Test",
          code: "T",
          duration: "",
          intakes: [],
          targetCohortSize: 0,
          numberOfGroups: 0,
          deliveryModality: "F2F",
          deliveryPatterns: {
            F2F: { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 },
          },
          deliveryNotes: "",
          onlineProctoredExams: "TBC",
          onlineProctoredExamsNotes: "",
          stages: [],
        },
      ];
    });

    it("displays pattern percentage inputs", () => {
      render(<VersionsStep />);

      expect(screen.getByTestId("version-pattern-sync-ver_1")).toBeInTheDocument();
      expect(screen.getByTestId("version-pattern-async-ver_1")).toBeInTheDocument();
      expect(screen.getByTestId("version-pattern-campus-ver_1")).toBeInTheDocument();
    });

    it("updates sync percentage on input change", async () => {
      render(<VersionsStep />);

      const input = screen.getByTestId("version-pattern-sync-ver_1");
      await act(async () => {
        fireEvent.change(input, { target: { value: "20" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].deliveryPatterns.F2F.syncOnlinePct).toBe(20);
    });

    it("shows OK badge when percentages total 100", () => {
      render(<VersionsStep />);

      expect(screen.getByText("OK")).toBeInTheDocument();
    });

    it("shows warning badge when percentages do not total 100", () => {
      state.programme.versions[0].deliveryPatterns.F2F = {
        syncOnlinePct: 10,
        asyncDirectedPct: 10,
        onCampusPct: 10,
      };
      render(<VersionsStep />);

      expect(screen.getByText("⚠")).toBeInTheDocument();
      expect(screen.getByText("30%")).toBeInTheDocument();
    });
  });

  describe("Online proctored exams", () => {
    beforeEach(() => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Test",
          code: "T",
          duration: "",
          intakes: [],
          targetCohortSize: 0,
          numberOfGroups: 0,
          deliveryModality: "F2F",
          deliveryPatterns: {},
          deliveryNotes: "",
          onlineProctoredExams: "TBC",
          onlineProctoredExamsNotes: "",
          stages: [],
        },
      ];
    });

    it("displays proctored exams dropdown", () => {
      render(<VersionsStep />);

      const select = screen.getByTestId("version-proctor-ver_1");
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue("TBC");
    });

    it("updates proctored exams setting on change", async () => {
      render(<VersionsStep />);

      const select = screen.getByTestId("version-proctor-ver_1");
      await act(async () => {
        fireEvent.change(select, { target: { value: "YES" } });
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions[0].onlineProctoredExams).toBe("YES");
    });

    it("shows proctoring notes when YES is selected", () => {
      state.programme.versions[0].onlineProctoredExams = "YES";
      render(<VersionsStep />);

      expect(screen.getByTestId("version-proctor-notes-ver_1")).toBeInTheDocument();
    });

    it("hides proctoring notes when TBC or NO is selected", () => {
      state.programme.versions[0].onlineProctoredExams = "NO";
      render(<VersionsStep />);

      expect(screen.queryByTestId("version-proctor-notes-ver_1")).not.toBeInTheDocument();
    });
  });

  describe("Remove version", () => {
    beforeEach(() => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Version 1",
          code: "V1",
          duration: "",
          intakes: [],
          targetCohortSize: 0,
          numberOfGroups: 0,
          deliveryModality: "F2F",
          deliveryPatterns: {},
          deliveryNotes: "",
          onlineProctoredExams: "TBC",
          onlineProctoredExamsNotes: "",
          stages: [],
        },
        {
          id: "ver_2",
          label: "Version 2",
          code: "V2",
          duration: "",
          intakes: [],
          targetCohortSize: 0,
          numberOfGroups: 0,
          deliveryModality: "ONLINE",
          deliveryPatterns: {},
          deliveryNotes: "",
          onlineProctoredExams: "TBC",
          onlineProctoredExamsNotes: "",
          stages: [],
        },
      ];
    });

    it("removes a version when clicking remove button", async () => {
      render(<VersionsStep />);

      const removeBtn = screen.getByTestId("remove-version-ver_1");
      await act(async () => {
        fireEvent.click(removeBtn);
        vi.advanceTimersByTime(400);
      });

      expect(state.programme.versions.length).toBe(1);
      expect(state.programme.versions[0].id).toBe("ver_2");
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      state.programme.versions = [
        {
          id: "ver_1",
          label: "Test",
          code: "T",
          duration: "",
          intakes: [],
          targetCohortSize: 0,
          numberOfGroups: 0,
          deliveryModality: "F2F",
          deliveryPatterns: {},
          deliveryNotes: "",
          onlineProctoredExams: "TBC",
          onlineProctoredExamsNotes: "",
          stages: [],
        },
      ];
    });

    it("has proper form labels", () => {
      render(<VersionsStep />);

      expect(screen.getByLabelText(/Version label/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Code$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Intakes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Target cohort size/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Number of groups/i)).toBeInTheDocument();
    });

    it("has aria-label on add version button", () => {
      render(<VersionsStep />);

      expect(screen.getByRole("button", { name: /Add new version/i })).toBeInTheDocument();
    });
  });
});
