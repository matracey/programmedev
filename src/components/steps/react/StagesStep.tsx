/**
 * React version of the Stage Structure step component.
 * Manages stages within programme versions and assigns modules to each stage.
 * @module components/steps/react/StagesStep
 */

import React, { useCallback, useState } from "react";
import { Button, Card, Form, Row, Col } from "react-bootstrap";
import { Accordion, AccordionControls, AccordionItem, Alert, HeaderAction, Icon } from "../../ui";
import { notifyStateChange, useProgramme, useSaveDebounced } from "../../../hooks/useStore";
import { defaultStage, state } from "../../../state/store";
import { sumStageCredits } from "../../../utils/helpers";

// ============================================================================
// Types (local aliases to avoid conflicts with global types)
// ============================================================================

interface LocalExitAward {
  enabled: boolean;
  awardTitle: string;
}

interface LocalStageModule {
  moduleId: string;
  semester?: string;
}

interface LocalStage {
  id: string;
  name: string;
  sequence: number;
  creditsTarget: number;
  exitAward?: LocalExitAward;
  modules: LocalStageModule[];
}

interface LocalProgrammeVersion {
  id: string;
  label: string;
  code: string;
  stages: LocalStage[];
}

interface LocalModule {
  id: string;
  code?: string;
  title: string;
  credits: number;
}

interface StageItemProps {
  stage: LocalStage;
  stageIndex: number;
  versionId: string;
  allModules: LocalModule[];
  onNameChange: (value: string) => void;
  onSequenceChange: (value: number) => void;
  onCreditsChange: (value: number) => void;
  onExitToggle: (enabled: boolean) => void;
  onExitTitleChange: (value: string) => void;
  onModuleToggle: (moduleId: string, checked: boolean) => void;
  onSemesterChange: (moduleId: string, value: string) => void;
  onRemove: () => void;
}

interface ModuleCheckProps {
  module: LocalModule;
  stageId: string;
  isChecked: boolean;
  semester: string;
  onToggle: (checked: boolean) => void;
  onSemesterChange: (value: string) => void;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Module checkbox with optional semester input.
 */
const ModuleCheck: React.FC<ModuleCheckProps> = ({
  module,
  stageId,
  isChecked,
  semester,
  onToggle,
  onSemesterChange,
}) => {
  const checkboxId = `st_${stageId}_mod_${module.id}`;
  const semesterId = `st_${stageId}_sem_${module.id}`;

  return (
    <div className="border rounded p-2 mb-2">
      <Form.Check
        type="checkbox"
        id={checkboxId}
        checked={isChecked}
        onChange={(e) => onToggle(e.target.checked)}
        label={
          <>
            {module.code ? `${module.code} — ` : ""}
            {module.title}{" "}
            <span className="text-secondary small">({Number(module.credits ?? 0)} cr)</span>
          </>
        }
        data-testid={`stage-module-${stageId}-${module.id}`}
      />
      {isChecked && (
        <div className="mt-2" id={`st_${stageId}_semWrap_${module.id}`}>
          <Form.Label className="small mb-1" htmlFor={semesterId}>
            Semester / timing tag (optional)
          </Form.Label>
          <Form.Control
            size="sm"
            id={semesterId}
            value={semester}
            onChange={(e) => onSemesterChange(e.target.value)}
            placeholder="e.g., S1 / S2 / Year / Block 1"
            data-testid={`stage-semester-${stageId}-${module.id}`}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Single stage accordion item.
 */
const StageItem: React.FC<StageItemProps> = ({
  stage,
  stageIndex,
  versionId,
  allModules,
  onNameChange,
  onSequenceChange,
  onCreditsChange,
  onExitToggle,
  onExitTitleChange,
  onModuleToggle,
  onSemesterChange,
  onRemove,
}) => {
  const exitOn = stage.exitAward?.enabled ?? false;
  // Cast to any to satisfy the helper function which expects global Module[] type
  const stageCreditSum = sumStageCredits(allModules as any, stage.modules ?? []);
  const summaryName = stage.name || `Stage ${stage.sequence || ""}`;

  return (
    <AccordionItem
      eventKey={stage.id}
      title={summaryName}
      subtitle={`Sequence ${Number(stage.sequence ?? 1)} • Target ${Number(stage.creditsTarget ?? 0)}cr • Assigned ${stageCreditSum}cr`}
      headerActions={
        <HeaderAction
          label="Remove stage"
          icon="trash"
          variant="outline-danger"
          onClick={onRemove}
          aria-label={`Remove stage ${summaryName}`}
          data-testid={`remove-stage-${stage.id}`}
        />
      }
      data-testid={`stage-item-${stage.id}`}
    >
      <fieldset className="row g-3">
        <legend className="visually-hidden">Stage {stageIndex + 1} details</legend>

        {/* Stage name */}
        <Col md={6}>
          <Form.Label className="fw-semibold" htmlFor={`stname_${stage.id}`}>
            Stage name
          </Form.Label>
          <Form.Control
            id={`stname_${stage.id}`}
            value={stage.name ?? ""}
            onChange={(e) => onNameChange(e.target.value)}
            data-testid={`stage-name-${stage.id}`}
          />
        </Col>

        {/* Sequence */}
        <Col md={3}>
          <Form.Label className="fw-semibold" htmlFor={`stseq_${stage.id}`}>
            Sequence
          </Form.Label>
          <Form.Control
            type="number"
            min={1}
            id={`stseq_${stage.id}`}
            value={Number(stage.sequence ?? 1)}
            onChange={(e) => onSequenceChange(Number(e.target.value))}
            data-testid={`stage-sequence-${stage.id}`}
          />
        </Col>

        {/* Credits target */}
        <Col md={3}>
          <Form.Label className="fw-semibold" htmlFor={`stcred_${stage.id}`}>
            Credits target
          </Form.Label>
          <Form.Control
            type="number"
            min={0}
            id={`stcred_${stage.id}`}
            value={Number(stage.creditsTarget ?? 0)}
            onChange={(e) => onCreditsChange(Number(e.target.value))}
            data-testid={`stage-credits-${stage.id}`}
          />
          <div className="small text-secondary mt-1" role="status">
            Assigned modules sum to <span className="fw-semibold">{stageCreditSum}</span> credits.
          </div>
        </Col>

        {/* Exit award toggle */}
        <Col xs={12}>
          <Form.Check
            type="checkbox"
            id={`stexit_${stage.id}`}
            checked={exitOn}
            onChange={(e) => onExitToggle(e.target.checked)}
            label={<span className="fw-semibold">Enable exit award for this stage</span>}
            data-testid={`stage-exit-${stage.id}`}
          />
        </Col>

        {/* Exit award title (shown when enabled) */}
        {exitOn && (
          <Col xs={12} id={`stexitWrap_${stage.id}`}>
            <Form.Label className="fw-semibold" htmlFor={`stexitTitle_${stage.id}`}>
              Exit award title
            </Form.Label>
            <Form.Control
              id={`stexitTitle_${stage.id}`}
              value={stage.exitAward?.awardTitle ?? ""}
              onChange={(e) => onExitTitleChange(e.target.value)}
              data-testid={`stage-exit-title-${stage.id}`}
            />
          </Col>
        )}

        {/* Modules in this stage */}
        <Col xs={12}>
          <Form.Label className="fw-semibold" id={`stage-modules-label-${stage.id}`}>
            Modules in this stage
          </Form.Label>
          <div role="group" aria-labelledby={`stage-modules-label-${stage.id}`}>
            {allModules.length === 0 ? (
              <div className="text-secondary">
                No modules defined yet (add modules in Credits &amp; Modules).
              </div>
            ) : (
              allModules.map((m) => {
                const stageModule = (stage.modules ?? []).find((sm) => sm.moduleId === m.id);
                const isChecked = !!stageModule;
                const semester = stageModule?.semester ?? "";

                return (
                  <ModuleCheck
                    key={m.id}
                    module={m}
                    stageId={stage.id}
                    isChecked={isChecked}
                    semester={semester}
                    onToggle={(checked) => onModuleToggle(m.id, checked)}
                    onSemesterChange={(value) => onSemesterChange(m.id, value)}
                  />
                );
              })
            )}
          </div>
        </Col>
      </fieldset>
    </AccordionItem>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Stages step component for React.
 * Manages stages within programme versions and assigns modules to each stage.
 */
export const StagesStep: React.FC = () => {
  const { programme } = useProgramme();
  const saveDebounced = useSaveDebounced();

  // Track expanded accordion items
  const versions = (programme.versions ?? []) as ProgrammeVersion[];
  const modules = (programme.modules ?? []) as Module[];

  // Initialize selectedVersionId if not set
  if (!state.selectedVersionId && versions.length > 0) {
    state.selectedVersionId = versions[0].id;
  }

  const selectedVersion =
    versions.find((v) => v.id === state.selectedVersionId) ?? versions[0] ?? null;

  const [expandedStages, setExpandedStages] = useState<Set<string>>(() => {
    const stages = selectedVersion?.stages ?? [];
    return new Set(stages.length > 0 ? [stages[0].id] : []);
  });

  // Helper to update flags and header
  const updateFlagsAndHeader = useCallback(() => {
    // No-op: React components auto-update via useSyncExternalStore
  }, []);

  // ============================================================================
  // Event handlers
  // ============================================================================

  const handleVersionChange = useCallback(
    (versionId: string) => {
      state.selectedVersionId = versionId;
      saveDebounced();
      // Update expanded stages for new version
      const newVersion = versions.find((v) => v.id === versionId);
      const stages = newVersion?.stages ?? [];
      setExpandedStages(new Set(stages.length > 0 ? [stages[0].id] : []));
      // Trigger re-render
      const win = window as Window & { render?: () => void | Promise<void> };
      win.render?.();
    },
    [versions, saveDebounced],
  );

  const handleAddStage = useCallback(() => {
    if (!selectedVersion) {
      return;
    }
    const nextSeq = (selectedVersion.stages ?? []).length + 1;
    const newStage = defaultStage(nextSeq) as Stage;

    // Set default credits target if programme has credits and this is the first stage
    if ((programme.totalCredits ?? 0) > 0 && (selectedVersion.stages ?? []).length === 0) {
      newStage.creditsTarget = programme.totalCredits % 60 === 0 ? 60 : 0;
    }

    selectedVersion.stages = [...(selectedVersion.stages ?? []), newStage];
    saveDebounced(updateFlagsAndHeader);

    // Expand the new stage
    setExpandedStages((prev) => new Set([...prev, newStage.id]));

    // Trigger re-render
    const win = window as Window & { render?: () => void | Promise<void> };
    win.render?.();
  }, [selectedVersion, programme.totalCredits, saveDebounced, updateFlagsAndHeader]);

  const handleRemoveStage = useCallback(
    (stageId: string) => {
      if (!selectedVersion) {
        return;
      }
      selectedVersion.stages = (selectedVersion.stages ?? []).filter((s) => s.id !== stageId);
      saveDebounced(updateFlagsAndHeader);
      // Trigger re-render
      const win = window as Window & { render?: () => void | Promise<void> };
      win.render?.();
    },
    [selectedVersion, saveDebounced, updateFlagsAndHeader],
  );

  const handleStageNameChange = useCallback(
    (stageId: string, value: string) => {
      if (!selectedVersion) {
        return;
      }
      const stage = (selectedVersion.stages ?? []).find((s) => s.id === stageId);
      if (stage) {
        stage.name = value;
        saveDebounced(updateFlagsAndHeader);
      }
    },
    [selectedVersion, saveDebounced, updateFlagsAndHeader],
  );

  const handleStageSequenceChange = useCallback(
    (stageId: string, value: number) => {
      if (!selectedVersion) {
        return;
      }
      const stage = (selectedVersion.stages ?? []).find((s) => s.id === stageId);
      if (stage) {
        stage.sequence = value;
        saveDebounced(updateFlagsAndHeader);
      }
    },
    [selectedVersion, saveDebounced, updateFlagsAndHeader],
  );

  const handleStageCreditsChange = useCallback(
    (stageId: string, value: number) => {
      if (!selectedVersion) {
        return;
      }
      const stage = (selectedVersion.stages ?? []).find((s) => s.id === stageId);
      if (stage) {
        stage.creditsTarget = value;
        saveDebounced(updateFlagsAndHeader);
      }
    },
    [selectedVersion, saveDebounced, updateFlagsAndHeader],
  );

  const handleExitToggle = useCallback(
    (stageId: string, enabled: boolean) => {
      if (!selectedVersion) {
        return;
      }
      const stage = (selectedVersion.stages ?? []).find((s) => s.id === stageId);
      if (stage) {
        if (!stage.exitAward) {
          stage.exitAward = { enabled: false, awardTitle: "" };
        }
        stage.exitAward.enabled = enabled;
        saveDebounced(updateFlagsAndHeader);
        // Trigger re-render to show/hide exit title field
        const win = window as Window & { render?: () => void | Promise<void> };
        win.render?.();
      }
    },
    [selectedVersion, saveDebounced, updateFlagsAndHeader],
  );

  const handleExitTitleChange = useCallback(
    (stageId: string, value: string) => {
      if (!selectedVersion) {
        return;
      }
      const stage = (selectedVersion.stages ?? []).find((s) => s.id === stageId);
      if (stage) {
        if (!stage.exitAward) {
          stage.exitAward = { enabled: false, awardTitle: "" };
        }
        stage.exitAward.awardTitle = value;
        saveDebounced();
      }
    },
    [selectedVersion, saveDebounced],
  );

  const handleModuleToggle = useCallback(
    (stageId: string, moduleId: string, checked: boolean) => {
      if (!selectedVersion) {
        return;
      }
      const stage = (selectedVersion.stages ?? []).find((s) => s.id === stageId);
      if (!stage) {
        return;
      }
      stage.modules = stage.modules ?? [];

      if (checked && !stage.modules.find((sm) => sm.moduleId === moduleId)) {
        stage.modules.push({ moduleId, semester: "" });
      } else if (!checked) {
        stage.modules = stage.modules.filter((sm) => sm.moduleId !== moduleId);
      }

      saveDebounced(updateFlagsAndHeader);
      // Notify React of state change to trigger re-render
      notifyStateChange();
    },
    [selectedVersion, saveDebounced, updateFlagsAndHeader],
  );

  const handleSemesterChange = useCallback(
    (stageId: string, moduleId: string, value: string) => {
      if (!selectedVersion) {
        return;
      }
      const stage = (selectedVersion.stages ?? []).find((s) => s.id === stageId);
      if (!stage) {
        return;
      }
      const entry = (stage.modules ?? []).find((sm) => sm.moduleId === moduleId);
      if (entry) {
        entry.semester = value;
        saveDebounced();
      }
    },
    [selectedVersion, saveDebounced],
  );

  // ============================================================================
  // Render
  // ============================================================================

  // Show warning if no versions exist
  if (versions.length === 0) {
    return (
      <Alert variant="warning" data-testid="no-versions-alert">
        Add at least one Programme Version first.
      </Alert>
    );
  }

  const stages = (selectedVersion?.stages ?? []).sort(
    (a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0),
  );

  return (
    <Card className="shadow-sm">
      <Card.Body>
        {/* Header with version selector and add button */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h5 className="card-title mb-1" id="stages-heading">
              <Icon name="stairs" className="me-2" aria-hidden />
              Stage Structure
            </h5>
            <div className="text-secondary small">
              <Icon name="lightbulb" className="me-1" aria-hidden />
              Define stages for the selected programme version and assign modules to each stage.
            </div>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <Form.Label className="visually-hidden" htmlFor="stageVersionSelect">
              Select programme version
            </Form.Label>
            <Form.Select
              id="stageVersionSelect"
              value={selectedVersion?.id ?? ""}
              onChange={(e) => handleVersionChange(e.target.value)}
              style={{ minWidth: 260 }}
              data-testid="stage-version-select"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.code || ""}
                  {v.code ? " — " : ""}
                  {v.label || ""}
                </option>
              ))}
            </Form.Select>
            <Button
              variant="dark"
              onClick={handleAddStage}
              aria-label="Add new stage"
              data-testid="add-stage-btn"
            >
              <Icon name="plus" aria-hidden /> Add stage
            </Button>
          </div>
        </div>

        {/* Stages accordion */}
        <div id="stagesAccordionWrapper" aria-labelledby="stages-heading">
          {stages.length === 0 ? (
            <Alert variant="info" icon="info" className="mb-0">
              No stages yet for this version. Add a stage to begin.
            </Alert>
          ) : (
            <>
              <Accordion
                id="stagesAccordion"
                defaultExpandedKeys={Array.from(expandedStages)}
                data-testid="stages-accordion"
                aria-labelledby="stages-heading"
              >
                <AccordionControls accordionId="stagesAccordion" />
                {stages.map((stage, idx) => (
                  <StageItem
                    key={stage.id}
                    stage={stage as LocalStage}
                    stageIndex={idx}
                    versionId={selectedVersion?.id ?? ""}
                    allModules={modules as LocalModule[]}
                    onNameChange={(value) => handleStageNameChange(stage.id, value)}
                    onSequenceChange={(value) => handleStageSequenceChange(stage.id, value)}
                    onCreditsChange={(value) => handleStageCreditsChange(stage.id, value)}
                    onExitToggle={(enabled) => handleExitToggle(stage.id, enabled)}
                    onExitTitleChange={(value) => handleExitTitleChange(stage.id, value)}
                    onModuleToggle={(moduleId, checked) =>
                      handleModuleToggle(stage.id, moduleId, checked)
                    }
                    onSemesterChange={(moduleId, value) =>
                      handleSemesterChange(stage.id, moduleId, value)
                    }
                    onRemove={() => handleRemoveStage(stage.id)}
                  />
                ))}
              </Accordion>
            </>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default StagesStep;
