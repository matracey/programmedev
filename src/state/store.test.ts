import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  activeSteps,
  AWARD_TYPE_OPTIONS,
  defaultProgramme,
  defaultStage,
  defaultVersion,
  editableModuleIds,
  getSelectedModuleId,
  getVersionById,
  load,
  resetProgramme,
  saveDebounced,
  saveNow,
  SCHOOL_OPTIONS,
  setMode,
  state,
  steps,
} from "./store";

const STORAGE_KEY = "nci_pds_mvp_programme_v1";

beforeEach(() => {
  localStorage.clear();
  state.programme = defaultProgramme();
  state.stepIndex = 0;
  state.saving = false;
  state.lastSaved = null;
  state.selectedVersionId = null;
  state.selectedModuleId = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("steps", () => {
  it("has expected number of entries", () => {
    expect(steps.length).toBe(14);
  });

  it("starts with identity and ends with snapshot", () => {
    expect(steps[0].key).toBe("identity");
    expect(steps[steps.length - 1].key).toBe("snapshot");
  });

  it("contains all required steps", () => {
    const keys = steps.map((s) => s.key);
    expect(keys).toContain("outcomes");
    expect(keys).toContain("versions");
    expect(keys).toContain("stages");
    expect(keys).toContain("structure");
    expect(keys).toContain("electives");
    expect(keys).toContain("mimlos");
    expect(keys).toContain("assessments");
    expect(keys).toContain("mapping");
  });
});

describe("SCHOOL_OPTIONS", () => {
  it("contains expected schools", () => {
    expect(SCHOOL_OPTIONS).toContain("Computing");
    expect(SCHOOL_OPTIONS).toContain("Business");
    expect(SCHOOL_OPTIONS.length).toBe(4);
  });
});

describe("AWARD_TYPE_OPTIONS", () => {
  it("contains expected award types", () => {
    expect(AWARD_TYPE_OPTIONS).toContain("Higher Diploma");
    expect(AWARD_TYPE_OPTIONS).toContain("Masters");
    expect(AWARD_TYPE_OPTIONS).toContain("Other");
    expect(AWARD_TYPE_OPTIONS.length).toBe(8);
  });
});

describe("defaultProgramme", () => {
  it("returns a valid programme structure", () => {
    const p = defaultProgramme();
    expect(p.schemaVersion).toBe(3);
    expect(p.id).toBe("current");
    expect(p.title).toBe("");
    expect(p.awardType).toBe("");
    expect(p.nfqLevel).toBeNull();
    expect(p.school).toBe("");
    expect(p.totalCredits).toBe(0);
  });

  it("initializes arrays as empty", () => {
    const p = defaultProgramme();
    expect(p.modules).toEqual([]);
    expect(p.plos).toEqual([]);
    expect(p.versions).toEqual([]);
    expect(p.electiveDefinitions).toEqual([]);
    expect(p.awardStandardIds).toEqual([]);
    expect(p.awardStandardNames).toEqual([]);
  });

  it("returns a new object each time", () => {
    const p1 = defaultProgramme();
    const p2 = defaultProgramme();
    expect(p1).not.toBe(p2);
    expect(p1).toEqual(p2);
  });
});

describe("defaultVersion", () => {
  it("returns a valid version object", () => {
    const v = defaultVersion();
    expect(v.id).toMatch(/^ver_/);
    expect(v.label).toBe("Full-time");
    expect(v.code).toBe("FT");
    expect(v.deliveryModality).toBe("F2F");
    expect(v.stages).toEqual([]);
    expect(v.intakes).toEqual([]);
  });

  it("generates unique ids on each call", () => {
    const v1 = defaultVersion();
    const v2 = defaultVersion();
    expect(v1.id).not.toBe(v2.id);
  });
});

describe("defaultStage", () => {
  it("creates with default sequence of 1", () => {
    const s = defaultStage();
    expect(s.id).toMatch(/^stage_/);
    expect(s.name).toBe("Stage 1");
    expect(s.sequence).toBe(1);
    expect(s.creditsTarget).toBe(0);
    expect(s.exitAward).toEqual({ enabled: false, awardTitle: "" });
    expect(s.modules).toEqual([]);
  });

  it("creates with specified sequence number", () => {
    const s = defaultStage(3);
    expect(s.name).toBe("Stage 3");
    expect(s.sequence).toBe(3);
  });

  it("generates unique ids", () => {
    const s1 = defaultStage(1);
    const s2 = defaultStage(2);
    expect(s1.id).not.toBe(s2.id);
  });
});

describe("activeSteps", () => {
  it("returns all steps in PROGRAMME_OWNER mode", () => {
    state.programme.mode = "PROGRAMME_OWNER";
    const result = activeSteps();
    expect(result.length).toBe(steps.length);
  });

  it("returns all steps when mode is not set", () => {
    const result = activeSteps();
    expect(result.length).toBe(steps.length);
  });

  it("returns limited steps in MODULE_EDITOR mode", () => {
    state.programme.mode = "MODULE_EDITOR";
    const result = activeSteps();
    const keys = result.map((s) => s.key);
    expect(keys).toContain("mimlos");
    expect(keys).toContain("effort-hours");
    expect(keys).toContain("assessments");
    expect(keys).toContain("reading-lists");
    expect(keys).toContain("schedule");
    expect(keys).toContain("mapping");
    expect(keys).toContain("traceability");
    expect(keys).toContain("snapshot");
    expect(keys).not.toContain("identity");
    expect(keys).not.toContain("versions");
    expect(result.length).toBe(8);
  });
});

describe("editableModuleIds", () => {
  it("returns all module ids normally", () => {
    state.programme.modules = [
      { id: "mod_1", title: "M1", code: "C1", credits: 5 },
      { id: "mod_2", title: "M2", code: "C2", credits: 10 },
    ];
    const ids = editableModuleIds();
    expect(ids).toEqual(["mod_1", "mod_2"]);
  });

  it("returns empty array when no modules", () => {
    state.programme.modules = [];
    expect(editableModuleIds()).toEqual([]);
  });

  it("returns assigned ids in MODULE_EDITOR mode", () => {
    state.programme.modules = [
      { id: "mod_1", title: "M1", code: "C1", credits: 5 },
      { id: "mod_2", title: "M2", code: "C2", credits: 10 },
    ];
    state.programme.mode = "MODULE_EDITOR";
    state.programme.moduleEditor = { assignedModuleIds: ["mod_1"] };
    const ids = editableModuleIds();
    expect(ids).toEqual(["mod_1"]);
  });

  it("falls back to all modules in MODULE_EDITOR mode when no assigned ids", () => {
    state.programme.modules = [
      { id: "mod_1", title: "M1", code: "C1", credits: 5 },
      { id: "mod_2", title: "M2", code: "C2", credits: 10 },
    ];
    state.programme.mode = "MODULE_EDITOR";
    state.programme.moduleEditor = { assignedModuleIds: [] };
    const ids = editableModuleIds();
    expect(ids).toEqual(["mod_1", "mod_2"]);
  });
});

describe("getSelectedModuleId", () => {
  it("returns empty string when no modules", () => {
    state.programme.modules = [];
    expect(getSelectedModuleId()).toBe("");
  });

  it("auto-selects first module when none selected", () => {
    state.programme.modules = [
      { id: "mod_a", title: "A", code: "A", credits: 5 },
      { id: "mod_b", title: "B", code: "B", credits: 5 },
    ];
    state.selectedModuleId = null;
    expect(getSelectedModuleId()).toBe("mod_a");
    expect(state.selectedModuleId).toBe("mod_a");
  });

  it("returns current selection when valid", () => {
    state.programme.modules = [
      { id: "mod_a", title: "A", code: "A", credits: 5 },
      { id: "mod_b", title: "B", code: "B", credits: 5 },
    ];
    state.selectedModuleId = "mod_b";
    expect(getSelectedModuleId()).toBe("mod_b");
  });

  it("resets to first module when selection is invalid", () => {
    state.programme.modules = [{ id: "mod_a", title: "A", code: "A", credits: 5 }];
    state.selectedModuleId = "mod_nonexistent";
    expect(getSelectedModuleId()).toBe("mod_a");
  });
});

describe("getVersionById", () => {
  it("finds version by id", () => {
    const ver: ProgrammeVersion = { id: "ver_1", label: "FT", code: "FT" };
    state.programme.versions = [ver];
    expect(getVersionById("ver_1")).toBe(ver);
  });

  it("returns undefined for unknown id", () => {
    state.programme.versions = [{ id: "ver_1", label: "FT", code: "FT" }];
    expect(getVersionById("ver_999")).toBeUndefined();
  });

  it("returns undefined when versions is empty", () => {
    state.programme.versions = [];
    expect(getVersionById("ver_1")).toBeUndefined();
  });
});

describe("load", () => {
  it("loads programme from localStorage", () => {
    const prog = {
      ...defaultProgramme(),
      schemaVersion: 4,
      title: "Test Programme",
      versions: [{ id: "ver_1", label: "FT", code: "FT", stages: [] }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
    load();
    expect(state.programme.title).toBe("Test Programme");
  });

  it("does nothing when localStorage is empty", () => {
    const before = { ...state.programme };
    load();
    expect(state.programme.title).toBe(before.title);
  });

  it("creates default version when no versions exist", () => {
    const prog = { ...defaultProgramme(), schemaVersion: 4, title: "No Versions" };
    delete (prog as any).versions;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
    load();
    expect(state.programme.versions!.length).toBeGreaterThanOrEqual(1);
    expect(state.selectedVersionId).toBe(state.programme.versions![0].id);
  });

  it("sets selectedVersionId to first version", () => {
    const prog = {
      ...defaultProgramme(),
      schemaVersion: 4,
      versions: [
        { id: "ver_x", label: "FT", code: "FT", stages: [] },
        { id: "ver_y", label: "PT", code: "PT", stages: [] },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
    load();
    expect(state.selectedVersionId).toBe("ver_x");
  });

  it("sets lastSaved from updatedAt", () => {
    const ts = "2024-01-01T00:00:00.000Z";
    const prog = {
      ...defaultProgramme(),
      schemaVersion: 4,
      updatedAt: ts,
      versions: [{ id: "ver_1", label: "FT", code: "FT", stages: [] }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
    load();
    expect(state.lastSaved).toBe(ts);
  });

  it("handles invalid JSON gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    load();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("saveNow", () => {
  it("saves to localStorage", () => {
    state.programme.title = "Saved Programme";
    saveNow();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.title).toBe("Saved Programme");
  });

  it("updates updatedAt timestamp", () => {
    saveNow();
    expect(state.programme.updatedAt).toBeTruthy();
    expect(state.lastSaved).toBe(state.programme.updatedAt);
  });

  it("sets saving flag during save", () => {
    // After save completes, saving should be false
    saveNow();
    expect(state.saving).toBe(false);
  });

  it("resets saving flag even on error", () => {
    const _origSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    try {
      saveNow();
    } catch {
      // expected
    }
    expect(state.saving).toBe(false);
    vi.restoreAllMocks();
  });
});

describe("saveDebounced", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves after 400ms delay", () => {
    state.programme.title = "Debounced";
    saveDebounced();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    vi.advanceTimersByTime(400);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.title).toBe("Debounced");
  });

  it("debounces multiple rapid calls", () => {
    saveDebounced();
    saveDebounced();
    saveDebounced();
    state.programme.title = "Final";
    saveDebounced();
    vi.advanceTimersByTime(400);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.title).toBe("Final");
  });

  it("invokes onSaved callback after save", () => {
    const callback = vi.fn();
    saveDebounced(callback);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("does not invoke callback before timer fires", () => {
    const callback = vi.fn();
    saveDebounced(callback);
    vi.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("resetProgramme", () => {
  it("resets to default programme", () => {
    state.programme.title = "Modified";
    state.stepIndex = 5;
    state.selectedVersionId = "ver_1";
    state.selectedModuleId = "mod_1";
    localStorage.setItem(STORAGE_KEY, "something");

    resetProgramme();

    expect(state.programme.title).toBe("");
    expect(state.stepIndex).toBe(0);
    expect(state.selectedVersionId).toBeNull();
    expect(state.selectedModuleId).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("setMode", () => {
  it("switches to PROGRAMME_OWNER mode", () => {
    state.programme.mode = "MODULE_EDITOR";
    state.programme.moduleEditor = { assignedModuleIds: ["mod_1"] };
    setMode("PROGRAMME_OWNER");
    expect(state.programme.mode).toBe("PROGRAMME_OWNER");
    expect(state.programme.moduleEditor).toBeUndefined();
  });

  it("switches to MODULE_EDITOR mode", () => {
    state.programme.modules = [{ id: "mod_1", title: "M1", code: "C1", credits: 5 }];
    setMode("MODULE_EDITOR", ["mod_1"]);
    expect(state.programme.mode).toBe("MODULE_EDITOR");
    expect(state.programme.moduleEditor?.assignedModuleIds).toEqual(["mod_1"]);
  });

  it("uses all modules when no assigned ids provided in MODULE_EDITOR mode", () => {
    state.programme.modules = [
      { id: "mod_1", title: "M1", code: "C1", credits: 5 },
      { id: "mod_2", title: "M2", code: "C2", credits: 10 },
    ];
    setMode("MODULE_EDITOR");
    expect(state.programme.moduleEditor?.assignedModuleIds).toEqual(["mod_1", "mod_2"]);
  });

  it("rejects invalid mode", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    setMode("INVALID");
    expect(spy).toHaveBeenCalledWith("Invalid mode. Use PROGRAMME_OWNER or MODULE_EDITOR");
    spy.mockRestore();
  });

  it("jumps step index to mimlos when current step is not allowed", () => {
    state.stepIndex = 0; // identity - not allowed in MODULE_EDITOR
    state.programme.modules = [];
    setMode("MODULE_EDITOR");
    const mimlosIdx = steps.findIndex((s) => s.key === "mimlos");
    expect(state.stepIndex).toBe(mimlosIdx);
  });

  it("keeps step index when current step is allowed", () => {
    const mimlosIdx = steps.findIndex((s) => s.key === "mimlos");
    state.stepIndex = mimlosIdx;
    state.programme.modules = [];
    setMode("MODULE_EDITOR");
    expect(state.stepIndex).toBe(mimlosIdx);
  });
});
