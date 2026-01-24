/**
 * Application state management
 * Handles state, persistence, and data factories
 */

import { uid } from '../utils/uid.js';
import { defaultPatternFor } from '../utils/helpers.js';

// Storage key for localStorage
const STORAGE_KEY = "nci_pds_mvp_programme_v1";

// Workflow steps definition
export const steps = [
  { key: "identity", title: "Identity" },
  { key: "outcomes", title: "PLOs" },
  { key: "versions", title: "Programme Versions" },
  { key: "stages", title: "Stage Structure" },
  { key: "structure", title: "Credits & Modules" },
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
export const SCHOOL_OPTIONS = ["Computing", "Business", "Psychology", "Education"];

export const AWARD_TYPE_OPTIONS = [
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
 * Factory for empty programme object
 */
export const defaultProgramme = () => ({
  schemaVersion: 2,
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
  ploToModules: {},

  // Versions
  versions: [],

  updatedAt: null,
});

/**
 * Factory for programme version
 */
export const defaultVersion = () => ({
  id: uid("ver"),
  label: "Full-time",
  code: "FT",
  duration: "",
  intakes: [],
  targetCohortSize: 0,
  numberOfGroups: 0,

  deliveryModality: "F2F",
  deliveryPatterns: {},
  deliveryNotes: "",

  onlineProctoredExams: "TBC",
  onlineProctoredExamsNotes: "",

  stages: [],
});

/**
 * Factory for stage
 */
export const defaultStage = (sequence = 1) => ({
  id: uid("stage"),
  name: `Stage ${sequence}`,
  sequence,
  creditsTarget: 0,
  exitAward: { enabled: false, awardTitle: "" },
  modules: [],
});

/**
 * Application state
 */
export const state = {
  programme: defaultProgramme(),
  stepIndex: 0,
  saving: false,
  lastSaved: null,
  selectedVersionId: null,
  selectedModuleId: null,
};

/**
 * Get active steps based on mode
 */
export function activeSteps() {
  const p = state.programme;
  if (p.mode === "MODULE_EDITOR") {
    const allowed = new Set(["mimlos", "effort-hours", "assessments", "reading-lists", "schedule", "mapping", "traceability", "snapshot"]);
    return steps.filter(s => allowed.has(s.key));
  }
  return steps;
}

/**
 * Get editable module IDs based on mode
 */
export function editableModuleIds() {
  const p = state.programme;
  if (!p) return [];
  if (p.mode === "MODULE_EDITOR") {
    const ids = p.moduleEditor?.assignedModuleIds || [];
    return ids.length ? ids : (p.modules || []).map(m => m.id);
  }
  return (p.modules || []).map(m => m.id);
}

/**
 * Get selected module ID (for module picker)
 */
export function getSelectedModuleId() {
  const ids = editableModuleIds();
  if (!ids.length) return "";
  if (!state.selectedModuleId || !ids.includes(state.selectedModuleId)) {
    state.selectedModuleId = ids[0];
  }
  return state.selectedModuleId;
}

/**
 * Get version by ID
 */
export function getVersionById(id) {
  return (state.programme.versions || []).find(v => v.id === id);
}

/**
 * Load state from localStorage
 */
export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    
    const parsed = JSON.parse(raw);
    state.programme = { ...defaultProgramme(), ...parsed };

    // Migration: convert old single standard to array format
    if (typeof state.programme.awardStandardId === 'string') {
      const oldId = state.programme.awardStandardId || '';
      const oldName = state.programme.awardStandardName || '';
      state.programme.awardStandardIds = oldId ? [oldId] : [];
      state.programme.awardStandardNames = oldName ? [oldName] : [];
      delete state.programme.awardStandardId;
      delete state.programme.awardStandardName;
    }
    // Ensure arrays exist
    if (!Array.isArray(state.programme.awardStandardIds)) {
      state.programme.awardStandardIds = [];
    }
    if (!Array.isArray(state.programme.awardStandardNames)) {
      state.programme.awardStandardNames = [];
    }

    // Migration to schemaVersion 2
    if (!Array.isArray(state.programme.versions)) {
      state.programme.versions = [];
    }

    // Create default version if needed
    if (state.programme.versions.length === 0) {
      const v = defaultVersion();
      // Migrate legacy fields if they exist
      // Migrate old deliveryMode/deliveryModalities to new deliveryModality
      const legacyModality = Array.isArray(state.programme.deliveryModalities)
        ? state.programme.deliveryModalities[0]
        : (state.programme.deliveryMode || state.programme.deliveryModality || "F2F");

      v.deliveryModality = legacyModality;
      if (state.programme.deliveryPatterns) {
        v.deliveryPatterns = state.programme.deliveryPatterns;
      }
      if (v.deliveryModality && !v.deliveryPatterns[v.deliveryModality]) {
        v.deliveryPatterns[v.deliveryModality] = defaultPatternFor(v.deliveryModality);
      }
      state.programme.versions.push(v);
    }

    // Clean up legacy fields
    delete state.programme.deliveryMode;
    delete state.programme.syncPattern;
    delete state.programme.deliveryModalities;

    if (!state.selectedVersionId && state.programme.versions.length) {
      state.selectedVersionId = state.programme.versions[0].id;
    }
    
    state.lastSaved = state.programme.updatedAt || null;
  } catch (e) {
    console.warn("Failed to load", e);
  }
}

/**
 * Save state immediately
 */
export function saveNow() {
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

let saveTimer = null;

/**
 * Debounced save (400ms)
 */
export function saveDebounced(onSaved) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveNow();
    if (onSaved) onSaved();
  }, 400);
}

/**
 * Reset to empty programme
 */
export function resetProgramme() {
  state.programme = defaultProgramme();
  state.stepIndex = 0;
  state.selectedVersionId = null;
  state.selectedModuleId = null;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Set mode (PROGRAMME_OWNER or MODULE_EDITOR)
 */
export function setMode(mode, assignedModuleIds = []) {
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
    const defaultAssigned = (p.modules || []).map(m => m.id);
    p.moduleEditor = p.moduleEditor || {};
    p.moduleEditor.assignedModuleIds = assignedModuleIds.length ? assignedModuleIds : defaultAssigned;
    p.moduleEditor.locks = p.moduleEditor.locks || { programme: true, modulesMeta: true, versions: true, plos: true };

    // Jump to appropriate step if needed
    const currentKey = steps[state.stepIndex]?.key;
    const allowed = new Set(["mimlos", "mapping", "snapshot", "assessments"]);
    if (!allowed.has(currentKey)) {
      const idx = steps.findIndex(s => s.key === "mimlos");
      if (idx >= 0) state.stepIndex = idx;
    }
  } else {
    delete p.moduleEditor;
  }
}

// Cache for award standards
let _standardsPromise = null;

async function loadStandardsFile() {
  if (_standardsPromise) return _standardsPromise;
  _standardsPromise = (async () => {
    const res = await fetch("./assets/standards.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load standards.json");
    const data = await res.json();
    return Array.isArray(data?.standards) ? data.standards : [data];
  })();
  return _standardsPromise;
}

/**
 * Get all award standards (array)
 */
export async function getAwardStandards() {
  return await loadStandardsFile();
}

/**
 * Get a single award standard by ID (defaults to first)
 */
export async function getAwardStandard(standardId) {
  const list = await loadStandardsFile();
  if (!standardId) return list[0] || null;
  return list.find(s => s && s.standard_id === standardId) || list[0] || null;
}
