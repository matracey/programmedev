// @ts-check
import { expect, getProgrammeData, loadProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Tests for migrateProgramme function
 * Validates that old programme data (v1/v2/v3) is correctly migrated to current schema (v4)
 *
 * Note: When old data is loaded into localStorage and the app loads, the migration happens
 * in-memory. We trigger a save by making a small UI change to persist the migrated state.
 */

/**
 * Helper to trigger save by making a minor UI interaction
 */
async function triggerSave(page) {
  // Focus and blur the title input to trigger the debounced save
  const titleInput = page.getByTestId("title-input");
  const currentValue = await titleInput.inputValue();
  await titleInput.fill(currentValue + " ");
  await titleInput.fill(currentValue); // restore original
  await page.waitForTimeout(600); // wait for debounced save
}

test.describe("Programme Migration - localStorage Path", () => {
  test("should migrate v3 data to v4 with ploToMimlos", async ({ page }) => {
    const v3Data = {
      schemaVersion: 3,
      title: "V3 Programme",
      nfqLevel: 8,
      totalCredits: 60,
      awardStandardIds: ["computing"],
      awardStandardNames: ["Computing"],
      versions: [
        {
          id: "v1",
          label: "FT",
          deliveryModality: "F2F",
          deliveryPatterns: { F2F: { weeks: 12 } },
        },
      ],
      modules: [
        { id: "mod1", title: "Module 1", code: "MOD001", credits: 5, mimlos: [{ id: "mim1" }] },
      ],
      plos: [{ id: "plo1", text: "PLO 1" }],
      ploToModules: { plo1: ["mod1"] },
    };

    await loadProgrammeData(page, v3Data);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    expect(data.title).toBe("V3 Programme");
    expect(data.awardStandardIds).toEqual(["computing"]);
    expect(data.awardStandardNames).toEqual(["Computing"]);
    expect(data.versions[0].deliveryModality).toBe("F2F");
    // ploToModules should be migrated to ploToMimlos
    expect(data.ploToMimlos.plo1).toEqual(["mim1"]);
    // ploToModules should be removed after migration
    expect(data.ploToModules).toBeUndefined();
  });

  test("should not modify data already at schemaVersion 4", async ({ page }) => {
    const v4Data = {
      schemaVersion: 4,
      title: "V4 Programme",
      nfqLevel: 8,
      totalCredits: 60,
      awardStandardIds: ["computing"],
      awardStandardNames: ["Computing"],
      versions: [
        {
          id: "v1",
          label: "FT",
          deliveryModality: "F2F",
          deliveryPatterns: { F2F: { weeks: 12 } },
        },
      ],
      modules: [],
      plos: [],
      ploToMimlos: {},
    };

    await loadProgrammeData(page, v4Data);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    expect(data.title).toBe("V4 Programme");
    expect(data.awardStandardIds).toEqual(["computing"]);
    expect(data.awardStandardNames).toEqual(["Computing"]);
    expect(data.versions[0].deliveryModality).toBe("F2F");
    // Should not have singular fields
    expect(data.awardStandardId).toBeUndefined();
    expect(data.awardStandardName).toBeUndefined();
  });

  test("should migrate data without schemaVersion (treated as v1)", async ({ page }) => {
    const legacyData = {
      // No schemaVersion - treated as v1
      title: "Legacy Programme",
      nfqLevel: 7,
      totalCredits: 120,
      modules: [],
      plos: [],
    };

    await loadProgrammeData(page, legacyData);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    expect(data.title).toBe("Legacy Programme");
    // Should have array fields initialized
    expect(Array.isArray(data.awardStandardIds)).toBe(true);
    expect(Array.isArray(data.awardStandardNames)).toBe(true);
    expect(Array.isArray(data.versions)).toBe(true);
    // Should have ploToMimlos initialized
    expect(data.ploToMimlos).toEqual({});
  });

  test("should convert singular awardStandardId to awardStandardIds array", async ({ page }) => {
    const v1Data = {
      schemaVersion: 1,
      title: "V1 Programme with Single Standard",
      nfqLevel: 8,
      awardStandardId: "business",
      awardStandardName: "Business",
      modules: [],
      plos: [],
    };

    await loadProgrammeData(page, v1Data);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    // Singular fields should be converted to arrays
    expect(data.awardStandardIds).toEqual(["business"]);
    expect(data.awardStandardNames).toEqual(["Business"]);
    // Old singular fields should be removed
    expect(data.awardStandardId).toBeUndefined();
    expect(data.awardStandardName).toBeUndefined();
    // Should have ploToMimlos initialized
    expect(data.ploToMimlos).toEqual({});
  });

  test("should handle empty singular awardStandardId", async ({ page }) => {
    const v1Data = {
      schemaVersion: 1,
      title: "V1 Programme without Standard",
      awardStandardId: "",
      awardStandardName: "",
      modules: [],
      plos: [],
    };

    await loadProgrammeData(page, v1Data);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    // Empty strings should result in empty arrays
    expect(data.awardStandardIds).toEqual([]);
    expect(data.awardStandardNames).toEqual([]);
    // Should have ploToMimlos initialized
    expect(data.ploToMimlos).toEqual({});
  });

  test("should convert deliveryModalities array to deliveryModality in versions", async ({
    page,
  }) => {
    const v1Data = {
      schemaVersion: 1,
      title: "V1 with Delivery Modalities",
      versions: [
        {
          id: "v1",
          label: "Full-time",
          deliveryModalities: ["F2F", "Blended"],
          deliveryPatterns: { F2F: { weeks: 12 } },
        },
        {
          id: "v2",
          label: "Part-time",
          deliveryModalities: ["Online"],
          deliveryPatterns: { Online: { weeks: 24 } },
        },
      ],
      modules: [],
      plos: [],
    };

    await loadProgrammeData(page, v1Data);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    // First modality should be selected
    expect(data.versions[0].deliveryModality).toBe("F2F");
    expect(data.versions[1].deliveryModality).toBe("Online");
    // Old array should be removed
    expect(data.versions[0].deliveryModalities).toBeUndefined();
    expect(data.versions[1].deliveryModalities).toBeUndefined();
    // Should have ploToMimlos initialized
    expect(data.ploToMimlos).toEqual({});
  });

  test("should clean up legacy programme-level delivery fields", async ({ page }) => {
    const v1Data = {
      schemaVersion: 1,
      title: "V1 with Legacy Fields",
      deliveryMode: "blended",
      syncPattern: "weekly",
      deliveryModalities: ["F2F", "Online"],
      modules: [],
      plos: [],
    };

    await loadProgrammeData(page, v1Data);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    // Legacy fields should be removed
    expect(data.deliveryMode).toBeUndefined();
    expect(data.syncPattern).toBeUndefined();
    expect(data.deliveryModalities).toBeUndefined();
    // Should have ploToMimlos initialized
    expect(data.ploToMimlos).toEqual({});
  });

  test("should clean up standardsCache and _cachedStandards fields", async ({ page }) => {
    const v1Data = {
      schemaVersion: 1,
      title: "V1 with Cache Fields",
      standardsCache: {
        computing: {
          /* mock data */
        },
      },
      _cachedStandards: ["computing"],
      modules: [],
      plos: [],
    };

    await loadProgrammeData(page, v1Data);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    expect(data.standardsCache).toBeUndefined();
    expect(data._cachedStandards).toBeUndefined();
    // Should have ploToMimlos initialized
    expect(data.ploToMimlos).toEqual({});
  });

  test("should preserve existing modules and PLOs during migration", async ({ page }) => {
    const v1Data = {
      schemaVersion: 1,
      title: "V1 with Content",
      modules: [
        {
          id: "mod1",
          title: "Module 1",
          code: "MOD001",
          credits: 5,
          mimlos: [{ id: "mim1a" }, { id: "mim1b" }],
        },
        {
          id: "mod2",
          title: "Module 2",
          code: "MOD002",
          credits: 10,
          mimlos: [{ id: "mim2a" }],
        },
      ],
      plos: [
        { id: "plo1", text: "PLO 1 text" },
        { id: "plo2", text: "PLO 2 text" },
      ],
      ploToModules: { plo1: ["mod1"], plo2: ["mod1", "mod2"] },
    };

    await loadProgrammeData(page, v1Data);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    // Content should be preserved
    expect(data.modules.length).toBe(2);
    expect(data.modules[0].title).toBe("Module 1");
    expect(data.plos.length).toBe(2);
    expect(data.plos[0].text).toBe("PLO 1 text");
    // ploToModules should be converted to ploToMimlos
    expect(data.ploToMimlos.plo1).toEqual(["mim1a", "mim1b"]);
    expect(data.ploToMimlos.plo2).toEqual(["mim1a", "mim1b", "mim2a"]);
    // ploToModules should be removed
    expect(data.ploToModules).toBeUndefined();
  });

  test("should migrate v2 data directly to v4", async ({ page }) => {
    // V2 has old standard IDs that need mapping
    const v2Data = {
      schemaVersion: 2,
      title: "V2 Programme",
      nfqLevel: 8,
      totalCredits: 60,
      awardStandardIds: ["qqi-computing-l6-9"],
      awardStandardNames: ["Computing"],
      versions: [
        {
          id: "v1",
          label: "FT",
          deliveryModality: "F2F",
          deliveryPatterns: { F2F: { weeks: 12 } },
        },
      ],
      modules: [
        {
          id: "mod1",
          title: "Module 1",
          code: "MOD001",
          credits: 5,
          mimlos: [{ id: "mim1" }, { id: "mim2" }],
        },
      ],
      plos: [{ id: "plo1", text: "PLO 1" }],
      ploToModules: { plo1: ["mod1"] },
    };

    await loadProgrammeData(page, v2Data);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    // V2→V3 migration: old standard IDs should be mapped to new IDs
    expect(data.awardStandardIds).toEqual(["computing"]);
    // V3→V4 migration: ploToModules should be converted to ploToMimlos
    expect(data.ploToMimlos.plo1).toEqual(["mim1", "mim2"]);
    expect(data.ploToModules).toBeUndefined();
  });

  test("should handle v3 to v4 migration with modules without mimlos", async ({ page }) => {
    // V3 data with ploToModules but modules have no mimlos
    const v3Data = {
      schemaVersion: 3,
      title: "V3 Without MIMLOs",
      nfqLevel: 8,
      totalCredits: 60,
      awardStandardIds: ["computing"],
      awardStandardNames: ["Computing"],
      modules: [
        { id: "mod1", title: "Module 1", code: "MOD001", credits: 5 },
        { id: "mod2", title: "Module 2", code: "MOD002", credits: 10 },
      ],
      plos: [{ id: "plo1", text: "PLO 1" }],
      ploToModules: { plo1: ["mod1", "mod2"] },
    };

    await loadProgrammeData(page, v3Data);
    await page.waitForTimeout(500);
    await triggerSave(page);

    const data = await getProgrammeData(page);
    expect(data.schemaVersion).toBe(4);
    // Modules without mimlos result in empty ploToMimlos (no mappings)
    expect(data.ploToMimlos).toEqual({});
    expect(data.ploToModules).toBeUndefined();
  });
});

test.describe("Programme Migration - JSON Import Path", () => {
  test("should migrate imported v1 JSON to v4", async ({ page }) => {
    const v1Programme = {
      schemaVersion: 1,
      title: "Imported V1 Programme",
      awardStandardId: "science",
      awardStandardName: "Science",
      nfqLevel: 9,
      totalCredits: 90,
      modules: [],
      plos: [],
      versions: [
        {
          id: "imp-v1",
          label: "Imported",
          deliveryModalities: ["Blended"],
          deliveryPatterns: { Blended: { weeks: 15 } },
        },
      ],
    };

    // Find the file input for import
    const fileInput = page.locator('input[type="file"]');

    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles({
        name: "v1-import.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(v1Programme)),
      });

      await page.waitForTimeout(1000);

      const data = await getProgrammeData(page);
      expect(data.schemaVersion).toBe(4);
      expect(data.title).toBe("Imported V1 Programme");
      // Should be migrated to arrays
      expect(data.awardStandardIds).toEqual(["science"]);
      expect(data.awardStandardNames).toEqual(["Science"]);
      // Delivery modality should be converted
      expect(data.versions[0].deliveryModality).toBe("Blended");
      expect(data.versions[0].deliveryModalities).toBeUndefined();
      // Should have ploToMimlos initialized
      expect(data.ploToMimlos).toEqual({});
    }
  });

  test("should migrate imported v3 JSON to v4", async ({ page }) => {
    const v3Programme = {
      schemaVersion: 3,
      title: "Imported V3 Programme",
      awardStandardIds: ["computing", "science"],
      awardStandardNames: ["Computing", "Science"],
      nfqLevel: 8,
      totalCredits: 60,
      modules: [
        {
          id: "m1",
          title: "Test Module",
          code: "TST001",
          credits: 5,
          mimlos: [{ id: "mim1" }],
        },
      ],
      plos: [{ id: "p1", text: "Test PLO" }],
      ploToModules: { p1: ["m1"] },
      versions: [
        {
          id: "v2-v1",
          label: "V2 Version",
          deliveryModality: "Online",
          deliveryPatterns: { Online: { weeks: 10 } },
        },
      ],
    };

    const fileInput = page.locator('input[type="file"]');

    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles({
        name: "v3-import.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(v3Programme)),
      });

      await page.waitForTimeout(1000);

      const data = await getProgrammeData(page);
      expect(data.schemaVersion).toBe(4);
      expect(data.awardStandardIds).toEqual(["computing", "science"]);
      expect(data.versions[0].deliveryModality).toBe("Online");
      expect(data.modules.length).toBe(1);
      // ploToModules should be converted to ploToMimlos
      expect(data.ploToMimlos.p1).toEqual(["mim1"]);
      expect(data.ploToModules).toBeUndefined();
    }
  });

  test("should accept and preserve imported v4 JSON unchanged", async ({ page }) => {
    const v4Programme = {
      schemaVersion: 4,
      title: "Imported V4 Programme",
      awardStandardIds: ["computing"],
      awardStandardNames: ["Computing"],
      nfqLevel: 8,
      totalCredits: 60,
      modules: [
        {
          id: "m1",
          title: "Test Module",
          code: "TST001",
          credits: 5,
          mimlos: [{ id: "mim1" }],
        },
      ],
      plos: [{ id: "p1", text: "Test PLO" }],
      ploToMimlos: { p1: ["mim1"] },
      versions: [
        {
          id: "v4-v1",
          label: "V4 Version",
          deliveryModality: "F2F",
          deliveryPatterns: { F2F: { weeks: 12 } },
        },
      ],
    };

    const fileInput = page.locator('input[type="file"]');

    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles({
        name: "v4-import.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(v4Programme)),
      });

      await page.waitForTimeout(1000);

      const data = await getProgrammeData(page);
      expect(data.schemaVersion).toBe(4);
      expect(data.title).toBe("Imported V4 Programme");
      expect(data.awardStandardIds).toEqual(["computing"]);
      expect(data.ploToMimlos.p1).toEqual(["mim1"]);
      expect(data.modules.length).toBe(1);
    }
  });
});

test.describe("Programme Migration - UI Verification", () => {
  test("should display migrated award standards in Identity step", async ({ page }) => {
    const v1Data = {
      schemaVersion: 1,
      title: "V1 UI Test",
      nfqLevel: 8,
      awardStandardId: "computing",
      awardStandardName: "Computing",
      modules: [],
      plos: [],
    };

    await loadProgrammeData(page, v1Data);
    await page.waitForTimeout(500);

    // Navigate to Identity step
    await page.getByTestId("step-identity").click();
    await page.waitForTimeout(300);

    // The first standard selector should show Computing as selected value
    const firstStandardSelect = page.locator("select").nth(2); // The third select on the page (after award type and school)
    await expect(firstStandardSelect).toHaveValue("computing");
  });

  test("should display migrated delivery modality in Versions step", async ({ page }) => {
    const v1Data = {
      schemaVersion: 1,
      title: "V1 Delivery Test",
      nfqLevel: 8,
      totalCredits: 60,
      versions: [
        {
          id: "test-v",
          label: "Test Version",
          cohortSize: 30,
          deliveryModalities: ["Blended"],
          deliveryPatterns: { Blended: { weeks: 12 } },
        },
      ],
      modules: [],
      plos: [],
    };

    await loadProgrammeData(page, v1Data);
    await page.waitForTimeout(500);

    // Navigate to Versions step
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(500);

    // Verify version label is visible
    await expect(page.getByText("Test Version")).toBeVisible();
    // Verify the version header shows Blended (format: "No code • Blended • No intakes")
    await expect(page.getByText("No code • Blended • No intakes")).toBeVisible();
  });
});
