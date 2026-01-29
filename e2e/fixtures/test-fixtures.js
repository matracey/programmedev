// @ts-check
import { test as base, expect as pwExpect } from '@playwright/test';

const STORAGE_KEY = 'nci_pds_mvp_programme_v1';

/**
 * Custom test fixtures for the Programme Design Studio
 */
export const test = base.extend({
  /**
   * Auto-clear localStorage before each test for isolation
   */
  page: async ({ page }, use) => {
    // Navigate to the page first
    await page.goto('/');
    
    // Clear localStorage
    await page.evaluate((key) => {
      localStorage.removeItem(key);
    }, STORAGE_KEY);
    
    // Reload to apply clean state
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await use(page);
  },
});

/**
 * Helper to load programme data into localStorage
 */
export const loadProgrammeData = async (page, data) => {
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: STORAGE_KEY, value: data });
  
  await page.reload();
  await page.waitForLoadState('networkidle');
};

/**
 * Helper to get current programme data from localStorage
 */
export const getProgrammeData = async (page) => {
  return await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
};

/**
 * Helper to get current in-memory programme state (after migrations have been applied)
 * This returns the state.programme object which reflects migrations applied during load()
 */
export const getInMemoryProgrammeState = async (page) => {
  return await page.evaluate(() => {
    // Access the state from the window if exposed, or via the app's store
    if (window.__pds_state) {
      return window.__pds_state.programme;
    }
    // Fallback: trigger a minimal state read via localStorage after ensuring save
    return null;
  });
};

/**
 * Helper to navigate to a specific step by clicking on it
 */
export const navigateToStep = async (page, stepNumber) => {
  await page.click(`button:has-text("${stepNumber}.")`);
  await page.waitForTimeout(300); // Allow for render
};

/**
 * Helper to click the Next button
 */
export const clickNext = async (page) => {
  await page.click('#nextBtn');
  await page.waitForTimeout(300);
};

/**
 * Helper to click the Back button
 */
export const clickBack = async (page) => {
  await page.click('#backBtn');
  await page.waitForTimeout(300);
};

export const expect = pwExpect;
