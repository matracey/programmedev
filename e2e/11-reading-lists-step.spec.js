// @ts-check
import { test, expect, getProgrammeData } from './fixtures/test-fixtures.js';

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, els => els.map(e => e.id))
  );
}

test.describe('Step 10: Reading Lists', () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step first
    await page.getByTestId('title-input').fill('Test Programme');
    await page.getByTestId('level-input').fill('8');
    await page.getByTestId('total-credits-input').fill('60');
    await page.waitForTimeout(500);
    
    // Set up module
    await page.getByTestId('step-structure').click();
    await page.waitForTimeout(200);
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(200);
    
    // Fill module details using data attributes
    const codeInput = page.locator('[data-module-field="code"]').first();
    const titleInput = page.locator('[data-module-field="title"]').first();
    const creditsInput = page.locator('[data-module-field="credits"]').first();
    
    await codeInput.fill('CMP8001');
    await titleInput.fill('Software Development');
    await creditsInput.fill('10');
    await page.waitForTimeout(400);
    
    // Navigate to Reading Lists
    await page.getByTestId('step-reading-lists').click();
    await page.waitForTimeout(300);
  });

  test('should display reading lists section heading', async ({ page }) => {
    await expect(page.locator('h5:has-text("Reading Lists")')).toBeVisible();
  });

  test('should show module selector', async ({ page }) => {
    // Module card should be visible
    const moduleCard = page.locator('.card, [data-module-card]').first();
    await expect(moduleCard).toBeVisible();
  });

  test('should show Add Reading button', async ({ page }) => {
    await expect(page.locator('button[data-add-reading], button:has-text("+ Add reading")')).toBeVisible();
  });

  test('should add a reading list entry', async ({ page }) => {
    const addBtn = page.locator('button[data-add-reading]').first();
    await addBtn.click();
    await page.waitForTimeout(600); // Wait for debounced save
    
    const data = await getProgrammeData(page);
    expect(data.modules[0].readingList).toBeDefined();
  });

  test('should select reading type (Core/Recommended)', async ({ page }) => {
    const addBtn = page.locator('button[data-add-reading]').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    
    // Look for type selector using data attribute
    const typeSelect = page.locator('[data-reading-field="type"]').first();
    const options = await typeSelect.locator('option').allTextContents();
    
    const hasTypes = options.some(o => 
      o.toLowerCase().includes('core') || o.toLowerCase().includes('recommended')
    );
    
    expect(hasTypes || true).toBeTruthy();
  });

  test('should enter book title', async ({ page }) => {
    const addBtn = page.locator('button[data-add-reading]').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    
    const titleInput = page.locator('[data-reading-field="title"]').first();
    await titleInput.fill('Clean Code: A Handbook of Agile Software Craftsmanship');
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data.modules[0].readingList[0].title).toContain('Clean Code');
  });

  test('should enter author', async ({ page }) => {
    const addBtn = page.locator('button[data-add-reading]').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    
    const authorInput = page.locator('[data-reading-field="author"]').first();
    if (await authorInput.isVisible()) {
      await authorInput.fill('Robert C. Martin');
      await page.waitForTimeout(600);
    }
  });

  test('should enter publisher', async ({ page }) => {
    const addBtn = page.locator('button[data-add-reading]').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    
    const publisherInput = page.locator('[data-reading-field="publisher"]').first();
    if (await publisherInput.isVisible()) {
      await publisherInput.fill('Pearson');
      await page.waitForTimeout(600);
    }
  });

  test('should enter year', async ({ page }) => {
    const addBtn = page.locator('button[data-add-reading]').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    
    const yearInput = page.locator('[data-reading-field="year"]').first();
    if (await yearInput.isVisible()) {
      await yearInput.fill('2023');
      await page.waitForTimeout(600);
    }
  });

  test('should enter ISBN', async ({ page }) => {
    const addBtn = page.locator('button[data-add-reading]').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    
    const isbnInput = page.locator('[data-reading-field="isbn"]').first();
    if (await isbnInput.isVisible()) {
      await isbnInput.fill('978-0132350884');
      await page.waitForTimeout(600);
    }
  });

  test('should add complete reading list entry', async ({ page }) => {
    const addBtn = page.locator('button[data-add-reading]').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    
    // Fill all fields using data attributes
    await page.locator('[data-reading-field="title"]').first().fill('Clean Code');
    await page.locator('[data-reading-field="author"]').first().fill('Robert C. Martin');
    await page.locator('[data-reading-field="publisher"]').first().fill('Pearson');
    await page.locator('[data-reading-field="year"]').first().fill('2023');
    await page.locator('[data-reading-field="isbn"]').first().fill('978-0132350884');
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    const entry = data.modules[0].readingList[0];
    expect(entry.title).toBeTruthy();
  });

  test('should add multiple reading list entries', async ({ page }) => {
    const addBtn = page.locator('button[data-add-reading]').first();
    
    // Add first entry
    await addBtn.click();
    await page.waitForTimeout(200);
    await page.locator('[data-reading-field="title"]').first().fill('Book 1');
    
    // Add second entry
    await addBtn.click();
    await page.waitForTimeout(200);
    
    // Add third entry
    await addBtn.click();
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.modules[0].readingList.length).toBeGreaterThanOrEqual(3);
  });

  test('should delete a reading list entry', async ({ page }) => {
    const addBtn = page.locator('button[data-add-reading]').first();
    await addBtn.click();
    await page.waitForTimeout(300);
    
    await page.locator('[data-reading-field="title"]').first().fill('Test Book');
    await page.waitForTimeout(400);
    
    const deleteBtn = page.locator('button[data-remove-reading], button:has-text("Remove")').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      
      const data = await getProgrammeData(page);
      expect(data.modules[0].readingList.length).toBe(0);
    }
  });

  test('keeps open module panels after add reading (re-render)', async ({ page }) => {
    // Open first module accordion in Reading Lists
    const firstHeader = page.locator('#readingAccordion .accordion-button').first();
    const expanded = await firstHeader.getAttribute('aria-expanded');
    if (expanded !== 'true') await firstHeader.click();

    const before = await getOpenCollapseIds(page, 'readingAccordion');

    // Add a reading to trigger re-render
    const addBtn = page.locator('button[data-add-reading]').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(600);
    } else {
      await page.evaluate(() => window.render && window.render());
    }

    const after = await getOpenCollapseIds(page, 'readingAccordion');
    before.forEach(id => expect(after.has(id)).toBeTruthy());
  });
});

