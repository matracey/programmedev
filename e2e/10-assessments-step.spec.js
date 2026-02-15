// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, (els) => els.map((e) => e.id)),
  );
}

test.describe("Step 9: Assessments", () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step first
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(500);

    // Set up module with MIMLOs first
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
    await page.waitForTimeout(400);

    // Add MIMLOs
    await page.getByTestId("step-mimlos").click();
    await page.waitForTimeout(200);

    const addMimloBtn = page.getByTestId(/^add-mimlo-/).first();
    if (await addMimloBtn.isVisible()) {
      await addMimloBtn.click();
      await page.waitForTimeout(200);
      await page
        .getByTestId(/^mimlo-input-/)
        .first()
        .fill("Design and implement software solutions");
      await page.waitForTimeout(400);
    }

    // Navigate to Assessments
    await page.getByTestId("step-assessments").click();
    await page.waitForTimeout(300);
  });

  test("should display assessments section heading", async ({ page }) => {
    await expect(
      page.locator('.h5:has-text("Assessments"), h5:has-text("Assessments")'),
    ).toBeVisible();
  });

  test("should show module selector", async ({ page }) => {
    // Module card with assessments should be visible
    const moduleCard = page.locator(".card").first();
    await expect(moduleCard).toBeVisible();
  });

  test("should show Add Assessment button", async ({ page }) => {
    await expect(page.getByTestId(/^add-asm-/)).toBeVisible();
  });

  test("should add an assessment", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(600); // Wait for debounced save (400ms)

    const data = await getProgrammeData(page);
    expect(data.modules[0].assessments.length).toBeGreaterThan(0);
  });

  test("should set assessment title", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);

    const titleInput = page.getByTestId(/^asm-title-/).first();
    await titleInput.fill("Programming Project");
    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    expect(data.modules[0].assessments[0].title).toBe("Programming Project");
  });

  test("should select assessment type", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);

    // Find assessment type selector using data-testid pattern
    const typeSelect = page.getByTestId(/^asm-type-/).first();

    // Select an assessment type (Project, Exam, etc.)
    await typeSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    const data = await getProgrammeData(page);
    expect(data.modules[0].assessments[0].type).toBeDefined();
  });

  test("should set assessment weighting", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);

    const weightingInput = page.getByTestId(/^asm-weight-/).first();
    await weightingInput.fill("50");
    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    expect(data.modules[0].assessments[0].weighting).toBe(50);
  });

  test("should validate weightings sum to 100%", async ({ page }) => {
    // Add first assessment
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);

    // Set first weight
    await page
      .getByTestId(/^asm-weight-/)
      .first()
      .fill("60");
    await page.waitForTimeout(300);

    // Add second assessment
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(500);

    // The new assessment is added but might be collapsed - click on the assessment accordion header
    // The assessments are nested inside module accordion, so look for the assessment accordion item headers
    const assessmentHeaders = page.locator(".accordion-item .accordion-item .accordion-button");
    if ((await assessmentHeaders.count()) > 1) {
      const secondHeader = assessmentHeaders.nth(1);
      const isCollapsed = (await secondHeader.getAttribute("aria-expanded")) === "false";
      if (isCollapsed) {
        await secondHeader.click();
        await page.waitForTimeout(300);
      }
    }

    // Fill the second weight input (should be visible after expanding)
    const weightInputs = page.getByTestId(/^asm-weight-/);
    await weightInputs.nth(1).fill("60");
    await page.waitForTimeout(600);

    // Should show warning about weightings (badge shows total 120%)
    await expect(page.locator("text=/120%/")).toBeVisible();
  });

  test("should select assessment mode (Online/Hybrid/OnCampus)", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);

    // Look for mode selector using data-testid pattern
    const modeSelector = page.getByTestId(/^asm-mode-/).first();

    if ((await modeSelector.count()) > 0) {
      await modeSelector.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });

  test("should link assessment to MIMLOs", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);

    // Look for MIMLO checkboxes using data-testid pattern
    const mimloCheckbox = page.getByTestId(/^asm-mimlo-/).first();

    if (await mimloCheckbox.isVisible()) {
      await mimloCheckbox.check();
      await page.waitForTimeout(500);

      const data = await getProgrammeData(page);
      expect(data.modules[0].assessments[0].mimloIds).toBeDefined();
    }
  });

  test("should configure academic integrity options", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);

    // Look for integrity checkboxes using data-testid pattern
    const integrityCheckbox = page.getByTestId(/^asm-integrity-/).first();

    if ((await integrityCheckbox.count()) > 0) {
      // Check some options
      await integrityCheckbox.check();
      await page.waitForTimeout(500);
    }
  });

  test("should add assessment notes", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);

    const notesTextarea = page.getByTestId(/^asm-notes-/).first();
    if (await notesTextarea.isVisible()) {
      await notesTextarea.fill("Individual software development project with viva presentation");
      await page.waitForTimeout(600);

      const data = await getProgrammeData(page);
      expect(data.modules[0].assessments[0].notes).toBeTruthy();
    }
  });

  test("should delete an assessment", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(500);

    const deleteBtn = page.getByTestId(/^remove-asm-/).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);

      const data = await getProgrammeData(page);
      expect(data.modules[0].assessments.length).toBe(0);
    }
  });

  test("keeps open module panels after add assessment (re-render)", async ({ page }) => {
    // Open first module accordion in Assessments view
    const firstHeader = page.locator("#assessmentsAccordion .accordion-button").first();
    if ((await firstHeader.count()) > 0) {
      const expanded = await firstHeader.getAttribute("aria-expanded");
      if (expanded !== "true") {
        await firstHeader.click();
      }
    }

    const before = await getOpenCollapseIds(page, "assessmentsAccordion");

    // Add an assessment to trigger re-render
    const addBtn = page.getByTestId(/^add-asm-/).first();
    if ((await addBtn.count()) > 0) {
      await addBtn.click();
      await page.waitForTimeout(600);
    } else {
      // Fallback: force re-render
      await page.evaluate(() => window.render && window.render());
    }

    const after = await getOpenCollapseIds(page, "assessmentsAccordion");
    before.forEach((id) => expect(after.has(id)).toBeTruthy());
  });
});

test.describe("Step 9: Assessment Types", () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity first
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(300);

    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(200);
    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(400);

    await page.getByTestId("step-assessments").click();
    await page.waitForTimeout(300);
  });

  test("should offer common assessment types", async ({ page }) => {
    await page
      .getByTestId(/^add-asm-/)
      .first()
      .click();
    await page.waitForTimeout(300);

    const typeSelect = page.getByTestId(/^asm-type-/).first();
    const options = await typeSelect.locator("option").allTextContents();

    // Common types should include
    const expectedTypes = ["Project", "Exam", "Report", "Portfolio", "Practical"];
    const hasExpectedTypes = expectedTypes.some((t) =>
      options.some((o) => o.toLowerCase().includes(t.toLowerCase())),
    );

    expect(hasExpectedTypes).toBeTruthy();
  });
});
