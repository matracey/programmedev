// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Effort Hours step E2E tests — workflow-level coverage only.
 *
 * Individual field editing, heading, module selector, re-render stability,
 * and per-modality display are covered by unit tests in
 * EffortHoursStep.test.tsx.
 */

test.describe("Step 8: Effort Hours", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(500);

    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(300);

    const modalityRadio = page.getByTestId(/^version-modality-.*-F2F$/);
    if ((await modalityRadio.count()) > 0) {
      await modalityRadio.first().click();
      await page.waitForTimeout(300);
    }

    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(200);

    await page
      .getByTestId(/^module-code-/)
      .first()
      .fill("CMP8001");
    await page
      .getByTestId(/^module-title-/)
      .first()
      .fill("Software Development");
    await page
      .getByTestId(/^module-credits-/)
      .first()
      .fill("10");
    await page.waitForTimeout(500);

    await page.getByTestId("step-effort-hours").click();
    await page.waitForTimeout(300);
  });

  test("should enter effort hours and calculate total", async ({ page }) => {
    const classroomInput = page.getByTestId(/^effort-classroom-hours-/).first();
    const mentoringInput = page.getByTestId(/^effort-mentoring-hours-/).first();
    const elearningInput = page.getByTestId(/^effort-directed-elearning-/).first();
    const independentInput = page.getByTestId(/^effort-independent-learning-/).first();

    await classroomInput.fill("48");
    await page.waitForTimeout(200);
    await mentoringInput.fill("12");
    await page.waitForTimeout(200);
    await elearningInput.fill("40");
    await page.waitForTimeout(200);
    await independentInput.fill("150");
    await page.waitForTimeout(600);

    const totalDisplay = page.getByTestId(/^effort-total-/).first();
    const totalText = await totalDisplay.textContent();
    expect(totalText).toBeTruthy();

    const data = await getProgrammeData(page);
    expect(data.modules[0].effortHours).toBeDefined();
  });

  test("should show effort hours table for version modality", async ({ page }) => {
    const effortRows = page.getByTestId(/^effort-row-/);
    await expect(effortRows.first()).toBeVisible();
    const count = await effortRows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
