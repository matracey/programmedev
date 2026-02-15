/**
 * React version of the Effort Hours step component.
 * Manages detailed student effort hour breakdowns per module and delivery modality.
 * @module components/steps/react/EffortHoursStep
 */

import React, { useCallback, useMemo, useState } from "react";
import { Badge, Col, Form, Row, Table } from "react-bootstrap";
import { Accordion, AccordionControls, AccordionItem, Alert, Icon, SectionCard } from "../../ui";
import { useProgramme, useSaveDebounced, useUpdateProgramme } from "../../../hooks/useStore";
import { editableModuleIds, getSelectedModuleId, state } from "../../../state/store";

// ============================================================================
// Types
// ============================================================================

/** Effort hours data for a single version/modality combination */
interface EffortData {
  classroomHours: number;
  classroomRatio: string;
  mentoringHours: number;
  mentoringRatio: string;
  otherContactHours: number;
  otherContactRatio: string;
  otherContactSpecify: string;
  directedElearningHours: number;
  independentLearningHours: number;
  otherHours: number;
  otherHoursSpecify: string;
  workBasedHours: number;
}

/** Version/modality combination for effort hour tracking */
interface VersionModality {
  key: string;
  versionId: string;
  modality: string;
  label: string;
}

/** Local module interface */
interface LocalModule {
  id: string;
  code?: string;
  title: string;
  credits: number;
  effortHours?: Record<string, Partial<EffortData>>;
}

/** Local programme version interface */
interface LocalProgrammeVersion {
  id: string;
  label?: string;
  code?: string;
  deliveryModality?: string;
}

/** Props for EffortHoursRow component */
interface EffortHoursRowProps {
  versionModality: VersionModality;
  moduleId: string;
  effortData: Partial<EffortData>;
  expectedTotal: number;
  onFieldChange: (vmKey: string, field: keyof EffortData, value: string | number) => void;
}

/** Props for ModuleEffortCard component */
interface ModuleEffortCardProps {
  module: LocalModule;
  moduleIndex: number;
  versionModalities: VersionModality[];
  isExpanded: boolean;
  isHidden: boolean;
  onToggle: () => void;
  onFieldChange: (vmKey: string, field: keyof EffortData, value: string | number) => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Human-readable labels for delivery modalities */
const MODALITY_LABELS: Record<string, string> = {
  F2F: "Face-to-face",
  BLENDED: "Blended",
  ONLINE: "Fully online",
};

/** Default effort data structure */
const DEFAULT_EFFORT_DATA: EffortData = {
  classroomHours: 0,
  classroomRatio: "1:60",
  mentoringHours: 0,
  mentoringRatio: "1:25",
  otherContactHours: 0,
  otherContactRatio: "",
  otherContactSpecify: "",
  directedElearningHours: 0,
  independentLearningHours: 0,
  otherHours: 0,
  otherHoursSpecify: "",
  workBasedHours: 0,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate total effort hours for given effort data.
 */
function getTotalHours(effortData: Partial<EffortData>): number {
  const e = effortData ?? {};
  return (
    Number(e.classroomHours ?? 0) +
    Number(e.mentoringHours ?? 0) +
    Number(e.otherContactHours ?? 0) +
    Number(e.directedElearningHours ?? 0) +
    Number(e.independentLearningHours ?? 0) +
    Number(e.otherHours ?? 0) +
    Number(e.workBasedHours ?? 0)
  );
}

/**
 * Get badge class based on total vs expected hours.
 */
function getTotalBadgeClass(total: number, expected: number): string {
  if (total === expected) {
    return "success";
  }
  if (total > 0) {
    return "warning";
  }
  return "secondary";
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Single row of effort hours inputs for a version/modality.
 */
const EffortHoursRow: React.FC<EffortHoursRowProps> = ({
  versionModality,
  moduleId,
  effortData,
  expectedTotal,
  onFieldChange,
}) => {
  const e = effortData ?? {};
  const total = getTotalHours(e);
  const badgeClass = getTotalBadgeClass(total, expectedTotal);
  const vmKey = versionModality.key;

  return (
    <tr data-testid={`effort-row-${moduleId}-${vmKey}`}>
      <td className="fw-semibold align-middle">{versionModality.label}</td>
      <td>
        <Form.Control
          type="number"
          size="sm"
          style={{ width: 70 }}
          value={e.classroomHours ?? 0}
          min={0}
          onChange={(ev) => onFieldChange(vmKey, "classroomHours", Number(ev.target.value))}
          aria-label={`Classroom hours for ${versionModality.label}`}
          data-testid={`effort-classroom-hours-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="text"
          size="sm"
          style={{ width: 70 }}
          value={e.classroomRatio ?? "1:60"}
          placeholder="1:60"
          onChange={(ev) => onFieldChange(vmKey, "classroomRatio", ev.target.value)}
          aria-label={`Classroom ratio for ${versionModality.label}`}
          data-testid={`effort-classroom-ratio-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="number"
          size="sm"
          style={{ width: 70 }}
          value={e.mentoringHours ?? 0}
          min={0}
          onChange={(ev) => onFieldChange(vmKey, "mentoringHours", Number(ev.target.value))}
          aria-label={`Mentoring hours for ${versionModality.label}`}
          data-testid={`effort-mentoring-hours-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="text"
          size="sm"
          style={{ width: 70 }}
          value={e.mentoringRatio ?? "1:25"}
          placeholder="1:25"
          onChange={(ev) => onFieldChange(vmKey, "mentoringRatio", ev.target.value)}
          aria-label={`Mentoring ratio for ${versionModality.label}`}
          data-testid={`effort-mentoring-ratio-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="number"
          size="sm"
          style={{ width: 60 }}
          value={e.otherContactHours ?? 0}
          min={0}
          onChange={(ev) => onFieldChange(vmKey, "otherContactHours", Number(ev.target.value))}
          aria-label={`Other contact hours for ${versionModality.label}`}
          data-testid={`effort-other-contact-hours-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="text"
          size="sm"
          style={{ width: 70 }}
          value={e.otherContactRatio ?? ""}
          placeholder="1:X"
          onChange={(ev) => onFieldChange(vmKey, "otherContactRatio", ev.target.value)}
          aria-label={`Other contact ratio for ${versionModality.label}`}
          data-testid={`effort-other-contact-ratio-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="text"
          size="sm"
          style={{ width: 90 }}
          value={e.otherContactSpecify ?? ""}
          placeholder="Specify..."
          onChange={(ev) => onFieldChange(vmKey, "otherContactSpecify", ev.target.value)}
          aria-label={`Other contact type for ${versionModality.label}`}
          data-testid={`effort-other-contact-specify-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="number"
          size="sm"
          style={{ width: 70 }}
          value={e.directedElearningHours ?? 0}
          min={0}
          onChange={(ev) => onFieldChange(vmKey, "directedElearningHours", Number(ev.target.value))}
          aria-label={`Directed e-learning hours for ${versionModality.label}`}
          data-testid={`effort-directed-elearning-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="number"
          size="sm"
          style={{ width: 70 }}
          value={e.independentLearningHours ?? 0}
          min={0}
          onChange={(ev) =>
            onFieldChange(vmKey, "independentLearningHours", Number(ev.target.value))
          }
          aria-label={`Independent learning hours for ${versionModality.label}`}
          data-testid={`effort-independent-learning-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="number"
          size="sm"
          style={{ width: 60 }}
          value={e.otherHours ?? 0}
          min={0}
          onChange={(ev) => onFieldChange(vmKey, "otherHours", Number(ev.target.value))}
          aria-label={`Other hours for ${versionModality.label}`}
          data-testid={`effort-other-hours-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="text"
          size="sm"
          style={{ width: 90 }}
          value={e.otherHoursSpecify ?? ""}
          placeholder="Specify..."
          onChange={(ev) => onFieldChange(vmKey, "otherHoursSpecify", ev.target.value)}
          aria-label={`Other hours type for ${versionModality.label}`}
          data-testid={`effort-other-hours-specify-${moduleId}-${vmKey}`}
        />
      </td>
      <td>
        <Form.Control
          type="number"
          size="sm"
          style={{ width: 70 }}
          value={e.workBasedHours ?? 0}
          min={0}
          onChange={(ev) => onFieldChange(vmKey, "workBasedHours", Number(ev.target.value))}
          aria-label={`Work-based learning hours for ${versionModality.label}`}
          data-testid={`effort-work-based-${moduleId}-${vmKey}`}
        />
      </td>
      <td className="text-center align-middle">
        <Badge bg={badgeClass} data-testid={`effort-total-${moduleId}-${vmKey}`}>
          {total}
        </Badge>
      </td>
    </tr>
  );
};

/**
 * Accordion card for a single module's effort hours.
 */
const ModuleEffortCard: React.FC<ModuleEffortCardProps> = ({
  module,
  moduleIndex,
  versionModalities,
  isExpanded,
  isHidden,
  onToggle,
  onFieldChange,
}) => {
  const expectedTotal = Number(module.credits ?? 0) * 25;
  const headerTitle = (module.code ? `${module.code} — ` : "") + module.title;

  if (isHidden) {
    return null;
  }

  return (
    <AccordionItem
      eventKey={module.id}
      title={headerTitle}
      subtitle={`${module.credits} ECTS × 25 = ${expectedTotal} expected hours`}
      data-testid={`effort-module-${module.id}`}
    >
      {versionModalities.length === 0 ? (
        <Alert variant="info" className="mb-0">
          No programme versions with delivery modalities defined. Go to the Programme Versions step
          to add versions and select their delivery modality.
        </Alert>
      ) : (
        <>
          <div className="table-responsive">
            <Table
              size="sm"
              bordered
              className="align-middle mb-0"
              aria-label={`Effort hours for ${module.title}`}
              data-testid={`effort-table-${module.id}`}
            >
              <thead>
                <tr>
                  <th rowSpan={2} className="align-middle" style={{ minWidth: 150 }} scope="col">
                    Version / Modality
                  </th>
                  <th colSpan={2} className="text-center" scope="colgroup">
                    Classroom &amp; Demonstrations
                  </th>
                  <th colSpan={2} className="text-center" scope="colgroup">
                    Mentoring &amp; Small-group
                  </th>
                  <th colSpan={3} className="text-center" scope="colgroup">
                    Other Contact (specify)
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center align-middle"
                    style={{ minWidth: 80 }}
                    scope="col"
                  >
                    Directed
                    <br />
                    E-learning
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center align-middle"
                    style={{ minWidth: 80 }}
                    scope="col"
                  >
                    Independent
                    <br />
                    Learning
                  </th>
                  <th colSpan={2} className="text-center" scope="colgroup">
                    Other Hours (specify)
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center align-middle"
                    style={{ minWidth: 80 }}
                    scope="col"
                  >
                    Work-based
                    <br />
                    Learning
                  </th>
                  <th
                    rowSpan={2}
                    className="text-center align-middle"
                    style={{ minWidth: 70 }}
                    scope="col"
                  >
                    Total
                    <br />
                    Effort
                  </th>
                </tr>
                <tr>
                  <th className="text-center small" scope="col">
                    Hours
                  </th>
                  <th className="text-center small" scope="col">
                    Min Ratio
                  </th>
                  <th className="text-center small" scope="col">
                    Hours
                  </th>
                  <th className="text-center small" scope="col">
                    Min Ratio
                  </th>
                  <th className="text-center small" scope="col">
                    Hours
                  </th>
                  <th className="text-center small" scope="col">
                    Ratio
                  </th>
                  <th className="text-center small" scope="col">
                    Type
                  </th>
                  <th className="text-center small" scope="col">
                    Hours
                  </th>
                  <th className="text-center small" scope="col">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {versionModalities.map((vm) => (
                  <EffortHoursRow
                    key={vm.key}
                    versionModality={vm}
                    moduleId={module.id}
                    effortData={module.effortHours?.[vm.key] ?? {}}
                    expectedTotal={expectedTotal}
                    onFieldChange={(vmKey, field, value) => onFieldChange(vmKey, field, value)}
                  />
                ))}
              </tbody>
            </Table>
          </div>
          <div className="small text-secondary mt-2">
            <strong>Tip:</strong> Total effort hours should equal {expectedTotal} (based on{" "}
            {module.credits} ECTS credits × 25 hours per credit).
          </div>
        </>
      )}
    </AccordionItem>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Effort Hours step component for React.
 * Manages detailed student effort hour breakdowns per module and delivery modality.
 */
export const EffortHoursStep: React.FC = () => {
  const { programme } = useProgramme();
  const updateProgramme = useUpdateProgramme();
  const saveDebounced = useSaveDebounced();

  // Track expanded accordion items
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const editableIds = editableModuleIds();
    const firstId = editableIds[0] ?? "";
    return new Set(firstId ? [firstId] : []);
  });

  // Get editable module IDs and selected module
  const editableIds = useMemo(() => editableModuleIds(), [programme.modules, programme.mode]);
  const selectedId = getSelectedModuleId();
  const canPickModule = programme.mode === "MODULE_EDITOR" && editableIds.length > 1;

  // Build version/modality combinations
  const versionModalities = useMemo<VersionModality[]>(() => {
    const versions = Array.isArray(programme.versions) ? programme.versions : [];
    return versions
      .filter((v: LocalProgrammeVersion) => v.deliveryModality)
      .map((v: LocalProgrammeVersion) => ({
        key: `${v.id}_${v.deliveryModality}`,
        versionId: v.id,
        modality: v.deliveryModality ?? "",
        label: `${v.label || v.code || "Version"} — ${
          v.deliveryModality ? MODALITY_LABELS[v.deliveryModality] || v.deliveryModality : ""
        }`,
      }));
  }, [programme.versions]);

  // Get modules to edit
  const modulesForEdit = useMemo<LocalModule[]>(() => {
    return (programme.modules ?? []).filter((m: LocalModule) => editableIds.includes(m.id));
  }, [programme.modules, editableIds]);

  // Helper to update flags and header without full re-render
  const updateFlagsAndHeader = useCallback(() => {
    // No-op: React components auto-update via useSyncExternalStore
  }, []);

  // Handle module picker change
  const handleModulePickerChange = useCallback((moduleId: string) => {
    state.selectedModuleId = moduleId;
    // Trigger re-render to show selected module
    const win = window as Window & { render?: () => void | Promise<void> };
    win.render?.();
  }, []);

  // Handle effort field change
  const handleFieldChange = useCallback(
    (moduleId: string, vmKey: string, field: keyof EffortData, value: string | number) => {
      const modules = [...(programme.modules ?? [])];
      const moduleIdx = modules.findIndex((m: LocalModule) => m.id === moduleId);
      if (moduleIdx === -1) {
        return;
      }

      const module = { ...modules[moduleIdx] };
      module.effortHours = { ...module.effortHours };
      module.effortHours[vmKey] = {
        ...DEFAULT_EFFORT_DATA,
        ...module.effortHours[vmKey],
        [field]: value,
      };
      modules[moduleIdx] = module;

      updateProgramme({ modules });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.modules, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // Accordion toggle handler
  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  // Expand/collapse all handlers
  const expandAll = useCallback(() => {
    setExpandedModules(new Set(modulesForEdit.map((m) => m.id)));
  }, [modulesForEdit]);

  const collapseAll = useCallback(() => {
    setExpandedModules(new Set());
  }, []);

  // Initialize effort hours for modules missing them
  useMemo(() => {
    let needsUpdate = false;
    const modules = [...(programme.modules ?? [])];

    modulesForEdit.forEach((m, idx) => {
      const moduleIdx = modules.findIndex((mod: LocalModule) => mod.id === m.id);
      if (moduleIdx === -1) {
        return;
      }

      const module = modules[moduleIdx];
      if (!module.effortHours) {
        module.effortHours = {};
        needsUpdate = true;
      }

      versionModalities.forEach((vm) => {
        if (!module.effortHours![vm.key]) {
          module.effortHours![vm.key] = { ...DEFAULT_EFFORT_DATA };
          needsUpdate = true;
        }
      });
    });

    // Save initialization only once on mount
    if (needsUpdate) {
      updateProgramme({ modules });
      saveDebounced();
    }
  }, []);

  return (
    <SectionCard title="Effort Hours by Version / Modality" icon="clock">
      <p className="small text-secondary mb-3">
        <Icon name="lightbulb" className="me-1" aria-hidden />
        Define how student learning effort is distributed across different activity types for each
        programme version and delivery modality. This helps demonstrate the workload balance and
        staffing requirements (teacher/learner ratios).
      </p>

      {/* Module picker for MODULE_EDITOR mode */}
      {canPickModule && (
        <Row className="g-3 mb-3">
          <Col md={6}>
            <Form.Label className="fw-semibold" htmlFor="modulePicker">
              Assigned module
            </Form.Label>
            <Form.Select
              id="modulePicker"
              value={selectedId}
              onChange={(e) => handleModulePickerChange(e.target.value)}
              aria-label="Select module for effort hours"
              data-testid="effort-module-picker"
            >
              {modulesForEdit.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code || ""} — {m.title || ""}
                </option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      )}

      {/* Accordion controls and module list */}
      {modulesForEdit.length === 0 ? (
        <Alert variant="info" className="mb-0">
          <Icon name="info" className="me-2" aria-hidden />
          Add modules first (Credits &amp; Modules step).
        </Alert>
      ) : (
        <>
          <Accordion id="effortHoursAccordion" defaultExpandedKeys={Array.from(expandedModules)}>
            <AccordionControls accordionId="effortHoursAccordion" />
            {modulesForEdit.map((module, idx) => {
              const isHidden =
                programme.mode === "MODULE_EDITOR" &&
                editableIds.length > 1 &&
                module.id !== selectedId;

              return (
                <ModuleEffortCard
                  key={module.id}
                  module={module}
                  moduleIndex={idx}
                  versionModalities={versionModalities}
                  isExpanded={expandedModules.has(module.id)}
                  isHidden={isHidden}
                  onToggle={() => toggleModule(module.id)}
                  onFieldChange={(vmKey, field, value) =>
                    handleFieldChange(module.id, vmKey, field, value)
                  }
                />
              );
            })}
          </Accordion>
        </>
      )}
    </SectionCard>
  );
};

export default EffortHoursStep;
