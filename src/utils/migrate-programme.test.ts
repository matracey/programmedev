import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  migrateProgramme,
  validateStandardMappings,
  getStandardIndicators,
  getCriteriaList,
  getThreadList,
  getDescriptor,
} from "./migrate-programme";

/** Helper: build a standard object with the hierarchical format used by the app. */
function makeStandard(
  id: string,
  levels: Array<{
    level: number;
    groups: Array<{
      name: string;
      indicators: Array<{ name: string; descriptor: string; descriptorText: string; id: string }>;
    }>;
  }>,
) {
  return {
    id,
    nfqLevels: levels.map((l) => ({
      level: l.level,
      indicatorGroups: l.groups.map((g) => ({
        name: g.name,
        indicators: g.indicators,
      })),
    })),
  };
}

const sampleStandard = makeStandard("computing", [
  {
    level: 8,
    groups: [
      {
        name: "Knowledge",
        indicators: [
          {
            name: "Breadth",
            descriptor: "K-B-8",
            descriptorText: "Knowledge Breadth L8",
            id: "kb8",
          },
          { name: "Kind", descriptor: "K-K-8", descriptorText: "Knowledge Kind L8", id: "kk8" },
        ],
      },
      {
        name: "Know-How & Skill",
        indicators: [
          { name: "Range", descriptor: "S-R-8", descriptorText: "Skill Range L8", id: "sr8" },
          {
            name: "Selectivity",
            descriptor: "S-S-8",
            descriptorText: "Skill Selectivity L8",
            id: "ss8",
          },
        ],
      },
      {
        name: "Competence",
        indicators: [
          {
            name: "Context",
            descriptor: "C-C-8",
            descriptorText: "Competence Context L8",
            id: "cc8",
          },
          { name: "Role", descriptor: "C-R-8", descriptorText: "Competence Role L8", id: "cr8" },
        ],
      },
    ],
  },
]);

// ───────────────────────────── migrateProgramme ─────────────────────────────

describe("migrateProgramme", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("passes through data already at current schema version", () => {
    const data = { schemaVersion: 4, title: "Test" };
    const result = migrateProgramme(data);
    expect(result).toEqual(data);
    expect(result).toBe(data); // short-circuit returns same reference
  });

  // ── v1 → v2 ──

  describe("v1 → v2", () => {
    it("converts singular awardStandard fields to arrays", () => {
      const v1 = {
        schemaVersion: 1,
        awardStandardId: "qqi-computing-l6-9",
        awardStandardName: "Computing",
        versions: [],
      };
      const result = migrateProgramme(v1);
      expect(result.schemaVersion).toBe(4);
      expect(result.awardStandardId).toBeUndefined();
      expect(result.awardStandardName).toBeUndefined();
      expect(result.awardStandardIds).toContain("computing"); // also migrated by v2→v3
      expect(result.awardStandardNames).toEqual(["Computing"]);
    });

    it("converts deliveryModalities array to single deliveryModality in versions", () => {
      const v1 = {
        schemaVersion: 1,
        versions: [{ deliveryModalities: ["ONLINE", "BLENDED"] }],
      };
      const result = migrateProgramme(v1);
      expect(result.versions[0].deliveryModality).toBe("ONLINE");
      expect(result.versions[0].deliveryModalities).toBeUndefined();
    });

    it("defaults deliveryModality to F2F when deliveryModalities is empty", () => {
      const v1 = {
        schemaVersion: 1,
        versions: [{ deliveryModalities: [] }],
      };
      const result = migrateProgramme(v1);
      expect(result.versions[0].deliveryModality).toBe("F2F");
    });

    it("removes legacy programme-level delivery fields", () => {
      const v1 = {
        schemaVersion: 1,
        deliveryMode: "full-time",
        syncPattern: "weekly",
        deliveryModalities: ["F2F"],
        versions: [],
      };
      const result = migrateProgramme(v1);
      expect(result.deliveryMode).toBeUndefined();
      expect(result.syncPattern).toBeUndefined();
      expect(result.deliveryModalities).toBeUndefined();
    });

    it("removes deprecated cache fields", () => {
      const v1 = {
        schemaVersion: 1,
        standardsCache: { cached: true },
        _cachedStandards: [1, 2],
        versions: [],
      };
      const result = migrateProgramme(v1);
      expect(result.standardsCache).toBeUndefined();
      expect(result._cachedStandards).toBeUndefined();
    });

    it("initialises missing arrays", () => {
      const v1 = { schemaVersion: 1 };
      const result = migrateProgramme(v1);
      expect(result.awardStandardIds).toEqual([]);
      expect(result.awardStandardNames).toEqual([]);
      expect(result.versions).toEqual([]);
    });
  });

  // ── v2 → v3 ──

  describe("v2 → v3", () => {
    it("maps old standard IDs to new IDs", () => {
      const v2 = {
        schemaVersion: 2,
        awardStandardIds: ["qqi-computing-l6-9", "qqi-professional-awards-l5-9"],
        versions: [],
      };
      const result = migrateProgramme(v2);
      expect(result.awardStandardIds).toEqual(["computing", "professional"]);
    });

    it("preserves unknown standard IDs unchanged", () => {
      const v2 = {
        schemaVersion: 2,
        awardStandardIds: ["custom-standard"],
        versions: [],
      };
      const result = migrateProgramme(v2);
      expect(result.awardStandardIds).toEqual(["custom-standard"]);
    });

    it("migrates thread names in PLO standardMappings", () => {
      const v2 = {
        schemaVersion: 2,
        awardStandardIds: ["computing"],
        plos: [
          {
            id: "plo1",
            standardMappings: [
              { standardId: "computing", thread: "Knowledge-Breadth", criteria: "Knowledge" },
              { standardId: "computing", thread: "Competence-Context", criteria: "Competence" },
            ],
          },
        ],
        versions: [],
      };
      const result = migrateProgramme(v2);
      expect(result.plos[0].standardMappings[0].thread).toBe("Breadth");
      expect(result.plos[0].standardMappings[1].thread).toBe("Context");
    });

    it("normalises criteria case", () => {
      const v2 = {
        schemaVersion: 2,
        awardStandardIds: ["computing"],
        plos: [
          {
            id: "plo1",
            standardMappings: [
              { standardId: "computing", criteria: "Know-how & Skill", thread: "Range" },
            ],
          },
        ],
        versions: [],
      };
      const result = migrateProgramme(v2);
      expect(result.plos[0].standardMappings[0].criteria).toBe("Know-How & Skill");
    });

    it("adds default standardId to mappings missing one", () => {
      const v2 = {
        schemaVersion: 2,
        awardStandardIds: ["computing"],
        plos: [
          {
            id: "plo1",
            standardMappings: [{ criteria: "Knowledge", thread: "Breadth" }],
          },
        ],
        versions: [],
      };
      const result = migrateProgramme(v2);
      expect(result.plos[0].standardMappings[0].standardId).toBe("computing");
    });

    it("maps old standard IDs inside PLO standardMappings", () => {
      const v2 = {
        schemaVersion: 2,
        awardStandardIds: ["qqi-computing-l6-9"],
        plos: [
          {
            id: "plo1",
            standardMappings: [
              { standardId: "qqi-computing-l6-9", criteria: "Knowledge", thread: "Breadth" },
            ],
          },
        ],
        versions: [],
      };
      const result = migrateProgramme(v2);
      expect(result.plos[0].standardMappings[0].standardId).toBe("computing");
    });

    it("skips PLOs without standardMappings", () => {
      const v2 = {
        schemaVersion: 2,
        awardStandardIds: ["computing"],
        plos: [{ id: "plo1" }],
        versions: [],
      };
      const result = migrateProgramme(v2);
      expect(result.plos[0]).toEqual({ id: "plo1" });
    });
  });

  // ── v3 → v4 ──

  describe("v3 → v4", () => {
    it("converts ploToModules to ploToMimlos", () => {
      const v3 = {
        schemaVersion: 3,
        modules: [
          { id: "mod1", mimlos: [{ id: "mim1" }, { id: "mim2" }] },
          { id: "mod2", mimlos: [{ id: "mim3" }] },
        ],
        ploToModules: {
          plo1: ["mod1", "mod2"],
        },
        versions: [],
      };
      const result = migrateProgramme(v3);
      expect(result.schemaVersion).toBe(4);
      expect(result.ploToModules).toBeUndefined();
      expect(result.ploToMimlos).toEqual({ plo1: ["mim1", "mim2", "mim3"] });
    });

    it("deduplicates mimlo IDs", () => {
      const v3 = {
        schemaVersion: 3,
        modules: [{ id: "mod1", mimlos: [{ id: "mim1" }] }],
        ploToModules: {
          plo1: ["mod1", "mod1"],
        },
        versions: [],
      };
      const result = migrateProgramme(v3);
      expect(result.ploToMimlos.plo1).toEqual(["mim1"]);
    });

    it("skips PLOs with no matching modules", () => {
      const v3 = {
        schemaVersion: 3,
        modules: [],
        ploToModules: { plo1: ["mod_missing"] },
        versions: [],
      };
      const result = migrateProgramme(v3);
      expect(result.ploToMimlos).toEqual({});
    });

    it("initialises ploToMimlos when ploToModules is absent", () => {
      const v3 = { schemaVersion: 3, versions: [] };
      const result = migrateProgramme(v3);
      expect(result.ploToMimlos).toEqual({});
    });

    it("skips modules without mimlos array", () => {
      const v3 = {
        schemaVersion: 3,
        modules: [{ id: "mod1" }],
        ploToModules: { plo1: ["mod1"] },
        versions: [],
      };
      const result = migrateProgramme(v3);
      expect(result.ploToMimlos).toEqual({});
    });
  });

  // ── Full chain ──

  it("applies all migrations from v1 to v4", () => {
    const v1 = {
      title: "Test Programme",
      awardStandardId: "qqi-computing-l6-9",
      awardStandardName: "Computing",
      versions: [{ deliveryModalities: ["ONLINE"] }],
      plos: [
        {
          id: "plo1",
          standardMappings: [
            {
              standardId: "qqi-computing-l6-9",
              criteria: "Know-how & Skill",
              thread: "Know-how & Skill-Range",
            },
          ],
        },
      ],
      modules: [{ id: "mod1", mimlos: [{ id: "mim1" }] }],
      ploToModules: { plo1: ["mod1"] },
    };
    const result = migrateProgramme(v1);
    expect(result.schemaVersion).toBe(4);
    expect(result.awardStandardIds).toEqual(["computing"]);
    expect(result.plos[0].standardMappings[0].criteria).toBe("Know-How & Skill");
    expect(result.plos[0].standardMappings[0].thread).toBe("Range");
    expect(result.ploToMimlos).toEqual({ plo1: ["mim1"] });
    expect(result.ploToModules).toBeUndefined();
  });
});

// ───────────────────────── validateStandardMappings ─────────────────────────

describe("validateStandardMappings", () => {
  it("returns valid for programme with no PLOs", () => {
    const result = validateStandardMappings({}, [sampleStandard]);
    expect(result).toEqual({ errors: [], warnings: [], isValid: true });
  });

  it("returns valid for correct mappings", () => {
    const programme = {
      nfqLevel: 8,
      plos: [
        {
          id: "plo1",
          standardMappings: [{ standardId: "computing", criteria: "Knowledge", thread: "Breadth" }],
        },
      ],
    };
    const result = validateStandardMappings(programme, [sampleStandard]);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("reports error for missing standard", () => {
    const programme = {
      nfqLevel: 8,
      plos: [
        {
          id: "plo1",
          standardMappings: [
            { standardId: "nonexistent", criteria: "Knowledge", thread: "Breadth" },
          ],
        },
      ],
    };
    const result = validateStandardMappings(programme, [sampleStandard]);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("nonexistent");
  });

  it("reports error for missing criteria", () => {
    const programme = {
      nfqLevel: 8,
      plos: [
        {
          id: "plo1",
          standardMappings: [
            { standardId: "computing", criteria: "Nonexistent", thread: "Breadth" },
          ],
        },
      ],
    };
    const result = validateStandardMappings(programme, [sampleStandard]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toContain("Criteria 'Nonexistent'");
  });

  it("reports error for missing thread", () => {
    const programme = {
      nfqLevel: 8,
      plos: [
        {
          id: "plo1",
          standardMappings: [
            { standardId: "computing", criteria: "Knowledge", thread: "Nonexistent" },
          ],
        },
      ],
    };
    const result = validateStandardMappings(programme, [sampleStandard]);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toContain("Thread 'Nonexistent'");
  });

  it("warns when NFQ level is not set", () => {
    const programme = {
      plos: [
        {
          id: "plo1",
          standardMappings: [{ standardId: "computing", criteria: "Knowledge", thread: "Breadth" }],
        },
      ],
    };
    const result = validateStandardMappings(programme, [sampleStandard]);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("NFQ level not set");
  });

  it("warns when standard has no data for the NFQ level", () => {
    const programme = {
      nfqLevel: 6,
      plos: [
        {
          id: "plo1",
          standardMappings: [{ standardId: "computing", criteria: "Knowledge", thread: "Breadth" }],
        },
      ],
    };
    const result = validateStandardMappings(programme, [sampleStandard]);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("no data for NFQ level 6");
  });

  it("skips PLOs without standardMappings", () => {
    const programme = {
      nfqLevel: 8,
      plos: [{ id: "plo1" }],
    };
    const result = validateStandardMappings(programme, [sampleStandard]);
    expect(result).toEqual({ errors: [], warnings: [], isValid: true });
  });
});

// ──────────────────────── getStandardIndicators ─────────────────────────────

describe("getStandardIndicators", () => {
  it("returns a flat array of indicators for a level", () => {
    const indicators = getStandardIndicators(sampleStandard, 8);
    expect(indicators).toHaveLength(6);
    expect(indicators[0]).toEqual({
      criteria: "Knowledge",
      thread: "Breadth",
      descriptor: "K-B-8",
      descriptorText: "Knowledge Breadth L8",
      id: "kb8",
      awardStandardId: "computing",
    });
  });

  it("returns empty array for null standard", () => {
    expect(getStandardIndicators(null, 8)).toEqual([]);
  });

  it("returns empty array for undefined standard", () => {
    expect(getStandardIndicators(undefined, 8)).toEqual([]);
  });

  it("returns empty array for missing NFQ level", () => {
    expect(getStandardIndicators(sampleStandard, 6)).toEqual([]);
  });

  it("coerces string nfqLevel to number", () => {
    const indicators = getStandardIndicators(sampleStandard, "8" as any);
    expect(indicators).toHaveLength(6);
  });
});

// ──────────────────────────── getCriteriaList ────────────────────────────────

describe("getCriteriaList", () => {
  it("returns criteria names for a level", () => {
    const criteria = getCriteriaList(sampleStandard, 8);
    expect(criteria).toEqual(["Knowledge", "Know-How & Skill", "Competence"]);
  });

  it("returns empty array for null standard", () => {
    expect(getCriteriaList(null, 8)).toEqual([]);
  });

  it("returns empty array for missing level", () => {
    expect(getCriteriaList(sampleStandard, 6)).toEqual([]);
  });

  it("coerces string nfqLevel to number", () => {
    expect(getCriteriaList(sampleStandard, "8" as any)).toEqual([
      "Knowledge",
      "Know-How & Skill",
      "Competence",
    ]);
  });
});

// ─────────────────────────── getThreadList ───────────────────────────────────

describe("getThreadList", () => {
  it("returns thread names for a criteria", () => {
    const threads = getThreadList(sampleStandard, 8, "Knowledge");
    expect(threads).toEqual(["Breadth", "Kind"]);
  });

  it("returns empty array for null standard", () => {
    expect(getThreadList(null, 8, "Knowledge")).toEqual([]);
  });

  it("returns empty array for empty criteria", () => {
    expect(getThreadList(sampleStandard, 8, "")).toEqual([]);
  });

  it("returns empty array for unknown criteria", () => {
    expect(getThreadList(sampleStandard, 8, "Nonexistent")).toEqual([]);
  });

  it("returns empty array for missing level", () => {
    expect(getThreadList(sampleStandard, 6, "Knowledge")).toEqual([]);
  });
});

// ─────────────────────────── getDescriptor ──────────────────────────────────

describe("getDescriptor", () => {
  it("returns descriptor text for a criteria/thread pair", () => {
    expect(getDescriptor(sampleStandard, 8, "Knowledge", "Breadth")).toBe("K-B-8");
  });

  it("returns empty string for null standard", () => {
    expect(getDescriptor(null, 8, "Knowledge", "Breadth")).toBe("");
  });

  it("returns empty string for missing criteria", () => {
    expect(getDescriptor(sampleStandard, 8, "", "Breadth")).toBe("");
  });

  it("returns empty string for missing thread", () => {
    expect(getDescriptor(sampleStandard, 8, "Knowledge", "")).toBe("");
  });

  it("returns empty string for unknown criteria", () => {
    expect(getDescriptor(sampleStandard, 8, "Nonexistent", "Breadth")).toBe("");
  });

  it("returns empty string for unknown thread", () => {
    expect(getDescriptor(sampleStandard, 8, "Knowledge", "Nonexistent")).toBe("");
  });

  it("returns empty string for missing level", () => {
    expect(getDescriptor(sampleStandard, 6, "Knowledge", "Breadth")).toBe("");
  });
});
