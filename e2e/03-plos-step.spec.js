// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * PLOs step E2E tests — workflow-level coverage only.
 *
 * Individual PLO add/delete, text editing, empty state, heading, and
 * accordion re-render stability are covered by unit tests in
 * OutcomesStep.test.tsx. Validation warnings are in validation.test.ts.
 */

test.describe("Step 2: Programme Learning Outcomes (PLOs)", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByTestId("step-outcomes").click();
    await page.waitForTimeout(300);
  });

  test("should add multiple PLOs and persist data", async ({ page }) => {
    for (let i = 0; i < 6; i++) {
      await page.getByTestId("add-plo-btn").click();
      await page.waitForTimeout(300);

      const expandAllBtn = page.getByRole("button", { name: "Expand all" });
      if (await expandAllBtn.isVisible()) {
        await expandAllBtn.click();
        await page.waitForTimeout(200);
      }

      await page
        .locator("[data-plo-id]")
        .last()
        .fill(`PLO ${i + 1}: Test learning outcome text`);
      await page.waitForTimeout(200);
    }

    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    expect(data.plos.length).toBe(6);
  });

  test("should show Bloom's helper when NFQ level is set (cross-step)", async ({ page }) => {
    // Set NFQ level on identity step first
    await page.getByTestId("step-identity").click();
    await page.waitForTimeout(300);
    await page.getByTestId("level-input").fill("8");
    await page.waitForTimeout(500);

    // Navigate back to PLOs
    await page.getByTestId("step-outcomes").click();
    await page.waitForTimeout(300);

    await page.getByTestId("add-plo-btn").click();
    await page.waitForTimeout(300);

    await expect(page.getByText("Bloom helper")).toBeVisible();
  });
});

test.describe("Step 2: PLOs - Standard Mappings", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");

    const awardStandardSelect = page.locator("#content select").nth(2);
    await awardStandardSelect.waitFor({ state: "visible", timeout: 5000 });
    const optionCount = await awardStandardSelect.locator("option").count();
    if (optionCount > 1) {
      await awardStandardSelect.selectOption({ index: 1 });
    }
    await page.waitForTimeout(500);

    await page.getByTestId("step-outcomes").click();
    await page.waitForTimeout(300);
  });

  test("should add standard mapping to PLO", async ({ page }) => {
    await page.getByTestId("add-plo-btn").click();
    await page.waitForTimeout(300);

    await page
      .getByTestId(/^plo-textarea-/)
      .first()
      .fill("Test PLO");
    await page.waitForTimeout(300);

    const critSel = page.getByTestId(/^plo-criteria-/).first();
    const threadSel = page.getByTestId(/^plo-thread-/).first();
    await expect(critSel).toBeVisible();
    await critSel.selectOption({ index: 1 });
    await page.waitForTimeout(100);
    await expect(threadSel).toBeVisible();
    await threadSel.selectOption({ index: 1 });
    await page.waitForTimeout(100);

    await page
      .getByTestId(/^add-mapping-/)
      .first()
      .click();
    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    expect(data.plos[0].standardMappings?.length).toBeGreaterThan(0);
  });
});
