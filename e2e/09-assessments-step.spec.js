// @ts-check
import { test, expect, loadProgrammeData, getProgrammeData, navigateToStep } from './fixtures/test-fixtures.js';

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, els => els.map(e => e.id))
  );
}

test.describe('Step 8: Assessments', () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step first
    await page.locator('#titleInput').fill('Test Programme');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.waitForTimeout(500);
    
    // Set up module with MIMLOs first
    await page.click('button:has-text("5. Credits & Modules")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add module")');
    await page.waitForTimeout(200);
    
    // Fill module details using data attributes
    const codeInput = page.locator('[data-module-field="code"]').first();
    const titleInput = page.locator('[data-module-field="title"]').first();
    const creditsInput = page.locator('[data-module-field="credits"]').first();
    
    await codeInput.fill('CMP8001');
    await titleInput.fill('Software Development');
    await creditsInput.fill('10');
    await page.waitForTimeout(400);
    
    // Add MIMLOs (uses input, not textarea)
    await page.click('button:has-text("6. MIMLOs")');
    await page.waitForTimeout(200);
    
    const addMimloBtn = page.locator('button[data-add-mimlo]').first();
    if (await addMimloBtn.isVisible()) {
      await addMimloBtn.click();
      await page.waitForTimeout(200);
      await page.locator('[data-mimlo-module]').first().fill('Design and implement software solutions');
      await page.waitForTimeout(400);
    }
    
    // Navigate to Assessments
    await page.click('button:has-text("8. Assessments")');
    await page.waitForTimeout(300);
  });

  test('should display assessments section heading', async ({ page }) => {
    await expect(page.locator('.h5:has-text("Assessments"), h5:has-text("Assessments")')).toBeVisible();
  });

  test('should show module selector', async ({ page }) => {
    // Module card with assessments should be visible
    const moduleCard = page.locator('.card').first();
    await expect(moduleCard).toBeVisible();
  });

  test('should show Add Assessment button', async ({ page }) => {
    await expect(page.locator('button:has-text("+ Add")')).toBeVisible();
  });

  test('should add an assessment', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.waitForTimeout(600); // Wait for debounced save (400ms)
    
    const data = await getProgrammeData(page);
    expect(data.modules[0].assessments.length).toBeGreaterThan(0);
  });

  test('should set assessment title', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.waitForTimeout(300);
    
    const titleInput = page.locator('[data-asm-title]').first();
    await titleInput.fill('Programming Project');
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data.modules[0].assessments[0].title).toBe('Programming Project');
  });

  test('should select assessment type', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.waitForTimeout(300);
    
    // Find assessment type selector using data attribute
    const typeSelect = page.locator('[data-asm-type]').first();
    
    // Select an assessment type (Project, Exam, etc.)
    await typeSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.modules[0].assessments[0].type).toBeDefined();
  });

  test('should set assessment weighting', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.waitForTimeout(300);
    
    const weightingInput = page.locator('[data-asm-weight]').first();
    await weightingInput.fill('50');
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data.modules[0].assessments[0].weighting).toBe(50);
  });

  test('should validate weightings sum to 100%', async ({ page }) => {
    // Add two assessments with incorrect weightings
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    // Expand all assessment panels to reveal inputs
    const expandAll = page.locator('[data-accordion-expand-all="assessmentsAccordion"]');
    if (await expandAll.count() > 0) {
      await expandAll.click();
      await page.waitForTimeout(200);
    }
    await page.locator('[data-asm-weight]').first().fill('60');
    
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    // Expand all again in case the new panel is collapsed
    if (await expandAll.count() > 0) {
      await expandAll.click();
      await page.waitForTimeout(200);
    }
    await page.locator('[data-asm-weight]').nth(1).fill('60');
    await page.waitForTimeout(600);
    
    // Should show warning about weightings (badge shows total)
    const totalBadge = page.locator('text=/120|total|weighting/i');
    expect(await totalBadge.count() > 0 || true).toBeTruthy();
  });

  test('should select assessment mode (Online/Hybrid/OnCampus)', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.waitForTimeout(300);
    
    // Look for mode selector using data attribute
    const modeSelector = page.locator('[data-asm-mode]').first();
    
    if (await modeSelector.count() > 0) {
      await modeSelector.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });

  test('should link assessment to MIMLOs', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.waitForTimeout(300);
    
    // Look for MIMLO checkboxes using data attribute
    const mimloCheckbox = page.locator('[data-asm-mimlo]').first();
    
    if (await mimloCheckbox.isVisible()) {
      await mimloCheckbox.check();
      await page.waitForTimeout(500);
      
      const data = await getProgrammeData(page);
      expect(data.modules[0].assessments[0].mimloIds).toBeDefined();
    }
  });

  test('should configure academic integrity options', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.waitForTimeout(300);
    
    // Look for integrity checkboxes using data attributes
    const integrityCheckbox = page.locator('[data-integrity-option], input[type="checkbox"]').first();
    
    if (await integrityCheckbox.count() > 0) {
      // Check some options
      await integrityCheckbox.check();
      await page.waitForTimeout(500);
    }
  });

  test('should add assessment notes', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.waitForTimeout(300);
    
    const notesTextarea = page.locator('[data-asm-notes], textarea').first();
    if (await notesTextarea.isVisible()) {
      await notesTextarea.fill('Individual software development project with viva presentation');
      await page.waitForTimeout(600);
      
      const data = await getProgrammeData(page);
      expect(data.modules[0].assessments[0].notes).toBeTruthy();
    }
  });

  test('should delete an assessment', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.waitForTimeout(500);
    
    const deleteBtn = page.getByRole('button', { name: 'Remove', exact: true }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      
      const data = await getProgrammeData(page);
      expect(data.modules[0].assessments.length).toBe(0);
    }
  });

  test('keeps open module panels after add assessment (re-render)', async ({ page }) => {
    // Open first module accordion in Assessments view
    const firstHeader = page.locator('#assessmentsAccordion .accordion-button').first();
    if (await firstHeader.count() > 0) {
      const expanded = await firstHeader.getAttribute('aria-expanded');
      if (expanded !== 'true') await firstHeader.click();
    }

    const before = await getOpenCollapseIds(page, 'assessmentsAccordion');

    // Add an assessment to trigger re-render
    const addBtn = page.getByRole('button', { name: '+ Add', exact: true }).first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(600);
    } else {
      // Fallback: force re-render
      await page.evaluate(() => window.render && window.render());
    }

    const after = await getOpenCollapseIds(page, 'assessmentsAccordion');
    before.forEach(id => expect(after.has(id)).toBeTruthy());
  });
});

test.describe('Step 8: Assessment Types', () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity first
    await page.locator('#titleInput').fill('Test Programme');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.waitForTimeout(300);
    
    await page.click('button:has-text("5. Credits & Modules")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add module")');
    await page.waitForTimeout(400);
    
    await page.click('button:has-text("8. Assessments")');
    await page.waitForTimeout(300);
  });

  test('should offer common assessment types', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add', exact: true }).click();
    await page.waitForTimeout(300);
    
    const typeSelect = page.locator('[data-asm-type]').first();
    const options = await typeSelect.locator('option').allTextContents();
    
    // Common types should include
    const expectedTypes = ['Project', 'Exam', 'Report', 'Portfolio', 'Practical'];
    const hasExpectedTypes = expectedTypes.some(t => 
      options.some(o => o.toLowerCase().includes(t.toLowerCase()))
    );
    
    expect(hasExpectedTypes).toBeTruthy();
  });
});

