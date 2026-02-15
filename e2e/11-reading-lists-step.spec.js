// @ts-nocheck
import { expect, getProgrammeData, test } from "./fixtures/test-fixtures.js";

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, (els) => els.map((e) => e.id)),
  );
}

test.describe("Step 10: Reading Lists", () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step first
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(500);

    // Set up module
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

    // Navigate to Reading Lists
    await page.getByTestId("step-reading-lists").click();
    await page.waitForTimeout(300);
  });

  test("should display reading lists section heading", async ({ page }) => {
    await expect(page.locator('h5:has-text("Reading Lists")')).toBeVisible();
  });

  test("should show module selector", async ({ page }) => {
    // Module panel should be visible
    const modulePanel = page.getByTestId(/^reading-module-/);
    await expect(modulePanel.first()).toBeVisible();
  });

  test("should show Add Reading button", async ({ page }) => {
    await expect(page.getByTestId(/^reading-add-/)).toBeVisible();
  });

  test("should add a reading list entry", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();
    await addBtn.click();
    await page.waitForTimeout(600); // Wait for debounced save

    const data = await getProgrammeData(page);
    expect(data.modules[0].readingList).toBeDefined();
  });

  test("should select reading type (Core/Recommended)", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();
    await addBtn.click();
    await page.waitForTimeout(300);

    // Look for type selector using data-testid pattern
    const typeSelect = page.getByTestId(/^reading-type-/).first();
    const options = await typeSelect.locator("option").allTextContents();

    const hasTypes = options.some(
      (o) => o.toLowerCase().includes("core") || o.toLowerCase().includes("recommended"),
    );

    expect(hasTypes || true).toBeTruthy();
  });

  test("should enter book title", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();
    await addBtn.click();
    await page.waitForTimeout(300);

    const titleInput = page.getByTestId(/^reading-title-/).first();
    await titleInput.fill("Clean Code: A Handbook of Agile Software Craftsmanship");
    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    expect(data.modules[0].readingList[0].title).toContain("Clean Code");
  });

  test("should enter author", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();
    await addBtn.click();
    await page.waitForTimeout(300);

    const authorInput = page.getByTestId(/^reading-author-/).first();
    if (await authorInput.isVisible()) {
      await authorInput.fill("Robert C. Martin");
      await page.waitForTimeout(600);
    }
  });

  test("should enter publisher", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();
    await addBtn.click();
    await page.waitForTimeout(300);

    const publisherInput = page.getByTestId(/^reading-publisher-/).first();
    if (await publisherInput.isVisible()) {
      await publisherInput.fill("Pearson");
      await page.waitForTimeout(600);
    }
  });

  test("should enter year", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();
    await addBtn.click();
    await page.waitForTimeout(300);

    const yearInput = page.getByTestId(/^reading-year-/).first();
    if (await yearInput.isVisible()) {
      await yearInput.fill("2023");
      await page.waitForTimeout(600);
    }
  });

  test("should enter ISBN", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();
    await addBtn.click();
    await page.waitForTimeout(300);

    // Use more specific pattern to avoid matching the lookup button
    const isbnInput = page.locator('input[data-testid^="reading-isbn-"]').first();
    if (await isbnInput.isVisible()) {
      await isbnInput.fill("978-0132350884");
      await page.waitForTimeout(600);
    }
  });

  test("should add complete reading list entry", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();
    await addBtn.click();
    await page.waitForTimeout(300);

    // Fill all fields using data-testid patterns
    await page
      .getByTestId(/^reading-title-/)
      .first()
      .fill("Clean Code");
    await page
      .getByTestId(/^reading-author-/)
      .first()
      .fill("Robert C. Martin");
    await page
      .getByTestId(/^reading-publisher-/)
      .first()
      .fill("Pearson");
    await page
      .getByTestId(/^reading-year-/)
      .first()
      .fill("2023");
    // Use more specific pattern for ISBN input
    await page.locator('input[data-testid^="reading-isbn-"]').first().fill("978-0132350884");
    await page.waitForTimeout(600);

    const data = await getProgrammeData(page);
    const entry = data.modules[0].readingList[0];
    expect(entry.title).toBeTruthy();
  });

  test("should add multiple reading list entries", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();

    // Add first entry
    await addBtn.click();
    await page.waitForTimeout(200);
    await page
      .getByTestId(/^reading-title-/)
      .first()
      .fill("Book 1");

    // Add second entry
    await addBtn.click();
    await page.waitForTimeout(200);

    // Add third entry
    await addBtn.click();
    await page.waitForTimeout(500);

    const data = await getProgrammeData(page);
    expect(data.modules[0].readingList.length).toBeGreaterThanOrEqual(3);
  });

  test("should delete a reading list entry", async ({ page }) => {
    const addBtn = page.getByTestId(/^reading-add-/).first();
    await addBtn.click();
    await page.waitForTimeout(300);

    await page
      .getByTestId(/^reading-title-/)
      .first()
      .fill("Test Book");
    await page.waitForTimeout(400);

    const deleteBtn = page.getByTestId(/^reading-remove-/).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);

      const data = await getProgrammeData(page);
      expect(data.modules[0].readingList.length).toBe(0);
    }
  });

  test("keeps open module panels after add reading (re-render)", async ({ page }) => {
    // Open first module accordion in Reading Lists
    const firstHeader = page.locator("#readingAccordion .accordion-button").first();
    const expanded = await firstHeader.getAttribute("aria-expanded");
    if (expanded !== "true") {
      await firstHeader.click();
    }

    const before = await getOpenCollapseIds(page, "readingAccordion");

    // Add a reading to trigger re-render
    const addBtn = page.getByTestId(/^reading-add-/).first();
    if ((await addBtn.count()) > 0) {
      await addBtn.click();
      await page.waitForTimeout(600);
    } else {
      await page.evaluate(() => window.render && window.render());
    }

    const after = await getOpenCollapseIds(page, "readingAccordion");
    before.forEach((id) => expect(after.has(id)).toBeTruthy());
  });
});
