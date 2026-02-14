/**
 * React version of the PLO to MIMLO Mapping step component (QQI-critical).
 * Maps Programme Learning Outcomes to MIMLOs using ploToMimlos structure.
 * Shows hierarchical checkboxes: PLO → Module → MIMLOs.
 * @module components/steps/react/MappingStep
 */

import React, { useCallback, useMemo } from "react";
import { Badge, Card, Form, ListGroup } from "react-bootstrap";
import { Accordion, AccordionControls, AccordionItem, Alert, Icon, SectionCard } from "../../ui";
import { useProgramme, useSaveDebounced, useUpdateProgramme } from "../../../hooks/useStore";
import { state } from "../../../state/store.js";
import { validateProgramme } from "../../../utils/validation.js";
import { renderFlags } from "../../flags.js";
import { renderHeader } from "../../header.js";

// ============================================================================
// Types
// ============================================================================

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
  [key: string]: unknown;
}

interface PLO {
  id: string;
  text: string;
  [key: string]: unknown;
}

interface Programme {
  mode?: string;
  modules?: Module[];
  plos?: PLO[];
  ploToMimlos?: Record<string, string[]>;
  moduleEditor?: { assignedModuleIds?: string[] };
  [key: string]: unknown;
}

type MappingState = "all" | "some" | "none";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Returns module IDs that can be edited in MODULE_EDITOR mode.
 */
function getEditableModuleIds(programme: Programme): string[] {
  if (programme.mode !== "MODULE_EDITOR") {
    return (programme.modules ?? []).map((m) => m.id);
  }
  return programme.moduleEditor?.assignedModuleIds ?? [];
}

/**
 * Gets all MIMLO IDs for a module.
 */
function getModuleMimloIds(mod: Module): string[] {
  return (mod.mimlos ?? []).map((m) => m.id);
}

/**
 * Checks if all MIMLOs of a module are mapped to a PLO.
 */
function getModuleMappingState(mappedMimloIds: string[], mod: Module): MappingState {
  const moduleMimloIds = getModuleMimloIds(mod);
  if (moduleMimloIds.length === 0) {
    return "none";
  }
  const mappedCount = moduleMimloIds.filter((id) => mappedMimloIds.includes(id)).length;
  if (mappedCount === 0) {
    return "none";
  }
  if (mappedCount === moduleMimloIds.length) {
    return "all";
  }
  return "some";
}

/**
 * Truncates text with ellipsis if too long.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
}

// ============================================================================
// Sub-components
// ============================================================================

interface MappingSummaryProps {
  unmappedPloCount: number;
  unmappedModuleCount: number;
}

/**
 * Summary section showing mapping coverage status.
 */
const MappingSummary: React.FC<MappingSummaryProps> = ({
  unmappedPloCount,
  unmappedModuleCount,
}) => {
  if (unmappedPloCount === 0 && unmappedModuleCount === 0) {
    return (
      <Alert variant="success" className="mb-3">
        <Icon name="check" className="me-1" aria-hidden />
        All PLOs mapped to MIMLOs
      </Alert>
    );
  }

  return (
    <Card className="bg-light mb-3">
      <Card.Body className="py-2">
        <div className="small">
          {unmappedPloCount > 0 ? (
            <div className="text-danger">
              <Icon name="warning" className="me-1" aria-hidden />
              {unmappedPloCount} PLO(s) not mapped to any MIMLO
            </div>
          ) : (
            <div className="text-success">
              <Icon name="check" className="me-1" aria-hidden />
              All PLOs mapped to at least one MIMLO
            </div>
          )}
          {unmappedModuleCount > 0 && (
            <div className="text-warning">
              <Icon name="warning" className="me-1" aria-hidden />
              {unmappedModuleCount} module(s) have no MIMLOs linked to any PLO
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

interface MimloCheckboxProps {
  ploId: string;
  ploIndex: number;
  mimlo: MIMLO;
  mimloIndex: number;
  moduleId: string;
  isChecked: boolean;
  isDisabled: boolean;
  onToggle: (ploId: string, mimloId: string, checked: boolean) => void;
}

/**
 * Individual MIMLO checkbox within a module.
 */
const MimloCheckbox: React.FC<MimloCheckboxProps> = ({
  ploId,
  ploIndex,
  mimlo,
  mimloIndex,
  moduleId,
  isChecked,
  isDisabled,
  onToggle,
}) => {
  const mimloText = mimlo.text || `MIMLO ${mimloIndex + 1}`;
  const shortText = truncateText(mimloText, 80);

  return (
    <ListGroup.Item
      as="label"
      className={`d-flex gap-2 align-items-start ps-4${isDisabled ? " opacity-50" : ""}`}
    >
      <Form.Check
        type="checkbox"
        className="m-0 mt-1"
        checked={isChecked}
        disabled={isDisabled}
        onChange={(e) => onToggle(ploId, mimlo.id, e.target.checked)}
        aria-label={`Map PLO ${ploIndex + 1} to MIMLO: ${shortText}`}
        data-testid={`mapping-checkbox-${ploId}-${mimlo.id}`}
      />
      <span className="small">
        {mimloIndex + 1}. {shortText}
      </span>
    </ListGroup.Item>
  );
};

interface ModuleMappingGroupProps {
  ploId: string;
  ploIndex: number;
  module: Module;
  mappedMimloIds: string[];
  isEditable: boolean;
  isModuleEditor: boolean;
  onToggleMimlo: (ploId: string, mimloId: string, checked: boolean) => void;
  onToggleModule: (ploId: string, moduleId: string, checked: boolean) => void;
}

/**
 * Module group with all/individual MIMLO checkboxes.
 */
const ModuleMappingGroup: React.FC<ModuleMappingGroupProps> = ({
  ploId,
  ploIndex,
  module,
  mappedMimloIds,
  isEditable,
  isModuleEditor,
  onToggleMimlo,
  onToggleModule,
}) => {
  const moduleMimlos = module.mimlos ?? [];
  const mappingState = getModuleMappingState(mappedMimloIds, module);

  // In module editor mode, hide modules they can't edit (unless already has mapped MIMLOs)
  if (isModuleEditor && !isEditable && mappingState === "none") {
    return null;
  }

  const isDisabled = isModuleEditor && !isEditable;
  const hasMimlos = moduleMimlos.length > 0;
  const selectedCount = moduleMimlos.filter((mimlo) => mappedMimloIds.includes(mimlo.id)).length;
  const totalCount = moduleMimlos.length;

  const moduleCollapseId = `map_${ploId}_${module.id}_mimlos`;

  // Badge styling
  const badgeClass =
    selectedCount === 0
      ? "bg-secondary-subtle text-secondary-emphasis"
      : "bg-primary-subtle text-primary-emphasis";

  // Module header text
  const moduleTitle = module.code ? `${module.code} — ${module.title}` : module.title;

  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div
      className={`module-mapping-group border-start border-2 ${mappingState !== "none" ? "border-primary" : "border-light"} mb-2`}
    >
      <div
        className={`d-flex align-items-center gap-2 py-2 px-2 bg-light rounded-end${isDisabled ? " opacity-50" : ""}`}
      >
        <Form.Check
          type="checkbox"
          className="m-0"
          checked={mappingState === "all"}
          ref={(el: HTMLInputElement | null) => {
            if (el) {
              el.indeterminate = mappingState === "some";
            }
          }}
          disabled={isDisabled}
          onChange={(e) => onToggleModule(ploId, module.id, e.target.checked)}
          aria-label={`Map PLO ${ploIndex + 1} to all MIMLOs of ${module.title}`}
          data-testid={`mapping-module-checkbox-${ploId}-${module.id}`}
        />
        <span
          className={`small fw-semibold flex-grow-1${hasMimlos ? " text-primary-emphasis" : ""}`}
          role={hasMimlos ? "button" : undefined}
          tabIndex={hasMimlos ? 0 : undefined}
          style={hasMimlos ? { cursor: "pointer" } : undefined}
          onClick={hasMimlos ? () => setIsExpanded(!isExpanded) : undefined}
          onKeyDown={
            hasMimlos
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsExpanded(!isExpanded);
                  }
                }
              : undefined
          }
          aria-expanded={hasMimlos ? isExpanded : undefined}
          aria-controls={hasMimlos ? moduleCollapseId : undefined}
        >
          {hasMimlos && (
            <Icon
              name={isExpanded ? "caret-down" : "caret-right"}
              className="me-1 collapse-icon"
              aria-hidden
            />
          )}
          {moduleTitle}{" "}
          <span className="text-secondary fw-normal">({Number(module.credits ?? 0)} cr)</span>
          {isDisabled && <span className="text-secondary fst-italic"> (read-only)</span>}
        </span>
        {hasMimlos ? (
          <Badge className={badgeClass}>
            {selectedCount} / {totalCount} selected
          </Badge>
        ) : (
          <span className="small text-secondary fst-italic">No MIMLOs</span>
        )}
      </div>
      {hasMimlos && isExpanded && (
        <div id={moduleCollapseId}>
          <ListGroup variant="flush">
            {moduleMimlos.map((mimlo, mimloIdx) => (
              <MimloCheckbox
                key={mimlo.id}
                ploId={ploId}
                ploIndex={ploIndex}
                mimlo={mimlo}
                mimloIndex={mimloIdx}
                moduleId={module.id}
                isChecked={mappedMimloIds.includes(mimlo.id)}
                isDisabled={isDisabled}
                onToggle={onToggleMimlo}
              />
            ))}
          </ListGroup>
        </div>
      )}
    </div>
  );
};

interface PloAccordionItemProps {
  plo: PLO;
  ploIndex: number;
  modules: Module[];
  mappedMimloIds: string[];
  editableIds: string[];
  isModuleEditor: boolean;
  onToggleMimlo: (ploId: string, mimloId: string, checked: boolean) => void;
  onToggleModule: (ploId: string, moduleId: string, checked: boolean) => void;
}

/**
 * Accordion item for a single PLO with all module mappings.
 */
const PloAccordionItem: React.FC<PloAccordionItemProps> = ({
  plo,
  ploIndex,
  modules,
  mappedMimloIds,
  editableIds,
  isModuleEditor,
  onToggleMimlo,
  onToggleModule,
}) => {
  const preview = (plo.text || "").trim();
  const previewShort = truncateText(preview, 120) || "—";
  const mappedCount = mappedMimloIds.length;
  const badgeClass = mappedCount > 0 ? "text-bg-primary" : "text-bg-secondary";

  // Filter modules for display
  const visibleModules = modules.filter((m) => {
    const isEditable = editableIds.includes(m.id);
    const mappingState = getModuleMappingState(mappedMimloIds, m);
    // In module editor mode, hide modules they can't edit (unless already has mapped MIMLOs)
    if (isModuleEditor && !isEditable && mappingState === "none") {
      return false;
    }
    return true;
  });

  return (
    <AccordionItem
      eventKey={plo.id}
      title={
        <div className="d-flex w-100 align-items-center justify-content-between">
          <div>
            <span className="fw-semibold">PLO {ploIndex + 1}</span>
            <div className="small text-secondary fw-normal">{previewShort}</div>
          </div>
          <Badge className={`${badgeClass} me-2`}>{mappedCount} MIMLOs</Badge>
        </div>
      }
      data-testid={`mapping-plo-${plo.id}`}
    >
      {visibleModules.length === 0 ? (
        <div className="small text-secondary">No modules available to map.</div>
      ) : (
        visibleModules.map((m) => (
          <ModuleMappingGroup
            key={m.id}
            ploId={plo.id}
            ploIndex={ploIndex}
            module={m}
            mappedMimloIds={mappedMimloIds}
            isEditable={editableIds.includes(m.id)}
            isModuleEditor={isModuleEditor}
            onToggleMimlo={onToggleMimlo}
            onToggleModule={onToggleModule}
          />
        ))
      )}
    </AccordionItem>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Mapping step component for React.
 * Maps Programme Learning Outcomes to Module MIMLOs.
 */
export const MappingStep: React.FC = () => {
  const { programme } = useProgramme() as { programme: Programme; revision: number };
  const updateProgramme = useUpdateProgramme();
  const saveDebounced = useSaveDebounced();

  const plos = (programme.plos ?? []) as PLO[];
  const modules = (programme.modules ?? []) as Module[];
  const ploToMimlos = programme.ploToMimlos ?? {};
  const isModuleEditor = programme.mode === "MODULE_EDITOR";
  const editableIds = getEditableModuleIds(programme);

  // Helper to update flags and header
  const updateFlagsAndHeader = useCallback(() => {
    const flags = validateProgramme(state.programme);
    renderFlags(flags, () => {
      const win = window as Window & { render?: () => void | Promise<void> };
      win.render?.();
    });
    renderHeader();
  }, []);

  // Calculate summary stats
  const { unmappedPloCount, unmappedModuleCount } = useMemo(() => {
    const unmappedPlos = plos.filter((plo) => !(ploToMimlos[plo.id] ?? []).length).length;

    // Count modules with at least one MIMLO mapped to any PLO
    const modulesWithMapping = new Set<string>();
    Object.values(ploToMimlos).forEach((mimloIds) => {
      (mimloIds ?? []).forEach((mimloId) => {
        const mod = modules.find((m) => (m.mimlos ?? []).some((mi) => mi.id === mimloId));
        if (mod) {
          modulesWithMapping.add(mod.id);
        }
      });
    });
    const modulesWithNoMapping = modules.filter((m) => !modulesWithMapping.has(m.id)).length;

    return {
      unmappedPloCount: unmappedPlos,
      unmappedModuleCount: modulesWithNoMapping,
    };
  }, [plos, modules, ploToMimlos]);

  // Handle individual MIMLO toggle
  const handleToggleMimlo = useCallback(
    (ploId: string, mimloId: string, checked: boolean) => {
      const newPloToMimlos = { ...ploToMimlos };
      if (!newPloToMimlos[ploId]) {
        newPloToMimlos[ploId] = [];
      }

      if (checked) {
        if (!newPloToMimlos[ploId].includes(mimloId)) {
          newPloToMimlos[ploId] = [...newPloToMimlos[ploId], mimloId];
        }
      } else {
        newPloToMimlos[ploId] = newPloToMimlos[ploId].filter((id) => id !== mimloId);
      }

      updateProgramme({ ploToMimlos: newPloToMimlos });
      saveDebounced(updateFlagsAndHeader);
    },
    [ploToMimlos, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // Handle module-level toggle (all MIMLOs)
  const handleToggleModule = useCallback(
    (ploId: string, moduleId: string, checked: boolean) => {
      const mod = modules.find((m) => m.id === moduleId);
      if (!mod) {
        return;
      }

      const moduleMimloIds = getModuleMimloIds(mod);
      const newPloToMimlos = { ...ploToMimlos };

      if (!newPloToMimlos[ploId]) {
        newPloToMimlos[ploId] = [];
      }

      if (checked) {
        // Add all MIMLOs from this module
        const currentMimlos = new Set(newPloToMimlos[ploId]);
        moduleMimloIds.forEach((mimloId) => currentMimlos.add(mimloId));
        newPloToMimlos[ploId] = Array.from(currentMimlos);
      } else {
        // Remove all MIMLOs from this module
        newPloToMimlos[ploId] = newPloToMimlos[ploId].filter((id) => !moduleMimloIds.includes(id));
      }

      updateProgramme({ ploToMimlos: newPloToMimlos });
      saveDebounced(updateFlagsAndHeader);
    },
    [modules, ploToMimlos, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // Empty state
  if (!plos.length || !modules.length) {
    return (
      <SectionCard title="Mapping" icon="graph">
        <Alert variant="info" className="mb-0">
          <Icon name="info" className="me-2" aria-hidden />
          Add PLOs and modules first.
        </Alert>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Map PLOs to MIMLOs (QQI-critical)" icon="graph" headingId="mapping-heading">
      <p className="text-muted small mb-3">
        <Icon name="lightbulb" className="me-1" aria-hidden />
        For each PLO, select the module MIMLOs that address this outcome. Check a module to select
        all its MIMLOs, or expand to select individual MIMLOs.
      </p>

      {isModuleEditor && (
        <Alert variant="info" className="mb-3">
          <strong>Module Editor Mode:</strong> You can only map PLOs to MIMLOs in your assigned
          modules. Other mappings are shown as read-only.
        </Alert>
      )}

      <MappingSummary
        unmappedPloCount={unmappedPloCount}
        unmappedModuleCount={unmappedModuleCount}
      />

      <div id="mappingAccordion" aria-labelledby="mapping-heading" data-testid="mapping-accordion">
        <Accordion id="mappingAccordion" defaultExpandedKeys={plos.length > 0 ? [plos[0].id] : []}>
          <AccordionControls accordionId="mappingAccordion" />
          {plos.map((plo, idx) => (
            <PloAccordionItem
              key={plo.id}
              plo={plo}
              ploIndex={idx}
              modules={modules}
              mappedMimloIds={ploToMimlos[plo.id] ?? []}
              editableIds={editableIds}
              isModuleEditor={isModuleEditor}
              onToggleMimlo={handleToggleMimlo}
              onToggleModule={handleToggleModule}
            />
          ))}
        </Accordion>
      </div>
    </SectionCard>
  );
};

export default MappingStep;
