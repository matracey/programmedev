import { describe, expect, it, vi } from "vitest";
import {
  formatPct,
  defaultPatternFor,
  sumPattern,
  sumStageCredits,
  deliveryPatternsHtml,
  mimloText,
  ploText,
  ensureMimloObjects,
  ensurePloObjects,
} from "./helpers";

describe("formatPct", () => {
  it("formats a number as a percentage string", () => {
    expect(formatPct(75)).toBe("75%");
  });

  it("formats a string number", () => {
    expect(formatPct("50")).toBe("50%");
  });

  it("defaults to 0% when undefined", () => {
    expect(formatPct(undefined)).toBe("0%");
  });

  it("defaults to 0% when called without arguments", () => {
    expect(formatPct()).toBe("0%");
  });

  it("handles zero", () => {
    expect(formatPct(0)).toBe("0%");
  });

  it("handles decimal values", () => {
    expect(formatPct(33.3)).toBe("33.3%");
  });
});

describe("defaultPatternFor", () => {
  it("returns F2F pattern", () => {
    expect(defaultPatternFor("F2F")).toEqual({
      syncOnlinePct: 0,
      asyncDirectedPct: 0,
      onCampusPct: 100,
    });
  });

  it("returns ONLINE pattern", () => {
    expect(defaultPatternFor("ONLINE")).toEqual({
      syncOnlinePct: 40,
      asyncDirectedPct: 60,
      onCampusPct: 0,
    });
  });

  it("returns BLENDED pattern as default", () => {
    expect(defaultPatternFor("BLENDED")).toEqual({
      syncOnlinePct: 30,
      asyncDirectedPct: 40,
      onCampusPct: 30,
    });
  });

  it("returns BLENDED pattern for unknown modality", () => {
    expect(defaultPatternFor("UNKNOWN")).toEqual({
      syncOnlinePct: 30,
      asyncDirectedPct: 40,
      onCampusPct: 30,
    });
  });

  it("pattern values sum to 100 for F2F", () => {
    const pat = defaultPatternFor("F2F");
    expect(pat.syncOnlinePct + pat.asyncDirectedPct + pat.onCampusPct).toBe(100);
  });

  it("pattern values sum to 100 for ONLINE", () => {
    const pat = defaultPatternFor("ONLINE");
    expect(pat.syncOnlinePct + pat.asyncDirectedPct + pat.onCampusPct).toBe(100);
  });

  it("pattern values sum to 100 for BLENDED", () => {
    const pat = defaultPatternFor("BLENDED");
    expect(pat.syncOnlinePct + pat.asyncDirectedPct + pat.onCampusPct).toBe(100);
  });
});

describe("sumPattern", () => {
  it("sums all three percentage values", () => {
    expect(sumPattern({ syncOnlinePct: 30, asyncDirectedPct: 40, onCampusPct: 30 })).toBe(100);
  });

  it("handles missing properties with defaults of 0", () => {
    expect(sumPattern({})).toBe(0);
  });

  it("handles partial properties", () => {
    expect(sumPattern({ syncOnlinePct: 50 })).toBe(50);
  });

  it("handles undefined values", () => {
    expect(
      sumPattern({ syncOnlinePct: undefined, asyncDirectedPct: 20, onCampusPct: undefined }),
    ).toBe(20);
  });

  it("coerces string-like numbers", () => {
    // Number() coercion handles this
    expect(sumPattern({ syncOnlinePct: 10, asyncDirectedPct: 20, onCampusPct: 30 })).toBe(60);
  });
});

describe("sumStageCredits", () => {
  const modules: Module[] = [
    { id: "mod_1", title: "Module A", credits: 10 } as Module,
    { id: "mod_2", title: "Module B", credits: 20 } as Module,
    { id: "mod_3", title: "Module C", credits: 15 } as Module,
  ];

  it("sums credits for modules in a stage", () => {
    const stageModules = [{ moduleId: "mod_1" }, { moduleId: "mod_2" }];
    expect(sumStageCredits(modules, stageModules)).toBe(30);
  });

  it("returns 0 for empty stage modules", () => {
    expect(sumStageCredits(modules, [])).toBe(0);
  });

  it("ignores stage modules not found in allModules", () => {
    const stageModules = [{ moduleId: "mod_1" }, { moduleId: "mod_999" }];
    expect(sumStageCredits(modules, stageModules)).toBe(10);
  });

  it("handles null-ish allModules", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sumStageCredits(null as any, [{ moduleId: "mod_1" }])).toBe(0);
  });

  it("handles null-ish stageModules", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sumStageCredits(modules, null as any)).toBe(0);
  });

  it("handles modules with undefined credits", () => {
    const mods = [{ id: "mod_x", title: "No Credits" } as Module];
    expect(sumStageCredits(mods, [{ moduleId: "mod_x" }])).toBe(0);
  });
});

describe("deliveryPatternsHtml", () => {
  it("returns em-dash when no modality is set", () => {
    expect(deliveryPatternsHtml({})).toBe('<span class="text-muted">—</span>');
  });

  it("returns em-dash when deliveryModality is empty string", () => {
    expect(deliveryPatternsHtml({ deliveryModality: "" })).toBe(
      '<span class="text-muted">—</span>',
    );
  });

  it("uses default pattern when no deliveryPatterns provided", () => {
    const html = deliveryPatternsHtml({ deliveryModality: "F2F" });
    expect(html).toContain("Face-to-face");
    expect(html).toContain("0% sync online");
    expect(html).toContain("0% async directed");
    expect(html).toContain("100% on campus");
  });

  it("uses custom pattern from deliveryPatterns when provided", () => {
    const html = deliveryPatternsHtml({
      deliveryModality: "F2F",
      deliveryPatterns: {
        F2F: { syncOnlinePct: 10, asyncDirectedPct: 20, onCampusPct: 70 },
      },
    });
    expect(html).toContain("10% sync online");
    expect(html).toContain("20% async directed");
    expect(html).toContain("70% on campus");
  });

  it("labels ONLINE as Fully online", () => {
    const html = deliveryPatternsHtml({ deliveryModality: "ONLINE" });
    expect(html).toContain("Fully online");
  });

  it("labels BLENDED as Blended", () => {
    const html = deliveryPatternsHtml({ deliveryModality: "BLENDED" });
    expect(html).toContain("Blended");
  });

  it("uses raw key as label for unknown modality", () => {
    const html = deliveryPatternsHtml({ deliveryModality: "CUSTOM" });
    expect(html).toContain("CUSTOM");
  });

  it("escapes HTML in modality label", () => {
    const html = deliveryPatternsHtml({ deliveryModality: '<script>alert("xss")</script>' });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("ignores non-object deliveryPatterns", () => {
    const html = deliveryPatternsHtml({ deliveryModality: "F2F", deliveryPatterns: "invalid" });
    // Falls back to default pattern
    expect(html).toContain("0% sync online");
  });
});

describe("mimloText", () => {
  it("returns the string directly if x is a string", () => {
    expect(mimloText("Learn things")).toBe("Learn things");
  });

  it("returns text property from an object", () => {
    expect(mimloText({ text: "Understand concepts" })).toBe("Understand concepts");
  });

  it("returns empty string for object without text", () => {
    expect(mimloText({ id: "123" })).toBe("");
  });

  it("returns empty string for null", () => {
    expect(mimloText(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(mimloText(undefined)).toBe("");
  });

  it("returns empty string for a number", () => {
    expect(mimloText(42)).toBe("");
  });
});

describe("ploText", () => {
  it("returns the string directly if x is a string", () => {
    expect(ploText("Demonstrate knowledge")).toBe("Demonstrate knowledge");
  });

  it("returns text property from an object", () => {
    expect(ploText({ text: "Apply skills", standardId: "s1" })).toBe("Apply skills");
  });

  it("returns empty string for object without text", () => {
    expect(ploText({ id: "plo_1" })).toBe("");
  });

  it("returns empty string for null", () => {
    expect(ploText(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(ploText(undefined)).toBe("");
  });

  it("returns empty string for a number", () => {
    expect(ploText(99)).toBe("");
  });
});

describe("ensureMimloObjects", () => {
  it("initialises mimlos to empty array if undefined", () => {
    const mod = { id: "mod_1", title: "Test" } as Module;
    ensureMimloObjects(mod);
    expect(mod.mimlos).toEqual([]);
  });

  it("converts string array to object array", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-0000-0000-000000000000");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = { id: "mod_1", title: "Test", mimlos: ["Learn A", "Learn B"] } as any;
    ensureMimloObjects(mod);
    expect(mod.mimlos).toHaveLength(2);
    expect(mod.mimlos[0]).toEqual({
      id: "mimlo_00000000-0000-0000-0000-000000000000",
      text: "Learn A",
    });
    expect(mod.mimlos[1]).toEqual({
      id: "mimlo_00000000-0000-0000-0000-000000000000",
      text: "Learn B",
    });
    vi.restoreAllMocks();
  });

  it("does not modify already-object mimlos", () => {
    const existing = [{ id: "mimlo_abc", text: "Existing" }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = { id: "mod_1", title: "Test", mimlos: existing } as any;
    ensureMimloObjects(mod);
    expect(mod.mimlos).toBe(existing);
  });

  it("does not modify empty mimlos array", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = { id: "mod_1", title: "Test", mimlos: [] } as any;
    ensureMimloObjects(mod);
    expect(mod.mimlos).toEqual([]);
  });

  it("handles null values in string array", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("11111111-1111-1111-1111-111111111111");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = { id: "mod_1", title: "Test", mimlos: [null as any, "Valid"] } as any;
    // First element is null (not a string), so typeof check won't trigger migration
    ensureMimloObjects(mod);
    // null is not "string", so no migration happens
    expect(mod.mimlos).toHaveLength(2);
    vi.restoreAllMocks();
  });
});

describe("ensurePloObjects", () => {
  it("initialises plos to empty array if undefined", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prog = {} as any;
    ensurePloObjects(prog);
    expect(prog.plos).toEqual([]);
  });

  it("converts string array to object array", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("22222222-2222-2222-2222-222222222222");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prog = { plos: ["PLO 1", "PLO 2"] } as any;
    ensurePloObjects(prog);
    expect(prog.plos).toHaveLength(2);
    expect(prog.plos[0]).toEqual({
      id: "plo_22222222-2222-2222-2222-222222222222",
      text: "PLO 1",
      standardId: null,
    });
    expect(prog.plos[1]).toEqual({
      id: "plo_22222222-2222-2222-2222-222222222222",
      text: "PLO 2",
      standardId: null,
    });
    vi.restoreAllMocks();
  });

  it("does not modify already-object plos", () => {
    const existing = [{ id: "plo_abc", text: "Existing", standardId: "s1" }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prog = { plos: existing } as any;
    ensurePloObjects(prog);
    expect(prog.plos).toBe(existing);
  });

  it("does not modify empty plos array", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prog = { plos: [] } as any;
    ensurePloObjects(prog);
    expect(prog.plos).toEqual([]);
  });

  it("handles null values in string array gracefully", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("33333333-3333-3333-3333-333333333333");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prog = { plos: ["Valid", null as any] } as any;
    ensurePloObjects(prog);
    expect(prog.plos).toHaveLength(2);
    expect(prog.plos[0].text).toBe("Valid");
    expect(prog.plos[1].text).toBe("");
    vi.restoreAllMocks();
  });
});
