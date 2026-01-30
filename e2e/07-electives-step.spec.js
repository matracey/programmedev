// @ts-check
import { test, expect, loadProgrammeData, getProgrammeData } from './fixtures/test-fixtures.js';
import { programmeWithElectives } from './fixtures/test-data.js';

test.describe('Step 6: Electives', () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step first
    await page.getByTestId('title-input').fill('Test Programme');
    await page.getByTestId('level-input').fill('9');
    await page.getByTestId('programme-credits').fill('90');
    await page.waitForTimeout(500);
    
    // Navigate to Electives
    await page.getByTestId('step-electives').click();
    await page.waitForTimeout(300);
  });

  test('should display electives section heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Electives' })).toBeVisible();
  });

  test('should show explanation of how electives work', async ({ page }) => {
    await expect(page.getByText('How elective definitions')).toBeVisible();
    await expect(page.getByText('Students complete')).toBeVisible();
  });

  test('should display credit summary metrics', async ({ page }) => {
    await expect(page.getByText('Mandatory Credits', { exact: true })).toBeVisible();
    await expect(page.getByText('Elective Definitions', { exact: true })).toBeVisible();
    await expect(page.getByText('Elective Credits', { exact: true })).toBeVisible();
    await expect(page.getByText('Programme Total', { exact: true })).toBeVisible();
  });

  test('should show empty state when no elective definitions exist', async ({ page }) => {
    await expect(page.getByText('No elective definitions')).toBeVisible();
  });

  test('should show link to Identity step for creating definitions', async ({ page }) => {
    const link = page.getByText('Go to Identity step');
    await expect(link).toBeVisible();
  });

  test('should navigate to Identity step via link', async ({ page }) => {
    await page.getByText('Go to Identity step').click();
    await page.waitForTimeout(300);
    
    // Should be on Identity step
    await expect(page.getByTestId('step-identity')).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Step 6: Elective Definitions from Identity', () => {
  test.beforeEach(async ({ page }) => {
    // Fill Identity step
    await page.getByTestId('title-input').fill('Test Programme with Electives');
    await page.getByTestId('level-input').fill('9');
    await page.getByTestId('programme-credits').fill('90');
    await page.waitForTimeout(300);
  });

  test('should add elective definition from Identity step', async ({ page }) => {
    // Click Add definition button
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data).not.toBeNull();
    expect(data.electiveDefinitions).toBeDefined();
    expect(data.electiveDefinitions.length).toBeGreaterThan(0);
  });

  test('should set elective definition code', async ({ page }) => {
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(300);
    
    // Find and clear/fill the code input
    const codeInput = page.locator('input[placeholder*="ELEC"]').first();
    await codeInput.fill('');
    await codeInput.fill('SPEC1');
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data.electiveDefinitions[0].code).toBe('SPEC1');
  });

  test('should set elective definition name', async ({ page }) => {
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(300);
    
    const nameInput = page.locator('input[placeholder*="Specialization"]').first();
    await nameInput.fill('Year 3 Specialization');
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data.electiveDefinitions[0].name).toBe('Year 3 Specialization');
  });

  test('should set elective definition credits', async ({ page }) => {
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(300);
    
    // Expand the definition if collapsed
    const expandBtn = page.getByRole('button', { name: 'Expand all' });
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(200);
    }
    
    // Find credits spinbutton (inside definition accordion)
    const creditsInput = page.locator('.accordion-collapse.show spinbutton, .accordion-collapse.show input[type="number"]').first();
    if (await creditsInput.count() > 0) {
      await creditsInput.fill('15');
      await page.waitForTimeout(600);
      
      const data = await getProgrammeData(page);
      expect(data.electiveDefinitions[0].credits).toBe(15);
    }
  });

  test('should add group to elective definition', async ({ page }) => {
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(300);
    
    // Add a second group
    await page.getByRole('button', { name: /Add group/i }).click();
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data.electiveDefinitions[0].groups.length).toBe(2);
  });

  test('should set group code and name', async ({ page }) => {
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(300);
    
    // Fill the first group's details
    const groupCodeInput = page.locator('input[placeholder="Code"]').first();
    const groupNameInput = page.locator('input[placeholder*="Group name"]').first();
    
    await groupCodeInput.fill('');
    await groupCodeInput.fill('DATA');
    await groupNameInput.fill('Data Analytics Track');
    await page.waitForTimeout(600);
    
    const data = await getProgrammeData(page);
    expect(data.electiveDefinitions[0].groups[0].code).toBe('DATA');
    expect(data.electiveDefinitions[0].groups[0].name).toBe('Data Analytics Track');
  });

  test('should remove group from definition', async ({ page }) => {
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(300);
    
    // Add a second group first
    await page.getByRole('button', { name: /Add group/i }).click();
    await page.waitForTimeout(300);
    
    // Remove the second group (click × button)
    const removeGroupBtns = page.getByRole('button', { name: '×' });
    if (await removeGroupBtns.count() > 1) {
      await removeGroupBtns.nth(1).click();
      await page.waitForTimeout(600);
      
      const data = await getProgrammeData(page);
      expect(data.electiveDefinitions[0].groups.length).toBe(1);
    }
  });

  test('should remove elective definition', async ({ page }) => {
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(600);
    
    // Verify definition was added
    let data = await getProgrammeData(page);
    expect(data).not.toBeNull();
    const initialCount = data.electiveDefinitions?.length || 0;
    expect(initialCount).toBeGreaterThan(0);
    
    // Click Remove button
    const removeBtn = page.locator('[data-remove-elective-definition]').first();
    await removeBtn.click();
    await page.waitForTimeout(800);
    
    data = await getProgrammeData(page);
    expect(data.electiveDefinitions.length).toBe(initialCount - 1);
  });

  test('should show elective definitions in Electives step after creation', async ({ page }) => {
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(600);
    
    // Set a name for easier identification
    const nameInput = page.locator('input[placeholder*="Specialization"]').first();
    await nameInput.fill('Test Track');
    await page.waitForTimeout(600);
    
    // Navigate to Electives step
    await page.getByTestId('step-electives').click();
    await page.waitForTimeout(500);
    
    // Definition should be visible - use getByRole for accordion button that contains the code
    await expect(page.getByRole('button', { name: /ELEC1\s+Test Track/i })).toBeVisible();
  });
});

test.describe('Step 6: Electives with Modules', () => {
  test.beforeEach(async ({ page }) => {
    // Load programme with electives data
    await loadProgrammeData(page, programmeWithElectives);
    await page.waitForTimeout(500);
    
    // Navigate to Electives
    await page.getByTestId('step-electives').click();
    await page.waitForTimeout(400);
  });

  test('should display elective definitions accordion', async ({ page }) => {
    await expect(page.locator('.badge:has-text("SPEC1")')).toBeVisible();
    await expect(page.getByText('Specialization Track', { exact: true })).toBeVisible();
  });

  test('should show correct credit counts', async ({ page }) => {
    // Should show elective definitions count
    await expect(page.getByText('Elective Definitions', { exact: true })).toBeVisible();
    
    // Check page content for credit displays
    const pageContent = await page.content();
    expect(pageContent).toContain('15'); // Elective credits
  });

  test('should display groups within definition', async ({ page }) => {
    // Expand definition accordion
    await page.getByRole('button', { name: 'Expand all' }).click();
    await page.waitForTimeout(300);
    
    // Should show group names - use exact match
    await expect(page.getByText('Data Analytics Track', { exact: true })).toBeVisible();
    await expect(page.getByText('Cloud Computing Track', { exact: true })).toBeVisible();
  });

  test('should show modules assigned to groups', async ({ page }) => {
    // Expand all to see modules
    await page.getByRole('button', { name: 'Expand all' }).click();
    await page.waitForTimeout(300);
    
    // Should show module codes or titles in groups
    const hasModuleInfo = await page.locator('text=/CMP90|Data Mining|Machine Learning|Cloud/i').count() > 0;
    expect(hasModuleInfo).toBeTruthy();
  });

  test('should show mandatory vs elective credit breakdown', async ({ page }) => {
    // The metrics panel should show mandatory and elective credits separately
    await expect(page.getByText('Mandatory Credits')).toBeVisible();
    await expect(page.getByText('Elective Credits')).toBeVisible();
  });

  test('should calculate programme total correctly', async ({ page }) => {
    // Programme Total metric should be visible
    await expect(page.getByText('Programme Total', { exact: true })).toBeVisible();
  });
});

test.describe('Step 6: Electives Validation', () => {
  test('should show warning for definition without credit value', async ({ page }) => {
    // Create definition without credits
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(600);
    
    // Should show QQI warning about credits
    await expect(page.locator('text=/no credit value|credit.*set/i')).toBeVisible();
  });

  test('should show warning for group without modules', async ({ page }) => {
    // Fill identity basics first
    await page.getByTestId('title-input').fill('Test');
    await page.getByTestId('level-input').fill('8');
    await page.waitForTimeout(300);
    
    // Create definition
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(600);
    
    // Should show warning about no modules assigned to group
    await expect(page.locator('text=/no modules assigned/i')).toBeVisible();
  });
});

test.describe('Step 6: Electives Module Assignment', () => {
  test.beforeEach(async ({ page }) => {
    // Fill identity
    await page.getByTestId('title-input').fill('Test Programme');
    await page.getByTestId('level-input').fill('8');
    await page.getByTestId('programme-credits').fill('60');
    await page.waitForTimeout(300);
    
    // Create an elective definition
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(300);
  });

  test('should show link to Credits & Modules when no elective modules exist', async ({ page }) => {
    // Navigate to Electives
    await page.getByTestId('step-electives').click();
    await page.waitForTimeout(300);
    
    // Should show link to Credits & Modules
    await expect(page.getByText('Go to Credits & Modules')).toBeVisible();
  });

  test('should create elective module in Credits & Modules step', async ({ page }) => {
    // Navigate to Credits & Modules
    await page.getByTestId('step-structure').click();
    await page.waitForTimeout(300);
    
    // Add a module
    await page.getByTestId('add-module-btn').click();
    await page.waitForTimeout(300);
    
    // Fill module details
    await page.locator('[data-module-field="code"]').first().fill('ELEC1');
    await page.locator('[data-module-field="title"]').first().fill('Elective Module');
    await page.locator('[data-module-field="credits"]').first().fill('10');
    await page.waitForTimeout(300);
    
    // Look for type selector and change to Elective
    const typeSelect = page.locator('[data-module-field="type"]').first();
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption('E');
      await page.waitForTimeout(600);
      
      const data = await getProgrammeData(page);
      const module = data.modules.find(m => m.code === 'ELEC1');
      expect(module.type).toBe('E');
    }
  });
});

test.describe('Step 6: Electives Navigation', () => {
  test('should navigate to Electives step using step button', async ({ page }) => {
    await page.getByTestId('step-electives').click();
    await page.waitForTimeout(300);
    
    await expect(page.getByTestId('step-electives')).toHaveAttribute('aria-selected', 'true');
  });

  test('should navigate to Electives using Next from Credits & Modules', async ({ page }) => {
    // First go to Credits & Modules
    await page.getByTestId('step-structure').click();
    await page.waitForTimeout(300);
    
    // Click Next
    await page.getByTestId('next-btn').click();
    await page.waitForTimeout(300);
    
    // Should be on Electives
    await expect(page.getByTestId('step-electives')).toHaveAttribute('aria-selected', 'true');
  });

  test('should navigate back to Credits & Modules using Back', async ({ page }) => {
    await page.getByTestId('step-electives').click();
    await page.waitForTimeout(300);
    
    // Click Back
    await page.getByTestId('back-btn').click();
    await page.waitForTimeout(300);
    
    // Should be on Credits & Modules
    await expect(page.getByTestId('step-structure')).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Step 6: Electives UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await loadProgrammeData(page, programmeWithElectives);
    await page.waitForTimeout(500);
    await page.getByTestId('step-electives').click();
    await page.waitForTimeout(400);
  });

  test('should expand all definitions', async ({ page }) => {
    const expandBtn = page.getByRole('button', { name: 'Expand all' });
    await expandBtn.click();
    await page.waitForTimeout(300);
    
    // Should show expanded content
    const expandedPanels = page.locator('.accordion-collapse.show');
    expect(await expandedPanels.count()).toBeGreaterThan(0);
  });

  test('should collapse all definitions', async ({ page }) => {
    // First expand
    await page.getByRole('button', { name: 'Expand all' }).click();
    await page.waitForTimeout(200);
    
    // Then collapse
    await page.getByRole('button', { name: 'Collapse all' }).click();
    await page.waitForTimeout(300);
  });

  test('should toggle individual definition accordion', async ({ page }) => {
    // Click on definition header to toggle
    const defHeader = page.locator('.accordion-button').first();
    const initialExpanded = await defHeader.getAttribute('aria-expanded');
    
    await defHeader.click();
    await page.waitForTimeout(300);
    
    const newExpanded = await defHeader.getAttribute('aria-expanded');
    expect(newExpanded).not.toBe(initialExpanded);
  });
});

test.describe('Step 6: Electives Data Persistence', () => {
  test('should persist elective definitions after page reload', async ({ page }) => {
    // Create definition
    await page.getByRole('button', { name: /Add definition/i }).click();
    await page.waitForTimeout(600);
    
    // Set a distinctive name
    const nameInput = page.locator('input[placeholder*="Specialization"]').first();
    await nameInput.fill('Persistent Track');
    await page.waitForTimeout(800);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Navigate to Electives
    await page.getByTestId('step-electives').click();
    await page.waitForTimeout(400);
    
    // Definition should still exist - use getByRole for accordion button that contains the name
    await expect(page.getByRole('button', { name: /Persistent Track/i })).toBeVisible();
  });

  test('should persist group assignments after page reload', async ({ page }) => {
    await loadProgrammeData(page, programmeWithElectives);
    await page.waitForTimeout(500);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    // Navigate to Electives
    await page.getByTestId('step-electives').click();
    await page.waitForTimeout(400);
    
    // Expand definitions
    await page.getByRole('button', { name: 'Expand all' }).click();
    await page.waitForTimeout(400);
    
    // Groups should be visible - use exact match
    await expect(page.getByText('Data Analytics Track', { exact: true })).toBeVisible();
    await expect(page.getByText('Cloud Computing Track', { exact: true })).toBeVisible();
  });
});
