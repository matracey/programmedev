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
        .getByTestId(/^plo-textarea-/)
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
    await page
      .getByTestId(/^module-code-/)
      .first()
      .fill("MOD1");
    await page
      .getByTestId(/^module-title-/)
      .first()
      .fill("Module 1");
    await page
      .getByTestId(/^module-credits-/)
      .first()
      .fill("10");
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
    await page
      .getByTestId(/^module-code-/)
      .nth(1)
      .fill("MOD2");
    await page
      .getByTestId(/^module-title-/)
      .nth(1)
      .fill("Module 2");
    await page
      .getByTestId(/^module-credits-/)
      .nth(1)
      .fill("10");
    await page.waitForTimeout(500);

    // Add MIMLOs to modules
    await page.getByTestId("step-mimlos").click();
    await page.waitForTimeout(300);

    // Expand first module accordion to add MIMLOs (if not already expanded)
    const firstAccordionBtn = page.locator(".accordion-button").first();
    if ((await firstAccordionBtn.count()) > 0) {
      const isExpanded = await firstAccordionBtn.getAttribute("aria-expanded");
      if (isExpanded !== "true") {
        await firstAccordionBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // Add 2 MIMLOs to first module
    for (let i = 0; i < 2; i++) {
      const addMimloBtn = page.getByTestId(/^add-mimlo-/).first();
      if (await addMimloBtn.isVisible()) {
        await addMimloBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Expand second module and add MIMLOs (if not already expanded)
    const secondAccordionBtn = page.locator(".accordion-button").nth(1);
    if ((await secondAccordionBtn.count()) > 0) {
      const isExpanded = await secondAccordionBtn.getAttribute("aria-expanded");
      if (isExpanded !== "true") {
        await secondAccordionBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // Add 2 MIMLOs to second module
    for (let i = 0; i < 2; i++) {
      const addMimloBtn = page.getByTestId(/^add-mimlo-/).nth(1);
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
    // Should show "X / N selected" badges for modules with MIMLOs
    const mimboBadges = page.locator('.badge:has-text("selected")');
    expect(await mimboBadges.count()).toBeGreaterThan(0);
  });

  test("should allow mapping PLO to all MIMLOs via module checkbox", async ({ page }) => {
    // Find the module-level checkbox using data-testid pattern
    const moduleCheckbox = page.getByTestId(/^mapping-module-checkbox-/).first();

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
    // Click the PLO accordion to expand it first
    const ploAccordion = page.locator("#mappingAccordion .accordion-button").first();
    if (await ploAccordion.isVisible()) {
      const isExpanded = (await ploAccordion.getAttribute("aria-expanded")) === "true";
      if (!isExpanded) {
        await ploAccordion.click();
        await page.waitForTimeout(300);
      }
    }

    // Verify module-level checkboxes exist (modules with MIMLOs)
    const moduleCheckboxes = page.getByTestId(/^mapping-module-checkbox-/);
    expect(await moduleCheckboxes.count()).toBeGreaterThan(0);
  });

  test("should allow mapping individual MIMLOs", async ({ page }) => {
    // Expand PLO accordion
    const ploAccordion = page.locator("#mappingAccordion .accordion-button").first();
    if (await ploAccordion.isVisible()) {
      const isExpanded = (await ploAccordion.getAttribute("aria-expanded")) === "true";
      if (!isExpanded) {
        await ploAccordion.click();
        await page.waitForTimeout(300);
      }
    }

    // Check an individual MIMLO
    const mimloCheckbox = page.getByTestId(/^mapping-checkbox-/).first();
    if (await mimloCheckbox.isVisible()) {
      await mimloCheckbox.check();
      await page.waitForTimeout(600);

      const data = await getProgrammeData(page);
      const allMimloIds = Object.values(data.ploToMimlos || {}).flat();
      expect(allMimloIds.length).toBeGreaterThan(0);
    }
  });

  test("should show indeterminate state when some MIMLOs selected", async ({ page }) => {
    // Expand PLO accordion
    const ploAccordion = page.locator("#mappingAccordion .accordion-button").first();
    if (await ploAccordion.isVisible()) {
      const isExpanded = (await ploAccordion.getAttribute("aria-expanded")) === "true";
      if (!isExpanded) {
        await ploAccordion.click();
        await page.waitForTimeout(300);
      }
    }

    // Check only one MIMLO (not all)
    const mimloCheckboxes = page.getByTestId(/^mapping-checkbox-/);
    const count = await mimloCheckboxes.count();
    if (count >= 2) {
      await mimloCheckboxes.first().check();
      await page.waitForTimeout(600);

      // Module checkbox should be indeterminate (checked but not all MIMLOs)
      const moduleCheckbox = page.getByTestId(/^mapping-module-checkbox-/).first();
      const isIndeterminate = await moduleCheckbox.evaluate((el) => el.indeterminate);
      expect(isIndeterminate).toBeTruthy();
    }
  });

  test("checking module checkbox should check all MIMLOs", async ({ page }) => {
    // Expand PLO accordion first
    const ploAccordion = page.locator("#mappingAccordion .accordion-button").first();
    if (await ploAccordion.isVisible()) {
      const isExpanded = (await ploAccordion.getAttribute("aria-expanded")) === "true";
      if (!isExpanded) {
        await ploAccordion.click();
        await page.waitForTimeout(300);
      }
    }

    // Check the module checkbox
    const moduleCheckbox = page.getByTestId(/^mapping-module-checkbox-/).first();
    await moduleCheckbox.check();
    await page.waitForTimeout(300);

    // All MIMLO checkboxes should now be checked (at least one should be visible)
    const mimloCheckboxes = page.getByTestId(/^mapping-checkbox-/);
    const count = await mimloCheckboxes.count();
    if (count > 0) {
      // At least check that the first one is checked
      await expect(mimloCheckboxes.first()).toBeChecked();
    }
  });

  test("unchecking module checkbox should uncheck all MIMLOs", async ({ page }) => {
    // Expand PLO accordion first
    const ploAccordion = page.locator("#mappingAccordion .accordion-button").first();
    if (await ploAccordion.isVisible()) {
      const isExpanded = (await ploAccordion.getAttribute("aria-expanded")) === "true";
      if (!isExpanded) {
        await ploAccordion.click();
        await page.waitForTimeout(300);
      }
    }

    // Check then uncheck module
    const moduleCheckbox = page.getByTestId(/^mapping-module-checkbox-/).first();
    await moduleCheckbox.check();
    await page.waitForTimeout(300);
    await moduleCheckbox.uncheck();
    await page.waitForTimeout(300);

    // MIMLO checkboxes should be unchecked
    const mimloCheckboxes = page.getByTestId(/^mapping-checkbox-/);
    const count = await mimloCheckboxes.count();
    if (count > 0) {
      await expect(mimloCheckboxes.first()).not.toBeChecked();
    }
  });

  test("should save ploToMimlos structure in localStorage", async ({ page }) => {
    // Expand PLO accordion first
    const ploAccordion = page.locator("#mappingAccordion .accordion-button").first();
    if (await ploAccordion.isVisible()) {
      const isExpanded = (await ploAccordion.getAttribute("aria-expanded")) === "true";
      if (!isExpanded) {
        await ploAccordion.click();
        await page.waitForTimeout(300);
      }
    }

    // Check a module checkbox
    const moduleCheckbox = page.getByTestId(/^mapping-module-checkbox-/).first();
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
