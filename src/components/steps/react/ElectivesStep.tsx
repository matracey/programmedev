/**
 * React version of the Electives step component.
 * Manages module assignments to elective groups within elective definitions.
 * @module components/steps/react/ElectivesStep
 */

import React, { useCallback, useMemo } from "react";
import { Badge, Button, Card, Col, Form, ListGroup, Row } from "react-bootstrap";
import { Accordion, AccordionControls, AccordionItem, Alert, Icon, SectionCard } from "../../ui";
import { useProgramme, useSaveDebounced, useUpdateProgramme } from "../../../hooks/useStore";
import { state, steps } from "../../../state/store.js";

// ============================================================================
// Types (using global types from types.d.ts where available)
// ============================================================================

/** Props for GroupCard component */
interface GroupCardProps {
  group: ElectiveGroup;
  groupIndex: number;
  definitionCredits: number;
  modules: Module[];
  electiveModules: Module[];
  assignedModuleIds: Set<string>;
  onAssignModule: (groupId: string, moduleId: string) => void;
  onUnassignModule: (groupId: string, moduleId: string) => void;
}

/** Props for CreditSummaryCard component */
interface CreditSummaryCardProps {
  label: string;
  value: string | number;
  testId: string;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Credit summary card showing a single metric.
 */
const CreditSummaryCard: React.FC<CreditSummaryCardProps> = ({ label, value, testId }) => (
  <Col md={3}>
    <Card className="bg-light">
      <Card.Body className="py-2 text-center">
        <div className="small text-muted">{label}</div>
        <div className="fs-4 fw-bold" data-testid={testId}>
          {value}
        </div>
      </Card.Body>
    </Card>
  </Col>
);

/**
 * Group card showing modules assigned to an elective group.
 */
const GroupCard: React.FC<GroupCardProps> = ({
  group,
  groupIndex,
  definitionCredits,
  modules,
  electiveModules,
  assignedModuleIds,
  onAssignModule,
  onUnassignModule,
}) => {
  const groupModules = modules.filter((m) => (group.moduleIds ?? []).includes(m.id));
  const groupCreditsSum = groupModules.reduce((acc, m) => acc + (Number(m.credits) ?? 0), 0);
  const creditsMismatch = groupCreditsSum !== definitionCredits;
  const hasNonElective = groupModules.some((m) => !m.isElective);
  const groupName = group.name || `Group ${groupIndex + 1}`;

  // Modules available to add (electives not already in this group)
  const availableModules = electiveModules.filter((m) => !(group.moduleIds ?? []).includes(m.id));

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleId = e.target.value;
    if (moduleId) {
      onAssignModule(group.id, moduleId);
      e.target.value = ""; // Reset select
    }
  };

  return (
    <Card
      className="mb-2 border-start border-info border-3"
      data-testid={`elective-group-${group.id}`}
    >
      <Card.Header className="py-2 d-flex justify-content-between align-items-center bg-light">
        <div>
          {group.code && (
            <Badge bg="dark" className="me-2">
              {group.code}
            </Badge>
          )}
          <strong>{groupName}</strong>
          <Badge
            bg={creditsMismatch ? "warning" : "success"}
            className="ms-2"
            title={
              creditsMismatch
                ? `Module credits don't match definition requirement (${definitionCredits} cr)`
                : undefined
            }
          >
            {groupCreditsSum}/{definitionCredits} cr
          </Badge>
          {hasNonElective && (
            <Badge bg="danger" className="ms-2">
              Contains mandatory module!
            </Badge>
          )}
        </div>
        <span className="text-muted small">
          {groupModules.length} module{groupModules.length !== 1 ? "s" : ""}
        </span>
      </Card.Header>
      <Card.Body className="py-2">
        {groupModules.length === 0 ? (
          <p className="text-muted mb-2 small">No modules assigned to this group yet.</p>
        ) : (
          <ListGroup
            variant="flush"
            className="mb-2"
            role="list"
            aria-label={`Modules in group ${groupName}`}
          >
            {groupModules.map((m) => (
              <ListGroup.Item
                key={m.id}
                className="d-flex justify-content-between align-items-center py-1 px-2"
                role="listitem"
              >
                <div>
                  <Badge
                    bg={m.isElective ? "info" : "danger"}
                    className="me-1"
                    style={{ fontSize: "0.7rem" }}
                    aria-label={m.isElective ? "Elective" : "Mandatory"}
                  >
                    {m.isElective ? "E" : "M"}
                  </Badge>
                  <strong>{m.code || ""}</strong> {m.title || "Untitled"}
                  <span className="text-muted ms-1">({m.credits ?? 0} cr)</span>
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="py-0"
                  onClick={() => onUnassignModule(group.id, m.id)}
                  aria-label={`Remove ${m.title || "module"} from group`}
                  data-testid={`unassign-module-${m.id}-${group.id}`}
                >
                  <Icon name="x" aria-hidden />
                </Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}

        <Form.Label visuallyHidden htmlFor={`assign-select-${group.id}`}>
          Add module to {groupName}
        </Form.Label>
        <Form.Select
          size="sm"
          id={`assign-select-${group.id}`}
          onChange={handleSelectChange}
          data-testid={`assign-module-${group.id}`}
        >
          <option value="">+ Add elective module...</option>
          {availableModules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code ?? ""} {m.title ?? "Untitled"} ({m.credits ?? 0} cr)
              {assignedModuleIds.has(m.id) ? " [in another group]" : ""}
            </option>
          ))}
        </Form.Select>
      </Card.Body>
    </Card>
  );
};

/**
 * Accordion item for a single elective definition.
 */
interface DefinitionAccordionItemProps {
  definition: ElectiveDefinition;
  definitionIndex: number;
  modules: Module[];
  electiveModules: Module[];
  assignedModuleIds: Set<string>;
  onAssignModule: (groupId: string, moduleId: string) => void;
  onUnassignModule: (groupId: string, moduleId: string) => void;
  onGoToStep: (stepKey: string) => void;
}

const DefinitionAccordionItem: React.FC<DefinitionAccordionItemProps> = ({
  definition,
  definitionIndex,
  modules,
  electiveModules,
  assignedModuleIds,
  onAssignModule,
  onUnassignModule,
  onGoToStep,
}) => {
  const defName = definition.name ?? `Definition ${definitionIndex + 1}`;
  const defCode = definition.code ?? "";
  const defCredits = definition.credits ?? 0;
  const groups = definition.groups ?? [];

  const headerTitle = (
    <div className="d-flex align-items-center gap-2">
      {defCode && <Badge bg="dark">{defCode}</Badge>}
      <span>{defName}</span>
      <Badge bg="info">{defCredits} cr</Badge>
      <Badge bg="secondary">
        {groups.length} group{groups.length !== 1 ? "s" : ""}
      </Badge>
    </div>
  );

  return (
    <AccordionItem
      eventKey={definition.id}
      title={headerTitle}
      data-testid={`elective-def-${definition.id}`}
    >
      <p className="small text-muted mb-3">
        All groups in this definition must total <strong>{defCredits} credits</strong>. Students
        choose one group.
      </p>

      {groups.length === 0 ? (
        <p className="text-muted">
          No groups in this definition.{" "}
          <a
            href="#"
            className="alert-link"
            onClick={(e) => {
              e.preventDefault();
              onGoToStep("identity");
            }}
          >
            Add groups in Identity step
          </a>
          .
        </p>
      ) : (
        groups.map((g, grpIdx) => (
          <GroupCard
            key={g.id}
            group={g}
            groupIndex={grpIdx}
            definitionCredits={defCredits}
            modules={modules}
            electiveModules={electiveModules}
            assignedModuleIds={assignedModuleIds}
            onAssignModule={onAssignModule}
            onUnassignModule={onUnassignModule}
          />
        ))
      )}
    </AccordionItem>
  );
};

/**
 * Unassigned elective modules card.
 */
interface UnassignedModulesCardProps {
  modules: Module[];
}

const UnassignedModulesCard: React.FC<UnassignedModulesCardProps> = ({ modules }) => {
  if (modules.length === 0) {
    return null;
  }

  return (
    <Card className="mb-3 border-warning" data-testid="unassigned-electives-card">
      <Card.Header className="bg-warning-subtle">
        <strong>Unassigned Elective Modules</strong>
        <Badge bg="warning" className="ms-2">
          {modules.length}
        </Badge>
      </Card.Header>
      <Card.Body>
        <p className="small text-muted">
          These elective modules are not assigned to any group yet:
        </p>
        <ListGroup variant="flush">
          {modules.map((m) => (
            <ListGroup.Item
              key={m.id}
              className="d-flex justify-content-between align-items-center py-2"
            >
              <div>
                <Badge bg="info" className="me-2">
                  E
                </Badge>
                <strong>{m.code ?? ""}</strong> {m.title ?? "Untitled"}
                <span className="text-muted ms-2">({m.credits ?? 0} cr)</span>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Electives step component for React.
 * Manages module assignments to elective groups within elective definitions.
 */
export const ElectivesStep: React.FC = () => {
  const { programme } = useProgramme();
  const updateProgramme = useUpdateProgramme();
  const saveDebounced = useSaveDebounced();

  // Helper to update flags and header
  const updateFlagsAndHeader = useCallback(() => {
    // No-op: React components auto-update via useSyncExternalStore
  }, []);

  // Computed values
  const modules = (programme.modules ?? []) as Module[];
  const electiveModules = useMemo(() => modules.filter((m) => m.isElective === true), [modules]);
  const electiveDefinitions = (programme.electiveDefinitions ?? []) as ElectiveDefinition[];

  // Calculate which modules are assigned to which groups
  const assignedModuleIds = useMemo(() => {
    const assigned = new Set<string>();
    electiveDefinitions.forEach((def) => {
      (def.groups ?? []).forEach((g) => {
        (g.moduleIds ?? []).forEach((id) => assigned.add(id));
      });
    });
    return assigned;
  }, [electiveDefinitions]);

  // Unassigned elective modules
  const unassignedElectives = useMemo(
    () => electiveModules.filter((m) => !assignedModuleIds.has(m.id)),
    [electiveModules, assignedModuleIds],
  );

  // Credit calculations
  const totalCredits = programme.totalCredits ?? 0;
  const electiveCredits = electiveDefinitions.reduce((sum, d) => sum + (d.credits ?? 0), 0);
  const mandatoryCredits = totalCredits - electiveCredits;

  // Navigate to a step
  const handleGoToStep = useCallback((stepKey: string) => {
    const idx = steps.findIndex((s: { key: string }) => s.key === stepKey);
    if (idx >= 0) {
      state.stepIndex = idx;
      const win = window as Window & { render?: () => void | Promise<void> };
      win.render?.();
    }
  }, []);

  // Assign module to a group
  const handleAssignModule = useCallback(
    (groupId: string, moduleId: string) => {
      const definitions = [...(programme.electiveDefinitions ?? [])] as ElectiveDefinition[];

      for (const def of definitions) {
        const group = (def.groups ?? []).find((g) => g.id === groupId);
        if (group) {
          group.moduleIds ??= [];
          if (!group.moduleIds.includes(moduleId)) {
            group.moduleIds.push(moduleId);
          }
          break;
        }
      }

      updateProgramme({ electiveDefinitions: definitions });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.electiveDefinitions, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // Unassign module from a group
  const handleUnassignModule = useCallback(
    (groupId: string, moduleId: string) => {
      const definitions = [...(programme.electiveDefinitions ?? [])] as ElectiveDefinition[];

      for (const def of definitions) {
        const group = (def.groups ?? []).find((g) => g.id === groupId);
        if (group) {
          group.moduleIds = (group.moduleIds ?? []).filter((id) => id !== moduleId);
          break;
        }
      }

      updateProgramme({ electiveDefinitions: definitions });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.electiveDefinitions, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // Default expanded definitions (first one)
  const defaultExpandedKeys = electiveDefinitions.length > 0 ? [electiveDefinitions[0].id] : [];

  return (
    <>
      {/* Main Card */}
      <SectionCard title="Electives" icon="path" headingId="electives-heading" className="mb-3">
        <Alert variant="light">
          <Icon name="lightbulb" className="me-1" aria-hidden />
          <strong>How elective definitions &amp; groups work:</strong>
          <ul className="mb-0 mt-2">
            <li>
              Students complete <strong>every</strong> elective definition in the programme
            </li>
            <li>
              For each definition, students choose <strong>one group</strong> to complete
            </li>
            <li>All modules within the chosen group are completed by the student</li>
          </ul>
        </Alert>

        <Row className="g-3 mb-3" role="group" aria-label="Credit summary">
          <CreditSummaryCard
            label="Mandatory Credits"
            value={mandatoryCredits}
            testId="mandatory-credits"
          />
          <CreditSummaryCard
            label="Elective Definitions"
            value={electiveDefinitions.length}
            testId="elective-def-count"
          />
          <CreditSummaryCard
            label="Elective Credits"
            value={`${electiveCredits} cr`}
            testId="elective-credits"
          />
          <CreditSummaryCard
            label="Programme Total"
            value={`${totalCredits} cr`}
            testId="total-credits"
          />
        </Row>
      </SectionCard>

      {/* Unassigned Modules */}
      <UnassignedModulesCard modules={unassignedElectives} />

      {/* Definitions & Groups Card */}
      <Card className="shadow-sm">
        <Card.Body>
          <h6 className="card-title mb-3" id="elective-defs-groups-heading">
            <Icon name="folders" className="me-2" aria-hidden />
            Elective Definitions &amp; Groups
          </h6>

          <div
            aria-labelledby="elective-defs-groups-heading"
            data-testid="elective-definitions-container"
          >
            {electiveDefinitions.length === 0 ? (
              <Alert variant="info">
                No elective definitions created.{" "}
                <a
                  href="#"
                  className="alert-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleGoToStep("identity");
                  }}
                >
                  Go to Identity step
                </a>{" "}
                to create elective definitions with groups.
              </Alert>
            ) : (
              <>
                <Accordion
                  id="electiveDefinitionsAccordion"
                  defaultExpandedKeys={defaultExpandedKeys}
                >
                  <AccordionControls accordionId="electiveDefinitionsAccordion" />
                  {electiveDefinitions.map((def, defIdx) => (
                    <DefinitionAccordionItem
                      key={def.id}
                      definition={def}
                      definitionIndex={defIdx}
                      modules={modules}
                      electiveModules={electiveModules}
                      assignedModuleIds={assignedModuleIds}
                      onAssignModule={handleAssignModule}
                      onUnassignModule={handleUnassignModule}
                      onGoToStep={handleGoToStep}
                    />
                  ))}
                </Accordion>
              </>
            )}

            {electiveDefinitions.length > 0 && electiveModules.length === 0 && (
              <Alert variant="warning" className="mt-3 mb-0">
                <Icon name="warning" className="me-2" aria-hidden />
                No elective modules available.{" "}
                <a
                  href="#"
                  className="alert-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleGoToStep("structure");
                  }}
                >
                  Go to Credits &amp; Modules
                </a>{" "}
                to mark some modules as Elective (E).
              </Alert>
            )}
          </div>
        </Card.Body>
      </Card>
    </>
  );
};

export default ElectivesStep;
