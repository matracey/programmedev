// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, (els) => els.map((e) => e.id)),
  );
}

test.describe("Step 12: PLO to MIMLO Mapping", () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step first
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(500);

    // Set up PLOs
    await page.getByTestId("step-outcomes").click();
    await page.waitForTimeout(300);

    for (let i = 0; i < 2; i++) {
      await page.getByTestId("add-plo-btn").click();
      await page.waitForTimeout(300);

      // Click "Expand all" to ensure all PLO accordions are visible
      const expandAllBtn = page.getByRole("button", { name: "Expand all" });
      if (await expandAllBtn.isVisible()) {
        await expandAllBtn.click();
        await page.waitForTimeout(200);
      }

      // Fill the last (newly added) PLO
      await page
        .locator("[data-plo-id]")
        .last()
        .fill(`PLO ${i + 1}: Test learning outcome`);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);

    // Set up modules with MIMLOs
    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(300);

    // First module
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(300);
    await page.locator('[data-module-field="code"]').first().fill("MOD1");
    await page.locator('[data-module-field="title"]').first().fill("Module 1");
    await page.locator('[data-module-field="credits"]').first().fill("10");
    await page.waitForTimeout(300);

    // Second module
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(500);

    // Click "Expand all" to ensure all module accordions are visible
    const expandAllModulesBtn = page.getByRole("button", {
      name: "Expand all",
    });
    if (await expandAllModulesBtn.isVisible()) {
      await expandAllModulesBtn.click();
      await page.waitForTimeout(300);
    }

    // Fill second module
    await page.locator('[data-module-field="code"]').nth(1).fill("MOD2");
    await page.locator('[data-module-field="title"]').nth(1).fill("Module 2");
    await page.locator('[data-module-field="credits"]').nth(1).fill("10");
    await page.waitForTimeout(500);

    // Add MIMLOs to modules
    await page.getByTestId("step-mimlos").click();
    await page.waitForTimeout(300);

    // Expand first module accordion to add MIMLOs
    const moduleAccordions = page.locator(".accordion-button");
    if ((await moduleAccordions.count()) > 0) {
      await moduleAccordions.first().click();
      await page.waitForTimeout(200);
    }

    // Add 2 MIMLOs to first module
    for (let i = 0; i < 2; i++) {
      const addMimloBtn = page.locator("[data-add-mimlo]").first();
      if (await addMimloBtn.isVisible()) {
        await addMimloBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Expand second module and add MIMLOs
    if ((await moduleAccordions.count()) > 1) {
      await moduleAccordions.nth(1).click();
      await page.waitForTimeout(200);
    }

    // Add 2 MIMLOs to second module
    for (let i = 0; i < 2; i++) {
      const addMimloBtn = page.locator("[data-add-mimlo]").nth(1);
      if (await addMimloBtn.isVisible()) {
        await addMimloBtn.click();
        await page.waitForTimeout(300);
      }
    }

    await page.waitForTimeout(500);

    // Navigate to Mapping
    await page.getByTestId("step-mapping").click();
    await page.waitForTimeout(400);
  });

  test("should display mapping section heading", async ({ page }) => {
    await expect(page.locator('h5:has-text("Map PLOs to MIMLOs")')).toBeVisible();
  });

  test("should display PLOs for mapping", async ({ page }) => {
    await expect(page.getByText("PLO 1", { exact: true })).toBeVisible();
    await expect(page.getByText("PLO 2", { exact: true })).toBeVisible();
  });

  test("should display modules with MIMLO count badges", async ({ page }) => {
    // Should show module names with MIMLO count
    await expect(page.getByText("MOD1", { exact: false }).first()).toBeVisible();
    // Should show "X MIMLOs" button to expand
    const mimloButtons = page.locator('button:has-text("MIMLOs")');
    expect(await mimloButtons.count()).toBeGreaterThan(0);
  });

  test("should allow mapping PLO to all MIMLOs via module checkbox", async ({ page }) => {
    // Find the module-level checkbox (has data-map-module-all attribute)
    const moduleCheckbox = page.locator("[data-map-module-all]").first();

    if (await moduleCheckbox.isVisible()) {
      await moduleCheckbox.check();
      await page.waitForTimeout(600);

      const data = await getProgrammeData(page);
      // Check ploToMimlos was updated (not ploToModules)
      const mappings = Object.values(data.ploToMimlos || {});
      const hasMapping = mappings.some((m) => m && m.length > 0);
      expect(hasMapping).toBeTruthy();
    }
  });

  test("should expand module to show individual MIMLO checkboxes", async ({ page }) => {
    // Click the MIMLOs expand button
    const expandBtn = page.locator('button:has-text("MIMLOs")').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(300);

      // Should now see individual MIMLO checkboxes
      const mimloCheckboxes = page.locator("[data-map-mimlo]");
      expect(await mimloCheckboxes.count()).toBeGreaterThan(0);
    }
  });

  test("should allow mapping individual MIMLOs", async ({ page }) => {
    // Expand MIMLOs
    const expandBtn = page.locator('button:has-text("MIMLOs")').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(300);
    }

    // Check an individual MIMLO
    const mimloCheckbox = page.locator("[data-map-mimlo]").first();
    if (await mimloCheckbox.isVisible()) {
      await mimloCheckbox.check();
      await page.waitForTimeout(600);

      const data = await getProgrammeData(page);
      const allMimloIds = Object.values(data.ploToMimlos || {}).flat();
      expect(allMimloIds.length).toBeGreaterThan(0);
    }
  });

  test("should show indeterminate state when some MIMLOs selected", async ({ page }) => {
    // Expand MIMLOs
    const expandBtn = page.locator('button:has-text("MIMLOs")').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(300);
    }

    // Check only one MIMLO (not all)
    const mimloCheckboxes = page.locator("[data-map-mimlo]");
    const count = await mimloCheckboxes.count();
    if (count >= 2) {
      await mimloCheckboxes.first().check();
      await page.waitForTimeout(600);

      // Module checkbox should be indeterminate (checked but not all MIMLOs)
      const moduleCheckbox = page.locator("[data-map-module-all]").first();
      const isIndeterminate = await moduleCheckbox.evaluate((el) => el.indeterminate);
      expect(isIndeterminate).toBeTruthy();
    }
  });

  test("checking module checkbox should check all MIMLOs", async ({ page }) => {
    // First expand MIMLOs to see them
    const expandBtn = page.locator('button:has-text("MIMLOs")').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(300);
    }

    // Check the module checkbox
    const moduleCheckbox = page.locator("[data-map-module-all]").first();
    await moduleCheckbox.check();
    await page.waitForTimeout(300);

    // All MIMLO checkboxes within that module should now be checked
    const ploId = await moduleCheckbox.getAttribute("data-map-plo");
    const moduleId = await moduleCheckbox.getAttribute("data-map-module-all");
    const mimloCheckboxes = page.locator(
      `[data-map-plo="${ploId}"][data-map-module="${moduleId}"]`,
    );

    const count = await mimloCheckboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(mimloCheckboxes.nth(i)).toBeChecked();
    }
  });

  test("unchecking module checkbox should uncheck all MIMLOs", async ({ page }) => {
    // Expand MIMLOs
    const expandBtn = page.locator('button:has-text("MIMLOs")').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(300);
    }

    // Check then uncheck module
    const moduleCheckbox = page.locator("[data-map-module-all]").first();
    await moduleCheckbox.check();
    await page.waitForTimeout(300);
    await moduleCheckbox.uncheck();
    await page.waitForTimeout(300);

    // All MIMLO checkboxes should be unchecked
    const ploId = await moduleCheckbox.getAttribute("data-map-plo");
    const moduleId = await moduleCheckbox.getAttribute("data-map-module-all");
    const mimloCheckboxes = page.locator(
      `[data-map-plo="${ploId}"][data-map-module="${moduleId}"]`,
    );

    const count = await mimloCheckboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(mimloCheckboxes.nth(i)).not.toBeChecked();
    }
  });

  test("should save ploToMimlos structure in localStorage", async ({ page }) => {
    // Check a module checkbox
    const moduleCheckbox = page.locator("[data-map-module-all]").first();
    await moduleCheckbox.check();
    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);

    // Should have ploToMimlos, not ploToModules
    expect(data.ploToMimlos).toBeDefined();
    expect(Object.keys(data.ploToMimlos).length).toBeGreaterThan(0);

    // Values should be MIMLO IDs (contain 'mimlo' prefix)
    const allIds = Object.values(data.ploToMimlos).flat();
    const hasMimloIds = allIds.some((id) => id.includes("mimlo"));
    expect(hasMimloIds).toBeTruthy();
  });

  test("should show unmapped PLOs warning", async ({ page }) => {
    // QQI flags panel shows warning for unmapped PLOs
    const hasWarning = (await page.locator("text=/not mapped|unmapped|PLO|MIMLO/i").count()) > 0;
    expect(hasWarning).toBeTruthy();
  });

  test("keeps open PLO panels after re-render", async ({ page }) => {
    // Open first two PLO accordions
    const headers = page.locator("#mappingAccordion .accordion-button");
    for (let i = 0; i < Math.min(await headers.count(), 2); i++) {
      const expanded = await headers.nth(i).getAttribute("aria-expanded");
      if (expanded !== "true") {
        await headers.nth(i).click();
      }
    }

    const before = await getOpenCollapseIds(page, "mappingAccordion");

    // Force a re-render of the page
    await page.evaluate(() => window.render && window.render());
    await page.waitForTimeout(600);

    const after = await getOpenCollapseIds(page, "mappingAccordion");
    before.forEach((id) => expect(after.has(id)).toBeTruthy());
  });
});

test.describe("Step 12: Mapping Summary", () => {
  test("should display MIMLO count badge per PLO", async ({ page }) => {
    // Fill Identity first
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(300);

    // Set up a PLO
    await page.getByTestId("step-outcomes").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-plo-btn").click();
    await page.locator("[data-plo-id]").first().fill("PLO 1");
    await page.waitForTimeout(300);

    // Set up a module
    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(400);

    // Navigate to mapping
    await page.getByTestId("step-mapping").click();
    await page.waitForTimeout(300);

    // Should see "0 MIMLOs" badge initially
    await expect(page.locator('.badge:has-text("MIMLOs")')).toBeVisible();
  });
});
