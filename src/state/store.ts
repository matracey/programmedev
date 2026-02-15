/**
 * Application state management.
 * Handles global state, localStorage persistence, and data factory functions.
 * @module state/store
 */

import { defaultPatternFor } from "../utils/helpers";
import { migrateProgramme } from "../utils/migrate-programme";
import { uid } from "../utils/uid";

// Storage key for localStorage
const STORAGE_KEY = "nci_pds_mvp_programme_v1";

// Workflow steps definition
export const steps: readonly { key: string; title: string }[] = [
  { key: "identity", title: "Identity" },
  { key: "outcomes", title: "PLOs" },
  { key: "versions", title: "Programme Versions" },
  { key: "stages", title: "Stage Structure" },
  { key: "structure", title: "Credits & Modules" },
  { key: "electives", title: "Electives" },
  { key: "mimlos", title: "MIMLOs" },
  { key: "effort-hours", title: "Effort Hours" },
  { key: "assessments", title: "Assessments" },
  { key: "reading-lists", title: "Reading Lists" },
  { key: "schedule", title: "Programme Schedule" },
  { key: "mapping", title: "Mapping" },
  { key: "traceability", title: "Traceability" },
  { key: "snapshot", title: "QQI Snapshot" },
];

// Options
export const SCHOOL_OPTIONS: readonly string[] = [
  "Computing",
  "Business",
  "Psychology",
  "Education",
];

export const AWARD_TYPE_OPTIONS: readonly string[] = [
  "Higher Certificate",
  "Ordinary Bachelor Degree",
  "Honours Bachelor Degree",
  "Higher Diploma",
  "Postgraduate Diploma",
  "Masters",
  "Micro-credential",
  "Other",
];

/**
 * Creates an empty programme object with default values.
 */
export const defaultProgramme = (): Programme => ({
  schemaVersion: 3,
  id: "current",

  // Identity
  title: "",
  awardType: "",
  awardTypeIsOther: false,
  nfqLevel: null,
  school: "",
  awardStandardIds: [],
  awardStandardNames: [],

  // Programme-level structure
  totalCredits: 0,
  modules: [],
  plos: [],
  ploToMimlos: {},

  // Elective definitions
  electiveDefinitions: [],

  // Versions
  versions: [],

  updatedAt: null,
});

/**
 * Creates a new programme version with default values.
 */
export const defaultVersion = (): any => ({
  id: uid("ver"),
  label: "Full-time",
  code: "FT",
  duration: "",
  intakes: [],
  targetCohortSize: 0,
  numberOfGroups: 0,

  deliveryModality: "F2F",
  deliveryPatterns: {} as Record<string, any>,
  deliveryNotes: "",

  onlineProctoredExams: "TBC",
  onlineProctoredExamsNotes: "",

  stages: [],
});

/**
 * Creates a new stage object with default values.
 */
export const defaultStage = (sequence: number = 1): any => ({
  id: uid("stage"),
  name: `Stage ${sequence}`,
  sequence,
  creditsTarget: 0,
  exitAward: { enabled: false, awardTitle: "" },
  modules: [],
});

/**
 * Global application state object.
 * Contains the current programme, navigation state, and UI state.
 */
export const state: {
  programme: Programme;
  stepIndex: number;
  saving: boolean;
  lastSaved: string | null;
  selectedVersionId: string | null;
  selectedModuleId: string | null;
  reportTypeId?: string;
  reportVersionId?: string;
  [key: string]: any;
} = {
  programme: defaultProgramme(),
  stepIndex: 0,
  saving: false,
  lastSaved: null,
  selectedVersionId: null,
  selectedModuleId: null,
};

/**
 * Returns the active workflow steps based on the current programme mode.
 * In MODULE_EDITOR mode, only module-related steps are shown.
 */
export function activeSteps(): Array<{ key: string; title: string }> {
  const p = state.programme;
  if (p.mode === "MODULE_EDITOR") {
    const allowed = new Set([
      "mimlos",
      "effort-hours",
      "assessments",
      "reading-lists",
      "schedule",
      "mapping",
      "traceability",
      "snapshot",
    ]);
    return steps.filter((s) => allowed.has(s.key));
  }
  return [...steps];
}

/**
 * Returns the IDs of modules that can be edited in the current mode.
 * In MODULE_EDITOR mode, returns only assigned modules.
 */
export function editableModuleIds(): string[] {
  const p = state.programme;
  if (!p) {
    return [];
  }
  if (p.mode === "MODULE_EDITOR") {
    const ids = p.moduleEditor?.assignedModuleIds ?? [];
    return ids.length ? ids : (p.modules ?? []).map((m) => m.id);
  }
  return (p.modules ?? []).map((m) => m.id);
}

/**
 * Returns the currently selected module ID for the module picker.
 * Auto-selects the first editable module if none selected or selection is invalid.
 */
export function getSelectedModuleId(): string {
  const ids = editableModuleIds();
  if (!ids.length) {
    return "";
  }
  if (!state.selectedModuleId || !ids.includes(state.selectedModuleId)) {
    state.selectedModuleId = ids[0];
  }
  return state.selectedModuleId;
}

/**
 * Finds a programme version by its ID.
 */
export function getVersionById(id: string): ProgrammeVersion | undefined {
  return (state.programme.versions ?? []).find((v) => v.id === id);
}

/**
 * Loads programme state from localStorage.
 * Applies any necessary migrations and creates a default version if needed.
 */
export function load(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);

    // Run migrations
    const migrated = migrateProgramme(parsed);
    state.programme = { ...defaultProgramme(), ...migrated };

    // Create default version if needed (initialization, not migration)
    if (!state.programme.versions || state.programme.versions.length === 0) {
      state.programme.versions ??= [];
      const v = defaultVersion();
      // Use legacy delivery patterns if they exist
      if (state.programme.deliveryPatterns) {
        v.deliveryPatterns = state.programme.deliveryPatterns;
      }
      if (v.deliveryModality && !v.deliveryPatterns[v.deliveryModality]) {
        v.deliveryPatterns[v.deliveryModality] = defaultPatternFor(v.deliveryModality);
      }
      state.programme.versions.push(v);
    }

    if (!state.selectedVersionId && state.programme.versions && state.programme.versions.length) {
      state.selectedVersionId = state.programme.versions[0].id;
    }

    state.lastSaved = state.programme.updatedAt || null;
  } catch (e) {
    console.warn("Failed to load", e);
  }
}

/**
 * Saves the current programme state to localStorage immediately.
 * Updates the programme's updatedAt timestamp.
 */
export function saveNow(): void {
  try {
    state.saving = true;
    const now = new Date().toISOString();
    state.programme.updatedAt = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.programme));
    state.lastSaved = now;
  } finally {
    state.saving = false;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Saves programme state after a 400ms debounce delay.
 * Useful for input fields to avoid excessive saves during typing.
 */
export function saveDebounced(onSaved?: () => void): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveNow();
    if (onSaved) {
      onSaved();
    }
  }, 400);
}

/**
 * Resets the application to an empty programme state.
 * Clears localStorage and resets navigation to step 0.
 */
export function resetProgramme(): void {
  state.programme = defaultProgramme();
  state.stepIndex = 0;
  state.selectedVersionId = null;
  state.selectedModuleId = null;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Sets the application mode (PROGRAMME_OWNER or MODULE_EDITOR).
 * MODULE_EDITOR mode restricts editing to assigned modules and specific steps.
 */
export function setMode(mode: string, assignedModuleIds: string[] = []): void {
  const p = state.programme;
  if (!p) {
    console.error("Programme not loaded yet.");
    return;
  }

  if (mode !== "PROGRAMME_OWNER" && mode !== "MODULE_EDITOR") {
    console.error("Invalid mode. Use PROGRAMME_OWNER or MODULE_EDITOR");
    return;
  }

  p.mode = mode;

  if (mode === "MODULE_EDITOR") {
    const defaultAssigned = (p.modules ?? []).map((m) => m.id);
    const editor: any = p.moduleEditor ?? {
      assignedModuleIds: [],
      locks: undefined,
    };
    editor.assignedModuleIds = assignedModuleIds.length ? assignedModuleIds : defaultAssigned;
    editor.locks ??= {
      programme: true,
      modulesMeta: true,
      versions: true,
      plos: true,
    };
    p.moduleEditor = editor;

    // Jump to appropriate step if needed
    const currentKey = steps[state.stepIndex]?.key;
    const allowed = new Set(["mimlos", "mapping", "snapshot", "assessments"]);
    if (!allowed.has(currentKey)) {
      const idx = steps.findIndex((s) => s.key === "mimlos");
      if (idx >= 0) {
        state.stepIndex = idx;
      }
    }
  } else {
    delete p.moduleEditor;
  }
}

// Cache for award standards
let _standardsPromise: Promise<any[]> | null = null;

/**
 * Loads and caches the standards.json file.
 */
async function loadStandardsFile(): Promise<any[]> {
  if (_standardsPromise) {
    return _standardsPromise;
  }
  _standardsPromise = (async () => {
    const res = await fetch("./assets/standards.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load standards.json");
    }
    const data = await res.json();
    // New format: { schemaVersion, generatedFrom, awardStandards: [...] }
    return Array.isArray(data?.awardStandards)
      ? data.awardStandards
      : Array.isArray(data?.standards)
        ? data.standards
        : [data];
  })();
  return _standardsPromise;
}

/**
 * Returns all available award standards.
 */
export async function getAwardStandards(): Promise<any[]> {
  return await loadStandardsFile();
}

/**
 * Returns a single award standard by ID.
 */
export async function getAwardStandard(standardId?: string): Promise<any> {
  const list = await loadStandardsFile();
  if (!standardId) {
    return list[0] || null;
  }
  return list.find((s: any) => s && s.id === standardId) || list[0] || null;
}

// Export helper functions from migrate-programme for convenience
export {
  getCriteriaList,
  getDescriptor,
  getStandardIndicators,
  getThreadList,
  migrateProgramme,
  validateStandardMappings,
} from "../utils/migrate-programme";
