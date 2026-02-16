/**
 * React version of the Programme Learning Outcomes (PLOs) step component.
 * Allows users to define, edit, and map PLOs to QQI award standards.
 * @module components/steps/react/OutcomesStep
 */

import React, { useCallback, useEffect, useState } from "react";

import { Badge, Button, Form, Table } from "react-bootstrap";

import { useProgramme, useSaveDebounced, useUpdateProgramme } from "../../../hooks/useStore";
import { lintLearningOutcome } from "../../../lib/lo-lint";
import {
  getAwardStandard,
  getCriteriaList,
  getDescriptor,
  getThreadList,
} from "../../../state/store";
import { uid } from "../../../utils/uid";
import {
  Accordion,
  AccordionControls,
  AccordionItem,
  Alert,
  HeaderAction,
  Icon,
  SectionCard,
} from "../../ui";

// ============================================================================
// Types
// ============================================================================

interface PLOMapping {
  criteria: string;
  thread: string;
  standardId?: string;
}

interface PLO {
  id: string;
  text: string;
  standardMappings: PLOMapping[];
}

interface LintIssue {
  severity: "warn" | "error" | "info";
  match: string;
  message: string;
  suggestions: string[];
}

interface AwardStandard {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface PLOItemProps {
  plo: PLO;
  index: number;
  onTextChange: (text: string) => void;
  onRemove: () => void;
  onAddMapping: (criteria: string, thread: string, standardId: string) => void;
  onRemoveMapping: (mappingIndex: number) => void;
  standardIds: string[];
  standardNames: string[];
  nfqLevel: number | null;
}

interface BloomsGuidanceProps {
  nfqLevel: number | null;
  contextLabel: string;
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
 * Lint warning display for a single PLO.
 */
const LintWarnings: React.FC<{ issues: LintIssue[] }> = ({ issues }) => {
  const warnings = issues.filter((i) => i.severity === "warn");
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="plo-lint-warnings mt-2" role="status" aria-live="polite">
      {warnings.map((issue, idx) => (
        <Alert key={idx} variant="warning" className="py-1 px-2 mb-1 small">
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
 * Mapping controls for a single PLO.
 */
const MappingControls: React.FC<{
  ploId: string;
  ploIndex: number;
  standardIds: string[];
  standardNames: string[];
  nfqLevel: number | null;
  currentMappings: PLOMapping[];
  onAddMapping: (criteria: string, thread: string, standardId: string) => void;
  onRemoveMapping: (index: number) => void;
}> = ({
  ploId,
  ploIndex,
  standardIds,
  standardNames,
  nfqLevel,
  currentMappings,
  onAddMapping,
  onRemoveMapping,
}) => {
  const [selectedStandardId, setSelectedStandardId] = useState(standardIds[0] ?? "");
  const [criteria, setCriteria] = useState("");
  const [thread, setThread] = useState("");
  const [description, setDescription] = useState("");
  const [criteriaList, setCriteriaList] = useState<string[]>([]);
  const [threadList, setThreadList] = useState<string[]>([]);
  const [standard, setStandard] = useState<AwardStandard | null>(null);

  const hasMultipleStandards = standardIds.length > 1;

  // Load award standard data
  useEffect(() => {
    if (!selectedStandardId) {
      return;
    }
    getAwardStandard(selectedStandardId)
      .then((std: AwardStandard) => {
        setStandard(std);
        const level = Number(nfqLevel ?? 8);
        const critList = getCriteriaList(std, level).sort((a, b) => a.localeCompare(b));
        setCriteriaList(critList);
        setThreadList([]);
        setCriteria("");
        setThread("");
        setDescription("");
      })
      .catch(() => {
        setCriteriaList([]);
        setThreadList([]);
      });
  }, [selectedStandardId, nfqLevel]);

  // Update thread list when criteria changes
  useEffect(() => {
    if (!standard || !criteria) {
      setThreadList([]);
      setDescription("");
      return;
    }
    const level = Number(nfqLevel ?? 8);
    const threads = getThreadList(standard, level, criteria).sort((a, b) => a.localeCompare(b));
    setThreadList(threads);
    setThread("");
    setDescription("");
  }, [criteria, standard, nfqLevel]);

  // Update description when thread changes
  useEffect(() => {
    if (!standard || !criteria || !thread) {
      setDescription("");
      return;
    }
    const level = Number(nfqLevel ?? 8);
    const desc = getDescriptor(standard, level, criteria, thread);
    setDescription(desc || (criteria && thread ? "No descriptor found for this level." : ""));
  }, [thread, criteria, standard, nfqLevel]);

  const handleAddMapping = () => {
    if (!criteria || !thread) {
      alert("Select both Criteria and Thread first.");
      return;
    }
    onAddMapping(criteria, thread, selectedStandardId);
    setCriteria("");
    setThread("");
    setDescription("");
  };

  // Group mappings by standard for display
  const mappingsByStandard: Record<string, { mapping: PLOMapping; index: number }[]> = {};
  currentMappings.forEach((m, i) => {
    const stdId = m.standardId ?? standardIds[0] ?? "default";
    if (!mappingsByStandard[stdId]) {
      mappingsByStandard[stdId] = [];
    }
    mappingsByStandard[stdId].push({ mapping: m, index: i });
  });

  if (!standardIds.length) {
    return (
      <div className="small text-danger" role="alert">
        Select a QQI award standard in Identity to enable mapping.
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="fw-semibold small mb-2" id={`plo-mapping-heading-${ploId}`}>
        Map this PLO to QQI award standards
      </div>

      {hasMultipleStandards && (
        <div className="mb-2">
          <Form.Label className="small mb-1" htmlFor={`plo-standard-${ploId}`}>
            Select standard to map to
          </Form.Label>
          <Form.Select
            size="sm"
            id={`plo-standard-${ploId}`}
            value={selectedStandardId}
            onChange={(e) => setSelectedStandardId(e.target.value)}
            data-testid={`plo-standard-${ploId}`}
          >
            {standardIds.map((stdId, i) => (
              <option key={stdId} value={stdId}>
                {standardNames[i] ?? stdId}
              </option>
            ))}
          </Form.Select>
        </div>
      )}

      <div
        className="d-flex flex-wrap gap-2 align-items-end"
        role="group"
        aria-labelledby={`plo-mapping-heading-${ploId}`}
      >
        <div className="plo-field-criteria">
          <Form.Label className="small mb-1" htmlFor={`plo-criteria-${ploId}`}>
            Criteria
          </Form.Label>
          <Form.Select
            size="sm"
            id={`plo-criteria-${ploId}`}
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            data-testid={`plo-criteria-${ploId}`}
          >
            <option value="">Select criteria...</option>
            {criteriaList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Form.Select>
        </div>

        <div className="plo-field-thread">
          <Form.Label className="small mb-1" htmlFor={`plo-thread-${ploId}`}>
            Thread
          </Form.Label>
          <Form.Select
            size="sm"
            id={`plo-thread-${ploId}`}
            value={thread}
            onChange={(e) => setThread(e.target.value)}
            data-testid={`plo-thread-${ploId}`}
          >
            <option value="">Select thread...</option>
            {threadList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Form.Select>
        </div>

        <Button
          variant="outline-primary"
          size="sm"
          onClick={handleAddMapping}
          aria-label={`Add mapping for PLO ${ploIndex + 1}`}
          data-testid={`add-mapping-${ploId}`}
        >
          <Icon name="link" className="me-1" aria-hidden />
          Add mapping
        </Button>
      </div>

      {description && (
        <div className="small text-secondary mt-2" aria-live="polite">
          {description}
        </div>
      )}

      <div className="mt-2" role="group" aria-label={`Current mappings for PLO ${ploIndex + 1}`}>
        {currentMappings.length === 0 ? (
          <div className="small text-secondary">No mappings yet for this PLO.</div>
        ) : hasMultipleStandards ? (
          Object.entries(mappingsByStandard).map(([stdId, items]) => {
            const stdIdx = standardIds.indexOf(stdId);
            const stdName = standardNames[stdIdx] ?? stdId;
            return (
              <div key={stdId} className="mb-2">
                <div className="small fw-semibold text-primary mb-1">{stdName}</div>
                <div>
                  {items.map(({ mapping, index }) => (
                    <Badge key={index} bg="light" text="dark" className="border me-2 mb-2">
                      {mapping.criteria} / {mapping.thread}
                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger p-0 ms-2"
                        onClick={() => onRemoveMapping(index)}
                        title="Remove"
                      >
                        <Icon name="x" aria-hidden />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          currentMappings.map((m, i) => (
            <Badge key={i} bg="light" text="dark" className="border me-2 mb-2">
              {m.criteria} / {m.thread}
              <Button
                variant="link"
                size="sm"
                className="text-danger p-0 ms-2"
                onClick={() => onRemoveMapping(i)}
                title="Remove"
              >
                <Icon name="x" aria-hidden />
              </Button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * Single PLO accordion item.
 */
const PLOItem: React.FC<PLOItemProps> = ({
  plo,
  index,
  onTextChange,
  onRemove,
  onAddMapping,
  onRemoveMapping,
  standardIds,
  standardNames,
  nfqLevel,
}) => {
  const [localText, setLocalText] = useState(plo.text ?? "");
  const lintResult = lintLearningOutcome(localText);

  const preview = localText.trim();
  const previewShort =
    preview.length > 120 ? `${preview.slice(0, 120)}…` : preview || "No text yet";

  const handleTextChange = (value: string) => {
    setLocalText(value);
    onTextChange(value);
  };

  // Sync local state with prop
  useEffect(() => {
    setLocalText(plo.text ?? "");
  }, [plo.text]);

  return (
    <AccordionItem
      eventKey={plo.id}
      title={`PLO ${index + 1}`}
      subtitle={previewShort}
      headerActions={
        <HeaderAction
          label="Remove"
          icon="trash"
          variant="outline-danger"
          onClick={onRemove}
          aria-label={`Remove PLO ${index + 1}`}
          data-testid={`remove-plo-${plo.id}`}
          data-remove-plo={plo.id}
        />
      }
      data-testid={`plo-item-${plo.id}`}
    >
      <Form.Label visuallyHidden htmlFor={`plo-text-${plo.id}`}>
        PLO {index + 1} text
      </Form.Label>
      <Form.Control
        as="textarea"
        id={`plo-text-${plo.id}`}
        value={localText}
        onChange={(e) => handleTextChange(e.target.value)}
        rows={3}
        placeholder="e.g., Analyse… / Design and implement…"
        data-plo-id={plo.id}
        data-testid={`plo-textarea-${plo.id}`}
        aria-describedby={`plo-lint-${plo.id}`}
      />
      <div id={`plo-lint-${plo.id}`}>
        <LintWarnings issues={lintResult.issues} />
      </div>

      <MappingControls
        ploId={plo.id}
        ploIndex={index}
        standardIds={standardIds}
        standardNames={standardNames}
        nfqLevel={nfqLevel}
        currentMappings={plo.standardMappings ?? []}
        onAddMapping={onAddMapping}
        onRemoveMapping={onRemoveMapping}
      />
    </AccordionItem>
  );
};

/**
 * Mapping snapshot table showing all PLOs and their mappings.
 */
const MappingSnapshot: React.FC<{
  plos: PLO[];
  standardIds: string[];
  standardNames: string[];
  nfqLevel: number | null;
}> = ({ plos, standardIds, standardNames, nfqLevel }) => {
  const [standardsMap, setStandardsMap] = useState<Map<string, AwardStandard>>(new Map());

  useEffect(() => {
    const loadStandards = async () => {
      const map = new Map<string, AwardStandard>();
      for (const stdId of standardIds) {
        try {
          const std = await getAwardStandard(stdId);
          map.set(stdId, std);
        } catch {
          // Skip failed loads
        }
      }
      setStandardsMap(map);
    };
    loadStandards();
  }, [standardIds]);

  if (plos.length === 0) {
    return <div className="text-secondary">Add PLOs to see a mapping snapshot.</div>;
  }

  const level = Number(nfqLevel ?? 8);
  const hasMultipleStandards = standardIds.length > 1;

  return (
    <div className="table-responsive">
      <Table size="sm" className="align-middle">
        <thead>
          <tr>
            <th className="plo-col-label">PLO</th>
            <th>PLO Text</th>
            <th>Mapped Standards (at NFQ Level {level ?? ""})</th>
          </tr>
        </thead>
        <tbody>
          {plos.map((plo, i) => {
            const maps = (plo.standardMappings ?? []).map((m) => {
              const stdId = m.standardId ?? standardIds[0];
              const std = standardsMap.get(stdId);
              const desc = std ? getDescriptor(std, level, m.criteria, m.thread) : "";
              const shortDesc = desc.length > 180 ? desc.slice(0, 180) + "…" : desc;
              const stdIdx = standardIds.indexOf(stdId);
              const stdName = hasMultipleStandards ? (
                <Badge bg="info" className="me-1">
                  {standardNames[stdIdx] ?? stdId}
                </Badge>
              ) : null;
              return (
                <li key={`${m.criteria}-${m.thread}-${stdId}`}>
                  {stdName}
                  <span className="fw-semibold">
                    {m.criteria} / {m.thread}
                  </span>
                  <div className="text-secondary">{shortDesc}</div>
                </li>
              );
            });

            return (
              <tr key={plo.id}>
                <td className="text-nowrap">PLO {i + 1}</td>
                <td>{plo.text ?? ""}</td>
                <td>
                  {maps.length > 0 ? (
                    <ul className="mb-0 ps-3">{maps}</ul>
                  ) : (
                    <span className="text-secondary">No mappings yet</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Outcomes step component for React.
 * Manages Programme Learning Outcomes with linting and standard mappings.
 */
export const OutcomesStep: React.FC = () => {
  const { programme } = useProgramme();
  const updateProgramme = useUpdateProgramme();
  const saveDebounced = useSaveDebounced();

  // Helper to update flags and header
  const updateFlagsAndHeader = useCallback(() => {
    // No-op: React components auto-update via useSyncExternalStore
  }, []);

  const handleAddPLO = useCallback(() => {
    const plos = [...(programme.plos ?? [])];
    const newPLO: PLO = { id: uid("plo"), text: "", standardMappings: [] };
    plos.push(newPLO);
    updateProgramme({ plos });
    saveDebounced(updateFlagsAndHeader);
  }, [programme.plos, updateProgramme, saveDebounced, updateFlagsAndHeader]);

  const handleRemovePLO = useCallback(
    (ploId: string) => {
      const plos = (programme.plos ?? []).filter((p) => p.id !== ploId);
      const ploToMimlos = { ...(programme.ploToMimlos ?? {}) };
      delete ploToMimlos[ploId];
      updateProgramme({ plos, ploToMimlos });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.plos, programme.ploToMimlos, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const handleTextChange = useCallback(
    (ploId: string, text: string) => {
      const plos = [...(programme.plos ?? [])];
      const plo = plos.find((p) => p.id === ploId);
      if (plo) {
        plo.text = text;
        updateProgramme({ plos });
        saveDebounced();
      }
    },
    [programme.plos, updateProgramme, saveDebounced],
  );

  const handleAddMapping = useCallback(
    (ploId: string, criteria: string, thread: string, standardId: string) => {
      const plos = [...(programme.plos ?? [])];
      const plo = plos.find((p) => p.id === ploId);
      if (!plo) {
        return;
      }

      // Check for duplicates
      const exists = (plo.standardMappings ?? []).some(
        (m) =>
          m.criteria === criteria &&
          m.thread === thread &&
          (m.standardId ?? (programme.awardStandardIds ?? [])[0]) === standardId,
      );

      if (exists) {
        alert("This mapping already exists for this PLO and standard.");
        return;
      }

      plo.standardMappings = [...(plo.standardMappings ?? []), { criteria, thread, standardId }];
      updateProgramme({ plos });
      saveDebounced(updateFlagsAndHeader);
    },
    [
      programme.plos,
      programme.awardStandardIds,
      updateProgramme,
      saveDebounced,
      updateFlagsAndHeader,
    ],
  );

  const handleRemoveMapping = useCallback(
    (ploId: string, mappingIndex: number) => {
      const plos = [...(programme.plos ?? [])];
      const plo = plos.find((p) => p.id === ploId);
      if (!plo) {
        return;
      }
      plo.standardMappings = (plo.standardMappings ?? []).filter((_, i) => i !== mappingIndex);
      updateProgramme({ plos });
      saveDebounced(updateFlagsAndHeader);
    },
    [programme.plos, updateProgramme, saveDebounced, updateFlagsAndHeader],
  );

  const plos = (programme.plos ?? []) as PLO[];
  const standardIds = programme.awardStandardIds ?? [];
  const standardNames = programme.awardStandardNames ?? [];

  return (
    <SectionCard
      title="Programme Learning Outcomes (PLOs) (QQI-critical)"
      icon="list-checks"
      headingId="plos-heading"
      actions={
        <Button
          variant="dark"
          size="sm"
          onClick={handleAddPLO}
          aria-label="Add new PLO"
          data-testid="add-plo-btn"
        >
          <Icon name="plus" aria-hidden /> Add PLO
        </Button>
      }
    >
      <BloomsGuidance nfqLevel={programme.nfqLevel} contextLabel="Programme Learning Outcomes" />

      <div className="small text-muted mb-3" role="note">
        <Icon name="lightbulb" className="me-1" aria-hidden />
        Aim for ~6–12 clear, assessable outcomes. Keep them measurable and assessable.
      </div>

      <div id="ploAccordion" aria-labelledby="plos-heading" data-testid="plo-accordion">
        {plos.length === 0 ? (
          <Alert variant="info">
            <Icon name="info" className="me-2" aria-hidden />
            No PLOs added yet.
          </Alert>
        ) : (
          <Accordion id="ploAccordion" defaultExpandedKeys={plos.length > 0 ? [plos[0].id] : []}>
            <AccordionControls accordionId="ploAccordion" />
            {plos.map((plo, idx) => (
              <PLOItem
                key={plo.id}
                plo={plo}
                index={idx}
                onTextChange={(text) => handleTextChange(plo.id, text)}
                onRemove={() => handleRemovePLO(plo.id)}
                onAddMapping={(c, t, s) => handleAddMapping(plo.id, c, t, s)}
                onRemoveMapping={(i) => handleRemoveMapping(plo.id, i)}
                standardIds={standardIds}
                standardNames={standardNames}
                nfqLevel={programme.nfqLevel}
              />
            ))}
          </Accordion>
        )}
      </div>

      <hr className="my-4" />

      <h6 className="mb-2" id="plo-snapshot-heading">
        <Icon name="graph" className="me-2" aria-hidden />
        PLO ↔ Award Standard Mapping Snapshot
      </h6>
      <div
        id="ploMappingSnapshot"
        className="small"
        aria-labelledby="plo-snapshot-heading"
        data-testid="plo-mapping-snapshot"
      >
        <MappingSnapshot
          plos={plos}
          standardIds={standardIds}
          standardNames={standardNames}
          nfqLevel={programme.nfqLevel}
        />
      </div>
    </SectionCard>
  );
};

export default OutcomesStep;
