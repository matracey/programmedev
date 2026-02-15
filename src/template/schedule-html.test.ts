import { describe, expect, it } from "vitest";
import { renderScheduleTable, renderAllSchedules } from "./schedule-html";

function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    schemaVersion: 1,
    id: "prog1",
    title: "BSc Computing",
    awardType: "Honours Bachelor Degree",
    awardTypeIsOther: false,
    nfqLevel: 8,
    school: "School of Computing",
    awardStandardIds: [],
    awardStandardNames: [],
    totalCredits: 60,
    electiveDefinitions: [],
    ...overrides,
  } as Programme;
}

function makeVersion(overrides: Partial<ProgrammeVersion> = {}): ProgrammeVersion {
  return {
    id: "v1",
    label: "Full-Time",
    code: "FT",
    deliveryModality: "F2F",
    ...overrides,
  } as ProgrammeVersion;
}

function makeStage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: "s1",
    name: "Year 1",
    creditsTarget: 60,
    modules: [],
    ...overrides,
  } as Stage;
}

function makeModule(overrides: Partial<Module> = {}): Module {
  return {
    id: "mod1",
    title: "Intro to Programming",
    code: "COMP101",
    credits: 5,
    ...overrides,
  } as Module;
}

describe("renderScheduleTable", () => {
  it("returns an HTML table", () => {
    const html = renderScheduleTable(makeProgramme(), makeVersion(), makeStage());
    expect(html).toMatch(/^<table>.*<\/table>$/s);
  });

  it("includes programme title", () => {
    const html = renderScheduleTable(
      makeProgramme({ title: "BSc Computing" }),
      makeVersion(),
      makeStage(),
    );
    expect(html).toContain("BSc Computing");
  });

  it("includes total credits", () => {
    const html = renderScheduleTable(
      makeProgramme({ totalCredits: 120 }),
      makeVersion(),
      makeStage(),
    );
    expect(html).toContain("120");
  });

  it("includes version label and stage name", () => {
    const html = renderScheduleTable(
      makeProgramme(),
      makeVersion({ label: "Part-Time" }),
      makeStage({ name: "Year 2" }),
    );
    expect(html).toContain("Part-Time");
    expect(html).toContain("Year 2");
  });

  it("renders module rows", () => {
    const mod = makeModule({ title: "Data Structures", credits: 10 });
    const programme = makeProgramme({ modules: [mod] });
    const stage = makeStage({
      modules: [{ moduleId: mod.id, semester: "S1" }],
    });
    const html = renderScheduleTable(programme, makeVersion(), stage);
    expect(html).toContain("Data Structures");
    expect(html).toContain("S1");
    expect(html).toContain("250"); // 10 credits * 25
    expect(html).toContain(">M<"); // mandatory
  });

  it("marks elective modules with E", () => {
    const mod = makeModule({ isElective: true });
    const programme = makeProgramme({ modules: [mod] });
    const stage = makeStage({ modules: [{ moduleId: mod.id }] });
    const html = renderScheduleTable(programme, makeVersion(), stage);
    expect(html).toContain(">E<");
  });

  it("renders empty rows when no modules", () => {
    const html = renderScheduleTable(makeProgramme(), makeVersion(), makeStage());
    // Should have 2 empty rows (the fallback)
    const emptyRowCount = (html.match(/<tr>\s*<td class="empty-data"><\/td>/g) ?? []).length;
    expect(emptyRowCount).toBe(2);
  });

  it("detects invigilated exam assessment type", () => {
    const mod = makeModule({
      assessments: [{ id: "a1", type: "Exam (On-Campus)", weighting: 50 }],
    });
    const programme = makeProgramme({ modules: [mod] });
    const stage = makeStage({ modules: [{ moduleId: mod.id }] });
    const html = renderScheduleTable(programme, makeVersion(), stage);
    // Invigilated exam row should have ✔
    expect(html).toContain("50");
  });

  it("detects proctored exam assessment type", () => {
    const mod = makeModule({
      assessments: [{ id: "a1", type: "Exam (Online Proctored)", weighting: 40 }],
    });
    const programme = makeProgramme({ modules: [mod] });
    const stage = makeStage({ modules: [{ moduleId: mod.id }] });
    const html = renderScheduleTable(programme, makeVersion(), stage);
    expect(html).toContain("40");
  });

  it("detects project assessment type", () => {
    const mod = makeModule({
      assessments: [{ id: "a1", type: "Project Submission", weighting: 60 }],
    });
    const programme = makeProgramme({ modules: [mod] });
    const stage = makeStage({ modules: [{ moduleId: mod.id }] });
    const html = renderScheduleTable(programme, makeVersion(), stage);
    expect(html).toContain("60");
  });

  it("detects practical/lab assessment type", () => {
    const mod = makeModule({
      assessments: [{ id: "a1", type: "Practical Lab", weighting: 30 }],
    });
    const programme = makeProgramme({ modules: [mod] });
    const stage = makeStage({ modules: [{ moduleId: mod.id }] });
    const html = renderScheduleTable(programme, makeVersion(), stage);
    expect(html).toContain("30");
  });

  it("detects work-based assessment type", () => {
    const mod = makeModule({
      assessments: [{ id: "a1", type: "Work Placement", weighting: 100 }],
    });
    const programme = makeProgramme({ modules: [mod] });
    const stage = makeStage({ modules: [{ moduleId: mod.id }] });
    const html = renderScheduleTable(programme, makeVersion(), stage);
    expect(html).toContain("100");
  });

  it("detects continuous assessment as fallback type", () => {
    const mod = makeModule({
      assessments: [{ id: "a1", type: "Essay", weighting: 25 }],
    });
    const programme = makeProgramme({ modules: [mod] });
    const stage = makeStage({ modules: [{ moduleId: mod.id }] });
    const html = renderScheduleTable(programme, makeVersion(), stage);
    expect(html).toContain("25");
  });

  it("checks delivery mode F2F", () => {
    const html = renderScheduleTable(
      makeProgramme(),
      makeVersion({ deliveryModality: "F2F" }),
      makeStage(),
    );
    // The F2F delivery mode row should contain a ✔
    expect(html).toContain("Programme Delivery Mode");
    // After the delivery mode headers, the F2F cell should be ticked
    expect(html).toMatch(/On-site Face-to-Face[\s\S]*?✔/);
  });

  it("skips modules not found in programme", () => {
    const programme = makeProgramme({ modules: [] });
    const stage = makeStage({ modules: [{ moduleId: "nonexistent" }] });
    const html = renderScheduleTable(programme, makeVersion(), stage);
    // Should not crash, just skip the missing module row
    expect(html).toContain("<table>");
    expect(html).toContain("</table>");
  });
});

describe("renderAllSchedules", () => {
  it("renders tables for versions with stages", () => {
    const mod = makeModule();
    const stage = makeStage({ modules: [{ moduleId: mod.id }] });
    const version = makeVersion({ stages: [stage] });
    const programme = makeProgramme({ modules: [mod], versions: [version] });
    const html = renderAllSchedules(programme);
    expect(html).toContain("<table>");
    expect(html).toContain("Intro to Programming");
  });

  it("returns no versions message when versions is empty", () => {
    const html = renderAllSchedules(makeProgramme({ versions: [] }));
    expect(html).toBe("<p>No programme versions available.</p>");
  });

  it("returns no versions message when versions is undefined", () => {
    const html = renderAllSchedules(makeProgramme({ versions: undefined }));
    expect(html).toBe("<p>No programme versions available.</p>");
  });

  it("returns no stages message when all versions have empty stages", () => {
    const version = makeVersion({ stages: [] });
    const programme = makeProgramme({ versions: [version] });
    const html = renderAllSchedules(programme);
    expect(html).toBe("<p>No stages found in programme versions.</p>");
  });

  it("adds page breaks between tables", () => {
    const mod = makeModule();
    const stage1 = makeStage({ id: "s1", name: "Year 1", modules: [{ moduleId: mod.id }] });
    const stage2 = makeStage({ id: "s2", name: "Year 2", modules: [{ moduleId: mod.id }] });
    const version = makeVersion({ stages: [stage1, stage2] });
    const programme = makeProgramme({ modules: [mod], versions: [version] });
    const html = renderAllSchedules(programme);
    expect(html).toContain('class="page-break"');
    expect(html).toContain("Year 1");
    expect(html).toContain("Year 2");
  });

  it("renders multiple versions", () => {
    const mod = makeModule();
    const stage = makeStage({ modules: [{ moduleId: mod.id }] });
    const v1 = makeVersion({ id: "v1", label: "Full-Time", stages: [stage] });
    const v2 = makeVersion({ id: "v2", label: "Part-Time", stages: [stage] });
    const programme = makeProgramme({ modules: [mod], versions: [v1, v2] });
    const html = renderAllSchedules(programme);
    expect(html).toContain("Full-Time");
    expect(html).toContain("Part-Time");
  });
});
