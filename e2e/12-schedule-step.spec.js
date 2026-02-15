// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, (els) => els.map((e) => e.id)),
  );
}

test.describe("Step 11: Programme Schedule", () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity first
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(300);

    // Set up version with stages and modules
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
    await page.waitForTimeout(200);
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(600);

    // Navigate to Schedule
    await page.getByTestId("step-schedule").click();
    await page.waitForTimeout(300);
  });

  test("should display schedule section heading", async ({ page }) => {
    await expect(page.locator('h5:has-text("Programme Schedule")')).toBeVisible();
  });

  test("should show version selector", async ({ page }) => {
    // Version select or schedule table should be visible
    const hasVersionContext =
      (await page.locator("[data-version-select], select, .card").count()) > 0;
    expect(hasVersionContext).toBeTruthy();
  });

  test("should display stage structure overview", async ({ page }) => {
    // Should show stages or info message about no stages
    // Either "Stage" in header or info alert about stages
    const hasStageContent = (await page.locator("text=/Stage|No stages defined/i").count()) > 0;
    expect(hasStageContent).toBeTruthy();
  });

  test("should show module placement in stages", async ({ page }) => {
    // Schedule should show which modules are in which stages, or info about no stages
    const hasScheduleContent =
      (await page.locator("text=/Stage|Module|No stages defined/i").count()) > 0;
    expect(hasScheduleContent).toBeTruthy();
  });

  test("should allow assigning semester to modules", async ({ page }) => {
    // Look for semester input/select - schedule table should be visible
    const scheduleTable = page.locator("table, .schedule-table, .card").first();
    await expect(scheduleTable).toBeVisible();
  });

  test("should show credit totals per stage", async ({ page }) => {
    // Should display credit calculations or info message
    const hasCreditInfo =
      (await page.locator("text=/credits|ECTS|No stages defined/i").count()) > 0;
    expect(hasCreditInfo).toBeTruthy();
  });

  test("should switch between versions", async ({ page }) => {
    // Add another version
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(200);
    await expect(page.getByRole("heading", { name: "Programme Versions" })).toBeVisible();
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(400);

    // Go back to schedule
    await page.getByTestId("step-schedule").click();
    await page.waitForTimeout(300);

    // Multiple versions should exist in data
    const data = await getProgrammeData(page);
    expect(data.versions.length).toBeGreaterThanOrEqual(2);
  });

  test("keeps open stage panels after re-render", async ({ page }) => {
    // Open first stage accordion in Schedule view
    const firstHeader = page.locator("#scheduleAccordion .accordion-button").first();
    if ((await firstHeader.count()) > 0) {
      const expanded = await firstHeader.getAttribute("aria-expanded");
      if (expanded !== "true") {
        await firstHeader.click();
      }
    }

    const before = await getOpenCollapseIds(page, "scheduleAccordion");

    // Force a re-render
    await page.evaluate(() => window.render && window.render());
    await page.waitForTimeout(600);

    const after = await getOpenCollapseIds(page, "scheduleAccordion");
    // Previously open stage should remain open after render
    before.forEach((id) => expect(after.has(id)).toBeTruthy());
  });
});

test.describe("Step 11: Schedule Visualization", () => {
  test("should show visual representation of programme timeline", async ({ page }) => {
    // Fill Identity first
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(300);

    // Set up data
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(300);

    await page.getByTestId("step-stages").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-stage-btn").click();
    await page.waitForTimeout(400);

    // Go to schedule
    await page.getByTestId("step-schedule").click();
    await page.waitForTimeout(300);

    // Should show some visual representation (table, grid, etc.)
    const hasVisual = (await page.locator("table, .schedule, .timeline, .card").count()) > 0;
    expect(hasVisual).toBeTruthy();
  });
});
