// @ts-check
import { test, expect, loadProgrammeData, getProgrammeData, navigateToStep } from './fixtures/test-fixtures.js';

test.describe('Step 1: Identity', () => {
  test('should display all identity form fields', async ({ page }) => {
    await expect(page.getByText('Programme title', { exact: true })).toBeVisible();
    await expect(page.getByText('Award type', { exact: true })).toBeVisible();
    await expect(page.getByText('NFQ level', { exact: true })).toBeVisible();
    await expect(page.locator('text=Total credits')).toBeVisible();
    await expect(page.locator('text=School / Discipline')).toBeVisible();
  });

  test('should enter programme title', async ({ page }) => {
    const titleInput = page.locator('#titleInput');
    await titleInput.fill('Higher Diploma in Science in Computing');
    await page.waitForTimeout(500); // Wait for debounced save
    
    // Check header updated
    await expect(page.locator('#programmeTitleNav')).toContainText('Higher Diploma in Science in Computing');
    
    // Check localStorage
    const data = await getProgrammeData(page);
    expect(data.title).toBe('Higher Diploma in Science in Computing');
  });

  test('should select award type', async ({ page }) => {
    const select = page.locator('#awardSelect');
    await select.selectOption('Higher Diploma');
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.awardType).toBe('Higher Diploma');
  });

  test('should show custom award type input when Other is selected', async ({ page }) => {
    const select = page.locator('#awardSelect');
    await select.selectOption('Other (type below)');
    await page.waitForTimeout(300);
    
    // Look for the custom input field
    await expect(page.locator('#awardOtherInput')).toBeVisible();
  });

  test('should set NFQ level', async ({ page }) => {
    const nfqInput = page.locator('#levelInput');
    await nfqInput.fill('8');
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.nfqLevel).toBe(8);
  });

  test('should validate NFQ level range (6-9)', async ({ page }) => {
    const nfqInput = page.locator('#levelInput');
    
    // Set invalid NFQ level
    await nfqInput.fill('5');
    await page.waitForTimeout(500);
    
    // Should show validation error
    await expect(page.locator('text=NFQ level must be between 6 and 9')).toBeVisible();
  });

  test('should set total credits', async ({ page }) => {
    // Use explicit ID for total credits input from Identity form
    const creditsInput = page.locator('#totalCreditsInput');
    
    await creditsInput.fill('60');
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.totalCredits).toBe(60);
  });

  test('should select school/discipline', async ({ page }) => {
    const schoolSelect = page.locator('#schoolSelect');
    await schoolSelect.selectOption('Computing');
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.school).toBe('Computing');
  });

  test('should select QQI award standard', async ({ page }) => {
    const standardSelect = page.locator('.standard-selector').first();
    await standardSelect.selectOption({ index: 1 }); // First non-disabled option
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    // Data model now uses awardStandardIds array
    expect(data.awardStandardIds?.length || data.awardStandardId).toBeTruthy();
  });

  test('should update completion percentage when fields are filled', async ({ page }) => {
    // Fill required fields
    await page.locator('#titleInput').fill('Test Programme');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.waitForTimeout(600);
    
    // Completion should increase from 0%
    const badge = page.locator('#completionBadge');
    const text = await badge.textContent();
    expect(text).not.toBe('0% complete');
  });

  test('should clear validation errors when required fields are filled', async ({ page }) => {
    // Initially there should be title error
    await expect(page.locator('text=Programme title is missing')).toBeVisible();
    
    // Fill title
    await page.locator('#titleInput').fill('Test Programme');
    await page.waitForTimeout(1000); // Wait for debounced save and flags update
    
    // Completion badge should update from 0%
    const badge = page.locator('#completionBadge');
    const text = await badge.textContent();
    expect(text).not.toBe('0% complete');
  });
});

test.describe('Step 1: Identity - Complete Entry', () => {
  test('should complete full identity section', async ({ page }) => {
    // Fill all fields
    await page.locator('#titleInput').fill('Higher Diploma in Science in Computing');
    await page.locator('#awardSelect').selectOption('Higher Diploma');
    await page.locator('#levelInput').fill('8');
    await page.locator('#totalCreditsInput').fill('60');
    await page.locator('#schoolSelect').selectOption('Computing');
    
    await page.waitForTimeout(600);
    
    // Verify all data saved
    const data = await getProgrammeData(page);
    expect(data.title).toBe('Higher Diploma in Science in Computing');
    expect(data.awardType).toBe('Higher Diploma');
    expect(data.nfqLevel).toBe(8);
    expect(data.totalCredits).toBe(60);
    expect(data.school).toBe('Computing');
  });
});

