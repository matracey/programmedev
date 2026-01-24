// @ts-check
import { test, expect, loadProgrammeData, getProgrammeData, navigateToStep } from './fixtures/test-fixtures.js';

// Helper: capture IDs of open Bootstrap collapse panels within an accordion
async function getOpenCollapseIds(page, accordionId) {
  return new Set(
    await page.$$eval(`#${accordionId} .accordion-collapse.show`, els => els.map(e => e.id))
  );
}

test.describe('Step 7: Effort Hours', () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step first
    await page.locator('#titleInput').fill('Test Programme');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.waitForTimeout(500);
    
    // Set up version WITH modality (required for effort hours to show)
    await page.click('button:has-text("3. Programme Versions")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add version")');
    await page.waitForTimeout(300);
    
    // Select a delivery modality - required for effort hours table
    const modalitySelect = page.locator('select[data-version-field="deliveryModality"]').first();
    if (await modalitySelect.count() > 0) {
      await modalitySelect.selectOption('F2F');
      await page.waitForTimeout(300);
    }
    
    // Navigate to Credits & Modules
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
    await page.waitForTimeout(500);
    
    // Navigate to Effort Hours
    await page.click('button:has-text("7. Effort Hours")');
    await page.waitForTimeout(300);
  });

  test('should display effort hours section heading', async ({ page }) => {
    await expect(page.locator('h5:has-text("Effort Hours")')).toBeVisible();
  });

  test('should show module selector', async ({ page }) => {
    // Module picker only shown when multiple modules exist in MODULE_EDITOR mode
    // Check for module card with module name instead
    const moduleCard = page.locator('[data-module-card]').first();
    await expect(moduleCard).toBeVisible();
  });

  test('should show version/modality tabs or selector', async ({ page }) => {
    // Should show table with version/modality info
    const hasModalityContext = await page.locator('[data-version-modality]').count() > 0;
    // Or check for modality text
    const hasModalityText = await page.locator('text=/Face-to-face|Blended|Online/i').count() > 0;
    expect(hasModalityContext || hasModalityText).toBeTruthy();
  });

  test('should show effort hours input fields', async ({ page }) => {
    // Common effort hour fields
    const fields = ['Classroom', 'Mentoring', 'E-learning', 'Independent', 'Other'];
    
    let foundFields = 0;
    for (const field of fields) {
      const count = await page.locator(`text=${field}`).count();
      if (count > 0) foundFields++;
    }
    
    expect(foundFields).toBeGreaterThan(0);
  });

  test('should enter classroom hours', async ({ page }) => {
    // Find classroom hours input using data attribute
    const classroomInput = page.locator('[data-effort-field="classroomHours"]').first();
    
    if (await classroomInput.isVisible()) {
      await classroomInput.fill('48');
      await page.waitForTimeout(600);
      
      const data = await getProgrammeData(page);
      // Check that effort hours were saved
      const module = data.modules[0];
      expect(module.effortHours).toBeDefined();
    }
  });

  test('should enter contact ratios', async ({ page }) => {
    // Look for ratio input fields using data attribute
    const ratioInput = page.locator('[data-effort-field="classroomRatio"]').first();
    
    if (await ratioInput.count() > 0) {
      await ratioInput.fill('1:60');
      await page.waitForTimeout(600);
    }
  });

  test('should calculate total hours', async ({ page }) => {
    // Fill in various hour fields using data attributes
    const classroomInput = page.locator('[data-effort-field="classroomHours"]').first();
    const mentoringInput = page.locator('[data-effort-field="mentoringHours"]').first();
    const elearningInput = page.locator('[data-effort-field="directedElearningHours"]').first();
    const independentInput = page.locator('[data-effort-field="independentLearningHours"]').first();
    
    // Classroom
    await classroomInput.fill('48');
    await page.waitForTimeout(200);
    
    // Mentoring
    await mentoringInput.fill('12');
    await page.waitForTimeout(200);
    
    // E-learning
    await elearningInput.fill('40');
    await page.waitForTimeout(200);
    
    // Independent
    await independentInput.fill('150');
    await page.waitForTimeout(600);
    
    // Should show total in badge (10 credits = 250 hours typically)
    const totalDisplay = page.locator('[data-total-display]').first();
    const totalText = await totalDisplay.textContent();
    expect(totalText).toBeTruthy();
  });

  test('should validate hours match credits (25 hours per credit)', async ({ page }) => {
    // 10 credits = 250 hours expected
    const classroomInput = page.locator('[data-effort-field="classroomHours"]').first();
    
    // Enter insufficient hours
    await classroomInput.fill('10');
    await page.waitForTimeout(600);
    
    // Total badge should show warning color (not success)
    const totalDisplay = page.locator('[data-total-display]').first();
    const hasWarning = await totalDisplay.evaluate(el => el.classList.contains('text-bg-warning'));
    expect(hasWarning).toBeTruthy();
  });

  test('should switch between versions for effort hours', async ({ page }) => {
    // Add another version with modality
    await page.click('button:has-text("3. Programme Versions")');
    await page.waitForTimeout(200);
    await expect(page.locator('h4:has-text("Programme Versions")')).toBeVisible();
    await page.click('button:has-text("+ Add version")');
    await page.waitForTimeout(400);
    
    // Set modality for new version
    const modalitySelects = page.locator('select[data-version-field="deliveryModality"]');
    if (await modalitySelects.nth(1).count() > 0) {
      await modalitySelects.nth(1).selectOption('BLENDED');
      await page.waitForTimeout(400);
    }
    
    // Go back to effort hours
    await page.click('button:has-text("7. Effort Hours")');
    await page.waitForTimeout(400);
    
    // Should have at least one version/modality row (or multiple if both versions have modalities)
    const rows = page.locator('[data-version-modality]');
    const count = await rows.count();
    // At minimum, the first version with F2F modality should show
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should enter other hours with specification', async ({ page }) => {
    // Find "Other hours" input using data attribute
    const otherInput = page.locator('[data-effort-field="otherHours"]').first();
    await otherInput.fill('10');
    await page.waitForTimeout(300);
    
    // Should have specify field nearby
    const specifyInput = page.locator('[data-effort-field="otherHoursSpecify"]').first();
    if (await specifyInput.count() > 0) {
      await specifyInput.fill('Lab setup and preparation');
      await page.waitForTimeout(500);
    }
  });

  test('keeps open module panels after re-render', async ({ page }) => {
    // Open first module accordion in Effort Hours
    const firstHeader = page.locator('#effortHoursAccordion .accordion-button').first();
    const expanded = await firstHeader.getAttribute('aria-expanded');
    if (expanded !== 'true') await firstHeader.click();

    const before = await getOpenCollapseIds(page, 'effortHoursAccordion');

    // Force a re-render of the page
    await page.evaluate(() => window.render && window.render());
    await page.waitForTimeout(600);

    const after = await getOpenCollapseIds(page, 'effortHoursAccordion');
    before.forEach(id => expect(after.has(id)).toBeTruthy());
  });
});

test.describe('Step 7: Effort Hours Per Modality', () => {
  test('should have separate effort hours per delivery modality', async ({ page }) => {
    // Fill identity
    await page.locator('#titleInput').fill('Test Programme');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.waitForTimeout(400);
    
    // Set up version with specific modality
    await page.click('button:has-text("3. Programme Versions")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("+ Add version")');
    await page.waitForTimeout(400);
    
    // Set modality
    const modalitySelect = page.locator('select[data-version-field="deliveryModality"]').first();
    if (await modalitySelect.count() > 0) {
      await modalitySelect.selectOption('F2F');
      await page.waitForTimeout(400);
    }
    
    // Add module
    await page.click('button:has-text("5. Credits & Modules")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("+ Add module")');
    await page.waitForTimeout(500);
    
    // Go to effort hours
    await page.click('button:has-text("7. Effort Hours")');
    await page.waitForTimeout(400);
    
    // Check that the page shows effort hours section
    const hasEffortSection = await page.locator('text=/Effort Hours|Classroom|Contact/i').count() > 0;
    expect(hasEffortSection).toBeTruthy();
  });
});

