/**
 * React version of the Credits & Modules step component.
 * Manages the programme's module list including mandatory and elective modules.
 * @module components/steps/react/StructureStep
 */

import React, { useCallback } from "react";
import { Badge, Button, Col, Form, Row } from "react-bootstrap";
import {
  Accordion,
  AccordionControls,
  AccordionItem,
  Alert,
  HeaderAction,
  Icon,
  SectionCard,
} from "../../ui";
import { useProgramme, useSaveDebounced, useUpdateProgramme } from "../../../hooks/useStore";
import { state } from "../../../state/store.js";
import { uid } from "../../../utils/uid.js";

// ============================================================================
// Types
// ============================================================================

/** Module structure */
interface Module {
  id: string;
  code: string;
  title: string;
  credits: number;
  isElective: boolean;
  mimlos?: { id: string }[];
  assessments?: unknown[];
}

/** Elective definition structure */
interface ElectiveDefinition {
  id: string;
  name: string;
  code: string;
  credits: number;
  groups: ElectiveGroup[];
}

/** Elective group structure */
interface ElectiveGroup {
  id: string;
  name: string;
  code: string;
  moduleIds: string[];
}

/** Props for ModuleItem component */
interface ModuleItemProps {
  module: Module;
  index: number;
  onFieldChange: (field: string, value: string | number | boolean) => void;
  onRemove: () => void;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Credit summary badges showing mandatory/elective breakdown.
 */
const CreditSummary: React.FC<{
  mandatoryCredits: number;
  mandatoryCount: number;
  electiveCredits: number;
  electiveCount: number;
  electiveDefinitionsCredits: number;
  numDefinitions: number;
  totalModuleCredits: number;
  totalProgrammeCredits: number;
}> = ({
  mandatoryCredits,
  mandatoryCount,
  electiveCredits,
  electiveCount,
  electiveDefinitionsCredits,
  numDefinitions,
  totalModuleCredits,
  totalProgrammeCredits,
}) => {
  const isMatch = totalModuleCredits === totalProgrammeCredits;

  return (
    <div
      className="d-flex gap-3 flex-wrap align-items-center"
      style={{ minHeight: 38 }}
      data-testid="credit-summary"
    >
      <Badge bg="primary" className="fs-6">
        <Badge bg="light" text="primary" className="me-1">
          M
        </Badge>
        {mandatoryCredits} cr ({mandatoryCount} modules)
      </Badge>
      <Badge bg="info" className="fs-6">
        <Badge bg="light" text="info" className="me-1">
          E
        </Badge>
        {electiveCredits} cr ({electiveCount} modules)
      </Badge>
      {numDefinitions > 0 && (
        <Badge bg="secondary" className="fs-6">
          {numDefinitions} elective def(s) = {electiveDefinitionsCredits} cr
        </Badge>
      )}
      <Badge bg={isMatch ? "success" : "warning"} className="fs-6">
        Sum: {totalModuleCredits} / {totalProgrammeCredits}
      </Badge>
    </div>
  );
};

/**
 * Single module accordion item.
 */
const ModuleItem: React.FC<ModuleItemProps> = ({ module, index, onFieldChange, onRemove }) => {
  const isElective = module.isElective === true;
  const codePreview = (module.code ?? "").trim();
  const titlePreview = (module.title ?? "").trim() || "Module";
  const creditsPreview = Number(module.credits ?? 0);

  const typeBadge = isElective ? (
    <Badge bg="info" className="me-2" title="Elective" aria-label="Elective module">
      E
    </Badge>
  ) : (
    <Badge bg="primary" className="me-2" title="Mandatory" aria-label="Mandatory module">
      M
    </Badge>
  );

  const headerTitle = (
    <>
      {typeBadge}Module {index + 1}
      {codePreview ? `: ${codePreview}` : ""}
    </>
  );

  const subtitle = `${titlePreview} • ${creditsPreview} cr`;

  return (
    <AccordionItem
      eventKey={module.id}
      title={headerTitle}
      subtitle={subtitle}
      headerActions={
        <HeaderAction
          label="Remove"
          icon="trash"
          variant="outline-danger"
          onClick={onRemove}
          aria-label={`Remove module ${titlePreview}`}
          data-testid={`remove-module-${module.id}`}
        />
      }
      data-testid={`module-item-${module.id}`}
    >
      <fieldset className="row g-3">
        <legend className="visually-hidden">Module {index + 1} details</legend>

        {/* Type */}
        <Col md={2}>
          <Form.Label className="fw-semibold" htmlFor={`module-type-${module.id}`}>
            Type
          </Form.Label>
          <Form.Select
            id={`module-type-${module.id}`}
            value={isElective ? "E" : "M"}
            onChange={(e) => {
              const isElectiveValue = e.target.value === "E";
              onFieldChange("isElective", isElectiveValue);
              onFieldChange("type", e.target.value);
            }}
            data-testid={`module-type-${module.id}`}
          >
            <option value="M">Mandatory</option>
            <option value="E">Elective</option>
          </Form.Select>
        </Col>

        {/* Code */}
        <Col md={2}>
          <Form.Label className="fw-semibold" htmlFor={`module-code-${module.id}`}>
            Code (opt.)
          </Form.Label>
          <Form.Control
            id={`module-code-${module.id}`}
            value={module.code ?? ""}
            onChange={(e) => onFieldChange("code", e.target.value)}
            data-testid={`module-code-${module.id}`}
          />
        </Col>

        {/* Title */}
        <Col md={5}>
          <Form.Label className="fw-semibold" htmlFor={`module-title-${module.id}`}>
            Title
          </Form.Label>
          <Form.Control
            id={`module-title-${module.id}`}
            value={module.title ?? ""}
            onChange={(e) => onFieldChange("title", e.target.value)}
            aria-required
            data-testid={`module-title-${module.id}`}
          />
        </Col>

        {/* Credits */}
        <Col md={3}>
          <Form.Label className="fw-semibold" htmlFor={`module-credits-${module.id}`}>
            Credits
          </Form.Label>
          <Form.Control
            type="number"
            id={`module-credits-${module.id}`}
            value={module.credits ?? 0}
            onChange={(e) => onFieldChange("credits", Number(e.target.value))}
            aria-required
            data-testid={`module-credits-${module.id}`}
          />
        </Col>
      </fieldset>
    </AccordionItem>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Structure step component for React.
 * Manages the programme's module list including mandatory and elective modules.
 */
export const StructureStep: React.FC = () => {
  const { programme } = useProgramme();
  const updateProgramme = useUpdateProgramme();
  const saveDebounced = useSaveDebounced();

  const modules = (programme.modules ?? []) as Module[];

  // Helper to update flags and header without full re-render
  const updateFlagsAndHeader = useCallback(() => {
    // No-op: React components auto-update via useSyncExternalStore
  }, []);

  // Calculate credit summaries
  const mandatoryModules = modules.filter((m) => !m.isElective);
  const electiveModules = modules.filter((m) => m.isElective === true);
  const mandatoryCredits = mandatoryModules.reduce((acc, m) => acc + (Number(m.credits) ?? 0), 0);
  const electiveCredits = electiveModules.reduce((acc, m) => acc + (Number(m.credits) ?? 0), 0);
  const totalModuleCredits = mandatoryCredits + electiveCredits;

  const electiveDefinitions = (programme.electiveDefinitions ?? []) as ElectiveDefinition[];
  const electiveDefinitionsCredits = electiveDefinitions.reduce(
    (acc, def) => acc + (Number(def.credits) ?? 0),
    0,
  );
  const numDefinitions = electiveDefinitions.length;

  // ============================================================================
  // Event handlers
  // ============================================================================

  const handleAddModule = useCallback(() => {
    const newModules = [...modules];
    const newModule: Module = {
      id: uid("mod"),
      code: "",
      title: "New module",
      credits: 0,
      isElective: false,
      mimlos: [],
      assessments: [],
    };
    newModules.push(newModule);
    updateProgramme({ modules: newModules });
    saveDebounced(updateFlagsAndHeader);
  }, [modules, updateProgramme, saveDebounced, updateFlagsAndHeader]);

  const handleRemoveModule = useCallback(
    (moduleId: string) => {
      const moduleToRemove = modules.find((m) => m.id === moduleId);
      // Get all MIMLO IDs from the module being removed
      const mimloIdsToRemove = (moduleToRemove?.mimlos ?? []).map((m) => m.id);

      const newModules = modules.filter((m) => m.id !== moduleId);

      // Remove MIMLOs from mappings
      const ploToMimlos = { ...(programme.ploToMimlos ?? {}) };
      for (const ploId of Object.keys(ploToMimlos)) {
        ploToMimlos[ploId] = (ploToMimlos[ploId] ?? []).filter(
          (mimloId: string) => !mimloIdsToRemove.includes(mimloId),
        );
      }

      // Remove from elective groups (nested in definitions)
      const newDefinitions = (programme.electiveDefinitions ?? []).map((def) => ({
        ...def,
        groups: (def.groups ?? []).map((g) => ({
          ...g,
          moduleIds: (g.moduleIds ?? []).filter((mid: string) => mid !== moduleId),
        })),
      }));

      updateProgramme({
        modules: newModules,
        ploToMimlos,
        electiveDefinitions: newDefinitions,
      });
      saveDebounced(updateFlagsAndHeader);
    },
    [
      modules,
      programme.ploToMimlos,
      programme.electiveDefinitions,
      updateProgramme,
      saveDebounced,
      updateFlagsAndHeader,
    ],
  );

  const handleFieldChange = useCallback(
    (moduleId: string, field: string, value: string | number | boolean) => {
      const newModules = [...modules];
      const module = newModules.find((m) => m.id === moduleId);
      if (!module) {
        return;
      }

      // Update the field
      (module as Record<string, unknown>)[field] = value;

      updateProgramme({ modules: newModules });
      saveDebounced(updateFlagsAndHeader);
    },
    [modules, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <SectionCard
      title="Credits & modules (QQI-critical)"
      icon="cube"
      headingId="modules-heading"
      actions={
        <Button
          variant="dark"
          size="sm"
          onClick={handleAddModule}
          aria-label="Add new module"
          data-testid="add-module-btn"
        >
          <Icon name="plus" aria-hidden /> Add module
        </Button>
      }
    >
      <Row className="g-3 mb-3">
        <Col md={3}>
          <Form.Label className="fw-semibold">Total programme credits</Form.Label>
          <Form.Control
            type="number"
            value={Number(programme.totalCredits ?? 0)}
            disabled
            data-testid="total-credits-display"
          />
        </Col>
        <Col md={9}>
          <Form.Label className="fw-semibold">Credit summary</Form.Label>
          <CreditSummary
            mandatoryCredits={mandatoryCredits}
            mandatoryCount={mandatoryModules.length}
            electiveCredits={electiveCredits}
            electiveCount={electiveModules.length}
            electiveDefinitionsCredits={electiveDefinitionsCredits}
            numDefinitions={numDefinitions}
            totalModuleCredits={totalModuleCredits}
            totalProgrammeCredits={Number(programme.totalCredits ?? 0)}
          />
        </Col>
      </Row>

      <Alert variant="light" className="mb-3">
        <Icon name="lightbulb" className="me-1" aria-hidden />
        <strong>Tip:</strong> Mark modules as <Badge bg="primary">M</Badge> Mandatory or{" "}
        <Badge bg="info">E</Badge> Elective. Elective modules are assigned to groups in the
        "Electives" step.
      </Alert>

      <div id="modulesAccordion" aria-labelledby="modules-heading" data-testid="modules-accordion">
        {modules.length === 0 ? (
          <Alert variant="info">
            <Icon name="info" className="me-2" aria-hidden />
            No modules added yet.
          </Alert>
        ) : (
          <Accordion
            id="modulesAccordion"
            defaultExpandedKeys={modules.length > 0 ? [modules[0].id] : []}
          >
            <AccordionControls accordionId="modulesAccordion" />
            {modules.map((module, idx) => (
              <ModuleItem
                key={module.id}
                module={module}
                index={idx}
                onFieldChange={(field, value) => handleFieldChange(module.id, field, value)}
                onRemove={() => handleRemoveModule(module.id)}
              />
            ))}
          </Accordion>
        )}
      </div>
    </SectionCard>
  );
};

export default StructureStep;
