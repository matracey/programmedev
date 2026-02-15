/**
 * React version of the QQI Snapshot step component.
 * Displays a read-only summary of the programme for QQI submission with export options.
 * @module components/steps/react/SnapshotStep
 */

import React, { useCallback, useMemo, useState } from "react";
import { Button, ButtonGroup, Table } from "react-bootstrap";

import { Accordion, AccordionControls, AccordionItem, Alert, Icon, SectionCard } from "../../ui";
import { useProgramme } from "../../../hooks/useStore";
import { state } from "../../../state/store";
import { completionPercent } from "../../../utils/validation";
import { exportProgrammeToWord } from "../../../export/word";

// ============================================================================
// Types
// ============================================================================

interface ModuleLabel {
  id: string;
  label: string;
  full: string;
  credits: number;
}

interface DeliveryPattern {
  syncOnlinePct?: number;
  asyncDirectedPct?: number;
  onCampusPct?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Returns the default delivery pattern percentages for a modality.
 */
function defaultPatternFor(mod: string): DeliveryPattern {
  if (mod === "F2F") {
    return { syncOnlinePct: 0, asyncDirectedPct: 0, onCampusPct: 100 };
  }
  if (mod === "ONLINE") {
    return { syncOnlinePct: 60, asyncDirectedPct: 40, onCampusPct: 0 };
  }
  return { syncOnlinePct: 30, asyncDirectedPct: 20, onCampusPct: 50 }; // BLENDED
}

/**
 * Calculates total credits for modules assigned to a stage.
 */
function sumStageCredits(allModules: Module[], stageModules: Array<{ moduleId: string }>): number {
  const moduleIds = (stageModules ?? []).map((x) => x.moduleId);
  return allModules
    .filter((m) => moduleIds.includes(m.id))
    .reduce((sum, m) => sum + Number(m.credits ?? 0), 0);
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Programme summary section displaying identity fields.
 */
const ProgrammeSummary: React.FC<{ programme: Programme }> = ({ programme }) => {
  const modules = programme.modules ?? [];

  return (
    <div className="p-3 bg-light border rounded-4">
      <div className="fw-semibold mb-2">Programme summary</div>
      <div className="small">
        <span className="fw-semibold">Title:</span> {programme.title || "—"}
      </div>
      <div className="small">
        <span className="fw-semibold">Award:</span> {programme.awardType || "—"}
      </div>
      <div className="small">
        <span className="fw-semibold">NFQ level:</span> {programme.nfqLevel ?? "—"}
      </div>
      <div className="small">
        <span className="fw-semibold">School:</span> {programme.school || "—"}
      </div>

      <div className="mt-3">
        <div className="fw-semibold mb-2">Modules</div>
        {modules.length > 0 ? (
          <ul className="small mb-0 ps-3">
            {modules.map((m) => (
              <li key={m.id}>
                {m.code ? `${m.code} — ` : ""}
                {m.title} ({Number(m.credits ?? 0)} cr)
              </li>
            ))}
          </ul>
        ) : (
          <div className="small text-secondary">—</div>
        )}
      </div>
    </div>
  );
};

/**
 * PLOs summary section.
 */
const PLOsSummary: React.FC<{ programme: Programme }> = ({ programme }) => {
  const plos = programme.plos ?? [];

  return (
    <div className="p-3 bg-light border rounded-4">
      <div className="fw-semibold mb-2">Programme Learning Outcomes (PLOs)</div>
      {plos.length > 0 ? (
        <ol className="small mb-0 ps-3">
          {plos.map((o, i) => (
            <li key={o.id || i}>{o.text || "—"}</li>
          ))}
        </ol>
      ) : (
        <div className="small text-secondary">—</div>
      )}
    </div>
  );
};

/**
 * Version accordion item displaying delivery and stage information.
 */
const VersionItem: React.FC<{
  version: ProgrammeVersion;
  index: number;
  allModules: Module[];
}> = ({ version, index, allModules }) => {
  const mods: string[] = Array.isArray((version as any).deliveryModalities)
    ? (version as any).deliveryModalities
    : (version as any).deliveryModality
      ? [(version as any).deliveryModality]
      : [];
  const patterns = (version as any).deliveryPatterns ?? {};

  const stages = ((version as any).stages ?? [])
    .slice()
    .sort((a: any, b: any) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0));

  const summary = `${version.label ?? version.code ?? "Version"} • ${(version as any).duration ?? "—"} • Intakes: ${((version as any).intakes ?? []).join(", ") || "—"}`;

  return (
    <AccordionItem
      eventKey={version.id}
      title={`Version ${index + 1}`}
      subtitle={summary}
      data-testid={`snapshot-version-${version.id}`}
    >
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <div className="small">
            <span className="fw-semibold">Cohort:</span>{" "}
            {Number((version as any).targetCohortSize ?? 0) || "—"} •{" "}
            <span className="fw-semibold">Groups:</span>{" "}
            {Number((version as any).numberOfGroups ?? 0) || "—"}
          </div>
        </div>
        <div className="small">
          <span className="fw-semibold">Online proctored exams:</span>{" "}
          {(version as any).onlineProctoredExams ?? "TBC"}
        </div>
      </div>

      <div className="mt-2">
        <div className="fw-semibold small mb-1">Delivery patterns</div>
        {mods.length > 0 ? (
          mods.map((mod) => {
            const pat: DeliveryPattern = patterns[mod] ?? defaultPatternFor(mod);
            return (
              <div key={mod} className="small">
                <span className="fw-semibold">{mod}</span>: {Number(pat.syncOnlinePct ?? 0)}% sync
                online, {Number(pat.asyncDirectedPct ?? 0)}% async directed,{" "}
                {Number(pat.onCampusPct ?? 0)}% on-campus
              </div>
            );
          })
        ) : (
          <div className="small text-secondary">—</div>
        )}
      </div>

      <div className="mt-3">
        <div className="fw-semibold small mb-1">Stage structure</div>
        {stages.length > 0 ? (
          <ul className="mb-0 ps-3">
            {stages.map((s: any) => {
              const stageMods = (s.modules ?? []).map((x: any) => x.moduleId);
              const modNames = allModules
                .filter((m) => stageMods.includes(m.id))
                .map((m) => (m.code && m.code.trim() ? m.code.trim() : m.title))
                .join(", ");
              const creditsSum = sumStageCredits(allModules, s.modules ?? []);
              const exitTxt =
                s.exitAward && s.exitAward.enabled
                  ? ` • Exit award: ${s.exitAward.awardTitle ?? ""}`
                  : "";
              return (
                <li key={s.id || s.name} className="small">
                  <span className="fw-semibold">{s.name ?? "Stage"}</span> — target{" "}
                  {Number(s.creditsTarget ?? 0)}cr (assigned {creditsSum}cr){exitTxt}
                  <br />
                  <span className="text-secondary">{modNames || "No modules assigned"}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="small text-secondary">—</div>
        )}
      </div>

      {(version as any).onlineProctoredExams === "YES" &&
        ((version as any).onlineProctoredExamsNotes ?? "").trim() && (
          <div className="mt-2 small">
            <span className="fw-semibold">Proctoring notes:</span>{" "}
            {(version as any).onlineProctoredExamsNotes}
          </div>
        )}

      {((version as any).deliveryNotes ?? "").trim() && (
        <div className="mt-2 small">
          <span className="fw-semibold">Delivery notes:</span> {(version as any).deliveryNotes}
        </div>
      )}
    </AccordionItem>
  );
};

/**
 * Programme versions accordion section.
 */
const VersionsSection: React.FC<{
  versions: ProgrammeVersion[];
  allModules: Module[];
}> = ({ versions, allModules }) => {
  if (versions.length === 0) {
    return (
      <Alert variant="warning" data-testid="snapshot-no-versions">
        <Icon name="warning" className="me-2" />
        No versions added yet.
      </Alert>
    );
  }

  return (
    <>
      <Accordion
        id="snapshotVersionsAccordion"
        defaultExpandedKeys={versions.length > 0 ? [versions[0].id] : []}
      >
        <AccordionControls accordionId="snapshotVersionsAccordion" />
        {versions.map((v, idx) => (
          <VersionItem key={v.id} version={v} index={idx} allModules={allModules} />
        ))}
      </Accordion>
    </>
  );
};

/**
 * PLO ↔ Module mapping matrix table.
 */
const MappingMatrix: React.FC<{ programme: Programme }> = ({ programme }) => {
  const plos = programme.plos ?? [];
  const modules = programme.modules ?? [];

  // Build module labels
  const moduleLabels: ModuleLabel[] = useMemo(
    () =>
      modules.map((m, i) => {
        const label = m.code && m.code.trim() ? m.code.trim() : `M${i + 1}`;
        const full = m.code && m.code.trim() ? `${m.code.trim()} — ${m.title}` : m.title;
        return { id: m.id, label, full, credits: Number(m.credits ?? 0) };
      }),
    [modules],
  );

  // Build module ID to MIMLO IDs map
  const moduleToMimloIds: Map<string, string[]> = useMemo(() => {
    const map = new Map<string, string[]>();
    modules.forEach((m) => {
      map.set(
        m.id,
        (m.mimlos ?? []).map((mi) => mi.id),
      );
    });
    return map;
  }, [modules]);

  if (plos.length === 0 || modules.length === 0) {
    return (
      <div className="mt-4">
        <div className="fw-semibold mb-2">PLO ↔ Module Mapping Matrix</div>
        <div className="text-secondary small">
          Add PLOs and modules to generate a mapping matrix.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4" data-testid="snapshot-mapping-matrix">
      <div className="fw-semibold mb-2">PLO ↔ Module Mapping Matrix</div>
      <div className="table-responsive">
        <Table size="sm" bordered className="align-middle mb-0">
          <thead>
            <tr>
              <th style={{ minWidth: 260 }}>PLO</th>
              {moduleLabels.map((m) => (
                <th key={m.id} className="text-center" title={m.full}>
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plos.map((o, i) => {
              const mappedMimloIds = (programme as any).ploToMimlos?.[o.id] ?? [];
              return (
                <tr key={o.id}>
                  <th className="small" style={{ minWidth: 260 }} title={o.text || ""}>
                    PLO {i + 1}
                  </th>
                  {moduleLabels.map((m) => {
                    const moduleMimloIds = moduleToMimloIds.get(m.id) ?? [];
                    const hasMapping = moduleMimloIds.some((mimloId) =>
                      mappedMimloIds.includes(mimloId),
                    );
                    return (
                      <td key={m.id} className="text-center">
                        {hasMapping ? "✓" : ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

/**
 * Export actions button group with Word export, JSON copy, and JSON download.
 */
const ExportActionsGroup: React.FC<{ isComplete: boolean }> = ({ isComplete }) => {
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  const handleExportWord = useCallback(async () => {
    try {
      await exportProgrammeToWord(state.programme);
    } catch (err) {
      console.error("Word export error:", err);
      alert((err as Error)?.message || String(err));
    }
  }, []);

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state.programme, null, 2));
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 1500);
    }
  }, []);

  const handleDownloadJson = useCallback(() => {
    const filename =
      (state.programme.title ?? "programme").replace(/[^a-z0-9]/gi, "_") + "-design.json";
    const blob = new Blob([JSON.stringify(state.programme, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <ButtonGroup>
      <Button
        variant="outline-success"
        size="sm"
        onClick={handleExportWord}
        disabled={!isComplete}
        aria-label="Export programme descriptor as Word document"
        data-testid="snapshot-export-word"
      >
        <Icon name="file-doc" className="me-1" />
        Export Programme Descriptor (Word)
      </Button>
      <Button
        variant={copyStatus === "success" ? "success" : "outline-secondary"}
        size="sm"
        onClick={handleCopyJson}
        aria-label="Copy programme JSON to clipboard"
        data-testid="snapshot-copy-json"
      >
        <Icon name="copy" className="me-1" />
        {copyStatus === "success" ? "Copied!" : "Copy JSON"}
      </Button>
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={handleDownloadJson}
        aria-label="Download programme JSON file"
        data-testid="snapshot-download-json"
      >
        <Icon name="download-simple" className="me-1" />
        Download JSON
      </Button>
    </ButtonGroup>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Snapshot step component for React.
 * Displays a comprehensive QQI-compatible programme summary with export options.
 */
export const SnapshotStep: React.FC = () => {
  const { programme } = useProgramme();

  const versions: ProgrammeVersion[] = Array.isArray(programme.versions) ? programme.versions : [];
  const modules: Module[] = programme.modules ?? [];

  // Calculate completion
  const isComplete = useMemo(() => completionPercent(programme) === 100, [programme]);

  return (
    <SectionCard
      title="QQI Snapshot (copy/paste-ready)"
      icon="file-doc"
      headingId="snapshot-heading"
      data-testid="snapshot-card"
      actions={<ExportActionsGroup isComplete={isComplete} />}
    >
      <ProgrammeSummary programme={programme} />

      <div className="mt-3">
        <PLOsSummary programme={programme} />
      </div>

      <div className="mt-3">
        <div className="fw-semibold mb-2">Programme versions</div>
        <VersionsSection versions={versions} allModules={modules} />
      </div>

      <MappingMatrix programme={programme} />
    </SectionCard>
  );
};

export default SnapshotStep;
