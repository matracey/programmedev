/**
 * React version of the Traceability step component.
 * Displays the full alignment chain from award standards through PLOs to MIMLOs
 * with coverage analysis and gap warnings.
 * @module components/steps/react/TraceabilityStep
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Plotly from "plotly.js-dist-min";
import { Badge, Button, Form, Nav, Tab, Table } from "react-bootstrap";

import { useProgramme } from "../../../hooks/useStore";
import { getAwardStandard, getStandardIndicators, state } from "../../../state/store";
import { validateProgramme } from "../../../utils/validation";
import { Alert, Icon, SectionCard } from "../../ui";

// ============================================================================
// Types
// ============================================================================

export interface TraceRow {
  awardStandardId: string | null;
  standard: string;
  ploNum: number | string;
  ploText: string;
  moduleCode: string;
  moduleTitle: string;
  mimloNum: number | string;
  mimloText: string;
  assessmentTitle: string;
  assessmentType: string;
  assessmentWeight: string;
  status: "ok" | "warning" | "gap" | "uncovered";
  statusLabel: string;
}

interface TraceStats {
  coveredCount: number;
  warningCount: number;
  gapCount: number;
  uncoveredCount: number;
}

interface StandardCoverage {
  id: string;
  name: string;
  totalStandards: number;
  coveredStandards: number;
  uncoveredList: string[];
}

interface ValidationFlag {
  type: "error" | "warn";
  msg: string;
  step: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Builds trace rows from programme data showing the full alignment chain.
 */
function buildTraceRows(
  programme: Programme,
  standardsData: Map<string, any>,
): { rows: TraceRow[]; stats: TraceStats; coverage: StandardCoverage[] } {
  const traceRows: TraceRow[] = [];
  const moduleMap = new Map((programme.modules ?? []).map((m) => [m.id, m]));

  const nfqLevel = Number(programme.nfqLevel ?? 0);
  const standardIds = programme.awardStandardIds ?? [];

  // Track which standards are covered by PLOs
  const coveredStandardsByAward = new Map<string, Set<string>>();
  standardIds.forEach((id) => {
    coveredStandardsByAward.set(id, new Set());
  });

  // Build MIMLO to module lookup map
  const mimloToModuleMap = new Map<string, { mod: Module; mimlo: MIMLO; mimloIdx: number }>();
  (programme.modules ?? []).forEach((mod) => {
    (mod.mimlos ?? []).forEach((mimlo, idx) => {
      mimloToModuleMap.set(mimlo.id, { mod, mimlo, mimloIdx: idx });
    });
  });

  // Process each PLO
  (programme.plos ?? []).forEach((plo, ploIdx) => {
    const standardMappings = plo.standardMappings ?? [];
    const mappedMimloIds = programme.ploToMimlos?.[plo.id] ?? [];

    // If no standard mappings, still show the PLO
    const standards =
      standardMappings.length > 0
        ? standardMappings
        : [{ criteria: "(Not mapped)", thread: "", standardId: null }];

    standards.forEach((std) => {
      const awardStandardId = std.standardId ?? standardIds[0] ?? null;
      const standardLabel = std.thread ? `${std.criteria} — ${std.thread}` : std.criteria;

      // Mark this standard as covered by a PLO
      if (std.thread && awardStandardId && coveredStandardsByAward.has(awardStandardId)) {
        coveredStandardsByAward.get(awardStandardId)!.add(std.thread);
      }

      if (mappedMimloIds.length === 0) {
        // PLO not mapped to any MIMLO
        traceRows.push({
          awardStandardId,
          standard: standardLabel,
          ploNum: ploIdx + 1,
          ploText: plo.text || "",
          moduleCode: "—",
          moduleTitle: "(Not mapped to MIMLO)",
          mimloNum: "—",
          mimloText: "",
          assessmentTitle: "",
          assessmentType: "",
          assessmentWeight: "",
          status: "gap",
          statusLabel: "PLO Gap",
        });
      } else {
        mappedMimloIds.forEach((mimloId) => {
          const mimloInfo = mimloToModuleMap.get(mimloId);
          if (!mimloInfo) {
            return;
          }

          const { mod, mimlo, mimloIdx } = mimloInfo;
          const assessments = mod.assessments ?? [];

          // Find assessments that cover this MIMLO
          const coveringAssessments = assessments.filter((a) =>
            (a.mimloIds ?? []).includes(mimloId),
          );

          if (coveringAssessments.length === 0) {
            // MIMLO not assessed
            traceRows.push({
              awardStandardId,
              standard: standardLabel,
              ploNum: ploIdx + 1,
              ploText: plo.text || "",
              moduleCode: mod.code || "",
              moduleTitle: mod.title || "",
              mimloNum: mimloIdx + 1,
              mimloText: mimlo.text || "",
              assessmentTitle: "—",
              assessmentType: "(Not assessed)",
              assessmentWeight: "",
              status: "warning",
              statusLabel: "Assessment Gap",
            });
          } else {
            coveringAssessments.forEach((asm) => {
              traceRows.push({
                awardStandardId,
                standard: standardLabel,
                ploNum: ploIdx + 1,
                ploText: plo.text || "",
                moduleCode: mod.code || "",
                moduleTitle: mod.title || "",
                mimloNum: mimloIdx + 1,
                mimloText: mimlo.text || "",
                assessmentTitle: asm.title || "",
                assessmentType: asm.type || "",
                assessmentWeight: asm.weighting ? `${asm.weighting}%` : "",
                status: "ok",
                statusLabel: "Covered",
              });
            });
          }
        });
      }
    });
  });

  // Find uncovered award standards and add them as critical gaps
  const coverage: StandardCoverage[] = [];
  standardIds.forEach((stdId) => {
    const stdData = standardsData.get(stdId);
    const levelStandards = stdData?.levels?.[nfqLevel] ?? [];
    const covered = coveredStandardsByAward.get(stdId) ?? new Set();
    const uncoveredList = levelStandards
      .filter((s: any) => !covered.has(s.thread))
      .map((s: any) => s.thread);

    const stdIdx = standardIds.indexOf(stdId);
    const stdName = (programme.awardStandardNames ?? [])[stdIdx] ?? stdId;

    coverage.push({
      id: stdId,
      name: stdName,
      totalStandards: levelStandards.length,
      coveredStandards: levelStandards.length - uncoveredList.length,
      uncoveredList,
    });

    // Add uncovered standards to trace rows
    levelStandards
      .filter((s: any) => !covered.has(s.thread))
      .forEach((std: any) => {
        const standardLabel = std.thread ? `${std.criteria} — ${std.thread}` : std.criteria;
        traceRows.unshift({
          awardStandardId: stdId,
          standard: standardLabel,
          ploNum: "—",
          ploText: "(No PLO covers this standard)",
          moduleCode: "—",
          moduleTitle: "",
          mimloNum: "—",
          mimloText: "",
          assessmentTitle: "",
          assessmentType: "",
          assessmentWeight: "",
          status: "uncovered",
          statusLabel: "Standard Gap",
        });
      });
  });

  // Calculate stats
  const stats: TraceStats = {
    coveredCount: traceRows.filter((r) => r.status === "ok").length,
    warningCount: traceRows.filter((r) => r.status === "warning").length,
    gapCount: traceRows.filter((r) => r.status === "gap").length,
    uncoveredCount: traceRows.filter((r) => r.status === "uncovered").length,
  };

  return { rows: traceRows, stats, coverage };
}

/**
 * Truncates text to a maximum length with ellipsis.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "…";
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Status badge component for trace rows.
 */
const StatusBadge: React.FC<{ status: TraceRow["status"]; label: string }> = ({
  status,
  label,
}) => {
  const bgMap: Record<string, string> = {
    ok: "success",
    warning: "warning",
    gap: "danger",
    uncovered: "dark",
  };
  return <Badge bg={bgMap[status] ?? "secondary"}>{label}</Badge>;
};

/**
 * Coverage summary cards showing standard coverage per award.
 */
const CoverageSummary: React.FC<{
  coverage: StandardCoverage[];
  nfqLevel: number | null;
}> = ({ coverage, nfqLevel }) => {
  if (coverage.length === 0) {
    if (nfqLevel) {
      return (
        <Alert variant="warning" className="mb-3" data-testid="traceability-no-standards">
          <Icon name="warning" className="me-2" />
          No award standards selected. Go to Identity to select QQI award standards.
        </Alert>
      );
    }
    return null;
  }

  return (
    <div className="mb-3" data-testid="traceability-coverage-summary">
      {coverage.map((cov) => {
        const isFullyCovered = cov.uncoveredList.length === 0;
        return (
          <div
            key={cov.id}
            className={`p-3 ${isFullyCovered ? "bg-success-subtle" : "bg-danger-subtle"} rounded mb-2`}
          >
            <div className="fw-semibold mb-1">
              {cov.name} (NFQ Level {nfqLevel})
            </div>
            <div className="small">
              {cov.coveredStandards} of {cov.totalStandards} standards covered by PLOs
              {!isFullyCovered && (
                <>
                  {" "}
                  —{" "}
                  <strong>
                    {cov.uncoveredList.length} standard
                    {cov.uncoveredList.length > 1 ? "s" : ""} not yet addressed
                  </strong>
                </>
              )}
              {isFullyCovered && " ✓"}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Stats badges showing coverage summary.
 */
const StatsBadges: React.FC<{ stats: TraceStats }> = ({ stats }) => (
  <div className="d-flex flex-wrap gap-3 mb-3 align-items-center" data-testid="traceability-stats">
    <div className="d-flex align-items-center gap-2">
      <Badge bg="success">{stats.coveredCount}</Badge>
      <span className="small">Covered</span>
    </div>
    <div className="d-flex align-items-center gap-2">
      <Badge bg="warning">{stats.warningCount}</Badge>
      <span className="small">Assessment Gaps</span>
    </div>
    <div className="d-flex align-items-center gap-2">
      <Badge bg="danger">{stats.gapCount}</Badge>
      <span className="small">PLO/MIMLO Gaps</span>
    </div>
    {stats.uncoveredCount > 0 && (
      <div className="d-flex align-items-center gap-2">
        <Badge bg="dark">{stats.uncoveredCount}</Badge>
        <span className="small">Uncovered Standards</span>
      </div>
    )}
  </div>
);

/**
 * Filter controls for the table view.
 */
const FilterControls: React.FC<{
  statusFilter: string;
  moduleFilter: string;
  modules: Module[];
  onStatusChange: (val: string) => void;
  onModuleChange: (val: string) => void;
  onExportCsv: () => void;
}> = ({ statusFilter, moduleFilter, modules, onStatusChange, onModuleChange, onExportCsv }) => (
  <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
    <Form.Select
      size="sm"
      style={{ width: "auto" }}
      value={statusFilter}
      onChange={(e) => onStatusChange(e.target.value)}
      aria-label="Filter by status"
      data-testid="traceability-filter-status"
    >
      <option value="all">All statuses</option>
      <option value="ok">Covered only</option>
      <option value="warning">Assessment gaps</option>
      <option value="gap">PLO/MIMLO gaps</option>
      <option value="uncovered">Uncovered standards</option>
    </Form.Select>
    <Form.Select
      size="sm"
      style={{ width: "auto" }}
      value={moduleFilter}
      onChange={(e) => onModuleChange(e.target.value)}
      aria-label="Filter by module"
      data-testid="traceability-filter-module"
    >
      <option value="all">All modules</option>
      {modules.map((m) => (
        <option key={m.id} value={m.code || m.title}>
          {m.code || m.title}
        </option>
      ))}
    </Form.Select>
    <Button
      variant="outline-secondary"
      size="sm"
      onClick={onExportCsv}
      aria-label="Export traceability matrix as CSV"
      data-testid="traceability-export-csv"
    >
      <Icon name="file-csv" className="me-1" />
      Export CSV
    </Button>
  </div>
);

/**
 * Traceability table component.
 */
const TraceabilityTable: React.FC<{
  rows: TraceRow[];
  hasMultipleStandards: boolean;
  programme: Programme;
}> = ({ rows, hasMultipleStandards, programme }) => {
  // Group rows by award standard if multiple standards
  const groupedRows = useMemo(() => {
    if (!hasMultipleStandards || rows.length === 0) {
      return null;
    }
    const groups = new Map<string, TraceRow[]>();
    rows.forEach((r) => {
      const awardId = r.awardStandardId || "unknown";
      if (!groups.has(awardId)) {
        groups.set(awardId, []);
      }
      groups.get(awardId)!.push(r);
    });
    return groups;
  }, [rows, hasMultipleStandards]);

  if (rows.length === 0) {
    return (
      <Alert variant="info" className="mb-0" data-testid="traceability-no-data">
        No traceability data yet. Add PLOs, map them to modules, define MIMLOs, and create
        assessments to see the full alignment chain.
      </Alert>
    );
  }

  return (
    <>
      <div className="table-responsive" style={{ maxHeight: 600, overflowY: "auto" }}>
        <Table
          size="sm"
          hover
          bordered
          className="align-middle mb-0"
          aria-label="Traceability matrix showing alignment from award standards to assessments"
          data-testid="traceability-table"
        >
          <thead className="sticky-top" style={{ background: "var(--bs-body-bg)" }}>
            <tr>
              <th style={{ minWidth: 140 }}>Award Standard</th>
              <th style={{ minWidth: 60 }}>PLO</th>
              <th style={{ minWidth: 150 }}>PLO Text</th>
              <th style={{ minWidth: 80 }}>Module</th>
              <th style={{ minWidth: 120 }}>Module Title</th>
              <th style={{ minWidth: 70 }}>MIMLO</th>
              <th style={{ minWidth: 140 }}>MIMLO Text</th>
              <th style={{ minWidth: 100 }}>Assessment</th>
              <th style={{ minWidth: 100 }}>Type</th>
              <th style={{ minWidth: 60 }}>Weight</th>
              <th style={{ minWidth: 80 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {hasMultipleStandards && groupedRows
              ? Array.from(groupedRows.entries()).map(([awardId, groupRows]) => {
                  const stdIdx = (programme.awardStandardIds ?? []).indexOf(awardId);
                  const stdName = (programme.awardStandardNames ?? [])[stdIdx] ?? awardId;
                  return (
                    <React.Fragment key={awardId}>
                      <tr className="table-secondary">
                        <td colSpan={11} className="fw-semibold">
                          {stdName}
                        </td>
                      </tr>
                      {groupRows.map((r, idx) => (
                        <TraceTableRow key={`${awardId}-${idx}`} row={r} />
                      ))}
                    </React.Fragment>
                  );
                })
              : rows.map((r, idx) => <TraceTableRow key={idx} row={r} />)}
          </tbody>
        </Table>
      </div>
      <div className="small text-secondary mt-2">
        {rows.length} alignment{rows.length !== 1 ? "s" : ""} shown
      </div>
    </>
  );
};

/**
 * Single row in the traceability table.
 */
const TraceTableRow: React.FC<{ row: TraceRow }> = ({ row }) => (
  <tr data-status={row.status}>
    <td className={`small ${row.status === "uncovered" ? "fw-bold" : ""}`}>{row.standard}</td>
    <td className="small text-nowrap">{row.ploNum !== "—" ? `PLO ${row.ploNum}` : "—"}</td>
    <td className="small" style={{ maxWidth: 200 }} title={row.ploText}>
      {truncateText(row.ploText, 60)}
    </td>
    <td className="small text-nowrap">{row.moduleCode}</td>
    <td className="small">{row.moduleTitle}</td>
    <td className="small text-nowrap">{row.mimloNum !== "—" ? `MIMLO ${row.mimloNum}` : "—"}</td>
    <td className="small" style={{ maxWidth: 180 }} title={row.mimloText}>
      {truncateText(row.mimloText, 50)}
    </td>
    <td className="small">{row.assessmentTitle}</td>
    <td className="small">{row.assessmentType}</td>
    <td className="small text-end">{row.assessmentWeight}</td>
    <td className="small text-center">
      <StatusBadge status={row.status} label={row.statusLabel} />
    </td>
  </tr>
);

/**
 * Builds Sankey diagram data from trace rows.
 */
export function buildSankeyData(rows: TraceRow[]): {
  nodeLabels: string[];
  nodeColors: string[];
  sources: number[];
  targets: number[];
  values: number[];
  linkColors: string[];
} {
  const nodeMap = new Map<string, number>();
  const nodeLabels: string[] = [];
  const nodeColors: string[] = [];

  const getNodeIndex = (label: string, color: string): number => {
    if (!nodeMap.has(label)) {
      const idx = nodeLabels.length;
      nodeMap.set(label, idx);
      nodeLabels.push(label);
      nodeColors.push(color);
    }
    return nodeMap.get(label)!;
  };

  const sources: number[] = [];
  const targets: number[] = [];
  const values: number[] = [];
  const linkColors: string[] = [];

  // Aggregate links to avoid duplicates
  const linkAgg = new Map<
    string,
    { source: number; target: number; value: number; color: string }
  >();

  const statusColor = (status: string) => {
    switch (status) {
      case "ok":
        return "rgba(25, 135, 84, 0.4)";
      case "warning":
        return "rgba(255, 193, 7, 0.4)";
      case "gap":
        return "rgba(220, 53, 69, 0.4)";
      case "uncovered":
        return "rgba(33, 37, 41, 0.3)";
      default:
        return "rgba(108, 117, 125, 0.3)";
    }
  };

  const statusNodeColor = (status: string) => {
    switch (status) {
      case "ok":
        return "#198754";
      case "warning":
        return "#ffc107";
      case "gap":
        return "#dc3545";
      case "uncovered":
        return "#212529";
      default:
        return "#6c757d";
    }
  };

  rows.forEach((row) => {
    const color = statusColor(row.status);

    // PLO node
    if (row.ploNum !== "—") {
      const ploLabel = `PLO ${row.ploNum}`;
      const ploIdx = getNodeIndex(ploLabel, "#0d6efd");

      // Module node
      if (row.moduleCode !== "—") {
        const modLabel = row.moduleCode;
        const modIdx = getNodeIndex(modLabel, "#6f42c1");

        const key1 = `${ploIdx}-${modIdx}`;
        if (linkAgg.has(key1)) {
          linkAgg.get(key1)!.value += 1;
        } else {
          linkAgg.set(key1, { source: ploIdx, target: modIdx, value: 1, color });
        }

        // MIMLO node
        if (row.mimloNum !== "—") {
          const mimloLabel = `${row.moduleCode} MIMLO ${row.mimloNum}`;
          const mimloIdx = getNodeIndex(mimloLabel, statusNodeColor(row.status));

          const key2 = `${modIdx}-${mimloIdx}`;
          if (linkAgg.has(key2)) {
            linkAgg.get(key2)!.value += 1;
          } else {
            linkAgg.set(key2, { source: modIdx, target: mimloIdx, value: 1, color });
          }

          // Assessment node
          if (row.assessmentTitle && row.assessmentTitle !== "—") {
            const asmLabel = `${row.moduleCode}: ${row.assessmentTitle}`;
            const asmIdx = getNodeIndex(asmLabel, statusNodeColor(row.status));

            const key3 = `${mimloIdx}-${asmIdx}`;
            if (linkAgg.has(key3)) {
              linkAgg.get(key3)!.value += 1;
            } else {
              linkAgg.set(key3, { source: mimloIdx, target: asmIdx, value: 1, color });
            }
          }
        }
      }
    }
  });

  linkAgg.forEach((link) => {
    sources.push(link.source);
    targets.push(link.target);
    values.push(link.value);
    linkColors.push(link.color);
  });

  return { nodeLabels, nodeColors, sources, targets, values, linkColors };
}

/**
 * Sankey diagram component using Plotly.
 */
const SankeyDiagram: React.FC<{ rows: TraceRow[] }> = ({ rows }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const sankeyData = useMemo(() => buildSankeyData(rows), [rows]);

  useEffect(() => {
    if (!chartRef.current || sankeyData.nodeLabels.length === 0) {
      return;
    }

    const data = [
      {
        type: "sankey" as const,
        orientation: "h" as const,
        node: {
          pad: 15,
          thickness: 20,
          label: sankeyData.nodeLabels,
          color: sankeyData.nodeColors,
        },
        link: {
          source: sankeyData.sources,
          target: sankeyData.targets,
          value: sankeyData.values,
          color: sankeyData.linkColors,
        },
      },
    ];

    const layout = {
      font: { size: 11, family: "system-ui, sans-serif" },
      margin: { l: 10, r: 10, t: 10, b: 10 },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      height: 600,
    };

    const config = {
      responsive: true,
      displayModeBar: false,
    };

    Plotly.react(chartRef.current, data, layout, config);

    // Relayout when the container becomes visible (e.g., tab switch)
    const el = chartRef.current;
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth > 0) {
        Plotly.relayout(el, { autosize: true });
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }
    };
  }, [sankeyData]);

  if (rows.length === 0) {
    return (
      <Alert variant="info" className="mb-0">
        No traceability data yet. Add PLOs, map them to modules, define MIMLOs, and create
        assessments to see the Sankey diagram.
      </Alert>
    );
  }

  if (sankeyData.nodeLabels.length === 0) {
    return (
      <Alert variant="info" className="mb-0">
        Not enough linked data to render the diagram. Ensure PLOs are mapped to modules with MIMLOs.
      </Alert>
    );
  }

  return (
    <div className="mb-2">
      <div className="small text-secondary mb-2">
        Flow diagram showing alignments from PLOs through Modules and MIMLOs to Assessments. Hover
        over nodes and links for details.
      </div>
      <div className="d-flex gap-2 flex-wrap mb-2">
        <Badge bg="success">● Covered</Badge>
        <Badge bg="warning">● Warning</Badge>
        <Badge bg="danger">● Gap</Badge>
        <Badge bg="dark">● Uncovered</Badge>
      </div>
      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: 600,
          background: "var(--bs-body-bg)",
          borderRadius: "0.375rem",
        }}
        data-testid="traceability-sankey-chart"
      />
    </div>
  );
};

/**
 * Validation warnings relevant to traceability.
 */
const TraceabilityWarnings: React.FC<{ programme: Programme }> = ({ programme }) => {
  const flags = useMemo(
    () =>
      (validateProgramme(programme) as ValidationFlag[]).filter((f) =>
        ["mapping", "mimlos", "assessments"].includes(f.step),
      ),
    [programme],
  );

  if (flags.length === 0) {
    return null;
  }

  const errors = flags.filter((f) => f.type === "error");
  const warnings = flags.filter((f) => f.type === "warn");

  return (
    <div className="mt-3" data-testid="traceability-validation-warnings">
      {errors.length > 0 && (
        <Alert variant="danger" icon="warning-circle" className="mb-2">
          <div className="fw-semibold mb-1">{errors.length} Error(s)</div>
          <ul className="mb-0 small ps-3">
            {errors.map((e, i) => (
              <li key={i}>
                {e.msg} <Badge bg="secondary">{e.step}</Badge>
              </li>
            ))}
          </ul>
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert variant="warning" icon="warning" className="mb-2">
          <div className="fw-semibold mb-1">{warnings.length} Warning(s)</div>
          <ul className="mb-0 small ps-3">
            {warnings.map((w, i) => (
              <li key={i}>
                {w.msg} <Badge bg="secondary">{w.step}</Badge>
              </li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Traceability step component for React.
 * Shows comprehensive traceability matrix from award standards to assessments.
 */
export const TraceabilityStep: React.FC = () => {
  const { programme } = useProgramme();
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [standardsData, setStandardsData] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const modules = programme.modules ?? [];
  const standardIds = programme.awardStandardIds ?? [];
  const hasMultipleStandards = standardIds.length > 1;

  // Load award standards data
  React.useEffect(() => {
    const loadStandards = async () => {
      setIsLoading(true);
      const dataMap = new Map<string, any>();

      await Promise.all(
        standardIds.map(async (stdId) => {
          try {
            const std = await getAwardStandard(stdId);
            dataMap.set(stdId, std || { levels: {}, standard_id: stdId });
          } catch (e) {
            console.warn(`Failed to load standard ${stdId}:`, e);
            dataMap.set(stdId, { levels: {}, standard_id: stdId });
          }
        }),
      );

      setStandardsData(dataMap);
      setIsLoading(false);
    };

    loadStandards();
  }, [standardIds.join(",")]);

  // Build trace data
  const {
    rows: allRows,
    stats,
    coverage,
  } = useMemo(() => buildTraceRows(programme, standardsData), [programme, standardsData]);

  // Filter rows based on current filters
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      if (moduleFilter !== "all" && row.moduleCode !== moduleFilter) {
        return false;
      }
      return true;
    });
  }, [allRows, statusFilter, moduleFilter]);

  // Export CSV handler
  const handleExportCsv = useCallback(() => {
    const headers = [
      "Award Standard",
      "PLO",
      "PLO Text",
      "Module",
      "Module Title",
      "MIMLO",
      "MIMLO Text",
      "Assessment",
      "Type",
      "Weight",
      "Status",
    ];

    const csvRows = [headers.join(",")];

    filteredRows.forEach((row) => {
      const cells = [
        row.standard,
        row.ploNum !== "—" ? `PLO ${row.ploNum}` : "—",
        row.ploText,
        row.moduleCode,
        row.moduleTitle,
        row.mimloNum !== "—" ? `MIMLO ${row.mimloNum}` : "—",
        row.mimloText,
        row.assessmentTitle,
        row.assessmentType,
        row.assessmentWeight,
        row.statusLabel,
      ].map((val) => {
        // Escape quotes and wrap in quotes if contains comma
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvRows.push(cells.join(","));
    });

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "traceability_matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredRows]);

  if (isLoading && standardIds.length > 0) {
    return (
      <SectionCard
        title="Traceability Matrix"
        icon="flow-arrow"
        headingId="traceability-heading"
        data-testid="traceability-card"
      >
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          Loading award standards...
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Traceability Matrix"
      icon="flow-arrow"
      headingId="traceability-heading"
      data-testid="traceability-card"
    >
      <p className="small text-secondary mb-3">
        <Icon name="lightbulb" className="me-1" />
        This shows the full alignment chain from QQI Award Standards → PLOs → Modules → MIMLOs →
        Assessments. Use the tabs to switch between table and diagram views.
      </p>

      <CoverageSummary coverage={coverage} nfqLevel={programme.nfqLevel} />

      <StatsBadges stats={stats} />

      <Tab.Container defaultActiveKey="table">
        <Nav variant="tabs" className="mb-3" role="tablist" aria-label="Traceability view options">
          <Nav.Item>
            <Nav.Link eventKey="table" data-testid="traceability-table-tab">
              Table View
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="sankey" data-testid="traceability-sankey-tab">
              Sankey Diagram
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="table">
            <FilterControls
              statusFilter={statusFilter}
              moduleFilter={moduleFilter}
              modules={modules}
              onStatusChange={setStatusFilter}
              onModuleChange={setModuleFilter}
              onExportCsv={handleExportCsv}
            />
            <TraceabilityTable
              rows={filteredRows}
              hasMultipleStandards={hasMultipleStandards}
              programme={programme}
            />
          </Tab.Pane>
          <Tab.Pane eventKey="sankey">
            <SankeyDiagram rows={allRows} />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      <TraceabilityWarnings programme={programme} />
    </SectionCard>
  );
};

export default TraceabilityStep;
