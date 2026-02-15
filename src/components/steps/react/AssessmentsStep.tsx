/**
 * React version of the Assessments step component.
 * Manages module assessments with types, weights, MIMLO mapping, and integrity controls.
 * @module components/steps/react/AssessmentsStep
 */

import React, { useCallback, useEffect, useState } from "react";
import { Badge, Button, ButtonGroup, Card, Form, Table } from "react-bootstrap";
import { Accordion, AccordionControls, AccordionItem, Alert, HeaderAction, Icon } from "../../ui";
import { useProgramme, useSaveDebounced, useUpdateProgramme } from "../../../hooks/useStore";
import { editableModuleIds, getSelectedModuleId, state } from "../../../state/store";
import { uid } from "../../../utils/uid";
import { ensureMimloObjects, formatPct, mimloText } from "../../../utils/helpers";
import { escapeHtml } from "../../../utils/dom";

// ============================================================================
// Constants
// ============================================================================

/** Assessment types matching legacy */
const ASSESSMENT_TYPES = [
  "Report/Essay",
  "Project",
  "Presentation",
  "Portfolio",
  "Practical/Lab",
  "Exam (On campus)",
  "Exam (Online)",
  "Reflective Journal",
  "Other",
];

/** Assessment modes */
const ASSESSMENT_MODES = ["Online", "OnCampus", "Hybrid"];

/** Integrity controls */
const INTEGRITY_CONTROLS = [
  { key: "proctored", label: "Proctored" },
  { key: "viva", label: "Viva/oral" },
  { key: "inClass", label: "In-class component" },
  { key: "originalityCheck", label: "Originality check" },
  { key: "aiDeclaration", label: "AI declaration" },
] as const;

/** Assessment report types */
const ASSESSMENT_REPORT_TYPES = [
  { id: "byStageType", label: "By stage: assessment types + weighting" },
  { id: "byModule", label: "By module: assessment types + weighting" },
  { id: "coverage", label: "MIMLO coverage (unassessed outcomes)" },
] as const;

// ============================================================================
// Types
// ============================================================================

interface IntegrityOptions {
  proctored?: boolean;
  viva?: boolean;
  inClass?: boolean;
  originalityCheck?: boolean;
  aiDeclaration?: boolean;
  [key: string]: boolean | undefined;
}

interface ModuleAssessment {
  id: string;
  title: string;
  type: string;
  weighting: number;
  mode?: string;
  integrity?: IntegrityOptions;
  mimloIds?: string[];
  notes?: string;
}

interface MIMLO {
  id: string;
  text: string;
  [key: string]: unknown;
}

interface Module {
  id: string;
  title: string;
  code: string;
  credits: number;
  mimlos?: MIMLO[];
  assessments?: ModuleAssessment[];
  [key: string]: unknown;
}

interface Stage {
  name?: string;
  modules?: Array<{ moduleId: string }>;
  [key: string]: unknown;
}

interface ProgrammeVersion {
  id: string;
  code?: string;
  label?: string;
  stages?: Stage[];
  [key: string]: unknown;
}

interface AssessmentInputProps {
  moduleId: string;
  assessment: ModuleAssessment;
  mimlos: MIMLO[];
  onUpdate: (field: keyof ModuleAssessment, value: unknown) => void;
  onRemove: () => void;
  onMimloToggle: (mimloId: string, checked: boolean) => void;
  onIntegrityChange: (key: string, checked: boolean) => void;
}

interface ModuleAccordionItemProps {
  module: Module;
  isHidden: boolean;
  onAddAssessment: () => void;
  onRemoveAssessment: (assessmentId: string) => void;
  onUpdateAssessment: (assessmentId: string, field: keyof ModuleAssessment, value: unknown) => void;
  onMimloToggle: (assessmentId: string, mimloId: string, checked: boolean) => void;
  onIntegrityChange: (assessmentId: string, key: string, checked: boolean) => void;
}

// ============================================================================
// Report Functions
// ============================================================================

/**
 * Get version by ID
 */
function getVersionById(
  versions: ProgrammeVersion[] | undefined,
  versionId: string,
): ProgrammeVersion | null {
  return (versions ?? []).find((v) => v.id === versionId) ?? (versions ?? [])[0] ?? null;
}

/**
 * Build report: By Stage Type
 */
function reportByStageType(
  modules: Module[],
  versions: ProgrammeVersion[] | undefined,
  versionId: string,
): React.ReactNode {
  const v = getVersionById(versions, versionId);
  if (!v) {
    return (
      <Alert variant="warning" className="mb-0">
        No versions found.
      </Alert>
    );
  }

  const modMap = new Map(modules.map((m) => [m.id, m]));

  return (v.stages ?? []).map((stg, stgIdx) => {
    const typeMap = new Map<string, { weight: number; count: number }>();
    (stg.modules ?? []).forEach((ref) => {
      const m = modMap.get(ref.moduleId);
      if (!m) {
        return;
      }
      (m.assessments ?? []).forEach((a) => {
        const t = a.type || "Unspecified";
        const rec = typeMap.get(t) ?? { weight: 0, count: 0 };
        rec.weight += Number(a.weighting ?? 0);
        rec.count += 1;
        typeMap.set(t, rec);
      });
    });

    const entries = Array.from(typeMap.entries()).sort((a, b) => b[1].weight - a[1].weight);

    return (
      <Card key={stgIdx} className="border-0 bg-white shadow-sm mb-3">
        <Card.Body>
          <div className="fw-semibold mb-2">{stg.name || "Stage"}</div>
          <div className="table-responsive">
            <Table size="sm" className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Assessment type</th>
                  <th className="text-nowrap">Count</th>
                  <th className="text-nowrap">Total weighting</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-muted">
                      No assessments found in this stage.
                    </td>
                  </tr>
                ) : (
                  entries.map(([type, rec]) => (
                    <tr key={type}>
                      <td>{type}</td>
                      <td>{rec.count}</td>
                      <td>{formatPct(rec.weight)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    );
  });
}

/**
 * Build report: By Module
 */
function reportByModule(modules: Module[]): React.ReactNode {
  return (
    <Card className="border-0 bg-white shadow-sm">
      <Card.Body>
        <div className="fw-semibold mb-2">By module</div>
        <div className="table-responsive">
          <Table size="sm" className="align-middle mb-0">
            <thead>
              <tr>
                <th>Code</th>
                <th>Module</th>
                <th>Assessment mix</th>
              </tr>
            </thead>
            <tbody>
              {modules.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No modules.
                  </td>
                </tr>
              ) : (
                modules.map((m) => {
                  const typeMap = new Map<string, { weight: number; count: number }>();
                  (m.assessments ?? []).forEach((a) => {
                    const t = a.type || "Unspecified";
                    const rec = typeMap.get(t) ?? { weight: 0, count: 0 };
                    rec.weight += Number(a.weighting ?? 0);
                    rec.count += 1;
                    typeMap.set(t, rec);
                  });

                  const summary = Array.from(typeMap.entries())
                    .sort((a, b) => b[1].weight - a[1].weight)
                    .map(([t, rec]) => `${t} (${rec.count}, ${rec.weight}%)`)
                    .join("; ");

                  return (
                    <tr key={m.id}>
                      <td className="text-nowrap">{m.code || ""}</td>
                      <td>{m.title || ""}</td>
                      <td className="text-nowrap">{summary || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
}

/**
 * Build report: MIMLO Coverage
 */
function reportCoverage(modules: Module[]): React.ReactNode {
  if (modules.length === 0) {
    return <div className="text-muted">No modules.</div>;
  }

  return modules.map((m) => {
    const mimlos = m.mimlos ?? [];
    const assessed = new Set<string>();
    (m.assessments ?? []).forEach((a) => (a.mimloIds ?? []).forEach((id) => assessed.add(id)));

    const unassessed = mimlos.filter((mi) => !assessed.has(mi.id));

    return (
      <Card key={m.id} className="border-0 bg-white shadow-sm mb-2">
        <Card.Body>
          <div className="fw-semibold">
            {m.code || ""} — {m.title || ""}
          </div>
          {unassessed.length === 0 ? (
            <div className="small text-success">✓ All MIMLOs are assessed.</div>
          ) : (
            <>
              <div className="small text-warning mb-2">
                Unassessed MIMLOs ({unassessed.length}):
              </div>
              <ul className="small mb-0">
                {unassessed.map((mi) => (
                  <li key={mi.id}>{mimloText(mi)}</li>
                ))}
              </ul>
            </>
          )}
        </Card.Body>
      </Card>
    );
  });
}

/**
 * Open report in new browser tab
 */
function openReportInNewTab(html: string, title = "Report"): void {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Allow popups to open report in a new tab.");
    return;
  }
  w.document.open();
  w.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${escapeHtml(title)}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="p-3">
        <h4 class="mb-3">${escapeHtml(title)}</h4>
        ${html}
      </body>
    </html>
  `);
  w.document.close();
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Report controls section
 */
const ReportControls: React.FC<{
  modules: Module[];
  versions: ProgrammeVersion[] | undefined;
}> = ({ modules, versions }) => {
  const [reportTypeId, setReportTypeId] = useState<string>(
    (state as { reportTypeId?: string }).reportTypeId || "byStageType",
  );
  const [reportVersionId, setReportVersionId] = useState<string>(
    (state as { reportVersionId?: string }).reportVersionId ?? versions?.[0]?.id ?? "",
  );
  const [showInline, setShowInline] = useState(false);

  const handleReportTypeChange = (value: string) => {
    setReportTypeId(value);
    (state as { reportTypeId?: string }).reportTypeId = value;
  };

  const handleVersionChange = (value: string) => {
    setReportVersionId(value);
    (state as { reportVersionId?: string }).reportVersionId = value;
  };

  const buildReport = useCallback(() => {
    switch (reportTypeId) {
      case "byStageType":
        return reportByStageType(modules, versions, reportVersionId);
      case "byModule":
        return reportByModule(modules);
      case "coverage":
        return reportCoverage(modules);
      default:
        return <div className="text-muted">Select a report.</div>;
    }
  }, [reportTypeId, modules, versions, reportVersionId]);

  const buildReportHtml = useCallback(() => {
    // For new tab, we need HTML string
    switch (reportTypeId) {
      case "byStageType": {
        const v = getVersionById(versions, reportVersionId);
        if (!v) {
          return "<div class='alert alert-warning'>No versions found.</div>";
        }
        const modMap = new Map(modules.map((m) => [m.id, m]));
        return (v.stages ?? [])
          .map((stg) => {
            const typeMap = new Map<string, { weight: number; count: number }>();
            (stg.modules ?? []).forEach((ref) => {
              const m = modMap.get(ref.moduleId);
              if (!m) {
                return;
              }
              (m.assessments ?? []).forEach((a) => {
                const t = a.type || "Unspecified";
                const rec = typeMap.get(t) ?? { weight: 0, count: 0 };
                rec.weight += Number(a.weighting ?? 0);
                rec.count += 1;
                typeMap.set(t, rec);
              });
            });
            const rows = Array.from(typeMap.entries())
              .sort((a, b) => b[1].weight - a[1].weight)
              .map(
                ([type, rec]) =>
                  `<tr><td>${escapeHtml(type)}</td><td>${rec.count}</td><td>${formatPct(rec.weight)}</td></tr>`,
              )
              .join("");
            return `<div class="card border-0 bg-white shadow-sm mb-3"><div class="card-body"><div class="fw-semibold mb-2">${escapeHtml(stg.name || "Stage")}</div><div class="table-responsive"><table class="table table-sm align-middle mb-0"><thead><tr><th>Assessment type</th><th>Count</th><th>Total weighting</th></tr></thead><tbody>${rows || '<tr><td colspan="3" class="text-muted">No assessments</td></tr>'}</tbody></table></div></div></div>`;
          })
          .join("");
      }
      case "byModule":
        return `<div class="card border-0 bg-white shadow-sm"><div class="card-body"><div class="table-responsive"><table class="table table-sm align-middle mb-0"><thead><tr><th>Code</th><th>Module</th><th>Assessment mix</th></tr></thead><tbody>${
          modules
            .map((m) => {
              const typeMap = new Map<string, { weight: number; count: number }>();
              (m.assessments ?? []).forEach((a) => {
                const t = a.type || "Unspecified";
                const rec = typeMap.get(t) ?? { weight: 0, count: 0 };
                rec.weight += Number(a.weighting ?? 0);
                rec.count += 1;
                typeMap.set(t, rec);
              });
              const summary = Array.from(typeMap.entries())
                .sort((a, b) => b[1].weight - a[1].weight)
                .map(([t, rec]) => `${t} (${rec.count}, ${rec.weight}%)`)
                .join("; ");
              return `<tr><td>${escapeHtml(m.code || "")}</td><td>${escapeHtml(m.title || "")}</td><td>${escapeHtml(summary || "—")}</td></tr>`;
            })
            .join("") || '<tr><td colspan="3" class="text-muted">No modules</td></tr>'
        }</tbody></table></div></div></div>`;
      case "coverage":
        return modules
          .map((m) => {
            const mimlos = m.mimlos ?? [];
            const assessed = new Set<string>();
            (m.assessments ?? []).forEach((a) =>
              (a.mimloIds ?? []).forEach((id) => assessed.add(id)),
            );
            const unassessed = mimlos.filter((mi) => !assessed.has(mi.id));
            if (unassessed.length === 0) {
              return `<div class="card border-0 bg-white shadow-sm mb-2"><div class="card-body"><div class="fw-semibold">${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</div><div class="small text-success">✓ All MIMLOs are assessed.</div></div></div>`;
            }
            return `<div class="card border-0 bg-white shadow-sm mb-2"><div class="card-body"><div class="fw-semibold">${escapeHtml(m.code || "")} — ${escapeHtml(m.title || "")}</div><div class="small text-warning mb-2">Unassessed MIMLOs (${unassessed.length}):</div><ul class="small mb-0">${unassessed.map((mi) => `<li>${escapeHtml(mimloText(mi))}</li>`).join("")}</ul></div></div>`;
          })
          .join("");
      default:
        return "";
    }
  }, [reportTypeId, modules, versions, reportVersionId]);

  const handleShowInline = () => {
    setShowInline((prev) => !prev);
  };

  const handleOpenNewTab = () => {
    const html = buildReportHtml();
    const label = ASSESSMENT_REPORT_TYPES.find((x) => x.id === reportTypeId)?.label || "Report";
    openReportInNewTab(html, label);
  };

  return (
    <Card className="border-0 bg-white shadow-sm mb-3">
      <Card.Body>
        <fieldset className="row g-2 align-items-end">
          <legend className="visually-hidden">Assessment reports</legend>
          <div className="col-md-4">
            <Form.Label className="small fw-semibold" htmlFor="reportTypeSelect">
              Report type
            </Form.Label>
            <Form.Select
              id="reportTypeSelect"
              value={reportTypeId}
              onChange={(e) => handleReportTypeChange(e.target.value)}
              data-testid="report-type-select"
            >
              {ASSESSMENT_REPORT_TYPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Form.Select>
          </div>
          <div className="col-md-4">
            <Form.Label className="small fw-semibold" htmlFor="reportVersionSelect">
              Version
            </Form.Label>
            <Form.Select
              id="reportVersionSelect"
              value={reportVersionId}
              onChange={(e) => handleVersionChange(e.target.value)}
              data-testid="report-version-select"
            >
              {(versions ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label || v.code || "Version"}
                </option>
              ))}
            </Form.Select>
          </div>
          <div className="col-md-4 d-flex">
            <ButtonGroup className="w-100">
              <Button
                variant={showInline ? "primary" : "outline-primary"}
                onClick={handleShowInline}
                data-testid="run-report-inline"
              >
                <Icon name={showInline ? "eye-slash" : "chart-bar"} className="me-1" aria-hidden />
                {showInline ? "Hide Report" : "Show Report Below"}
              </Button>
              <Button
                variant="outline-secondary"
                onClick={handleOpenNewTab}
                data-testid="run-report-newtab"
              >
                <Icon name="arrow-square-out" className="me-1" aria-hidden />
                Open Report in New Tab
              </Button>
            </ButtonGroup>
          </div>
        </fieldset>
        {showInline && (
          <div className="mt-3" role="region" aria-live="polite" data-testid="report-output">
            {buildReport()}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

/**
 * Single assessment input form
 */
const AssessmentInput: React.FC<AssessmentInputProps> = ({
  moduleId,
  assessment,
  mimlos,
  onUpdate,
  onRemove,
  onMimloToggle,
  onIntegrityChange,
}) => {
  const [localTitle, setLocalTitle] = useState(assessment.title);
  const [localNotes, setLocalNotes] = useState(assessment.notes ?? "");

  // Sync local state with props
  useEffect(() => {
    setLocalTitle(assessment.title);
    setLocalNotes(assessment.notes ?? "");
  }, [assessment.title, assessment.notes]);

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    onUpdate("title", value);
  };

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    onUpdate("notes", value);
  };

  const mode = assessment.mode ?? "Online";
  const integrity = assessment.integrity ?? {};

  return (
    <AccordionItem
      eventKey={assessment.id}
      title={assessment.title || "Assessment"}
      subtitle={`${assessment.type || ""} • ${assessment.weighting ?? 0}%`}
      headerActions={
        <HeaderAction
          onClick={onRemove}
          icon="trash"
          label="Remove"
          variant="outline-danger"
          aria-label={`Remove assessment ${assessment.title || ""}`}
          data-testid={`remove-asm-${assessment.id}`}
        />
      }
      data-testid={`assessment-item-${assessment.id}`}
    >
      <fieldset className="row g-2">
        <legend className="visually-hidden">Assessment details</legend>
        <div className="col-md-4">
          <Form.Label className="small fw-semibold" htmlFor={`asm-title-${assessment.id}`}>
            Title
          </Form.Label>
          <Form.Control
            id={`asm-title-${assessment.id}`}
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            data-testid={`asm-title-${assessment.id}`}
          />
        </div>
        <div className="col-md-3">
          <Form.Label className="small fw-semibold" htmlFor={`asm-type-${assessment.id}`}>
            Type
          </Form.Label>
          <Form.Select
            id={`asm-type-${assessment.id}`}
            value={assessment.type}
            onChange={(e) => onUpdate("type", e.target.value)}
            data-testid={`asm-type-${assessment.id}`}
          >
            {ASSESSMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Form.Select>
        </div>
        <div className="col-md-2">
          <Form.Label className="small fw-semibold" htmlFor={`asm-weight-${assessment.id}`}>
            Weighting %
          </Form.Label>
          <Form.Control
            type="number"
            min={0}
            max={100}
            step={1}
            id={`asm-weight-${assessment.id}`}
            value={assessment.weighting ?? ""}
            onChange={(e) => onUpdate("weighting", Number(e.target.value) || 0)}
            data-testid={`asm-weight-${assessment.id}`}
          />
        </div>
        <div className="col-md-3">
          <Form.Label className="small fw-semibold" htmlFor={`asm-mode-${assessment.id}`}>
            Mode
          </Form.Label>
          <Form.Select
            id={`asm-mode-${assessment.id}`}
            value={mode}
            onChange={(e) => onUpdate("mode", e.target.value)}
            data-testid={`asm-mode-${assessment.id}`}
          >
            {ASSESSMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Form.Select>
        </div>
      </fieldset>

      <div className="row g-2 mt-2">
        <div className="col-md-6">
          <div className="fw-semibold small mb-1" id={`mimlo-map-heading-${assessment.id}`}>
            Map to MIMLOs
          </div>
          <div
            className="border rounded p-2"
            role="group"
            aria-labelledby={`mimlo-map-heading-${assessment.id}`}
          >
            {mimlos.length === 0 ? (
              <span className="text-muted small">Add MIMLOs first</span>
            ) : (
              mimlos.map((mi) => {
                const checked = (assessment.mimloIds ?? []).includes(mi.id);
                return (
                  <Form.Check
                    key={mi.id}
                    type="checkbox"
                    id={`asm-mimlo-${assessment.id}-${mi.id}`}
                    label={<span className="small">{mimloText(mi)}</span>}
                    checked={checked}
                    onChange={(e) => onMimloToggle(mi.id, e.target.checked)}
                    data-testid={`asm-mimlo-${assessment.id}-${mi.id}`}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="col-md-6">
          <div className="fw-semibold small mb-1" id={`integrity-heading-${assessment.id}`}>
            Integrity controls
          </div>
          <div
            className="border rounded p-2"
            role="group"
            aria-labelledby={`integrity-heading-${assessment.id}`}
          >
            {INTEGRITY_CONTROLS.map(({ key, label }) => (
              <Form.Check
                key={key}
                type="checkbox"
                id={`asm-int-${assessment.id}-${key}`}
                label={<span className="small">{label}</span>}
                checked={!!integrity[key]}
                onChange={(e) => onIntegrityChange(key, e.target.checked)}
                data-testid={`asm-integrity-${assessment.id}-${key}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <Form.Label className="small fw-semibold" htmlFor={`asm-notes-${assessment.id}`}>
          Notes
        </Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          id={`asm-notes-${assessment.id}`}
          value={localNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          data-testid={`asm-notes-${assessment.id}`}
        />
      </div>
    </AccordionItem>
  );
};

/**
 * Module accordion item containing all assessments for a module
 */
const ModuleAccordionItem: React.FC<ModuleAccordionItemProps> = ({
  module,
  isHidden,
  onAddAssessment,
  onRemoveAssessment,
  onUpdateAssessment,
  onMimloToggle,
  onIntegrityChange,
}) => {
  const assessments = module.assessments ?? [];
  const mimlos = module.mimlos ?? [];
  const total = assessments.reduce((acc, a) => acc + (Number(a.weighting) ?? 0), 0);
  const headerTitle = module.code ? `${module.code} — ${module.title}` : module.title;
  const countText = `${assessments.length} assessment${assessments.length !== 1 ? "s" : ""}`;

  if (isHidden) {
    return null;
  }

  const totalBadge =
    total === 100 ? (
      <Badge bg="success">Total {total}%</Badge>
    ) : (
      <Badge bg="warning">Total {total}% (should be 100)</Badge>
    );

  return (
    <AccordionItem
      eventKey={module.id}
      title={headerTitle}
      subtitle={<span className="small text-secondary">{countText}</span>}
      headerActions={
        <>
          {totalBadge}
          <HeaderAction
            onClick={onAddAssessment}
            icon="plus"
            label="Add"
            variant="outline-primary"
            aria-label={`Add assessment to ${module.title || "module"}`}
            data-testid={`add-asm-${module.id}`}
          />
        </>
      }
      data-testid={`asm-module-${module.id}`}
    >
      {assessments.length === 0 ? (
        <div className="text-muted small">No assessments yet. Click "+ Add" to create one.</div>
      ) : (
        <Accordion
          id={`asm-nested-${module.id}`}
          defaultExpandedKeys={assessments.length > 0 ? [assessments[0].id] : []}
        >
          {assessments.map((a) => (
            <AssessmentInput
              key={a.id}
              moduleId={module.id}
              assessment={a}
              mimlos={mimlos}
              onUpdate={(field, value) => onUpdateAssessment(a.id, field, value)}
              onRemove={() => onRemoveAssessment(a.id)}
              onMimloToggle={(mimloId, checked) => onMimloToggle(a.id, mimloId, checked)}
              onIntegrityChange={(key, checked) => onIntegrityChange(a.id, key, checked)}
            />
          ))}
        </Accordion>
      )}
    </AccordionItem>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Assessments step component for React.
 * Manages module assessments with types, weights, MIMLO mapping, and integrity controls.
 */
export const AssessmentsStep: React.FC = () => {
  const { programme } = useProgramme();
  const updateProgramme = useUpdateProgramme();
  const saveDebounced = useSaveDebounced();

  // Track selected module for MODULE_EDITOR mode
  const [selectedModuleId, setSelectedModuleId] = useState<string>(getSelectedModuleId());

  // Helper to update flags and header
  const updateFlagsAndHeader = useCallback(() => {
    // No-op: React components auto-update via useSyncExternalStore
  }, []);

  // Get editable modules
  const editableIds = editableModuleIds();
  const canPickModule = programme.mode === "MODULE_EDITOR" && editableIds.length > 1;
  const modulesForEdit = (programme.modules ?? []).filter((m) => editableIds.includes(m.id));

  // Ensure mimlos are object format on each module
  useEffect(() => {
    const modules = programme.modules ?? [];
    let needsUpdate = false;

    modules.forEach((m) => {
      if (m.mimlos && m.mimlos.length > 0 && typeof m.mimlos[0] === "string") {
        ensureMimloObjects(m);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      updateProgramme({ modules: [...modules] });
      saveDebounced();
    }
  }, [programme.modules, updateProgramme, saveDebounced]);

  // Handle module picker change
  const handleModuleChange = useCallback((moduleId: string) => {
    setSelectedModuleId(moduleId);
    state.selectedModuleId = moduleId;
  }, []);

  // Handle adding an assessment
  const handleAddAssessment = useCallback(
    (moduleId: string) => {
      const modules = [...(programme.modules ?? [])];
      const module = modules.find((m) => m.id === moduleId);
      if (!module) {
        return;
      }

      ensureMimloObjects(module);
      module.assessments = module.assessments ?? [];
      module.assessments.push({
        id: uid("asm"),
        title: "",
        type: "Report/Essay",
        weighting: 0,
        mode: "Online",
        integrity: {
          proctored: false,
          viva: false,
          inClass: false,
          originalityCheck: true,
          aiDeclaration: true,
        },
        mimloIds: [],
        notes: "",
      });

      updateProgramme({ modules });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.modules, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // Handle removing an assessment
  const handleRemoveAssessment = useCallback(
    (moduleId: string, assessmentId: string) => {
      const modules = [...(programme.modules ?? [])];
      const module = modules.find((m) => m.id === moduleId);
      if (!module) {
        return;
      }

      module.assessments = (module.assessments ?? []).filter((a) => a.id !== assessmentId);

      updateProgramme({ modules });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.modules, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // Handle updating an assessment field
  const handleUpdateAssessment = useCallback(
    (moduleId: string, assessmentId: string, field: keyof ModuleAssessment, value: unknown) => {
      const modules = [...(programme.modules ?? [])];
      const module = modules.find((m) => m.id === moduleId);
      if (!module) {
        return;
      }

      const assessment = (module.assessments ?? []).find((a) => a.id === assessmentId);
      if (!assessment) {
        return;
      }

      (assessment as Record<string, unknown>)[field] = value;

      updateProgramme({ modules });
      saveDebounced();
    },
    [programme.modules, updateProgramme, saveDebounced],
  );

  // Handle MIMLO toggle
  const handleMimloToggle = useCallback(
    (moduleId: string, assessmentId: string, mimloId: string, checked: boolean) => {
      const modules = [...(programme.modules ?? [])];
      const module = modules.find((m) => m.id === moduleId);
      if (!module) {
        return;
      }

      const assessment = (module.assessments ?? []).find((a) => a.id === assessmentId);
      if (!assessment) {
        return;
      }

      assessment.mimloIds = assessment.mimloIds ?? [];
      if (checked) {
        if (!assessment.mimloIds.includes(mimloId)) {
          assessment.mimloIds.push(mimloId);
        }
      } else {
        assessment.mimloIds = assessment.mimloIds.filter((id) => id !== mimloId);
      }

      updateProgramme({ modules });
      saveDebounced();
    },
    [programme.modules, updateProgramme, saveDebounced],
  );

  // Handle integrity change
  const handleIntegrityChange = useCallback(
    (moduleId: string, assessmentId: string, key: string, checked: boolean) => {
      const modules = [...(programme.modules ?? [])];
      const module = modules.find((m) => m.id === moduleId);
      if (!module) {
        return;
      }

      const assessment = (module.assessments ?? []).find((a) => a.id === assessmentId);
      if (!assessment) {
        return;
      }

      assessment.integrity = assessment.integrity ?? {};
      assessment.integrity[key] = checked;

      updateProgramme({ modules });
      saveDebounced();
    },
    [programme.modules, updateProgramme, saveDebounced],
  );

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h5 className="mb-0" id="assessments-heading">
              <Icon name="exam" className="me-2" aria-hidden />
              Assessments
            </h5>
            <div className="text-muted small">
              <Icon name="lightbulb" className="me-1" aria-hidden />
              Create assessments per module, set weightings, and map to MIMLOs.
            </div>
          </div>
        </div>

        {/* Report controls */}
        <ReportControls
          modules={modulesForEdit as Module[]}
          versions={programme.versions as ProgrammeVersion[] | undefined}
        />

        {/* Module picker for MODULE_EDITOR mode */}
        {canPickModule && (
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <Form.Label className="fw-semibold" htmlFor="assessmentModulePicker">
                Assigned module
              </Form.Label>
              <Form.Select
                id="assessmentModulePicker"
                value={selectedModuleId}
                onChange={(e) => handleModuleChange(e.target.value)}
                data-testid="assessment-module-picker"
              >
                {modulesForEdit.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code || ""} — {m.title || ""}
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>
        )}

        {/* Accordion controls and list */}
        <div
          id="assessmentsAccordion"
          aria-labelledby="assessments-heading"
          data-testid="assessments-accordion"
        >
          {modulesForEdit.length === 0 ? (
            <Alert variant="warning">
              <Icon name="warning" className="me-2" aria-hidden />
              No modules available to edit.
            </Alert>
          ) : (
            <>
              <Accordion
                id="assessmentsAccordion"
                defaultExpandedKeys={modulesForEdit.length > 0 ? [modulesForEdit[0].id] : []}
              >
                <AccordionControls accordionId="assessmentsAccordion" />
                {modulesForEdit.map((module) => {
                  const isHidden =
                    programme.mode === "MODULE_EDITOR" &&
                    editableIds.length > 1 &&
                    module.id !== selectedModuleId;

                  return (
                    <ModuleAccordionItem
                      key={module.id}
                      module={module as Module}
                      isHidden={isHidden}
                      onAddAssessment={() => handleAddAssessment(module.id)}
                      onRemoveAssessment={(assessmentId) =>
                        handleRemoveAssessment(module.id, assessmentId)
                      }
                      onUpdateAssessment={(assessmentId, field, value) =>
                        handleUpdateAssessment(module.id, assessmentId, field, value)
                      }
                      onMimloToggle={(assessmentId, mimloId, checked) =>
                        handleMimloToggle(module.id, assessmentId, mimloId, checked)
                      }
                      onIntegrityChange={(assessmentId, key, checked) =>
                        handleIntegrityChange(module.id, assessmentId, key, checked)
                      }
                    />
                  );
                })}
              </Accordion>
            </>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default AssessmentsStep;
