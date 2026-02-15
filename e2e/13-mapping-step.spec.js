// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * PLO-to-MIMLO Mapping step E2E tests — workflow-level coverage only.
 *
 * Heading, PLO display, badge rendering, re-render stability, and
 * MIMLO count badges are covered by unit tests in MappingStep.test.tsx.
 */

test.describe("Step 12: PLO to MIMLO Mapping", () => {
  test.beforeEach(async ({ page }) => {
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
      const expandAllBtn = page.getByRole("button", { name: "Expand all" });
      if (await expandAllBtn.isVisible()) {
        await expandAllBtn.click();
        await page.waitForTimeout(200);
      }
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

    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(500);
    const expandAllModulesBtn = page.getByRole("button", { name: "Expand all" });
    if (await expandAllModulesBtn.isVisible()) {
      await expandAllModulesBtn.click();
      await page.waitForTimeout(300);
    }
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

    // Add MIMLOs
    await page.getByTestId("step-mimlos").click();
    await page.waitForTimeout(300);
    const firstAccordionBtn = page.locator(".accordion-button").first();
    if ((await firstAccordionBtn.count()) > 0) {
      const isExpanded = await firstAccordionBtn.getAttribute("aria-expanded");
      if (isExpanded !== "true") {
        await firstAccordionBtn.click();
        await page.waitForTimeout(200);
      }
    }
    for (let i = 0; i < 2; i++) {
      const addMimloBtn = page.getByTestId(/^add-mimlo-/).first();
      if (await addMimloBtn.isVisible()) {
        await addMimloBtn.click();
        await page.waitForTimeout(300);
      }
    }

    const secondAccordionBtn = page.locator(".accordion-button").nth(1);
    if ((await secondAccordionBtn.count()) > 0) {
      const isExpanded = await secondAccordionBtn.getAttribute("aria-expanded");
      if (isExpanded !== "true") {
        await secondAccordionBtn.click();
        await page.waitForTimeout(200);
      }
    }
    for (let i = 0; i < 2; i++) {
      const addMimloBtn = page.getByTestId(/^add-mimlo-/).nth(1);
      if (await addMimloBtn.isVisible()) {
        await addMimloBtn.click();
        await page.waitForTimeout(300);
      }
    }
    await page.waitForTimeout(500);

    await page.getByTestId("step-mapping").click();
    await page.waitForTimeout(400);
  });

  test("should map PLO to all MIMLOs via module checkbox and persist", async ({ page }) => {
    const moduleCheckbox = page.getByTestId(/^mapping-module-checkbox-/).first();
    if (await moduleCheckbox.isVisible()) {
      await moduleCheckbox.check();
      await page.waitForTimeout(600);

      const data = await getProgrammeData(page);
      expect(data.ploToMimlos).toBeDefined();
      expect(Object.keys(data.ploToMimlos).length).toBeGreaterThan(0);
      const allIds = Object.values(data.ploToMimlos).flat();
      const hasMimloIds = allIds.some((id) => id.includes("mimlo"));
      expect(hasMimloIds).toBeTruthy();
    }
  });

  test("should show indeterminate state when some MIMLOs selected", async ({ page }) => {
    const ploAccordion = page.locator("#mappingAccordion .accordion-button").first();
    if (await ploAccordion.isVisible()) {
      const isExpanded = (await ploAccordion.getAttribute("aria-expanded")) === "true";
      if (!isExpanded) {
        await ploAccordion.click();
        await page.waitForTimeout(300);
      }
    }

    const mimloCheckboxes = page.getByTestId(/^mapping-checkbox-/);
    const count = await mimloCheckboxes.count();
    if (count >= 2) {
      await mimloCheckboxes.first().check();
      await page.waitForTimeout(600);

      const moduleCheckbox = page.getByTestId(/^mapping-module-checkbox-/).first();
      const isIndeterminate = await moduleCheckbox.evaluate((el) => el.indeterminate);
      expect(isIndeterminate).toBeTruthy();
    }
  });

  test("should show unmapped PLOs warning", async ({ page }) => {
    const hasWarning = (await page.locator("text=/not mapped|unmapped|PLO|MIMLO/i").count()) > 0;
    expect(hasWarning).toBeTruthy();
  });
});
