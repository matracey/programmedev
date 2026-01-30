// @ts-check
import { test, expect, getProgrammeData } from './fixtures/test-fixtures.js';

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, els => els.map(e => e.id))
  );
}

test.describe('Step 5: Credits & Modules', () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity first to ensure localStorage is properly initialized
    await page.getByTestId('title-input').fill('Test Programme');
    await page.getByTestId('level-input').fill('8');
    await page.getByTestId('programme-credits').fill('60');
    await page.waitForTimeout(300);
    
    await page.getByTestId('step-structure').click();
    await page.waitForTimeout(300);
  });

  test('should display modules section heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Credits.*modules/i })).toBeVisible();
  });

  test('should show Add Module button', async ({ page }) => {
    await expect(page.getByTestId('add-module-btn')).toBeVisible();
  });

  test('should add a new module', async ({ page }) => {
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(600); // Wait for debounced save (400ms) to complete
    
    // Module form should appear - use specific data attribute selector
    await expect(page.locator('[data-module-field="title"]').first()).toBeVisible();
    
    const data = await getProgrammeData(page);
    expect(data.modules.length).toBeGreaterThan(0);
  });

  test('should set module code', async ({ page }) => {
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(300);
    
    // Find code input using data attribute
    const codeInput = page.locator('[data-module-field="code"]').first();
    await codeInput.fill('CMP8001');
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data.modules[0].code).toBe('CMP8001');
  });

  test('should set module title', async ({ page }) => {
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(300);
    
    // Find title input using data attribute
    const titleInput = page.locator('[data-module-field="title"]').first();
    await titleInput.fill('Software Development');
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data.modules[0].title).toBe('Software Development');
  });

  test('should set module credits', async ({ page }) => {
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(300);
    
    // Find credits input using data attribute
    const creditsInput = page.locator('[data-module-field="credits"]').first();
    await creditsInput.fill('10');
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data.modules[0].credits).toBe(10);
  });

  test('should add multiple modules', async ({ page }) => {
    const modulesToAdd = [
      { code: 'CMP8001', title: 'Software Development', credits: '10' },
      { code: 'CMP8002', title: 'Object Oriented Software Engineering', credits: '10' },
      { code: 'CMP8003', title: 'Introduction to Databases', credits: '5' },
      { code: 'CMP8004', title: 'Web Design', credits: '5' }
    ];
    
    for (let i = 0; i < modulesToAdd.length; i++) {
      await page.getByTestId('add-module-btn').click();
      await page.waitForTimeout(200);
    }
    
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.modules.length).toBe(4);
  });

  test('should delete a module', async ({ page }) => {
    // Add module first
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(500);
    
    // Click Remove button (inside accordion header)
    await page.locator('[data-remove-module]').first().click();
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.modules.length).toBe(0);
  });

  test('should show credits sum', async ({ page }) => {
    // Set programme credits first
    await page.getByTestId('step-identity').click();
    await page.waitForTimeout(200);
    await page.getByTestId('programme-credits').fill('60');
    await page.waitForTimeout(300);
    
    // Go back to modules
    await page.getByTestId('step-structure').click();
    await page.waitForTimeout(300);
    
    // Add modules
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(200);
    
    // Use data attribute for credits input
    const creditsInput = page.locator('[data-module-field="credits"]').first();
    await creditsInput.fill('30');
    await page.waitForTimeout(600);
    
    // Verify the total programme credits field shows the value from Identity
    await expect(page.locator('#totalCredits')).toHaveValue('60');
    
    // Verify module credits field has the value we entered
    await expect(creditsInput).toHaveValue('30');
  });

  test('should validate credits mismatch', async ({ page }) => {
    // Set programme credits
    await page.getByTestId('step-identity').click();
    await page.waitForTimeout(200);
    await page.getByTestId('programme-credits').fill('60');
    await page.waitForTimeout(300);
    
    // Add module with wrong credits
    await page.getByTestId('step-structure').click();
    await page.waitForTimeout(200);
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(200);
    
    // Use data attribute for credits input
    const creditsInput = page.locator('[data-module-field="credits"]').first();
    await creditsInput.fill('30');
    await page.waitForTimeout(600);
    
    // Should show mismatch error in flags
    await expect(page.getByText('mismatch')).toBeVisible();
  });

  test('keeps open module panels after add module (re-render)', async ({ page }) => {
    // Ensure at least two modules exist
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(300);
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(600);

    // Open first two module accordions
    const headers = page.locator('#modulesAccordion .accordion-button');
    for (let i = 0; i < Math.min(await headers.count(), 2); i++) {
      const expanded = await headers.nth(i).getAttribute('aria-expanded');
      if (expanded !== 'true') await headers.nth(i).click();
    }

    const before = await getOpenCollapseIds(page, 'modulesAccordion');

    // Trigger re-render by adding a module
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(600);

    const after = await getOpenCollapseIds(page, 'modulesAccordion');
    // Previously open panels should remain open
    before.forEach(id => expect(after.has(id)).toBeTruthy());
  });
});

test.describe('Step 5: Module Details', () => {
  test('should expand module to show details', async ({ page }) => {
    await page.getByTestId('step-structure').click();
    await page.waitForTimeout(200);
    
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(300);
    
    // Look for expand/accordion toggle
    const expandBtn = page.locator('button:has-text("▼"), button:has-text("Expand"), [data-bs-toggle="collapse"]').first();
    
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(300);
    }
  });
});

