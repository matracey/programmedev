/**
 * Unit tests for TraceabilityStep React component.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../../state/store";
import { TraceabilityStep, buildSankeyData } from "./TraceabilityStep";
import type { TraceRow } from "./TraceabilityStep";

// Mock the store module
vi.mock("../../../state/store", async () => {
  const actual = await vi.importActual("../../../state/store");
  return {
    ...actual,
    saveNow: vi.fn(),
    getAwardStandard: vi.fn().mockResolvedValue({
      levels: {
        8: [{ criteria: "Knowledge", thread: "Breadth", descriptor: "Advanced" }],
      },
    }),
    getStandardIndicators: vi.fn().mockReturnValue([]),
  };
});

vi.mock("../../../utils/validation.js", () => ({
  validateProgramme: vi.fn(() => []),
}));

describe("TraceabilityStep", () => {
  beforeEach(() => {
    state.programme = {
      schemaVersion: 3,
      id: "test",
      title: "Test Programme",
      awardType: "Honours Bachelor Degree",
      nfqLevel: 8,
      school: "Computing",
      awardStandardIds: ["computing"],
      awardStandardNames: ["Computing"],
      totalCredits: 180,
      electiveDefinitions: [],
      intakeMonths: ["Sep"],
      modules: [],
      plos: [],
      ploToMimlos: {},
      versions: [],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the traceability card", () => {
      render(<TraceabilityStep />);
      expect(screen.getByTestId("traceability-card")).toBeInTheDocument();
    });

    it("displays loading state while fetching standards", () => {
      render(<TraceabilityStep />);
      expect(screen.getByText(/Loading award standards/)).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("renders without crashing when no PLOs", () => {
      render(<TraceabilityStep />);
      expect(screen.getByText("Traceability Matrix")).toBeInTheDocument();
    });
  });

  describe("Sankey Diagram", () => {
    it("renders sankey tab option", async () => {
      render(<TraceabilityStep />);
      // Wait for loading to complete
      await vi.waitFor(() => {
        expect(screen.queryByText(/Loading award standards/)).not.toBeInTheDocument();
      });
      expect(screen.getByTestId("traceability-sankey-tab")).toBeInTheDocument();
    });

    it("shows empty state message when no traceability data", async () => {
      render(<TraceabilityStep />);
      await vi.waitFor(() => {
        expect(screen.queryByText(/Loading award standards/)).not.toBeInTheDocument();
      });
      // Click on sankey tab
      fireEvent.click(screen.getByTestId("traceability-sankey-tab"));
      expect(screen.getByText(/Not enough linked data to render the diagram/)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has accessible title", () => {
      render(<TraceabilityStep />);
      expect(screen.getByText("Traceability Matrix")).toBeInTheDocument();
    });
  });
});

describe("buildSankeyData", () => {
  it("returns empty arrays for empty input", () => {
    const result = buildSankeyData([]);
    expect(result.nodeLabels).toHaveLength(0);
    expect(result.sources).toHaveLength(0);
    expect(result.targets).toHaveLength(0);
    expect(result.values).toHaveLength(0);
    expect(result.linkColors).toHaveLength(0);
  });

  it("creates nodes and links for a complete trace row", () => {
    const rows: TraceRow[] = [
      {
        awardStandardId: "cs",
        standard: "Computing",
        ploNum: 1,
        ploText: "Analyse problems",
        moduleCode: "COMP101",
        moduleTitle: "Intro to Computing",
        mimloNum: 1,
        mimloText: "Identify basic concepts",
        assessmentTitle: "Assignment 1",
        assessmentType: "Report",
        assessmentWeight: "50%",
        status: "ok",
        statusLabel: "Covered",
      },
    ];

    const result = buildSankeyData(rows);

    // 4 nodes: PLO 1, COMP101, COMP101 MIMLO 1, COMP101: Assignment 1
    expect(result.nodeLabels).toHaveLength(4);
    expect(result.nodeLabels).toContain("PLO 1");
    expect(result.nodeLabels).toContain("COMP101");
    expect(result.nodeLabels).toContain("COMP101 MIMLO 1");
    expect(result.nodeLabels).toContain("COMP101: Assignment 1");

    // 3 links: PLO→Module, Module→MIMLO, MIMLO→Assessment
    expect(result.sources).toHaveLength(3);
    expect(result.targets).toHaveLength(3);
    expect(result.values).toHaveLength(3);
  });

  it("aggregates duplicate links", () => {
    const baseRow: TraceRow = {
      awardStandardId: "cs",
      standard: "Computing",
      ploNum: 1,
      ploText: "Analyse problems",
      moduleCode: "COMP101",
      moduleTitle: "Intro to Computing",
      mimloNum: 1,
      mimloText: "Identify basic concepts",
      assessmentTitle: "Assignment 1",
      assessmentType: "Report",
      assessmentWeight: "50%",
      status: "ok",
      statusLabel: "Covered",
    };

    // Same row repeated — should aggregate, not create duplicate links
    const result = buildSankeyData([baseRow, baseRow]);

    // Still 4 unique nodes
    expect(result.nodeLabels).toHaveLength(4);

    // Still 3 links but with value 2 each
    expect(result.sources).toHaveLength(3);
    expect(result.values).toEqual([2, 2, 2]);
  });

  it("skips rows with no PLO", () => {
    const rows: TraceRow[] = [
      {
        awardStandardId: null,
        standard: "",
        ploNum: "—",
        ploText: "",
        moduleCode: "COMP101",
        moduleTitle: "Intro",
        mimloNum: 1,
        mimloText: "Some MIMLO",
        assessmentTitle: "Exam",
        assessmentType: "Exam",
        assessmentWeight: "100%",
        status: "uncovered",
        statusLabel: "Uncovered",
      },
    ];

    const result = buildSankeyData(rows);
    expect(result.nodeLabels).toHaveLength(0);
    expect(result.sources).toHaveLength(0);
  });

  it("creates partial links when MIMLO is missing", () => {
    const rows: TraceRow[] = [
      {
        awardStandardId: "cs",
        standard: "Computing",
        ploNum: 1,
        ploText: "Analyse problems",
        moduleCode: "COMP101",
        moduleTitle: "Intro",
        mimloNum: "—",
        mimloText: "",
        assessmentTitle: "—",
        assessmentType: "",
        assessmentWeight: "",
        status: "gap",
        statusLabel: "Gap",
      },
    ];

    const result = buildSankeyData(rows);

    // 2 nodes: PLO 1, COMP101
    expect(result.nodeLabels).toHaveLength(2);
    // 1 link: PLO→Module
    expect(result.sources).toHaveLength(1);
  });

  it("uses correct colors for different statuses", () => {
    const makeRow = (status: "ok" | "warning" | "gap" | "uncovered"): TraceRow => ({
      awardStandardId: "cs",
      standard: "Computing",
      ploNum: 1,
      ploText: "PLO text",
      moduleCode: `MOD_${status}`,
      moduleTitle: `Module ${status}`,
      mimloNum: 1,
      mimloText: "MIMLO text",
      assessmentTitle: `Assessment ${status}`,
      assessmentType: "Report",
      assessmentWeight: "100%",
      status,
      statusLabel: status,
    });

    const result = buildSankeyData([makeRow("ok"), makeRow("gap")]);

    // PLO node should be blue
    expect(result.nodeColors[0]).toBe("#0d6efd");

    // Module nodes should be purple
    const modOkIdx = result.nodeLabels.indexOf("MOD_ok");
    expect(result.nodeColors[modOkIdx]).toBe("#6f42c1");

    // MIMLO nodes colored by status
    const mimloOkIdx = result.nodeLabels.indexOf("MOD_ok MIMLO 1");
    const mimloGapIdx = result.nodeLabels.indexOf("MOD_gap MIMLO 1");
    expect(result.nodeColors[mimloOkIdx]).toBe("#198754"); // green for ok
    expect(result.nodeColors[mimloGapIdx]).toBe("#dc3545"); // red for gap
  });
});
