/**
 * React version of the Programme Versions step component.
 * Manages programme versions (e.g., Full-time, Part-time, Online) with
 * delivery modalities, patterns, intakes, and proctoring settings.
 * @module components/steps/react/VersionsStep
 */

import React, { useCallback } from "react";
import { Badge, Button, Card, Col, Form, Row } from "react-bootstrap";
import { Accordion, AccordionControls, AccordionItem, Alert, HeaderAction, Icon } from "../../ui";
import { useProgramme, useSaveDebounced, useUpdateProgramme } from "../../../hooks/useStore";
import { defaultVersion, state } from "../../../state/store";
import { defaultPatternFor, sumPattern } from "../../../utils/helpers";

// ============================================================================
// Types
// ============================================================================

/** Delivery pattern percentages */
interface DeliveryPattern {
  syncOnlinePct: number;
  asyncDirectedPct: number;
  onCampusPct: number;
}

/** Modality definition */
interface ModalityDef {
  key: string;
  label: string;
}

// ============================================================================
// Constants
// ============================================================================

const MOD_DEFS: ModalityDef[] = [
  { key: "F2F", label: "Face-to-face" },
  { key: "BLENDED", label: "Blended" },
  { key: "ONLINE", label: "Fully online" },
];

// ============================================================================
// Sub-components
// ============================================================================

interface DeliveryPatternCardProps {
  versionId: string;
  modality: string;
  pattern: DeliveryPattern;
  onPatternChange: (field: keyof DeliveryPattern, value: number) => void;
}

/**
 * Card for editing delivery pattern percentages.
 */
const DeliveryPatternCard: React.FC<DeliveryPatternCardProps> = ({
  versionId,
  modality,
  pattern,
  onPatternChange,
}) => {
  const total = sumPattern(pattern);
  const isValid = total === 100;

  return (
    <Card className="mt-2">
      <Card.Body>
        <div className="d-flex align-items-center justify-content-between">
          <div className="fw-semibold" id={`pattern-heading-${versionId}`}>
            {modality} delivery pattern (must total 100%)
          </div>
          <span className="small" role="status">
            <Badge bg={isValid ? "success" : "warning"} className="me-1">
              {isValid ? "OK" : "⚠"}
            </Badge>
            <span className="text-secondary">{total}%</span>
          </span>
        </div>
        <Row className="g-2 mt-2" as="fieldset" aria-labelledby={`pattern-heading-${versionId}`}>
          <Col md={4}>
            <Form.Label htmlFor={`pat_${versionId}_sync`}>Synchronous Online Classes %</Form.Label>
            <Form.Control
              type="number"
              min={0}
              max={100}
              id={`pat_${versionId}_sync`}
              data-testid={`version-pattern-sync-${versionId}`}
              value={pattern.syncOnlinePct ?? 0}
              onChange={(e) => onPatternChange("syncOnlinePct", Number(e.target.value))}
            />
          </Col>
          <Col md={4}>
            <Form.Label htmlFor={`pat_${versionId}_async`}>
              Asynchronous Directed Learning %
            </Form.Label>
            <Form.Control
              type="number"
              min={0}
              max={100}
              id={`pat_${versionId}_async`}
              data-testid={`version-pattern-async-${versionId}`}
              value={pattern.asyncDirectedPct ?? 0}
              onChange={(e) => onPatternChange("asyncDirectedPct", Number(e.target.value))}
            />
          </Col>
          <Col md={4}>
            <Form.Label htmlFor={`pat_${versionId}_campus`}>On Campus Learning Event %</Form.Label>
            <Form.Control
              type="number"
              min={0}
              max={100}
              id={`pat_${versionId}_campus`}
              data-testid={`version-pattern-campus-${versionId}`}
              value={pattern.onCampusPct ?? 0}
              onChange={(e) => onPatternChange("onCampusPct", Number(e.target.value))}
            />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

interface VersionItemProps {
  version: ProgrammeVersion;
  index: number;
  onRemove: () => void;
  onFieldChange: (field: keyof ProgrammeVersion, value: unknown) => void;
  onModalityChange: (modality: string) => void;
  onPatternChange: (field: keyof DeliveryPattern, value: number) => void;
}

/**
 * Accordion item for a single version.
 */
const VersionItem: React.FC<VersionItemProps> = ({
  version,
  index,
  onRemove,
  onFieldChange,
  onModalityChange,
  onPatternChange,
}) => {
  const v = version;
  const intakeVal = (v.intakes ?? []).join(", ");
  const selectedMod = v.deliveryModality || "";
  const modLabel = selectedMod
    ? MOD_DEFS.find((m) => m.key === selectedMod)?.label || selectedMod
    : "Choose modality";

  const showProctoringNotes = v.onlineProctoredExams === "YES";

  // Get current pattern for selected modality
  const currentPattern: DeliveryPattern =
    selectedMod && v.deliveryPatterns?.[selectedMod]
      ? v.deliveryPatterns[selectedMod]
      : defaultPatternFor(selectedMod || "F2F");

  return (
    <AccordionItem
      eventKey={v.id}
      title={
        <>
          Version {index + 1}: <span data-version-label={v.id}>{v.label || "(untitled)"}</span>
        </>
      }
      subtitle={
        <>
          <span data-version-code={v.id}>{v.code || "No code"}</span> •{" "}
          <span data-version-modality={v.id}>{modLabel}</span> •{" "}
          <span data-version-intakes={v.id}>{intakeVal || "No intakes"}</span>
        </>
      }
      headerActions={
        <HeaderAction
          label="Remove"
          icon="trash"
          variant="outline-danger"
          onClick={onRemove}
          aria-label={`Remove version ${index + 1}`}
          data-testid={`remove-version-${v.id}`}
        />
      }
      data-testid={`version-item-${v.id}`}
    >
      <Row as="fieldset" className="g-3">
        <legend className="visually-hidden">Version {index + 1} details</legend>

        {/* Version Label */}
        <Col md={6}>
          <Form.Label className="fw-semibold" htmlFor={`vlabel_${v.id}`}>
            Version label
          </Form.Label>
          <Form.Control
            id={`vlabel_${v.id}`}
            data-testid={`version-label-${v.id}`}
            value={v.label || ""}
            onChange={(e) => onFieldChange("label", e.target.value)}
          />
        </Col>

        {/* Version Code */}
        <Col md={2}>
          <Form.Label className="fw-semibold" htmlFor={`vcode_${v.id}`}>
            Code
          </Form.Label>
          <Form.Control
            id={`vcode_${v.id}`}
            data-testid={`version-code-${v.id}`}
            value={v.code || ""}
            onChange={(e) => onFieldChange("code", e.target.value)}
          />
        </Col>

        {/* Duration */}
        <Col md={4}>
          <Form.Label className="fw-semibold" htmlFor={`vduration_${v.id}`}>
            Duration
          </Form.Label>
          <Form.Control
            id={`vduration_${v.id}`}
            data-testid={`version-duration-${v.id}`}
            value={v.duration || ""}
            onChange={(e) => onFieldChange("duration", e.target.value)}
            placeholder="e.g., 1 year FT / 2 years PT"
          />
        </Col>

        {/* Intakes */}
        <Col md={6}>
          <Form.Label className="fw-semibold" htmlFor={`vintakes_${v.id}`}>
            Intakes
          </Form.Label>
          <Form.Control
            id={`vintakes_${v.id}`}
            data-testid={`version-intakes-${v.id}`}
            value={intakeVal}
            onChange={(e) => {
              const intakes = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              onFieldChange("intakes", intakes);
            }}
            placeholder="Comma-separated, e.g., Sep, Jan"
          />
        </Col>

        {/* Target Cohort Size */}
        <Col md={3}>
          <Form.Label className="fw-semibold" htmlFor={`vcohort_${v.id}`}>
            Target cohort size
          </Form.Label>
          <Form.Control
            type="number"
            min={0}
            id={`vcohort_${v.id}`}
            data-testid={`version-cohort-${v.id}`}
            value={v.targetCohortSize ?? 0}
            onChange={(e) => onFieldChange("targetCohortSize", Number(e.target.value))}
          />
        </Col>

        {/* Number of Groups */}
        <Col md={3}>
          <Form.Label className="fw-semibold" htmlFor={`vgroups_${v.id}`}>
            Number of groups
          </Form.Label>
          <Form.Control
            type="number"
            min={0}
            id={`vgroups_${v.id}`}
            data-testid={`version-groups-${v.id}`}
            value={v.numberOfGroups ?? 0}
            onChange={(e) => onFieldChange("numberOfGroups", Number(e.target.value))}
          />
        </Col>

        {/* Delivery Modality */}
        <Col xs={12}>
          <Form.Label className="fw-semibold" id={`modality-label-${v.id}`}>
            Delivery modality
          </Form.Label>
          <div role="radiogroup" aria-labelledby={`modality-label-${v.id}`}>
            {MOD_DEFS.map((m) => (
              <Form.Check
                key={m.key}
                inline
                type="radio"
                name={`vmod_${v.id}`}
                id={`vmod_${v.id}_${m.key}`}
                label={m.label}
                value={m.key}
                checked={selectedMod === m.key}
                onChange={() => onModalityChange(m.key)}
                data-testid={`version-modality-${v.id}-${m.key}`}
              />
            ))}
          </div>

          {selectedMod ? (
            <DeliveryPatternCard
              versionId={v.id}
              modality={selectedMod}
              pattern={currentPattern}
              onPatternChange={onPatternChange}
            />
          ) : (
            <div className="small text-secondary mt-2">
              Select a delivery modality to define delivery patterns.
            </div>
          )}
        </Col>

        {/* Delivery Notes */}
        <Col xs={12}>
          <Form.Label className="fw-semibold" htmlFor={`vnotes_${v.id}`}>
            Delivery notes
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            id={`vnotes_${v.id}`}
            data-testid={`version-notes-${v.id}`}
            value={v.deliveryNotes || ""}
            onChange={(e) => onFieldChange("deliveryNotes", e.target.value)}
            placeholder="High-level plan: where learning happens, key touchpoints."
          />
        </Col>

        {/* Online Proctored Exams */}
        <Col md={4}>
          <Form.Label className="fw-semibold" htmlFor={`vproctor_${v.id}`}>
            Online proctored exams?
          </Form.Label>
          <Form.Select
            id={`vproctor_${v.id}`}
            data-testid={`version-proctor-${v.id}`}
            value={v.onlineProctoredExams || "TBC"}
            onChange={(e) => onFieldChange("onlineProctoredExams", e.target.value)}
          >
            <option value="TBC">TBC</option>
            <option value="NO">No</option>
            <option value="YES">Yes</option>
          </Form.Select>
        </Col>

        {/* Proctoring Notes (conditional) */}
        {showProctoringNotes && (
          <Col xs={12}>
            <Form.Label className="fw-semibold" htmlFor={`vproctorNotes_${v.id}`}>
              Proctoring notes
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              id={`vproctorNotes_${v.id}`}
              data-testid={`version-proctor-notes-${v.id}`}
              value={v.onlineProctoredExamsNotes || ""}
              onChange={(e) => onFieldChange("onlineProctoredExamsNotes", e.target.value)}
              placeholder="What is proctored, when, and why?"
            />
          </Col>
        )}

        {/* Stages Count (read-only) */}
        <Col xs={12}>
          <div className="small text-secondary">
            Stages in this version: <span className="fw-semibold">{(v.stages ?? []).length}</span>{" "}
            (define in the next step).
          </div>
        </Col>
      </Row>
    </AccordionItem>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Versions step component for React.
 * Manages programme versions with delivery settings, intakes, and proctoring options.
 */
export const VersionsStep: React.FC = () => {
  const { programme } = useProgramme();
  const updateProgramme = useUpdateProgramme();
  const saveDebounced = useSaveDebounced();

  // Compute default expanded keys
  const getDefaultExpandedKeys = useCallback((): string[] => {
    const versions = programme.versions ?? [];
    if (versions.length > 0) {
      const selectedId = state.selectedVersionId;
      if (selectedId && versions.some((v) => v.id === selectedId)) {
        return [selectedId];
      }
      return [versions[0].id];
    }
    return [];
  }, [programme.versions]);

  // Helper to update flags and header
  const updateFlagsAndHeader = useCallback(() => {
    // No-op: React components auto-update via useSyncExternalStore
  }, []);

  // ============================================================================
  // Event handlers
  // ============================================================================

  const handleAddVersion = useCallback(() => {
    const versions = [...(programme.versions ?? [])];
    const newVersion = defaultVersion() as ProgrammeVersion;
    versions.push(newVersion);
    updateProgramme({ versions });
    state.selectedVersionId = newVersion.id;
    saveDebounced(updateFlagsAndHeader);
  }, [programme.versions, updateProgramme, saveDebounced, updateFlagsAndHeader]);

  const handleRemoveVersion = useCallback(
    (versionId: string) => {
      const versions = (programme.versions ?? []).filter((v) => v.id !== versionId);
      updateProgramme({ versions });
      if (state.selectedVersionId === versionId) {
        state.selectedVersionId = versions[0]?.id || null;
      }
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.versions, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleFieldChange = useCallback(
    (versionId: string, field: keyof ProgrammeVersion, value: unknown) => {
      const versions = [...(programme.versions ?? [])];
      const version = versions.find((v) => v.id === versionId);
      if (!version) {
        return;
      }
      (version as Record<string, unknown>)[field] = value;
      updateProgramme({ versions });
      saveDebounced();
    },
    [programme.versions, updateProgramme, saveDebounced],
  );

  const handleModalityChange = useCallback(
    (versionId: string, modality: string) => {
      const versions = [...(programme.versions ?? [])];
      const version = versions.find((v) => v.id === versionId);
      if (!version) {
        return;
      }

      version.deliveryModality = modality;
      version.deliveryPatterns ??= {};

      // Initialize default pattern for this modality if not set
      if (!version.deliveryPatterns[modality]) {
        version.deliveryPatterns[modality] = defaultPatternFor(modality);
      }

      updateProgramme({ versions });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.versions, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handlePatternChange = useCallback(
    (versionId: string, field: keyof DeliveryPattern, value: number) => {
      const versions = [...(programme.versions ?? [])];
      const version = versions.find((v) => v.id === versionId);
      if (!version || !version.deliveryModality) {
        return;
      }

      const modality = version.deliveryModality;
      version.deliveryPatterns ??= {};
      version.deliveryPatterns[modality] ??= defaultPatternFor(modality);
      version.deliveryPatterns[modality][field] = value;

      updateProgramme({ versions });
      saveDebounced();
    },
    [programme.versions, updateProgramme, saveDebounced],
  );

  // ============================================================================
  // Render
  // ============================================================================

  const versions = (programme.versions ?? []) as ProgrammeVersion[];
  const defaultExpandedKeys = getDefaultExpandedKeys();

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h5 className="card-title mb-1" id="versions-heading">
              <Icon name="git-branch" className="me-2" aria-hidden />
              Programme Versions
            </h5>
            <div className="text-secondary small">
              <Icon name="lightbulb" className="me-1" aria-hidden />
              Create versions (e.g., FT/PT/Online). Each version can have different delivery
              patterns, capacity, intakes and stage structure.
            </div>
          </div>
          <Button
            variant="dark"
            onClick={handleAddVersion}
            aria-label="Add new version"
            data-testid="add-version-btn"
          >
            <Icon name="plus" aria-hidden /> Add version
          </Button>
        </div>

        <div
          id="versionsAccordionContainer"
          aria-labelledby="versions-heading"
          data-testid="versions-accordion"
        >
          {versions.length === 0 ? (
            <Alert variant="info">
              <Icon name="info" className="me-2" aria-hidden />
              No versions yet. Add at least one version to continue.
            </Alert>
          ) : (
            <>
              <Accordion id="versionsAccordion" defaultExpandedKeys={defaultExpandedKeys}>
                <AccordionControls accordionId="versionsAccordion" />
                {versions.map((version, idx) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    index={idx}
                    onRemove={() => handleRemoveVersion(version.id)}
                    onFieldChange={(field, value) => handleFieldChange(version.id, field, value)}
                    onModalityChange={(modality) => handleModalityChange(version.id, modality)}
                    onPatternChange={(field, value) =>
                      handlePatternChange(version.id, field, value)
                    }
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

export default VersionsStep;
