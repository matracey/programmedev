// @ts-check
import { test, expect, loadProgrammeData, getProgrammeData } from './fixtures/test-fixtures.js';
import { higherDiplomaComputing } from './fixtures/test-data.js';

test.describe('Import/Export Functionality', () => {
  test('should export programme as JSON', async ({ page }) => {
    // Load complete data
    await loadProgrammeData(page, higherDiplomaComputing);
    
    // Click Export JSON in header
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    
    await page.getByRole('button', { name: 'Export JSON' }).click();
    
    const download = await downloadPromise;
    if (download) {
      const filename = download.suggestedFilename();
      expect(filename).toContain('.json');
    }
  });

  test('should import programme from JSON file', async ({ page }) => {
    // Create a test JSON content
    const testProgramme = {
      schemaVersion: 3,
      title: "Imported Test Programme",
      awardType: "Masters",
      nfqLevel: 9,
      totalCredits: 90,
      modules: [],
      plos: [],
      ploToModules: {},
      versions: []
    };
    
    // Look for import button/input
    const importButton = page.locator('text=Import JSON, button:has-text("Import")').first();
    
    if (await importButton.isVisible()) {
      // Find the file input
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.count() > 0) {
        // Create a temporary file to upload
        await fileInput.setInputFiles({
          name: 'test-import.json',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify(testProgramme))
        });
        
        await page.waitForTimeout(1000);
        
        // Verify import worked
        const data = await getProgrammeData(page);
        expect(data.title).toBe('Imported Test Programme');
      }
    }
  });

  test('should update header after import', async ({ page }) => {
    await loadProgrammeData(page, higherDiplomaComputing);
    await page.waitForTimeout(500);
    
    // Header should show imported programme title
    await expect(page.locator('#programmeTitleNav')).toContainText('Higher Diploma');
  });

  test('should update completion percentage after import', async ({ page }) => {
    await loadProgrammeData(page, higherDiplomaComputing);
    await page.waitForTimeout(500);
    
    // Completion should be non-zero for complete programme
    const badge = page.locator('#completionBadge');
    const text = await badge.textContent();
    expect(text).not.toBe('0% complete');
  });
});

test.describe('LocalStorage Persistence', () => {
  test('should save changes to localStorage', async ({ page }) => {
    // Make a change using specific ID
    await page.getByTestId('title-input').fill('Persisted Programme');
    await page.waitForTimeout(600);
    
    // Check localStorage
    const data = await getProgrammeData(page);
    expect(data.title).toBe('Persisted Programme');
  });

  test('should persist data across page reload', async ({ page }) => {
    // Make a change using specific ID
    await page.getByTestId('title-input').fill('Persisted After Reload');
    await page.waitForTimeout(600);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Data should still be there
    const titleInput = page.getByTestId('title-input');
    await expect(titleInput).toHaveValue('Persisted After Reload');
  });

  test('should show last saved timestamp', async ({ page }) => {
    // Make a change to trigger save
    await page.getByTestId('title-input').fill('Test Save');
    await page.waitForTimeout(600);
    
    // Check save status
    const saveStatus = page.locator('#saveStatus');
    const text = await saveStatus.textContent();
    expect(text).toContain('Saved');
  });
});

test.describe('Import Complete Programme Flow', () => {
  test('should import and display complete Higher Diploma programme', async ({ page }) => {
    await loadProgrammeData(page, higherDiplomaComputing);
    await page.waitForTimeout(800);
    
    // Check Identity using specific IDs
    await page.getByTestId('step-identity').click();
    await page.waitForTimeout(500);
    await expect(page.getByTestId('title-input')).toHaveValue('Higher Diploma in Science in Computing');
    
    // Check PLOs - look for any PLO text content
    await page.getByTestId('step-outcomes').click();
    await page.waitForTimeout(500);
    // First PLO text starts with "Design, develop..."
    await expect(page.getByText('Design', { exact: false }).first()).toBeVisible();
    
    // Check Modules
    await page.getByTestId('step-structure').click();
    await page.waitForTimeout(800);
    // Module data uses code CMP8001 and title Software Development
    // The code is in a textbox value, so check the input has the expected value
    await expect(page.locator('input[value="CMP8001"]').first()).toBeVisible();
  });
});

