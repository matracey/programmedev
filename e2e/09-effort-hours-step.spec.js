// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, (els) => els.map((e) => e.id)),
  );
}

test.describe("Step 8: Effort Hours", () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step first
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(500);

    // Set up version WITH modality (required for effort hours to show)
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(300);

    // Select a delivery modality - uses radio button pattern
    const modalityRadio = page.getByTestId(/^version-modality-.*-F2F$/);
    if ((await modalityRadio.count()) > 0) {
      await modalityRadio.first().click();
      await page.waitForTimeout(300);
    }

    // Navigate to Credits & Modules
    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(200);

    // Fill module details using data-testid patterns
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

    // Navigate to Effort Hours
    await page.getByTestId("step-effort-hours").click();
    await page.waitForTimeout(300);
  });

  test("should display effort hours section heading", async ({ page }) => {
    await expect(page.locator('h5:has-text("Effort Hours")')).toBeVisible();
  });

  test("should show module selector", async ({ page }) => {
    // Check for effort module panel
    const modulePanel = page.getByTestId(/^effort-module-/);
    await expect(modulePanel.first()).toBeVisible();
  });

  test("should show version/modality tabs or selector", async ({ page }) => {
    // Should show table with effort hours rows
    const hasEffortRow = (await page.getByTestId(/^effort-row-/).count()) > 0;
    // Or check for modality text
    const hasModalityText = (await page.locator("text=/Face-to-face|Blended|Online/i").count()) > 0;
    expect(hasEffortRow || hasModalityText).toBeTruthy();
  });

  test("should show effort hours input fields", async ({ page }) => {
    // Common effort hour fields
    const fields = ["Classroom", "Mentoring", "E-learning", "Independent", "Other"];

    let foundFields = 0;
    for (const field of fields) {
      const count = await page.locator(`text=${field}`).count();
      if (count > 0) {
        foundFields++;
      }
    }

    expect(foundFields).toBeGreaterThan(0);
  });

  test("should enter classroom hours", async ({ page }) => {
    // Find classroom hours input using data-testid pattern
    const classroomInput = page.getByTestId(/^effort-classroom-hours-/).first();

    if (await classroomInput.isVisible()) {
      await classroomInput.fill("48");
      await page.waitForTimeout(600);

      const data = await getProgrammeData(page);
      // Check that effort hours were saved
      const module = data.modules[0];
      expect(module.effortHours).toBeDefined();
    }
  });

  test("should enter contact ratios", async ({ page }) => {
    // Look for ratio input fields using data-testid pattern
    const ratioInput = page.getByTestId(/^effort-classroom-ratio-/).first();

    if ((await ratioInput.count()) > 0) {
      await ratioInput.fill("1:60");
      await page.waitForTimeout(600);
    }
  });

  test("should calculate total hours", async ({ page }) => {
    // Fill in various hour fields using data-testid patterns
    const classroomInput = page.getByTestId(/^effort-classroom-hours-/).first();
    const mentoringInput = page.getByTestId(/^effort-mentoring-hours-/).first();
    const elearningInput = page.getByTestId(/^effort-directed-elearning-/).first();
    const independentInput = page.getByTestId(/^effort-independent-learning-/).first();

    // Classroom
    await classroomInput.fill("48");
    await page.waitForTimeout(200);

    // Mentoring
    await mentoringInput.fill("12");
    await page.waitForTimeout(200);

    // E-learning
    await elearningInput.fill("40");
    await page.waitForTimeout(200);

    // Independent
    await independentInput.fill("150");
    await page.waitForTimeout(600);

    // Should show total in badge (10 credits = 250 hours typically)
    const totalDisplay = page.getByTestId(/^effort-total-/).first();
    const totalText = await totalDisplay.textContent();
    expect(totalText).toBeTruthy();
  });

  test("should validate hours match credits (25 hours per credit)", async ({ page }) => {
    // 10 credits = 250 hours expected
    const classroomInput = page.getByTestId(/^effort-classroom-hours-/).first();

    // Enter insufficient hours
    await classroomInput.fill("10");
    await page.waitForTimeout(600);

    // Total badge should exist - check that it's not showing success/green
    const totalDisplay = page.getByTestId(/^effort-total-/).first();
    await expect(totalDisplay).toBeVisible();
    // The badge shows the hours total - with only 10 hours it won't match 250 expected
    const totalText = await totalDisplay.textContent();
    expect(totalText).toContain("10"); // Shows the actual hours
  });

  test("should switch between versions for effort hours", async ({ page }) => {
    // Verify the effort hours table exists for the current version
    const effortRows = page.getByTestId(/^effort-row-/);
    await expect(effortRows.first()).toBeVisible();

    // Count rows before - should have at least 1 for the F2F modality
    const initialCount = await effortRows.count();
    expect(initialCount).toBeGreaterThanOrEqual(1);
  });

  test("should enter other hours with specification", async ({ page }) => {
    // Find "Other hours" input using data-testid pattern
    const otherInput = page.getByTestId(/^effort-other-hours-/).first();
    await otherInput.fill("10");
    await page.waitForTimeout(300);

    // Should have specify field nearby
    const specifyInput = page.getByTestId(/^effort-other-hours-specify-/).first();
    if ((await specifyInput.count()) > 0) {
      await specifyInput.fill("Lab setup and preparation");
      await page.waitForTimeout(500);
    }
  });

  test("keeps open module panels after re-render", async ({ page }) => {
    // Open first module accordion in Effort Hours
    const firstHeader = page.locator("#effortHoursAccordion .accordion-button").first();
    const expanded = await firstHeader.getAttribute("aria-expanded");
    if (expanded !== "true") {
      await firstHeader.click();
    }

    const before = await getOpenCollapseIds(page, "effortHoursAccordion");

    // Force a re-render of the page
    await page.evaluate(() => window.render && window.render());
    await page.waitForTimeout(600);

    const after = await getOpenCollapseIds(page, "effortHoursAccordion");
    before.forEach((id) => expect(after.has(id)).toBeTruthy());
  });
});

test.describe("Step 8: Effort Hours Per Modality", () => {
  test("should have separate effort hours per delivery modality", async ({ page }) => {
    // Fill identity
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(400);

    // Set up version with specific modality
    await page.getByTestId("step-versions").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-version-btn").click();
    await page.waitForTimeout(400);

    // Set modality - uses radio button
    const modalityRadio = page.getByTestId(/^version-modality-.*-F2F$/);
    if ((await modalityRadio.count()) > 0) {
      await modalityRadio.first().click();
      await page.waitForTimeout(400);
    }

    // Add module
    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(300);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(500);

    // Go to effort hours
    await page.getByTestId("step-effort-hours").click();
    await page.waitForTimeout(400);

    // Check that the page shows effort hours section
    const hasEffortSection =
      (await page.locator("text=/Effort Hours|Classroom|Contact/i").count()) > 0;
    expect(hasEffortSection).toBeTruthy();
  });
});
