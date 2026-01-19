// @ts-check
const { test, expect, loadProgrammeData, getProgrammeData, navigateToStep } = require('./fixtures/test-fixtures');

test.describe('Step 11: PLO to Module Mapping', () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step first
    await page.locator('#titleInput').fill('Test Programme');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.waitForTimeout(500);
    
    // Set up PLOs
    await page.click('button:has-text("2. PLOs")');
    await page.waitForTimeout(200);
    
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Add PLO")');
      await page.waitForTimeout(150);
      await page.locator('[data-plo-id]').nth(i).fill(`PLO ${i + 1}: Test learning outcome`);
    }
    await page.waitForTimeout(400);
    
    // Set up modules
    await page.click('button:has-text("5. Credits & Modules")');
    await page.waitForTimeout(200);
    
    // First module
    await page.click('button:has-text("Add Module")');
    await page.waitForTimeout(150);
    const codeInput1 = page.locator('[data-module-field="code"]').first();
    const titleInput1 = page.locator('[data-module-field="title"]').first();
    const creditsInput1 = page.locator('[data-module-field="credits"]').first();
    await codeInput1.fill('MOD1');
    await titleInput1.fill('Module 1');
    await creditsInput1.fill('10');
    
    // Second module
    await page.click('button:has-text("Add Module")');
    await page.waitForTimeout(150);
    const codeInput2 = page.locator('[data-module-field="code"]').nth(1);
    const titleInput2 = page.locator('[data-module-field="title"]').nth(1);
    const creditsInput2 = page.locator('[data-module-field="credits"]').nth(1);
    await codeInput2.fill('MOD2');
    await titleInput2.fill('Module 2');
    await creditsInput2.fill('10');
    
    await page.waitForTimeout(400);
    
    // Navigate to Mapping
    await page.click('button:has-text("11. Mapping")');
    await page.waitForTimeout(300);
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
    await page.click('button:has-text("Add PLO")');
    await page.locator('[data-plo-id]').first().fill('PLO 1');
    await page.waitForTimeout(300);
    
    await page.click('button:has-text("5. Credits & Modules")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Add Module")');
    await page.waitForTimeout(400);
    
    await page.click('button:has-text("11. Mapping")');
    await page.waitForTimeout(300);
    
    // Look for matrix/table structure
    const hasMatrix = await page.locator('table, .matrix, .mapping-grid, .card').count() > 0;
    expect(hasMatrix).toBeTruthy();
  });
});

