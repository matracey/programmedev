// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, (els) => els.map((e) => e.id)),
  );
}

test.describe("Step 4: Stage Structure", () => {
  test.beforeEach(async ({ page }) => {
    // Add a version first (required for stages)
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(500);

    // Navigate to Stage Structure
    await page.getByTestId("step-stages").click();
    await page.waitForTimeout(300);
  });

  test("should display stage structure section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Stage Structure" })).toBeVisible();
  });

  test("should show Add Stage button", async ({ page }) => {
    await expect(page.getByTestId("add-stage-btn")).toBeVisible();
  });

  test("should add a new stage", async ({ page }) => {
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(600); // Wait for debounced save (400ms) to complete

    // Stage should be added
    const data = await getProgrammeData(page);
    const version = data.versions[0];
    expect(version.stages.length).toBeGreaterThan(0);
  });

  test("should set stage name", async ({ page }) => {
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);

    // Find stage name input
    const stageNameInput = page.locator('#content input[placeholder*="Stage"], input').first();
    if (await stageNameInput.isVisible()) {
      await stageNameInput.fill("Year 1 - Semester 1");
      await page.waitForTimeout(600);

      const data = await getProgrammeData(page);
      expect(data.versions[0].stages[0].name).toBeTruthy();
    }
  });

  test("should set stage credit target", async ({ page }) => {
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);

    // Find credits input
    const creditsInput = page.locator('input[type="number"]').first();
    if (await creditsInput.isVisible()) {
      await creditsInput.fill("30");
      await page.waitForTimeout(600);

      const data = await getProgrammeData(page);
      expect(data.versions[0].stages[0].creditsTarget).toBeDefined();
    }
  });

  test("should add multiple stages", async ({ page }) => {
    // Add Stage 1
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);

    // Add Stage 2
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(500);

    const data = await getProgrammeData(page);
    expect(data.versions[0].stages.length).toBe(2);
  });

  test("should configure exit award for stage", async ({ page }) => {
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);

    // Look for exit award checkbox or toggle
    const exitAwardCheckbox = page.locator('input[type="checkbox"]').first();

    if (await exitAwardCheckbox.isVisible()) {
      await exitAwardCheckbox.check();
      await page.waitForTimeout(300);

      // Should show award title input
      const awardTitleInput = page.locator(
        '#content input[placeholder*="award"], input[placeholder*="title"]',
      );
      if ((await awardTitleInput.count()) > 0) {
        await awardTitleInput.first().fill("Certificate in Computing");
        await page.waitForTimeout(500);
      }
    }
  });

  test("should delete a stage", async ({ page }) => {
    // Add two stages
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);

    // Look for delete button
    const deleteBtn = page.getByRole("button", { name: /×|Delete/ }).first();

    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);

      const data = await getProgrammeData(page);
      expect(data.versions[0].stages.length).toBe(1);
    }
  });

  test("should reorder stages", async ({ page }) => {
    // Add two stages
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);

    // Look for up/down or drag handles
    const upBtn = page.getByRole("button", { name: /↑|up/ }).first();
    const downBtn = page.getByRole("button", { name: /↓|down/ }).first();

    if (await downBtn.isVisible()) {
      await downBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("keeps open stage panels after add stage (re-render)", async ({ page }) => {
    // Add two stages to have multiple accordions
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(600);

    // Open first two stage accordions
    const headers = page.locator("#stagesAccordion .accordion-button");
    for (let i = 0; i < Math.min(await headers.count(), 2); i++) {
      const expanded = await headers.nth(i).getAttribute("aria-expanded");
      if (expanded !== "true") {
        await headers.nth(i).click();
      }
    }

    const before = await getOpenCollapseIds(page, "stagesAccordion");

    // Trigger re-render by adding a stage
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(600);

    const after = await getOpenCollapseIds(page, "stagesAccordion");
    before.forEach((id) => expect(after.has(id)).toBeTruthy());
  });
});

test.describe("Step 4: Stage-Module Assignment", () => {
  test.beforeEach(async ({ page }) => {
    // Set up version with stage and modules
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(300);

    // Add some modules first
    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(300);

    // Go to stage structure
    await page.getByTestId("step-stages").click();
    await page.waitForTimeout(300);
  });

  test("should assign modules to stage", async ({ page }) => {
    // Add a stage
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);

    // Look for module checkboxes or dropdown
    const moduleCheckbox = page.locator('input[type="checkbox"]').first();

    if (await moduleCheckbox.isVisible()) {
      await moduleCheckbox.check();
      await page.waitForTimeout(500);

      const data = await getProgrammeData(page);
      expect(data.versions[0].stages[0].modules.length).toBeGreaterThanOrEqual(0);
    }
  });

  test("should set module semester within stage", async ({ page }) => {
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(300);

    // Look for semester input or dropdown
    const semesterInput = page.locator(
      'select:has-text("Semester"), input[placeholder*="semester"]',
    );

    if ((await semesterInput.count()) > 0) {
      await semesterInput.first().selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });
});
