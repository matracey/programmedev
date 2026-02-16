/**
 * React version of the Identity step component.
 * Handles programme identity fields including title, award type, NFQ level,
 * credits, school, award standards, and elective definitions.
 * @module components/steps/react/IdentityStep
 */

import React, { useCallback, useEffect, useState } from "react";

import { Badge, Button, Col, Form, InputGroup, Row } from "react-bootstrap";

import { useProgramme, useSaveDebounced, useUpdateProgramme } from "../../../hooks/useStore";
import {
  AWARD_TYPE_OPTIONS,
  getAwardStandard,
  getAwardStandards,
  SCHOOL_OPTIONS,
} from "../../../state/store";
import { uid } from "../../../utils/uid";
import {
  Accordion,
  AccordionControls,
  AccordionItem,
  Alert,
  FormField,
  FormInput,
  FormSelect,
  HeaderAction,
  Icon,
  SectionCard,
} from "../../ui";

// ============================================================================
// Types
// ============================================================================

/** Award standard from QQI database */
interface AwardStandard {
  id: string;
  name: string;
  [key: string]: unknown;
}

/** Elective group within a definition */
interface ElectiveGroup {
  id: string;
  name: string;
  code: string;
  moduleIds: string[];
}

/** Elective definition containing groups */
interface ElectiveDefinition {
  id: string;
  name: string;
  code: string;
  credits: number;
  groups: ElectiveGroup[];
}

/** Props for ElectiveGroupRow component */
interface ElectiveGroupRowProps {
  group: ElectiveGroup;
  groupIndex: number;
  definitionId: string;
  onCodeChange: (groupId: string, value: string) => void;
  onNameChange: (groupId: string, value: string) => void;
  onRemove: (groupId: string) => void;
}

/** Props for ElectiveDefinitionItem component */
interface ElectiveDefinitionItemProps {
  definition: ElectiveDefinition;
  definitionIndex: number;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onCreditsChange: (value: number) => void;
  onGroupCodeChange: (groupId: string, value: string) => void;
  onGroupNameChange: (groupId: string, value: string) => void;
  onAddGroup: () => void;
  onRemoveGroup: (groupId: string) => void;
  onRemove: () => void;
}

/** Props for StandardSelector component */
interface StandardSelectorProps {
  index: number;
  selectedId: string;
  standards: AwardStandard[];
  canRemove: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Single row for an elective group within a definition.
 */
const ElectiveGroupRow: React.FC<ElectiveGroupRowProps> = ({
  group,
  groupIndex,
  definitionId: _definitionId,
  onCodeChange,
  onNameChange,
  onRemove,
}) => {
  return (
    <Row className="g-2 mb-2 align-items-center" data-testid={`elective-group-row-${group.id}`}>
      <Col xs="auto">
        <Badge bg="secondary">{groupIndex + 1}</Badge>
      </Col>
      <Col md={3}>
        <Form.Control
          size="sm"
          value={group.code ?? ""}
          placeholder="Code"
          onChange={(e) => onCodeChange(group.id, e.target.value)}
          data-testid={`elective-group-code-${group.id}`}
          aria-label={`Group ${groupIndex + 1} code`}
        />
      </Col>
      <Col>
        <Form.Control
          size="sm"
          value={group.name ?? ""}
          placeholder="Group name (e.g., Data Analytics Track)"
          onChange={(e) => onNameChange(group.id, e.target.value)}
          data-testid={`elective-group-name-${group.id}`}
          aria-label={`Group ${groupIndex + 1} name`}
        />
      </Col>
      <Col xs="auto">
        <Button
          variant="outline-danger"
          size="sm"
          onClick={() => onRemove(group.id)}
          title="Remove group"
          data-testid={`remove-elective-group-${group.id}`}
          aria-label={`Remove group ${groupIndex + 1}`}
        >
          <Icon name="x" aria-hidden />
        </Button>
      </Col>
    </Row>
  );
};

/**
 * Accordion item for a single elective definition.
 */
const ElectiveDefinitionItem: React.FC<ElectiveDefinitionItemProps> = ({
  definition,
  definitionIndex,
  onCodeChange,
  onNameChange,
  onCreditsChange,
  onGroupCodeChange,
  onGroupNameChange,
  onAddGroup,
  onRemoveGroup,
  onRemove,
}) => {
  const defName = definition.name || `Elective Definition ${definitionIndex + 1}`;
  const defCode = definition.code || "";
  const headerTitle = defCode ? `[${defCode}] ${defName}` : defName;
  const groups = definition.groups ?? [];

  return (
    <AccordionItem
      eventKey={definition.id}
      title={headerTitle}
      subtitle={`${Number(definition.credits ?? 0)} cr • ${groups.length} group(s)`}
      headerActions={
        <HeaderAction
          label="Remove"
          icon="trash"
          variant="outline-danger"
          onClick={onRemove}
          aria-label={`Remove ${defName}`}
          data-testid={`remove-elective-definition-${definition.id}`}
        />
      }
      data-testid={`elective-definition-${definition.id}`}
    >
      <Row className="g-2 mb-3">
        <Col md={2}>
          <Form.Label className="small mb-1">Code</Form.Label>
          <Form.Control
            size="sm"
            value={defCode}
            placeholder="e.g., ELEC1"
            onChange={(e) => onCodeChange(e.target.value)}
            data-testid={`elective-definition-code-${definition.id}`}
            aria-label="Definition code"
          />
        </Col>
        <Col md={5}>
          <Form.Label className="small mb-1">Name</Form.Label>
          <Form.Control
            size="sm"
            value={definition.name ?? ""}
            placeholder="e.g., Year 3 Specialization"
            onChange={(e) => onNameChange(e.target.value)}
            data-testid={`elective-definition-name-${definition.id}`}
            aria-label="Definition name"
          />
        </Col>
        <Col md={3}>
          <Form.Label className="small mb-1">Credits (all groups)</Form.Label>
          <InputGroup size="sm">
            <Form.Control
              type="number"
              value={definition.credits ?? 0}
              min={0}
              step={5}
              placeholder="Credits"
              onChange={(e) => onCreditsChange(Number(e.target.value))}
              data-testid={`elective-definition-credits-${definition.id}`}
              aria-label="Definition credits"
            />
            <InputGroup.Text>cr</InputGroup.Text>
          </InputGroup>
        </Col>
      </Row>

      <Form.Label className="small mb-1">Groups (students choose one)</Form.Label>
      <div className="small text-muted mb-2">Code • Name</div>

      {groups.length === 0 ? (
        <div className="text-muted small mb-2">No groups in this definition yet.</div>
      ) : (
        groups.map((group, grpIdx) => (
          <ElectiveGroupRow
            key={group.id}
            group={group}
            groupIndex={grpIdx}
            definitionId={definition.id}
            onCodeChange={onGroupCodeChange}
            onNameChange={onGroupNameChange}
            onRemove={onRemoveGroup}
          />
        ))
      )}

      <Button
        variant="outline-secondary"
        size="sm"
        onClick={onAddGroup}
        data-testid={`add-group-to-definition-${definition.id}`}
        aria-label="Add group to definition"
      >
        <Icon name="plus" aria-hidden /> Add group
      </Button>
    </AccordionItem>
  );
};

/**
 * Standard selector dropdown with optional remove button.
 */
const StandardSelector: React.FC<StandardSelectorProps> = ({
  index,
  selectedId,
  standards,
  canRemove,
  onChange,
  onRemove,
}) => {
  return (
    <div className="d-flex gap-2 mb-2 align-items-start">
      <Form.Select
        className="standard-selector"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        data-index={index}
        aria-label={`Award standard ${index + 1}`}
      >
        <option value="">Select a standard{index > 0 ? " (optional)" : ""}</option>
        {standards.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name || s.id}
          </option>
        ))}
      </Form.Select>
      {canRemove && selectedId && (
        <Button
          variant="outline-danger"
          onClick={onRemove}
          data-index={index}
          aria-label={`Remove standard ${index + 1}`}
        >
          Remove
        </Button>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Identity step component for React.
 * Manages programme identity fields and elective definitions.
 */
export const IdentityStep: React.FC = () => {
  const { programme } = useProgramme();
  const updateProgramme = useUpdateProgramme();
  const saveDebounced = useSaveDebounced();

  // Local state for standards cache (async-loaded)
  const [standards, setStandards] = useState<AwardStandard[]>([]);
  const [standardsLoaded, setStandardsLoaded] = useState(false);

  // Default expanded definitions (first one)
  const defaultExpandedDefinitions =
    (programme.electiveDefinitions ?? []).length > 0 ? [programme.electiveDefinitions![0].id] : [];

  // Helper to update flags and header without full re-render
  const updateFlagsAndHeader = useCallback(() => {
    // No-op: React components auto-update via useSyncExternalStore
  }, []);

  // Load award standards on mount
  useEffect(() => {
    if (!standardsLoaded) {
      setStandardsLoaded(true);
      getAwardStandards()
        .then((list: AwardStandard[]) => {
          setStandards(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          setStandards([]);
        });
    }
  }, [standardsLoaded]);

  // ============================================================================
  // Event handlers - Identity fields
  // ============================================================================

  const handleTitleChange = useCallback(
    (value: string) => {
      updateProgramme({ title: value });
      // Update the legacy header title
      const titleNav = document.getElementById("programmeTitleNav");
      if (titleNav) {
        titleNav.textContent = value.trim() || "New Programme (Draft)";
      }
      saveDebounced(updateFlagsAndHeader);
    },
    [updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleAwardTypeChange = useCallback(
    (value: string) => {
      if (value === "Other") {
        updateProgramme({ awardTypeIsOther: true, awardType: "" });
      } else {
        updateProgramme({ awardTypeIsOther: false, awardType: value });
      }
      saveDebounced(updateFlagsAndHeader);
    },
    [updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleAwardOtherChange = useCallback(
    (value: string) => {
      if (programme.awardTypeIsOther) {
        updateProgramme({ awardType: value });
        saveDebounced(updateFlagsAndHeader);
      }
    },
    [programme.awardTypeIsOther, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleNfqLevelChange = useCallback(
    (value: string) => {
      updateProgramme({ nfqLevel: value ? Number(value) : null });
      saveDebounced(updateFlagsAndHeader);
    },
    [updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleTotalCreditsChange = useCallback(
    (value: string) => {
      updateProgramme({ totalCredits: Number(value) || 0 });
      saveDebounced(updateFlagsAndHeader);
    },
    [updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleSchoolChange = useCallback(
    (value: string) => {
      updateProgramme({ school: value });
      saveDebounced(updateFlagsAndHeader);
    },
    [updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleIntakeChange = useCallback(
    (value: string) => {
      const months = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      updateProgramme({ intakeMonths: months });
      saveDebounced(updateFlagsAndHeader);
    },
    [updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // ============================================================================
  // Event handlers - Award standards
  // ============================================================================

  const handleStandardChange = useCallback(
    async (index: number, value: string) => {
      const newIds = [...(programme.awardStandardIds ?? [])];
      const newNames = [...(programme.awardStandardNames ?? [])];

      if (value) {
        newIds[index] = value;
        try {
          const s = await getAwardStandard(value);
          newNames[index] = s?.name || "QQI Award Standard";
        } catch {
          newNames[index] = "QQI Award Standard";
        }
      } else {
        newIds.splice(index, 1);
        newNames.splice(index, 1);
      }

      updateProgramme({
        awardStandardIds: newIds.filter(Boolean),
        awardStandardNames: newNames.filter(Boolean),
      });
      saveDebounced(updateFlagsAndHeader);
    },
    [
      programme.awardStandardIds,
      programme.awardStandardNames,
      updateProgramme,
      saveDebounced,
      updateFlagsAndHeader,
    ],
  );

  const handleRemoveStandard = useCallback(
    (index: number) => {
      const newIds = [...(programme.awardStandardIds ?? [])];
      const newNames = [...(programme.awardStandardNames ?? [])];
      newIds.splice(index, 1);
      newNames.splice(index, 1);
      updateProgramme({
        awardStandardIds: newIds,
        awardStandardNames: newNames,
      });
      saveDebounced(updateFlagsAndHeader);
    },
    [
      programme.awardStandardIds,
      programme.awardStandardNames,
      updateProgramme,
      saveDebounced,
      updateFlagsAndHeader,
    ],
  );

  // ============================================================================
  // Event handlers - Elective definitions
  // ============================================================================

  const handleAddDefinition = useCallback(() => {
    const definitions = [...(programme.electiveDefinitions ?? [])];
    const defNum = definitions.length + 1;
    const defCode = `ELEC${defNum}`;
    const newDef: ElectiveDefinition = {
      id: uid("edef"),
      name: "",
      code: defCode,
      credits: 0,
      groups: [{ id: uid("egrp"), name: "", code: `${defCode}-A`, moduleIds: [] }],
    };
    definitions.push(newDef);
    updateProgramme({ electiveDefinitions: definitions });
    saveDebounced();
  }, [programme.electiveDefinitions, updateProgramme, saveDebounced]);

  const handleRemoveDefinition = useCallback(
    (defId: string) => {
      const definitions = (programme.electiveDefinitions ?? []).filter((d) => d.id !== defId);
      updateProgramme({ electiveDefinitions: definitions });
      saveDebounced();
    },
    [programme.electiveDefinitions, updateProgramme, saveDebounced],
  );

  const handleDefinitionCodeChange = useCallback(
    (defId: string, value: string) => {
      const definitions = [...(programme.electiveDefinitions ?? [])];
      const def = definitions.find((d) => d.id === defId);
      if (!def) {
        return;
      }
      const oldCode = def.code ?? "";
      def.code = value;
      // Update group codes that start with the old definition code
      if (oldCode) {
        (def.groups ?? []).forEach((grp) => {
          if (grp.code && grp.code.startsWith(oldCode)) {
            grp.code = value + grp.code.slice(oldCode.length);
          }
        });
      }
      updateProgramme({ electiveDefinitions: definitions });
      saveDebounced();
    },
    [programme.electiveDefinitions, updateProgramme, saveDebounced],
  );

  const handleDefinitionNameChange = useCallback(
    (defId: string, value: string) => {
      const definitions = [...(programme.electiveDefinitions ?? [])];
      const def = definitions.find((d) => d.id === defId);
      if (def) {
        def.name = value;
        updateProgramme({ electiveDefinitions: definitions });
        saveDebounced();
      }
    },
    [programme.electiveDefinitions, updateProgramme, saveDebounced],
  );

  const handleDefinitionCreditsChange = useCallback(
    (defId: string, value: number) => {
      const definitions = [...(programme.electiveDefinitions ?? [])];
      const def = definitions.find((d) => d.id === defId);
      if (def) {
        def.credits = value;
        updateProgramme({ electiveDefinitions: definitions });
        saveDebounced();
      }
    },
    [programme.electiveDefinitions, updateProgramme, saveDebounced],
  );

  const handleAddGroup = useCallback(
    (defId: string) => {
      const definitions = [...(programme.electiveDefinitions ?? [])];
      const def = definitions.find((d) => d.id === defId);
      if (!def) {
        return;
      }
      def.groups ??= [];
      const defCode = def.code || "";
      const nextLetter = String.fromCharCode(65 + def.groups.length); // A, B, C...
      const groupCode = defCode ? `${defCode}-${nextLetter}` : "";
      def.groups.push({
        id: uid("egrp"),
        name: "",
        code: groupCode,
        moduleIds: [],
      });
      updateProgramme({ electiveDefinitions: definitions });
      saveDebounced();
    },
    [programme.electiveDefinitions, updateProgramme, saveDebounced],
  );

  const handleRemoveGroup = useCallback(
    (defId: string, groupId: string) => {
      const definitions = [...(programme.electiveDefinitions ?? [])];
      const def = definitions.find((d) => d.id === defId);
      if (!def) {
        return;
      }
      def.groups = (def.groups ?? []).filter((g) => g.id !== groupId);
      updateProgramme({ electiveDefinitions: definitions });
      saveDebounced();
    },
    [programme.electiveDefinitions, updateProgramme, saveDebounced],
  );

  const handleGroupCodeChange = useCallback(
    (defId: string, groupId: string, value: string) => {
      const definitions = [...(programme.electiveDefinitions ?? [])];
      const def = definitions.find((d) => d.id === defId);
      if (!def) {
        return;
      }
      const grp = (def.groups ?? []).find((g) => g.id === groupId);
      if (grp) {
        grp.code = value;
        updateProgramme({ electiveDefinitions: definitions });
        saveDebounced();
      }
    },
    [programme.electiveDefinitions, updateProgramme, saveDebounced],
  );

  const handleGroupNameChange = useCallback(
    (defId: string, groupId: string, value: string) => {
      const definitions = [...(programme.electiveDefinitions ?? [])];
      const def = definitions.find((d) => d.id === defId);
      if (!def) {
        return;
      }
      const grp = (def.groups ?? []).find((g) => g.id === groupId);
      if (grp) {
        grp.name = value;
        updateProgramme({ electiveDefinitions: definitions });
        saveDebounced();
      }
    },
    [programme.electiveDefinitions, updateProgramme, saveDebounced],
  );

  // ============================================================================
  // Render
  // ============================================================================

  // Compute award type select value
  const awardSelectValue = programme.awardTypeIsOther ? "Other" : programme.awardType || "";

  // Compute number of standard selectors (up to 2)
  const numSelectors = Math.min((programme.awardStandardIds?.length ?? 0) + 1, 2);
  const standardSelectors = Array.from({ length: numSelectors }, (_, i) => {
    const selectedId = programme.awardStandardIds?.[i] || "";
    const canRemove = i > 0 || (programme.awardStandardIds?.length ?? 0) > 1;
    return { index: i, selectedId, canRemove };
  });

  const definitions = programme.electiveDefinitions ?? [];

  return (
    <>
      {/* Identity Card */}
      <SectionCard
        title="Identity (QQI-critical)"
        icon="identification-card"
        headingId="identity-heading"
      >
        <Form className="row g-3" aria-labelledby="identity-heading">
          {/* Programme Title */}
          <Col md={6}>
            <FormField label="Programme title" htmlFor="titleInput" required>
              <FormInput
                id="titleInput"
                value={programme.title ?? ""}
                onChange={handleTitleChange}
                data-testid="title-input"
              />
            </FormField>
          </Col>

          {/* Award Type */}
          <Col md={6}>
            <FormField label="Award type" htmlFor="awardSelect" required>
              <FormSelect
                id="awardSelect"
                value={awardSelectValue}
                onChange={handleAwardTypeChange}
                placeholder="Select an award type"
                options={AWARD_TYPE_OPTIONS.map((a) => ({
                  value: a === "Other" ? "Other" : a,
                  label: a === "Other" ? "Other (type below)" : a,
                }))}
                data-testid="award-select"
              />
            </FormField>
            {programme.awardTypeIsOther && (
              <div className="mt-2" id="awardOtherWrap">
                <Form.Control
                  id="awardOtherInput"
                  value={programme.awardTypeIsOther ? programme.awardType : ""}
                  onChange={(e) => handleAwardOtherChange(e.target.value)}
                  placeholder="Type the award type"
                  aria-label="Custom award type"
                  data-testid="award-other-input"
                />
              </div>
            )}
          </Col>

          {/* NFQ Level */}
          <Col md={4}>
            <FormField
              label="NFQ level"
              htmlFor="levelInput"
              required
              helpText="Enter a value between 6 and 9"
            >
              <Form.Control
                type="number"
                id="levelInput"
                value={programme.nfqLevel ?? ""}
                onChange={(e) => handleNfqLevelChange(e.target.value)}
                min={6}
                max={9}
                step={1}
                aria-required
                data-testid="level-input"
              />
            </FormField>
          </Col>

          {/* Total Credits */}
          <Col md={4}>
            <FormField label="Total credits (ECTS)" htmlFor="totalCreditsInput" required>
              <Form.Control
                type="number"
                id="totalCreditsInput"
                value={programme.totalCredits ?? ""}
                onChange={(e) => handleTotalCreditsChange(e.target.value)}
                min={1}
                step={1}
                placeholder="e.g., 180 / 240"
                aria-required
                data-testid="total-credits-input"
              />
            </FormField>
          </Col>

          {/* School */}
          <Col md={4}>
            <FormField label="School / Discipline" htmlFor="schoolSelect">
              <FormSelect
                id="schoolSelect"
                value={programme.school ?? ""}
                onChange={handleSchoolChange}
                placeholder="Select a School"
                options={SCHOOL_OPTIONS.map((s) => ({ value: s, label: s }))}
                data-testid="school-select"
              />
            </FormField>
          </Col>

          {/* QQI Award Standards */}
          <Col md={12}>
            <Form.Label className="fw-semibold" id="standardLabel">
              QQI award standard
            </Form.Label>
            <div
              id="standardSelectorsContainer"
              aria-labelledby="standardLabel"
              data-testid="standard-selectors"
            >
              {standardSelectors.map(({ index, selectedId, canRemove }) => (
                <StandardSelector
                  key={index}
                  index={index}
                  selectedId={selectedId}
                  standards={standards}
                  canRemove={canRemove}
                  onChange={(value) => handleStandardChange(index, value)}
                  onRemove={() => handleRemoveStandard(index)}
                />
              ))}
            </div>
            <Form.Text id="standardHelp">
              Select up to two standards. These drive PLO mapping and autocompletion.
            </Form.Text>
          </Col>

          {/* Intake Months */}
          <Col xs={12}>
            <FormField
              label="Intake months"
              htmlFor="intakeInput"
              helpText="Enter comma-separated months, e.g., Sep, Jan"
            >
              <FormInput
                id="intakeInput"
                value={(programme.intakeMonths ?? []).join(", ")}
                onChange={handleIntakeChange}
                placeholder="Comma-separated, e.g., Sep, Jan"
                data-testid="intake-input"
              />
            </FormField>
          </Col>
        </Form>
      </SectionCard>

      {/* Elective Definitions Card */}
      <SectionCard
        title="Elective Definitions"
        icon="path"
        headingId="elective-defs-heading"
        className="mt-3"
        actions={
          <Button
            variant="dark"
            size="sm"
            id="addElectiveDefinitionBtn"
            onClick={handleAddDefinition}
            aria-label="Add new elective definition"
            data-testid="add-elective-definition-btn"
          >
            <Icon name="plus" aria-hidden /> Add definition
          </Button>
        }
      >
        <Alert variant="light">
          <Icon name="lightbulb" className="me-1" aria-hidden />
          <strong>How elective definitions work:</strong>
          <ul className="mb-0 mt-1 small">
            <li>
              Students complete <strong>every</strong> elective definition in the programme
            </li>
            <li>
              For each definition, students choose <strong>one group</strong> to complete
            </li>
            <li>All groups within a definition share the same credit requirement</li>
          </ul>
        </Alert>

        <div id="electiveDefinitionsList" aria-labelledby="elective-defs-heading">
          {definitions.length === 0 ? (
            <Alert variant="light" className="mb-0">
              No elective definitions yet. Add definitions to create specialization tracks.
            </Alert>
          ) : (
            <>
              <Accordion
                id="electiveDefinitionsAccordion"
                defaultExpandedKeys={defaultExpandedDefinitions}
              >
                <AccordionControls accordionId="electiveDefinitionsAccordion" />
                {definitions.map((def, defIdx) => (
                  <ElectiveDefinitionItem
                    key={def.id}
                    definition={def}
                    definitionIndex={defIdx}
                    onCodeChange={(value) => handleDefinitionCodeChange(def.id, value)}
                    onNameChange={(value) => handleDefinitionNameChange(def.id, value)}
                    onCreditsChange={(value) => handleDefinitionCreditsChange(def.id, value)}
                    onGroupCodeChange={(groupId, value) =>
                      handleGroupCodeChange(def.id, groupId, value)
                    }
                    onGroupNameChange={(groupId, value) =>
                      handleGroupNameChange(def.id, groupId, value)
                    }
                    onAddGroup={() => handleAddGroup(def.id)}
                    onRemoveGroup={(groupId) => handleRemoveGroup(def.id, groupId)}
                    onRemove={() => handleRemoveDefinition(def.id)}
                  />
                ))}
              </Accordion>
            </>
          )}
        </div>
      </SectionCard>
    </>
  );
};

export default IdentityStep;
