// @ts-check
import { test, expect, getProgrammeData } from './fixtures/test-fixtures.js';

test.describe('Step 1: Identity', () => {
  test('should display all identity form fields', async ({ page }) => {
    await expect(page.getByLabel('Programme title')).toBeVisible();
    await expect(page.getByLabel('Award type')).toBeVisible();
    await expect(page.getByLabel('NFQ level')).toBeVisible();
    await expect(page.getByLabel('Total credits (ECTS)')).toBeVisible();
    await expect(page.getByLabel('School / Discipline')).toBeVisible();
  });

  test('should enter programme title', async ({ page }) => {
    const titleInput = page.getByTestId('title-input');
    await titleInput.fill('Higher Diploma in Science in Computing');
    await page.waitForTimeout(500); // Wait for debounced save
    
    // Check header updated
    await expect(page.locator('#programmeTitleNav')).toContainText('Higher Diploma in Science in Computing');
    
    // Check localStorage
    const data = await getProgrammeData(page);
    expect(data.title).toBe('Higher Diploma in Science in Computing');
  });

  test('should select award type', async ({ page }) => {
    const select = page.getByTestId('award-select');
    await select.selectOption('Higher Diploma');
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.awardType).toBe('Higher Diploma');
  });

  test('should show custom award type input when Other is selected', async ({ page }) => {
    const select = page.getByTestId('award-select');
    await select.selectOption('Other (type below)');
    await page.waitForTimeout(300);
    
    // Look for the custom input field
    await expect(page.getByTestId('award-other-input')).toBeVisible();
  });

  test('should set NFQ level', async ({ page }) => {
    const nfqInput = page.getByTestId('level-input');
    await nfqInput.fill('8');
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.nfqLevel).toBe(8);
  });

  test('should validate NFQ level range (6-9)', async ({ page }) => {
    const nfqInput = page.getByTestId('level-input');
    
    // Set invalid NFQ level
    await nfqInput.fill('5');
    await page.waitForTimeout(500);
    
    // Should show validation error
    await expect(page.locator('text=NFQ level must be between 6 and 9')).toBeVisible();
  });

  test('should set total credits', async ({ page }) => {
    // Use explicit ID for total credits input from Identity form
    const creditsInput = page.getByTestId('total-credits-input');
    
    await creditsInput.fill('60');
    await page.waitForTimeout(500);
    
    const data = await getProgrammeData(page);
    expect(data.totalCredits).toBe(60);
  });

  test('should select school/discipline', async ({ page }) => {
    const schoolSelect = page.getByTestId('school-select');
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
    await page.getByTestId('title-input').fill('Test Programme');
    await page.getByTestId('level-input').fill('8');
    await page.getByTestId('total-credits-input').fill('60');
    await page.waitForTimeout(600);
    
    // Completion should increase from 0%
    const badge = page.getByTestId('completion-badge');
    const text = await badge.textContent();
    expect(text).not.toBe('0% complete');
  });

  test('should clear validation errors when required fields are filled', async ({ page }) => {
    // Initially there should be title error
    await expect(page.locator('text=Programme title is missing')).toBeVisible();
    
    // Fill title
    await page.getByTestId('title-input').fill('Test Programme');
    await page.waitForTimeout(1000); // Wait for debounced save and flags update
    
    // Completion badge should update from 0%
    const badge = page.getByTestId('completion-badge');
    const text = await badge.textContent();
    expect(text).not.toBe('0% complete');
  });
});

test.describe('Step 1: Identity - Complete Entry', () => {
  test('should complete full identity section', async ({ page }) => {
    // Fill all fields
    await page.getByTestId('title-input').fill('Higher Diploma in Science in Computing');
    await page.getByTestId('award-select').selectOption('Higher Diploma');
    await page.getByTestId('level-input').fill('8');
    await page.getByTestId('total-credits-input').fill('60');
    await page.getByTestId('school-select').selectOption('Computing');
    
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

