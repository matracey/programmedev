import { describe, expect, it } from "vitest";

import { completionPercent, validateProgramme, type ValidationFlag } from "./validation";

/** Helper to create a minimal valid programme for testing. */
function baseProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    schemaVersion: 1,
    id: "prog_1",
    title: "Higher Diploma in Computing",
    awardType: "Higher Diploma",
    awardTypeIsOther: false,
    nfqLevel: 8,
    school: "School of Computing",
    awardStandardIds: [],
    awardStandardNames: [],
    totalCredits: 60,
    electiveDefinitions: [],
    modules: [
      {
        id: "mod_1",
        title: "Module A",
        code: "MA",
        credits: 30,
        mimlos: [{ id: "m1", text: "LO1" }],
      },
      {
        id: "mod_2",
        title: "Module B",
        code: "MB",
        credits: 30,
        mimlos: [{ id: "m2", text: "LO2" }],
      },
    ],
    plos: Array.from({ length: 6 }, (_, i) => ({
      id: `plo_${i + 1}`,
      text: `PLO ${i + 1}`,
    })),
    ploToMimlos: {
      plo_1: ["m1"],
      plo_2: ["m2"],
      plo_3: ["m1"],
      plo_4: ["m2"],
      plo_5: ["m1"],
      plo_6: ["m2"],
    },
    versions: [
      {
        id: "v1",
        label: "Full-Time",
        code: "FT",
        targetCohortSize: 30,
        stages: [
          {
            id: "s1",
            name: "Year 1",
            creditsTarget: 60,
            modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
          },
        ],
      } as ProgrammeVersion,
    ],
    ...overrides,
  } as Programme;
}

function flagMsgs(flags: ValidationFlag[]): string[] {
  return flags.map((f) => f.msg);
}

function flagsOfType(flags: ValidationFlag[], type: "error" | "warn"): ValidationFlag[] {
  return flags.filter((f) => f.type === type);
}

// ---------------------------------------------------------------------------
// validateProgramme
// ---------------------------------------------------------------------------
describe("validateProgramme", () => {
  // --- Identity ---
  describe("identity checks", () => {
    it("flags missing programme title", () => {
      const flags = validateProgramme(baseProgramme({ title: "" }));
      expect(flagMsgs(flags)).toContain("Programme title is missing.");
      expect(flags.find((f) => f.msg === "Programme title is missing.")!.type).toBe("error");
      expect(flags.find((f) => f.msg === "Programme title is missing.")!.step).toBe("identity");
    });

    it("flags whitespace-only programme title", () => {
      const flags = validateProgramme(baseProgramme({ title: "   " }));
      expect(flagMsgs(flags)).toContain("Programme title is missing.");
    });

    it("flags missing NFQ level", () => {
      const flags = validateProgramme(baseProgramme({ nfqLevel: null }));
      expect(flagMsgs(flags)).toContain("NFQ level is missing.");
    });

    it("flags NFQ level below 6", () => {
      const flags = validateProgramme(baseProgramme({ nfqLevel: 5 }));
      expect(flagMsgs(flags)).toContain("NFQ level must be between 6 and 9.");
    });

    it("flags NFQ level above 9", () => {
      const flags = validateProgramme(baseProgramme({ nfqLevel: 10 }));
      expect(flagMsgs(flags)).toContain("NFQ level must be between 6 and 9.");
    });

    it("accepts NFQ level 6", () => {
      const flags = validateProgramme(baseProgramme({ nfqLevel: 6 }));
      expect(flagMsgs(flags)).not.toContain("NFQ level must be between 6 and 9.");
      expect(flagMsgs(flags)).not.toContain("NFQ level is missing.");
    });

    it("accepts NFQ level 9", () => {
      const flags = validateProgramme(baseProgramme({ nfqLevel: 9 }));
      expect(flagMsgs(flags)).not.toContain("NFQ level must be between 6 and 9.");
    });

    it("flags missing award type", () => {
      const flags = validateProgramme(baseProgramme({ awardType: "" }));
      const flag = flags.find((f) => f.msg === "Award type is missing.");
      expect(flag).toBeDefined();
      expect(flag!.type).toBe("warn");
      expect(flag!.step).toBe("identity");
    });
  });

  // --- Structure / credits ---
  describe("structure / credits", () => {
    it("flags zero total credits", () => {
      const flags = validateProgramme(baseProgramme({ totalCredits: 0 }));
      expect(flagMsgs(flags)).toContain("Total programme credits are missing/zero.");
    });

    it("flags credits mismatch when no electives", () => {
      const p = baseProgramme({ totalCredits: 90 });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags)).toContain("Credits mismatch: totalCredits=90 but modules sum to 60.");
    });

    it("no credits mismatch when totals match", () => {
      const flags = validateProgramme(baseProgramme());
      expect(flagMsgs(flags).some((m) => m.startsWith("Credits mismatch"))).toBe(false);
    });
  });

  // --- Elective definitions ---
  describe("elective definitions", () => {
    function progWithElectives(overrides: Partial<Programme> = {}): Programme {
      return baseProgramme({
        modules: [
          {
            id: "mod_1",
            title: "Mandatory",
            code: "M1",
            credits: 30,
            mimlos: [{ id: "m1", text: "LO1" }],
          },
          {
            id: "mod_e1",
            title: "Elective A",
            code: "EA",
            credits: 15,
            isElective: true,
            mimlos: [{ id: "m2", text: "LO2" }],
          },
          {
            id: "mod_e2",
            title: "Elective B",
            code: "EB",
            credits: 15,
            isElective: true,
            mimlos: [{ id: "m3", text: "LO3" }],
          },
        ],
        totalCredits: 45,
        electiveDefinitions: [
          {
            id: "edef_1",
            name: "Stream",
            code: "STR",
            credits: 15,
            groups: [
              { id: "egrp_1", name: "Group A", code: "GA", moduleIds: ["mod_e1"] },
              { id: "egrp_2", name: "Group B", code: "GB", moduleIds: ["mod_e2"] },
            ],
          },
        ],
        ...overrides,
      });
    }

    it("flags definition with no groups", () => {
      const p = progWithElectives({
        electiveDefinitions: [{ id: "edef_1", name: "Empty", code: "", credits: 15, groups: [] }],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags)).toContain(
        "Empty: no groups defined (students need at least one option).",
      );
    });

    it("flags definition with groups but no credits", () => {
      const p = progWithElectives({
        electiveDefinitions: [
          {
            id: "edef_1",
            name: "Stream",
            code: "",
            credits: 0,
            groups: [{ id: "egrp_1", name: "G", code: "", moduleIds: ["mod_e1"] }],
          },
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags)).toContain("Stream: has groups but no credit value set.");
    });

    it("flags group with no modules assigned", () => {
      const p = progWithElectives({
        electiveDefinitions: [
          {
            id: "edef_1",
            name: "Stream",
            code: "STR",
            credits: 15,
            groups: [{ id: "egrp_1", name: "Empty Group", code: "EG", moduleIds: [] }],
          },
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags).some((m) => m.includes("no modules assigned"))).toBe(true);
    });

    it("flags group containing mandatory module", () => {
      const p = progWithElectives({
        electiveDefinitions: [
          {
            id: "edef_1",
            name: "Stream",
            code: "STR",
            credits: 30,
            groups: [{ id: "egrp_1", name: "Group A", code: "GA", moduleIds: ["mod_1"] }],
          },
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags).some((m) => m.includes("mandatory module(s)"))).toBe(true);
    });

    it("flags group credit mismatch with definition", () => {
      const p = progWithElectives({
        electiveDefinitions: [
          {
            id: "edef_1",
            name: "Stream",
            code: "STR",
            credits: 999,
            groups: [{ id: "egrp_1", name: "Group A", code: "GA", moduleIds: ["mod_e1"] }],
          },
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags).some((m) => m.includes("don't match definition requirement"))).toBe(
        true,
      );
    });

    it("flags module assigned to multiple groups", () => {
      const p = progWithElectives({
        electiveDefinitions: [
          {
            id: "edef_1",
            name: "Stream",
            code: "STR",
            credits: 15,
            groups: [
              { id: "egrp_1", name: "Group A", code: "GA", moduleIds: ["mod_e1"] },
              { id: "egrp_2", name: "Group B", code: "GB", moduleIds: ["mod_e1"] },
            ],
          },
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags).some((m) => m.includes("assigned to 2 groups"))).toBe(true);
    });

    it("flags mandatory + elective credits not matching total", () => {
      const p = progWithElectives({ totalCredits: 999 });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags).some((m) => m.startsWith("Credit check:"))).toBe(true);
    });
  });

  // --- Versions ---
  describe("version validation", () => {
    it("flags no versions", () => {
      const flags = validateProgramme(baseProgramme({ versions: [] }));
      expect(flagMsgs(flags)).toContain(
        "At least one Programme Version is required (e.g., FT/PT/Online).",
      );
    });

    it("flags version with missing label", () => {
      const p = baseProgramme({
        versions: [
          {
            id: "v1",
            label: "",
            code: "FT",
            targetCohortSize: 20,
            stages: [
              {
                id: "s1",
                name: "Y1",
                creditsTarget: 60,
                modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
              },
            ],
          } as ProgrammeVersion,
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags)).toContain("Version 1: label is missing.");
    });

    it("flags duplicate version labels", () => {
      const p = baseProgramme({
        versions: [
          {
            id: "v1",
            label: "Full-Time",
            code: "FT",
            targetCohortSize: 20,
            stages: [
              {
                id: "s1",
                name: "Y1",
                creditsTarget: 60,
                modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
              },
            ],
          } as ProgrammeVersion,
          {
            id: "v2",
            label: "Full-Time",
            code: "FT2",
            targetCohortSize: 20,
            stages: [
              {
                id: "s2",
                name: "Y1",
                creditsTarget: 60,
                modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
              },
            ],
          } as ProgrammeVersion,
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags).some((m) => m.includes("duplicate label"))).toBe(true);
    });

    it("flags delivery pattern not totalling 100%", () => {
      const p = baseProgramme({
        versions: [
          {
            id: "v1",
            label: "Online",
            code: "OL",
            deliveryModality: "online",
            deliveryPatterns: {
              online: { syncOnlinePct: 30, asyncDirectedPct: 30, onCampusPct: 30 },
            },
            targetCohortSize: 20,
            stages: [
              {
                id: "s1",
                name: "Y1",
                creditsTarget: 60,
                modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
              },
            ],
          } as ProgrammeVersion,
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags).some((m) => m.includes("delivery pattern must total 100%"))).toBe(
        true,
      );
    });

    it("flags missing delivery pattern for modality", () => {
      const p = baseProgramme({
        versions: [
          {
            id: "v1",
            label: "Online",
            code: "OL",
            deliveryModality: "online",
            deliveryPatterns: {},
            targetCohortSize: 20,
            stages: [
              {
                id: "s1",
                name: "Y1",
                creditsTarget: 60,
                modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
              },
            ],
          } as ProgrammeVersion,
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags).some((m) => m.includes("missing delivery pattern"))).toBe(true);
    });

    it("flags online proctored exams YES but no notes", () => {
      const p = baseProgramme({
        versions: [
          {
            id: "v1",
            label: "Full-Time",
            code: "FT",
            onlineProctoredExams: "YES",
            onlineProctoredExamsNotes: "",
            targetCohortSize: 20,
            stages: [
              {
                id: "s1",
                name: "Y1",
                creditsTarget: 60,
                modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
              },
            ],
          } as ProgrammeVersion,
        ],
      });
      const flags = validateProgramme(p);
      expect(
        flagMsgs(flags).some((m) => m.includes("proctored exams marked YES but notes are empty")),
      ).toBe(true);
    });

    it("flags missing cohort size", () => {
      const p = baseProgramme({
        versions: [
          {
            id: "v1",
            label: "Full-Time",
            code: "FT",
            targetCohortSize: 0,
            stages: [
              {
                id: "s1",
                name: "Y1",
                creditsTarget: 60,
                modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
              },
            ],
          } as ProgrammeVersion,
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags)).toContain("Version 1: cohort size is missing/zero.");
    });
  });

  // --- Stage validation ---
  describe("stage credit validation", () => {
    it("flags no stages defined", () => {
      const p = baseProgramme({
        versions: [
          {
            id: "v1",
            label: "Full-Time",
            code: "FT",
            targetCohortSize: 20,
            stages: [],
          } as ProgrammeVersion,
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags)).toContain("Version 1: no stages defined yet.");
    });

    it("flags stage credit targets not matching programme total", () => {
      const p = baseProgramme({
        versions: [
          {
            id: "v1",
            label: "Full-Time",
            code: "FT",
            targetCohortSize: 20,
            stages: [
              {
                id: "s1",
                name: "Year 1",
                creditsTarget: 40,
                modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
              },
            ],
          } as ProgrammeVersion,
        ],
      });
      const flags = validateProgramme(p);
      expect(
        flagMsgs(flags).some(
          (m) => m.includes("sum of stage credit targets") && m.includes("does not match"),
        ),
      ).toBe(true);
    });

    it("flags stage module credits not matching target", () => {
      const p = baseProgramme({
        totalCredits: 60,
        modules: [
          { id: "mod_1", title: "M1", code: "M1", credits: 20, mimlos: [{ id: "m1", text: "L1" }] },
          { id: "mod_2", title: "M2", code: "M2", credits: 10, mimlos: [{ id: "m2", text: "L2" }] },
        ],
        versions: [
          {
            id: "v1",
            label: "Full-Time",
            code: "FT",
            targetCohortSize: 20,
            stages: [
              {
                id: "s1",
                name: "Year 1",
                creditsTarget: 60,
                modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
              },
            ],
          } as ProgrammeVersion,
        ],
      });
      const flags = validateProgramme(p);
      expect(
        flagMsgs(flags).some(
          (m) => m.includes("module credits sum to") && m.includes("but target is"),
        ),
      ).toBe(true);
    });

    it("flags exit award enabled but no title", () => {
      const p = baseProgramme({
        versions: [
          {
            id: "v1",
            label: "Full-Time",
            code: "FT",
            targetCohortSize: 20,
            stages: [
              {
                id: "s1",
                name: "Year 1",
                creditsTarget: 60,
                modules: [{ moduleId: "mod_1" }, { moduleId: "mod_2" }],
                exitAward: { enabled: true, awardTitle: "" },
              },
            ],
          } as ProgrammeVersion,
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags).some((m) => m.includes("exit award enabled but no award title"))).toBe(
        true,
      );
    });
  });

  // --- PLO / MIMLO mapping ---
  describe("PLO / MIMLO validation", () => {
    it("flags fewer than 6 PLOs", () => {
      const flags = validateProgramme(baseProgramme({ plos: [{ id: "plo_1", text: "PLO 1" }] }));
      expect(flagMsgs(flags)).toContain("PLOs: fewer than 6 (usually aim for ~6–12).");
    });

    it("flags more than 12 PLOs", () => {
      const plos = Array.from({ length: 13 }, (_, i) => ({ id: `plo_${i}`, text: `PLO ${i}` }));
      const ploToMimlos: Record<string, string[]> = {};
      plos.forEach((plo) => {
        ploToMimlos[plo.id] = ["m1"];
      });
      const flags = validateProgramme(baseProgramme({ plos, ploToMimlos }));
      expect(flagMsgs(flags)).toContain("PLOs: more than 12 (consider tightening).");
    });

    it("does not flag PLO count between 6 and 12", () => {
      const flags = validateProgramme(baseProgramme());
      expect(flagMsgs(flags)).not.toContain("PLOs: fewer than 6 (usually aim for ~6–12).");
      expect(flagMsgs(flags)).not.toContain("PLOs: more than 12 (consider tightening).");
    });

    it("flags modules missing MIMLOs", () => {
      const p = baseProgramme({
        modules: [
          { id: "mod_1", title: "M1", code: "M1", credits: 30, mimlos: [] },
          { id: "mod_2", title: "M2", code: "M2", credits: 30, mimlos: [{ id: "m2", text: "LO" }] },
        ],
      });
      const flags = validateProgramme(p);
      expect(flagMsgs(flags).some((m) => m.includes("no MIMLOs yet (1)"))).toBe(true);
    });

    it("flags unmapped PLOs", () => {
      const flags = validateProgramme(baseProgramme({ ploToMimlos: {} }));
      expect(flagMsgs(flags).some((m) => m.includes("PLOs are not mapped to any MIMLO"))).toBe(
        true,
      );
    });

    it("flags partially mapped PLOs", () => {
      const flags = validateProgramme(baseProgramme({ ploToMimlos: { plo_1: ["m1"] } }));
      expect(flagMsgs(flags).some((m) => m.includes("PLOs are not mapped to any MIMLO (5)"))).toBe(
        true,
      );
    });
  });

  // --- Clean programme ---
  describe("clean programme", () => {
    it("returns no errors for a well-formed programme", () => {
      const flags = validateProgramme(baseProgramme());
      const errors = flagsOfType(flags, "error");
      expect(errors).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// completionPercent
// ---------------------------------------------------------------------------
describe("completionPercent", () => {
  it("returns 0 for an empty programme", () => {
    const p = baseProgramme({
      title: "",
      nfqLevel: null,
      awardType: "",
      school: "",
      totalCredits: 0,
      modules: [],
      plos: [],
      ploToMimlos: {},
      versions: [],
    });
    expect(completionPercent(p)).toBe(0);
  });

  it("returns 100 for a fully complete programme", () => {
    const p = baseProgramme();
    expect(completionPercent(p)).toBe(100);
  });

  it("returns partial completion", () => {
    // Only identity fields filled (4 of 10)
    const p = baseProgramme({
      totalCredits: 0,
      modules: [],
      plos: [],
      ploToMimlos: {},
      versions: [],
    });
    expect(completionPercent(p)).toBe(Math.round((4 / 10) * 100));
  });

  it("counts PLOs >= 6 as complete", () => {
    const fivePlos = Array.from({ length: 5 }, (_, i) => ({ id: `plo_${i}`, text: `PLO ${i}` }));
    const p = baseProgramme({ plos: fivePlos });
    // 5 PLOs < 6, so outcomes PLO check is not done
    const full = baseProgramme();
    expect(completionPercent(p)).toBeLessThan(completionPercent(full));
  });

  it("counts ploToMimlos as complete when non-empty", () => {
    const p = baseProgramme({ ploToMimlos: {} });
    const full = baseProgramme();
    expect(completionPercent(p)).toBeLessThan(completionPercent(full));
  });

  it("counts versions with stages as complete", () => {
    const p = baseProgramme({
      versions: [{ id: "v1", label: "FT", code: "FT", stages: [] } as ProgrammeVersion],
    });
    const _full = baseProgramme();
    // Has version but no stages, so 9/10
    expect(completionPercent(p)).toBe(Math.round((9 / 10) * 100));
  });
});
