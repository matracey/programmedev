/**
 * React version of the MIMLOs (Module Intended Minimum Learning Outcomes) step component.
 * Allows users to define, edit, and lint MIMLOs for each module.
 * @module components/steps/react/MimlosStep
 */

import React, { useCallback, useEffect, useState } from "react";

import { Badge, Button, Form, InputGroup } from "react-bootstrap";

import { useProgramme, useSaveDebounced, useUpdateProgramme } from "../../../hooks/useStore";
import { lintLearningOutcome } from "../../../lib/lo-lint";
import { editableModuleIds, getSelectedModuleId, state } from "../../../state/store";
import { ensureMimloObjects, mimloText } from "../../../utils/helpers";
import { uid } from "../../../utils/uid";
import {
  Accordion,
  AccordionControls,
  AccordionItem,
  Alert,
  Icon,
  SectionCard,
} from "../../ui";

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

interface LintIssue {
  severity: "warn" | "error" | "info";
  match: string;
  message: string;
  suggestions: string[];
}

interface BloomsGuidanceProps {
  nfqLevel: number | null;
  contextLabel: string;
}

interface MimloInputProps {
  moduleId: string;
  mimlo: MIMLO;
  index: number;
  moduleTitle: string;
  onTextChange: (text: string) => void;
  onRemove: () => void;
}

interface ModuleAccordionItemProps {
  module: Module;
  moduleIndex: number;
  isHidden: boolean;
  onAddMimlo: () => void;
  onRemoveMimlo: (mimloIndex: number) => void;
  onTextChange: (mimloIndex: number, text: string) => void;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Bloom's guidance helper showing NFQ-level appropriate verbs.
 */
const BloomsGuidance: React.FC<BloomsGuidanceProps> = ({ nfqLevel, contextLabel }) => {
  const lvl = Number(nfqLevel ?? 0);
  const title = lvl
    ? `Bloom helper (aligned to NFQ level ${lvl})`
    : "Bloom helper (choose NFQ level first)";

  let focus: string;
  let verbs: string[];

  if (!lvl) {
    focus =
      "Pick the programme NFQ level in Identity, then come back here for tailored verb suggestions.";
    verbs = ["describe", "explain", "apply", "analyse", "evaluate", "design"];
  } else if (lvl <= 6) {
    focus =
      "Emphasise foundational knowledge and applied skills (remember/understand/apply), with some analysis.";
    verbs = [
      "identify",
      "describe",
      "explain",
      "apply",
      "demonstrate",
      "use",
      "outline",
      "compare",
    ];
  } else if (lvl === 7) {
    focus = "Balance application and analysis. Show problem-solving and autonomy.";
    verbs = [
      "apply",
      "analyse",
      "evaluate",
      "compare",
      "develop",
      "justify",
      "implement",
      "design",
    ];
  } else if (lvl === 8) {
    focus = "Push beyond application: critical analysis, evaluation, and creation/design.";
    verbs = [
      "analyse",
      "evaluate",
      "synthesise",
      "design",
      "develop",
      "critique",
      "justify",
      "implement",
    ];
  } else {
    focus = "Focus on creation, research, and leadership. Expect original contribution.";
    verbs = [
      "design",
      "develop",
      "evaluate",
      "create",
      "synthesise",
      "lead",
      "formulate",
      "originate",
    ];
  }

  return (
    <Alert variant="secondary" className="mb-3 small">
      <div className="fw-semibold mb-1">
        {title} — for {contextLabel}
      </div>
      <div className="mb-2">{focus}</div>
      <div className="d-flex flex-wrap gap-1">
        {verbs.map((v) => (
          <Badge key={v} bg="light" text="dark">
            {v}
          </Badge>
        ))}
      </div>
      <div className="mt-2 text-secondary">
        Tip: start outcomes with a verb + object + standard (e.g., "Analyse X using Y to produce
        Z").
      </div>
    </Alert>
  );
};

/**
 * Lint warning display for a single MIMLO.
 */
const LintWarnings: React.FC<{ issues: LintIssue[] }> = ({ issues }) => {
  const warnings = issues.filter((i) => i.severity === "warn");
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="mimlo-lint-warnings mt-1" role="status" aria-live="polite">
      {warnings.map((issue, idx) => (
        <Alert key={idx} variant="warning" className="py-1 px-2 mb-0 mt-1 small">
          <strong>⚠️ "{issue.match}"</strong> — {issue.message}
          {issue.suggestions.length > 0 && (
            <>
              <br />
              <em>Try: {issue.suggestions.join(", ")}</em>
            </>
          )}
        </Alert>
      ))}
    </div>
  );
};

/**
 * Single MIMLO input with lint warnings.
 */
const MimloInput: React.FC<MimloInputProps> = ({
  moduleId,
  mimlo,
  index,
  moduleTitle,
  onTextChange,
  onRemove,
}) => {
  const [localText, setLocalText] = useState(mimloText(mimlo));
  const lintResult = lintLearningOutcome(localText);

  const handleChange = (value: string) => {
    setLocalText(value);
    onTextChange(value);
  };

  // Sync local state with prop
  useEffect(() => {
    setLocalText(mimloText(mimlo));
  }, [mimlo]);

  return (
    <div className="mb-2">
      <InputGroup className="d-flex gap-2">
        <Form.Label visuallyHidden htmlFor={`mimlo-${moduleId}-${index}`}>
          MIMLO {index + 1} for {moduleTitle || "module"}
        </Form.Label>
        <Form.Control
          id={`mimlo-${moduleId}-${index}`}
          value={localText}
          onChange={(e) => handleChange(e.target.value)}
          data-mimlo-module={moduleId}
          data-mimlo-index={index}
          data-testid={`mimlo-input-${moduleId}-${index}`}
        />
        <Button
          variant="outline-danger"
          onClick={onRemove}
          aria-label={`Remove MIMLO ${index + 1}`}
          data-testid={`remove-mimlo-${moduleId}-${index}`}
        >
          <Icon name="trash" aria-hidden /> Remove
        </Button>
      </InputGroup>
      <LintWarnings issues={lintResult.issues} />
    </div>
  );
};

/**
 * Module accordion item containing all MIMLOs for a module.
 */
const ModuleAccordionItem: React.FC<ModuleAccordionItemProps> = ({
  module,
  moduleIndex: _moduleIndex,
  isHidden,
  onAddMimlo,
  onRemoveMimlo,
  onTextChange,
}) => {
  const mimlos = module.mimlos ?? [];
  const countText = `${mimlos.length} item${mimlos.length !== 1 ? "s" : ""}`;
  const headerTitle = module.code ? `${module.code} — ${module.title}` : module.title;

  if (isHidden) {
    return null;
  }

  return (
    <AccordionItem
      eventKey={module.id}
      title={headerTitle}
      subtitle={<Badge bg="secondary">{countText}</Badge>}
      subtitlePosition="right"
      data-testid={`mimlo-module-${module.id}`}
    >
      <div className="small text-muted mb-3" role="note">
        Add 3–6 MIMLOs per module to start.
      </div>

      {mimlos.length === 0 ? (
        <div className="small text-secondary mb-2">No MIMLOs yet.</div>
      ) : (
        mimlos.map((mimlo, idx) => (
          <MimloInput
            key={mimlo.id}
            moduleId={module.id}
            mimlo={mimlo}
            index={idx}
            moduleTitle={module.title}
            onTextChange={(text) => onTextChange(idx, text)}
            onRemove={() => onRemoveMimlo(idx)}
          />
        ))
      )}

      <Button
        variant="outline-secondary"
        size="sm"
        onClick={onAddMimlo}
        aria-label={`Add MIMLO to ${module.title || "module"}`}
        data-testid={`add-mimlo-${module.id}`}
      >
        <Icon name="plus" aria-hidden /> Add MIMLO
      </Button>
    </AccordionItem>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * MIMLOs step component for React.
 * Manages Module Intended Minimum Learning Outcomes with linting.
 */
export const MimlosStep: React.FC = () => {
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

  // Handle adding a MIMLO
  const handleAddMimlo = useCallback(
    (moduleId: string) => {
      const modules = [...(programme.modules ?? [])];
      const module = modules.find((m) => m.id === moduleId);
      if (!module) {
        return;
      }

      module.mimlos = module.mimlos ?? [];
      module.mimlos.push({ id: uid("mimlo"), text: "" });

      updateProgramme({ modules });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.modules, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // Handle removing a MIMLO
  const handleRemoveMimlo = useCallback(
    (moduleId: string, mimloIndex: number) => {
      const modules = [...(programme.modules ?? [])];
      const module = modules.find((m) => m.id === moduleId);
      if (!module) {
        return;
      }

      module.mimlos = (module.mimlos ?? []).filter((_, i) => i !== mimloIndex);

      updateProgramme({ modules });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.modules, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  // Handle MIMLO text change
  const handleTextChange = useCallback(
    (moduleId: string, mimloIndex: number, text: string) => {
      const modules = [...(programme.modules ?? [])];
      const module = modules.find((m) => m.id === moduleId);
      if (!module) {
        return;
      }

      module.mimlos = module.mimlos ?? [];
      ensureMimloObjects(module);

      if (!module.mimlos[mimloIndex]) {
        module.mimlos[mimloIndex] = { id: uid("mimlo"), text: "" };
      }
      module.mimlos[mimloIndex].text = text;

      updateProgramme({ modules });
      saveDebounced();
    },
    [programme.modules, updateProgramme, saveDebounced],
  );

  return (
    <SectionCard
      title="MIMLOs (Minimum Intended Module Learning Outcomes)"
      icon="graduation-cap"
      headingId="mimlos-heading"
    >
      <BloomsGuidance nfqLevel={programme.nfqLevel} contextLabel="MIMLOs" />

      {/* Module picker for MODULE_EDITOR mode */}
      {canPickModule && (
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <Form.Label className="fw-semibold" htmlFor="modulePicker">
              Assigned module
            </Form.Label>
            <Form.Select
              id="modulePicker"
              value={selectedModuleId}
              onChange={(e) => handleModuleChange(e.target.value)}
              data-testid="mimlo-module-picker"
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
      <div id="mimloAccordion" aria-labelledby="mimlos-heading" data-testid="mimlo-accordion">
        {modulesForEdit.length === 0 ? (
          <Alert variant="info">
            <Icon name="info" className="me-2" aria-hidden />
            Add modules first (Credits & Modules step).
          </Alert>
        ) : (
          <>
            <Accordion
              id="mimloAccordion"
              defaultExpandedKeys={modulesForEdit.length > 0 ? [modulesForEdit[0].id] : []}
            >
              <AccordionControls accordionId="mimloAccordion" />
              {modulesForEdit.map((module, idx) => {
                const isHidden =
                  programme.mode === "MODULE_EDITOR" &&
                  editableIds.length > 1 &&
                  module.id !== selectedModuleId;

                return (
                  <ModuleAccordionItem
                    key={module.id}
                    module={module as Module}
                    moduleIndex={idx}
                    isHidden={isHidden}
                    onAddMimlo={() => handleAddMimlo(module.id)}
                    onRemoveMimlo={(mimloIndex) => handleRemoveMimlo(module.id, mimloIndex)}
                    onTextChange={(mimloIndex, text) =>
                      handleTextChange(module.id, mimloIndex, text)
                    }
                  />
                );
              })}
            </Accordion>
          </>
        )}
      </div>
    </SectionCard>
  );
};

export default MimlosStep;
