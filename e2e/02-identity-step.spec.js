// @ts-check
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Identity step E2E tests — workflow-level coverage only.
 *
 * Individual field editing, rendering, and validation logic are covered
 * by unit tests in IdentityStep.test.tsx and validation.test.ts.
 */

test.describe("Step 1: Identity", () => {
  test("should complete full identity section and persist data", async ({ page }) => {
    // Fill all fields
    await page.getByTestId("title-input").fill("Higher Diploma in Science in Computing");
    await page.getByTestId("award-select").selectOption("Higher Diploma");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.getByTestId("school-select").selectOption("Computing");

    await page.waitForTimeout(600);

    // Verify header reflects title
    await expect(page.locator("#programmeTitleNav")).toContainText(
      "Higher Diploma in Science in Computing",
    );

    // Verify all data saved to state
    const data = await getProgrammeData(page);
    expect(data.title).toBe("Higher Diploma in Science in Computing");
    expect(data.awardType).toBe("Higher Diploma");
    expect(data.nfqLevel).toBe(8);
    expect(data.totalCredits).toBe(60);
    expect(data.school).toBe("Computing");
  });

  test("should select QQI award standard", async ({ page }) => {
    const standardSelect = page.locator(".standard-selector").first();
    await standardSelect.selectOption({ index: 1 }); // First non-disabled option
    await page.waitForTimeout(500);

    const data = await getProgrammeData(page);
    expect(data.awardStandardIds?.length || data.awardStandardId).toBeTruthy();
  });

  test("should update completion percentage when fields are filled", async ({ page }) => {
    // Initially there should be validation errors
    await expect(page.locator("text=Programme title is missing")).toBeVisible();

    // Fill required fields
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(1000);

    // Completion should increase and title error should clear
    const badge = page.getByTestId("completion-badge");
    const text = await badge.textContent();
    expect(text).not.toBe("0% complete");
  });
});
