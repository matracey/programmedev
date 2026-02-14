/**
 * React version of the Schedule step component.
 * Displays a QQI-style timetable view showing module placement across stages.
 * @module components/steps/react/ScheduleStep
 */

import React, { useCallback, useMemo, useState } from "react";
import { Card, Col, Form, Row, Table, Button } from "react-bootstrap";
import { Accordion, AccordionControls, AccordionItem, Alert, Icon } from "../../ui";
import { useProgramme } from "../../../hooks/useStore";
import { state } from "../../../state/store.js";

// ============================================================================
// Types
// ============================================================================

/** Processed module data for schedule display */
interface ScheduleModule {
  module: Module;
  semester: string;
  status: string;
  credits: number;
  totalHours: number;
  contactHours: number;
  directedElearn: number;
  independent: number;
  workBased: number;
  caPercent: number;
  projectPercent: number;
  practicalPercent: number;
  examPercent: number;
}

/** Modality display labels */
const MODALITY_LABELS: Record<string, string> = {
  F2F: "Face-to-face",
  BLENDED: "Blended",
  ONLINE: "Fully online",
};

// ============================================================================
// Sub-components
// ============================================================================

/** Props for ScheduleTable */
interface ScheduleTableProps {
  stageModules: ScheduleModule[];
  nfqLevel: number | null;
  stageSequence: number;
  stageName: string;
}

/**
 * Table displaying module schedule for a single stage.
 */
const ScheduleTable: React.FC<ScheduleTableProps> = ({
  stageModules,
  nfqLevel,
  stageSequence,
  stageName,
}) => {
  const stageCredits = stageModules.reduce((sum, sm) => sum + sm.credits, 0);
  const stageTotalHours = stageModules.reduce((sum, sm) => sum + sm.totalHours, 0);

  return (
    <div className="table-responsive">
      <Table
        size="sm"
        bordered
        className="align-middle mb-0"
        aria-label={`Module schedule for ${stageName}`}
        data-testid={`schedule-table-${stageSequence}`}
      >
        <thead>
          <tr>
            <th rowSpan={2} className="align-middle" style={{ minWidth: 180 }} scope="col">
              Module Title
            </th>
            <th rowSpan={2} className="text-center align-middle" style={{ width: 60 }} scope="col">
              Sem
            </th>
            <th rowSpan={2} className="text-center align-middle" style={{ width: 50 }} scope="col">
              Status
            </th>
            <th rowSpan={2} className="text-center align-middle" style={{ width: 50 }} scope="col">
              NFQ
            </th>
            <th rowSpan={2} className="text-center align-middle" style={{ width: 50 }} scope="col">
              ECTS
            </th>
            <th colSpan={5} className="text-center" scope="colgroup">
              Total Student Effort (hours)
            </th>
            <th colSpan={4} className="text-center" scope="colgroup">
              Assessment Strategy (%)
            </th>
          </tr>
          <tr>
            <th className="text-center small" style={{ width: 50 }} scope="col">
              Total
            </th>
            <th className="text-center small" style={{ width: 55 }} scope="col">
              Contact
            </th>
            <th className="text-center small" style={{ width: 55 }} scope="col">
              Dir. E-Learn
            </th>
            <th className="text-center small" style={{ width: 60 }} scope="col">
              Indep. Learn
            </th>
            <th className="text-center small" style={{ width: 55 }} scope="col">
              Work-based
            </th>
            <th className="text-center small" style={{ width: 40 }} scope="col">
              CA
            </th>
            <th className="text-center small" style={{ width: 45 }} scope="col">
              Project
            </th>
            <th className="text-center small" style={{ width: 50 }} scope="col">
              Practical
            </th>
            <th className="text-center small" style={{ width: 45 }} scope="col">
              Exam
            </th>
          </tr>
        </thead>
        <tbody>
          {stageModules.length === 0 ? (
            <tr>
              <td colSpan={14} className="text-muted text-center">
                No modules assigned to this stage.
              </td>
            </tr>
          ) : (
            <>
              {stageModules.map((sm) => (
                <tr key={sm.module.id} data-testid={`schedule-row-${sm.module.id}`}>
                  <td className="small" style={{ maxWidth: 200 }}>
                    {sm.module.title}
                  </td>
                  <td className="text-center small">{sm.semester || "—"}</td>
                  <td className="text-center small">{sm.status}</td>
                  <td className="text-center small">{nfqLevel || "—"}</td>
                  <td className="text-center small fw-semibold">{sm.credits}</td>
                  <td className="text-center small">{sm.totalHours || "—"}</td>
                  <td className="text-center small">{sm.contactHours || "—"}</td>
                  <td className="text-center small">{sm.directedElearn || "—"}</td>
                  <td className="text-center small">{sm.independent || "—"}</td>
                  <td className="text-center small">{sm.workBased || "—"}</td>
                  <td className="text-center small">{sm.caPercent || "—"}</td>
                  <td className="text-center small">{sm.projectPercent || "—"}</td>
                  <td className="text-center small">{sm.practicalPercent || "—"}</td>
                  <td className="text-center small">{sm.examPercent || "—"}</td>
                </tr>
              ))}
              {/* Stage totals row */}
              <tr className="fw-semibold" style={{ background: "var(--bs-tertiary-bg)" }}>
                <td className="small">Stage Total</td>
                <td />
                <td />
                <td />
                <td className="text-center small">{stageCredits}</td>
                <td className="text-center small">{stageTotalHours}</td>
                <td className="text-center small">
                  {stageModules.reduce((s, m) => s + m.contactHours, 0)}
                </td>
                <td className="text-center small">
                  {stageModules.reduce((s, m) => s + m.directedElearn, 0)}
                </td>
                <td className="text-center small">
                  {stageModules.reduce((s, m) => s + m.independent, 0)}
                </td>
                <td className="text-center small">
                  {stageModules.reduce((s, m) => s + m.workBased, 0)}
                </td>
                <td colSpan={4} />
              </tr>
            </>
          )}
        </tbody>
      </Table>
    </div>
  );
};

/** Props for ProgrammeInfoCard */
interface ProgrammeInfoCardProps {
  programme: Programme;
  version: ProgrammeVersion;
}

/**
 * Card displaying programme and version information header.
 */
const ProgrammeInfoCard: React.FC<ProgrammeInfoCardProps> = ({ programme, version }) => {
  const modalityLabel = version.deliveryModality
    ? MODALITY_LABELS[version.deliveryModality] || version.deliveryModality
    : "—";

  return (
    <Card className="mb-3">
      <Card.Body>
        <Row className="g-3">
          <Col md={6}>
            <Table size="sm" borderless className="mb-0">
              <tbody>
                <tr>
                  <th className="small text-secondary" style={{ width: 140 }}>
                    Provider:
                  </th>
                  <td className="small fw-semibold">National College of Ireland</td>
                </tr>
                <tr>
                  <th className="small text-secondary">Programme Title:</th>
                  <td className="small">{programme.title || "—"}</td>
                </tr>
                <tr>
                  <th className="small text-secondary">Award Title:</th>
                  <td className="small">{programme.awardType || "—"}</td>
                </tr>
                <tr>
                  <th className="small text-secondary">Version:</th>
                  <td className="small">{version.label || version.code || "—"}</td>
                </tr>
              </tbody>
            </Table>
          </Col>
          <Col md={6}>
            <Table size="sm" borderless className="mb-0">
              <tbody>
                <tr>
                  <th className="small text-secondary" style={{ width: 140 }}>
                    NFQ Level:
                  </th>
                  <td className="small">{programme.nfqLevel || "—"}</td>
                </tr>
                <tr>
                  <th className="small text-secondary">Total Credits:</th>
                  <td className="small">{programme.totalCredits || "—"} ECTS</td>
                </tr>
                <tr>
                  <th className="small text-secondary">Delivery Mode:</th>
                  <td className="small">{modalityLabel}</td>
                </tr>
                <tr>
                  <th className="small text-secondary">Duration:</th>
                  <td className="small">{version.duration || "—"}</td>
                </tr>
              </tbody>
            </Table>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Schedule step component for React.
 * Displays QQI-style timetable view showing module placement across stages.
 */
export const ScheduleStep: React.FC = () => {
  const { programme } = useProgramme();

  // Track selected version (using local state synced with global state)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(() => {
    return state.selectedVersionId ?? null;
  });

  // Helper to update flags and header
  const updateFlagsAndHeader = useCallback(() => {
    // No-op: React components auto-update via useSyncExternalStore
  }, []);

  // Get versions array
  const versions = useMemo(() => {
    return Array.isArray(programme.versions) ? programme.versions : [];
  }, [programme.versions]);

  // Get selected version
  const selectedVersion = useMemo(() => {
    if (versions.length === 0) {
      return null;
    }
    // Initialize selected version if not set
    if (!selectedVersionId) {
      const firstId = versions[0].id;
      state.selectedVersionId = firstId;
      setSelectedVersionId(firstId);
      return versions[0];
    }
    return versions.find((v) => v.id === selectedVersionId) || versions[0];
  }, [versions, selectedVersionId]);

  // Build module lookup map
  const moduleMap = useMemo(() => {
    return new Map((programme.modules ?? []).map((m) => [m.id, m]));
  }, [programme.modules]);

  // Build modality key for effort hours lookup
  const modalityKey = useMemo(() => {
    if (!selectedVersion?.deliveryModality) {
      return null;
    }
    return `${selectedVersion.id}_${selectedVersion.deliveryModality}`;
  }, [selectedVersion]);

  // Process stages with module data
  const processedStages = useMemo(() => {
    if (!selectedVersion?.stages) {
      return [];
    }

    return [...selectedVersion.stages]
      .sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0))
      .map((stg) => {
        const stageModules: ScheduleModule[] = (stg.modules ?? [])
          .map((sm) => {
            const m = moduleMap.get(sm.moduleId);
            if (!m) {
              return null;
            }

            // Get effort hours for this version/modality
            const effort = modalityKey && m.effortHours ? (m.effortHours[modalityKey] ?? {}) : {};
            const classroomHrs = Number(effort.classroomHours ?? 0);
            const mentoringHrs = Number(effort.mentoringHours ?? 0);
            const otherContactHrs = Number(effort.otherContactHours ?? 0);
            const contactTotal = classroomHrs + mentoringHrs + otherContactHrs;
            const directedElearn = Number(effort.directedElearningHours ?? 0);
            const independent = Number(effort.independentLearningHours ?? 0);
            const workBased = Number(effort.workBasedHours ?? 0);
            const otherHrs = Number(effort.otherHours ?? 0);
            const totalHours = contactTotal + directedElearn + independent + workBased + otherHrs;

            // Get assessment breakdown
            const assessments = m.assessments ?? [];

            // Categorize assessments for QQI breakdown
            let caPercent = 0;
            let projectPercent = 0;
            let practicalPercent = 0;
            let examPercent = 0;

            assessments.forEach((a) => {
              const w = Number(a.weighting ?? 0);
              const t = (a.type ?? "").toLowerCase();
              if (t.includes("exam")) {
                examPercent += w;
              } else if (t.includes("project")) {
                projectPercent += w;
              } else if (t.includes("practical") || t.includes("lab") || t.includes("demo")) {
                practicalPercent += w;
              } else {
                caPercent += w;
              }
            });

            return {
              module: m,
              semester: sm.semester || "",
              status: "M", // M = Mandatory (default)
              credits: Number(m.credits ?? 0),
              totalHours,
              contactHours: contactTotal,
              directedElearn,
              independent,
              workBased,
              caPercent,
              projectPercent,
              practicalPercent,
              examPercent,
            };
          })
          .filter((x): x is ScheduleModule => x !== null);

        return {
          stage: stg,
          modules: stageModules,
        };
      });
  }, [selectedVersion, moduleMap, modalityKey]);

  // Event handlers
  const handleVersionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newId = e.target.value;
      state.selectedVersionId = newId;
      setSelectedVersionId(newId);
      updateFlagsAndHeader();
    },
    [updateFlagsAndHeader],
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  // No versions - show warning
  if (versions.length === 0) {
    return (
      <Alert variant="warning" data-testid="schedule-no-versions">
        <Icon name="warning" className="me-2" aria-hidden />
        Add at least one Programme Version first.
      </Alert>
    );
  }

  // No selected version (should not happen, but handle gracefully)
  if (!selectedVersion) {
    return (
      <Alert variant="warning" data-testid="schedule-no-selection">
        <Icon name="warning" className="me-2" aria-hidden />
        Please select a programme version.
      </Alert>
    );
  }

  const hasStages = processedStages.length > 0;

  return (
    <Card className="shadow-sm" data-testid="schedule-step">
      <Card.Body>
        {/* Header with title and version selector */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h5 className="card-title mb-1">
              <Icon name="calendar" className="me-2" aria-hidden />
              Programme Schedule
            </h5>
            <div className="small text-secondary">
              <Icon name="lightbulb" className="me-1" aria-hidden />
              QQI-style module schedule showing effort hours and assessment strategy per stage.
            </div>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <Form.Label htmlFor="scheduleVersionSelect" className="visually-hidden">
              Select programme version
            </Form.Label>
            <Form.Select
              id="scheduleVersionSelect"
              value={selectedVersion.id}
              onChange={handleVersionChange}
              style={{ minWidth: 260 }}
              aria-label="Select programme version"
              data-testid="schedule-version-select"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.code ? `${v.code} — ` : ""}
                  {v.label || ""}
                </option>
              ))}
            </Form.Select>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handlePrint}
              title="Print schedule"
              aria-label="Print schedule"
              data-testid="schedule-print-btn"
            >
              <Icon name="printer" aria-hidden /> Print
            </Button>
          </div>
        </div>

        {/* Programme info header */}
        <ProgrammeInfoCard programme={programme} version={selectedVersion} />

        {/* Stages accordion */}
        {hasStages ? (
          <>
            <Accordion
              id="scheduleAccordion"
              defaultExpandedKeys={
                processedStages.length > 0 ? [`schedule_${processedStages[0].stage.sequence}`] : []
              }
              data-testid="schedule-accordion"
            >
              <AccordionControls accordionId="scheduleAccordion" />
              {processedStages.map((ps, idx) => {
                const stageId = `schedule_${ps.stage.sequence}`;
                const stageName = ps.stage.name || `Stage ${ps.stage.sequence}`;
                const creditsTarget = ps.stage.creditsTarget || 0;

                return (
                  <AccordionItem
                    key={ps.stage.id || stageId}
                    eventKey={stageId}
                    title={stageName}
                    subtitle={`Target: ${creditsTarget} ECTS • NFQ ${programme.nfqLevel || "—"}`}
                    subtitlePosition="right"
                    data-testid={`schedule-stage-${ps.stage.sequence}`}
                  >
                    <ScheduleTable
                      stageModules={ps.modules}
                      nfqLevel={programme.nfqLevel}
                      stageSequence={ps.stage.sequence ?? idx + 1}
                      stageName={stageName}
                    />
                  </AccordionItem>
                );
              })}
            </Accordion>
          </>
        ) : (
          <Alert variant="info" data-testid="schedule-no-stages">
            <Icon name="info" className="me-2" aria-hidden />
            No stages defined for this version. Go to Stage Structure to add stages and assign
            modules.
          </Alert>
        )}

        {/* Legend */}
        <div className="small text-secondary mt-3" data-testid="schedule-legend">
          <strong>Legend:</strong> Status: M = Mandatory, E = Elective | CA = Continuous Assessment
          | Contact = Classroom + Mentoring + Other Contact Hours
        </div>
      </Card.Body>
    </Card>
  );
};

export default ScheduleStep;
