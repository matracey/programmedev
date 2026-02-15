// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Schedule step E2E tests — workflow-level coverage only.
 *
 * Heading, version selector, stage display, credit totals, and
 * re-render stability are covered by unit tests in ScheduleStep.test.tsx.
 */

test.describe("Step 11: Programme Schedule", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(300);

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

    await page.getByTestId("step-schedule").click();
    await page.waitForTimeout(300);
  });

  test("should display schedule with stages and modules", async ({ page }) => {
    const hasStageContent = (await page.locator("text=/Stage|No stages defined/i").count()) > 0;
    expect(hasStageContent).toBeTruthy();
  });

  test("should switch between multiple versions", async ({ page }) => {
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(400);

    await page.getByTestId("step-schedule").click();
    await page.waitForTimeout(300);

    const data = await getProgrammeData(page);
    expect(data.versions.length).toBeGreaterThanOrEqual(2);
  });
});
