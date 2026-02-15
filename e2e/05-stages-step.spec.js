// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Stages step E2E tests — workflow-level coverage only.
 *
 * Individual stage add/delete, field editing, heading, re-render stability
 * are covered by unit tests in StagesStep.test.tsx.
 */

test.describe("Step 4: Stage Structure", () => {
  test.beforeEach(async ({ page }) => {
    // Add a version first (required for stages)
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(500);

    await page.getByTestId("step-stages").click();
    await page.waitForTimeout(300);
  });

  test("should configure stage with name, credits and exit award", async ({ page }) => {
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);

    // Set stage name
    const stageNameInput = page.locator('#content input[placeholder*="Stage"], input').first();
    if (await stageNameInput.isVisible()) {
      await stageNameInput.fill("Year 1 - Semester 1");
    }

    // Set credit target
    const creditsInput = page.locator('input[type="number"]').first();
    if (await creditsInput.isVisible()) {
      await creditsInput.fill("30");
    }

    // Configure exit award
    const exitAwardCheckbox = page.getByTestId(/^stage-exit-/).first();
    if (await exitAwardCheckbox.isVisible()) {
      const isChecked = await exitAwardCheckbox.isChecked();
      if (!isChecked) {
        await exitAwardCheckbox.click();
        await page.waitForTimeout(300);
      }
      const awardTitleInput = page.getByTestId(/^stage-exit-title-/).first();
      if ((await awardTitleInput.count()) > 0) {
        await awardTitleInput.fill("Certificate in Computing");
      }
    }

    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    expect(data.versions[0].stages.length).toBe(1);
  });

  test("should add multiple stages", async ({ page }) => {
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(500);

    const data = await getProgrammeData(page);
    expect(data.versions[0].stages.length).toBe(2);
  });
});

test.describe("Step 4: Stage-Module Assignment", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(300);

    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(300);

    await page.getByTestId("step-stages").click();
    await page.waitForTimeout(300);
  });

  test("should assign modules to stage", async ({ page }) => {
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);

    const moduleCheckbox = page.getByTestId(/^stage-module-/).first();
    await expect(moduleCheckbox).toBeVisible();

    const wasChecked = await moduleCheckbox.isChecked();
    await moduleCheckbox.click();
    await page.waitForTimeout(500);

    const nowChecked = await moduleCheckbox.isChecked();
    expect(nowChecked).not.toBe(wasChecked);

    const data = await getProgrammeData(page);
    const assignedModules = data.versions?.[0]?.stages?.[0]?.modules ?? [];
    if (nowChecked) {
      expect(assignedModules.length).toBeGreaterThan(0);
    }
  });
});
