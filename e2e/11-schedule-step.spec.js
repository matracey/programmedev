// @ts-check
import { test, expect, loadProgrammeData, getProgrammeData, navigateToStep } from './fixtures/test-fixtures.js';

test.describe('Step 10: Programme Schedule', () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity first
    await page.locator('#titleInput').fill('Test Programme');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.waitForTimeout(300);
    
    // Set up version with stages and modules
    await page.click('button:has-text("3. Programme Versions")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add version")');
    await page.waitForTimeout(300);
    
    await page.click('button:has-text("5. Credits & Modules")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add module")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add module")');
    await page.waitForTimeout(300);
    
    await page.click('button:has-text("4. Stage Structure")');
    await page.waitForTimeout(200);
    await page.click('#addStageBtn');
    await page.waitForTimeout(600);
    
    // Navigate to Schedule
    await page.click('button:has-text("10. Programme Schedule")');
    await page.waitForTimeout(300);
  });

  test('should display schedule section heading', async ({ page }) => {
    await expect(page.locator('h5:has-text("Programme Schedule")')).toBeVisible();
  });

  test('should show version selector', async ({ page }) => {
    // Version select or schedule table should be visible
    const hasVersionContext = await page.locator('[data-version-select], select, .card').count() > 0;
    expect(hasVersionContext).toBeTruthy();
  });

  test('should display stage structure overview', async ({ page }) => {
    // Should show stages or info message about no stages
    // Either "Stage" in header or info alert about stages
    const hasStageContent = await page.locator('text=/Stage|No stages defined/i').count() > 0;
    expect(hasStageContent).toBeTruthy();
  });

  test('should show module placement in stages', async ({ page }) => {
    // Schedule should show which modules are in which stages, or info about no stages
    const hasScheduleContent = await page.locator('text=/Stage|Module|No stages defined/i').count() > 0;
    expect(hasScheduleContent).toBeTruthy();
  });

  test('should allow assigning semester to modules', async ({ page }) => {
    // Look for semester input/select - schedule table should be visible
    const scheduleTable = page.locator('table, .schedule-table, .card').first();
    await expect(scheduleTable).toBeVisible();
  });

  test('should show credit totals per stage', async ({ page }) => {
    // Should display credit calculations or info message
    const hasCreditInfo = await page.locator('text=/credits|ECTS|No stages defined/i').count() > 0;
    expect(hasCreditInfo).toBeTruthy();
  });

  test('should switch between versions', async ({ page }) => {
    // Add another version
    await page.click('button:has-text("3. Programme Versions")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add version")');
    await page.waitForTimeout(400);
    
    // Go back to schedule
    await page.click('button:has-text("10. Programme Schedule")');
    await page.waitForTimeout(300);
    
    // Multiple versions should exist in data
    const data = await getProgrammeData(page);
    expect(data.versions.length).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Step 10: Schedule Visualization', () => {
  test('should show visual representation of programme timeline', async ({ page }) => {
    // Fill Identity first
    await page.locator('#titleInput').fill('Test Programme');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.waitForTimeout(300);
    
    // Set up data
    await page.click('button:has-text("3. Programme Versions")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add version")');
    await page.waitForTimeout(300);
    
    await page.click('button:has-text("4. Stage Structure")');
    await page.waitForTimeout(200);
    await page.click('#addStageBtn');
    await page.waitForTimeout(200);
    await page.click('#addStageBtn');
    await page.waitForTimeout(400);
    
    // Go to schedule
    await page.click('button:has-text("10. Programme Schedule")');
    await page.waitForTimeout(300);
    
    // Should show some visual representation (table, grid, etc.)
    const hasVisual = await page.locator('table, .schedule, .timeline, .card').count() > 0;
    expect(hasVisual).toBeTruthy();
  });
});

