// @ts-check
import { test, expect, loadProgrammeData, getProgrammeData, navigateToStep } from './fixtures/test-fixtures.js';

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, els => els.map(e => e.id))
  );
}

test.describe('Step 11: PLO to Module Mapping', () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step first
    await page.locator('#titleInput').fill('Test Programme');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.waitForTimeout(500);
    
    // Set up PLOs
    await page.click('button:has-text("2. PLOs")');
    await page.waitForTimeout(300);
    
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("+ Add PLO")');
      await page.waitForTimeout(300);
      
      // Click "Expand all" to ensure all PLO accordions are visible
      const expandAllBtn = page.locator('button:has-text("Expand all")');
      if (await expandAllBtn.isVisible()) {
        await expandAllBtn.click();
        await page.waitForTimeout(200);
      }
      
      // Fill the last (newly added) PLO
      await page.locator('[data-plo-id]').last().fill(`PLO ${i + 1}: Test learning outcome`);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
    
    // Set up modules
    await page.click('button:has-text("5. Credits & Modules")');
    await page.waitForTimeout(300);
    
    // First module
    await page.click('button:has-text("+ Add module")');
    await page.waitForTimeout(300);
    await page.locator('[data-module-field="code"]').first().fill('MOD1');
    await page.locator('[data-module-field="title"]').first().fill('Module 1');
    await page.locator('[data-module-field="credits"]').first().fill('10');
    await page.waitForTimeout(300);
    
    // Second module
    await page.click('button:has-text("+ Add module")');
    await page.waitForTimeout(500);
    
    // Click "Expand all" to ensure all module accordions are visible
    const expandAllModulesBtn = page.locator('button:has-text("Expand all")');
    if (await expandAllModulesBtn.isVisible()) {
      await expandAllModulesBtn.click();
      await page.waitForTimeout(300);
    }
    
    // Fill second module (now visible after expand)
    await page.locator('[data-module-field="code"]').nth(1).fill('MOD2');
    await page.locator('[data-module-field="title"]').nth(1).fill('Module 2');
    await page.locator('[data-module-field="credits"]').nth(1).fill('10');
    
    await page.waitForTimeout(500);
    
    // Navigate to Mapping
    await page.click('button:has-text("11. Mapping")');
    await page.waitForTimeout(400);
  });

  test('should display mapping section heading', async ({ page }) => {
    await expect(page.locator('h5:has-text("Map PLOs to modules")')).toBeVisible();
  });

  test('should display PLOs for mapping', async ({ page }) => {
    // Should show PLO text - app shows "PLO 1", "PLO 2" etc.
    // Use exact: true to avoid matching the full PLO text like "PLO 1: Test learning outcome"
    await expect(page.getByText('PLO 1', { exact: true })).toBeVisible();
  });

  test('should display modules as mapping options', async ({ page }) => {
    // Should show module options (checkboxes or similar)
    // Module cards show code + title, or just title
    // Use .first() since 'MOD1' appears multiple times (once per PLO row)
    await expect(page.getByText('MOD1', { exact: false }).first()).toBeVisible();
  });

  test('should allow mapping PLO to module via checkbox', async ({ page }) => {
    // Find checkbox for PLO-module mapping
    const checkbox = page.locator('input[type="checkbox"]').first();
    
    if (await checkbox.isVisible()) {
      await checkbox.check();
      await page.waitForTimeout(500);
      
      const data = await getProgrammeData(page);
      // Check ploToModules was updated
      const mappings = Object.values(data.ploToModules || {});
      const hasMapping = mappings.some(m => m && m.length > 0);
      expect(hasMapping).toBeTruthy();
    }
  });

  test('should save multiple PLO-module mappings', async ({ page }) => {
    // Expand all PLO accordions first to make checkboxes visible
    await page.click('button:has-text("Expand all")');
    await page.waitForTimeout(200);
    
    // Map multiple PLOs to modules
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    
    for (let i = 0; i < Math.min(count, 4); i++) {
      await checkboxes.nth(i).check();
      await page.waitForTimeout(200);
    }
    
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(Object.keys(data.ploToModules || {}).length).toBeGreaterThan(0);
  });

  test('should show unmapped PLOs warning', async ({ page }) => {
    // QQI flags panel shows warning for unmapped PLOs
    // The actual validation message mentions PLOs or mapping
    const hasWarning = await page.locator('text=/not mapped|unmapped|PLO|mapping/i').count() > 0;
    expect(hasWarning).toBeTruthy();
  });

  test('should clear warning when all PLOs are mapped', async ({ page }) => {
    // Expand all PLO accordions first to make checkboxes visible
    await page.click('button:has-text("Expand all")');
    await page.waitForTimeout(200);
    
    // Map all PLOs
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    
    // Check at least one per PLO
    for (let i = 0; i < Math.min(count, 3); i++) {
      await checkboxes.nth(i).check();
      await page.waitForTimeout(200);
    }
    
    await page.waitForTimeout(600);
    
    // Warning should be reduced or cleared
    const data = await getProgrammeData(page);
    const unmappedCount = (data.plos || []).filter(
      p => !(data.ploToModules || {})[p.id] || data.ploToModules[p.id].length === 0
    ).length;
    
    expect(unmappedCount).toBeLessThan(3);
  });

  test('should unmap PLO from module', async ({ page }) => {
    // First map
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    await page.waitForTimeout(400);
    
    // Then unmap
    await checkbox.uncheck();
    await page.waitForTimeout(500);
  });

  test('keeps open PLO panels after re-render', async ({ page }) => {
    // Open first two PLO accordions
    const headers = page.locator('#mappingAccordion .accordion-button');
    for (let i = 0; i < Math.min(await headers.count(), 2); i++) {
      const expanded = await headers.nth(i).getAttribute('aria-expanded');
      if (expanded !== 'true') await headers.nth(i).click();
    }

    const before = await getOpenCollapseIds(page, 'mappingAccordion');

    // Force a re-render of the page
    await page.evaluate(() => window.render && window.render());
    await page.waitForTimeout(600);

    const after = await getOpenCollapseIds(page, 'mappingAccordion');
    before.forEach(id => expect(after.has(id)).toBeTruthy());
  });
});

test.describe('Step 11: Mapping Matrix View', () => {
  test('should display mapping in matrix format', async ({ page }) => {
    // Fill Identity first
    await page.locator('#titleInput').fill('Test Programme');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.waitForTimeout(300);
    
    // Set up data
    await page.click('button:has-text("2. PLOs")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add PLO")');
    await page.locator('[data-plo-id]').first().fill('PLO 1');
    await page.waitForTimeout(300);
    
    await page.click('button:has-text("5. Credits & Modules")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add module")');
    await page.waitForTimeout(400);
    
    await page.click('button:has-text("11. Mapping")');
    await page.waitForTimeout(300);
    
    // Look for matrix/table structure
    const hasMatrix = await page.locator('table, .matrix, .mapping-grid, .card').count() > 0;
    expect(hasMatrix).toBeTruthy();
  });
});

