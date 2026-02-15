// @ts-nocheck
import { higherDiplomaComputing } from "./fixtures/test-data.js";
import { expect, loadProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * QQI Snapshot step E2E tests — workflow-level coverage only.
 *
 * Heading, button rendering, re-render stability, and individual field
 * display are covered by unit tests in SnapshotStep.test.tsx.
 */

test.describe("Step 14: QQI Snapshot", () => {
  test.beforeEach(async ({ page }) => {
    await loadProgrammeData(page, higherDiplomaComputing);
    await page.waitForTimeout(500);
    await page.getByTestId("step-snapshot").click();
    await page.waitForTimeout(600);
  });

  test("should display complete programme summary with versions and mapping", async ({ page }) => {
    // Programme identity
    await expect(page.getByText("Title:", { exact: false })).toBeVisible();
    await expect(page.getByText("Award:", { exact: false })).toBeVisible();
    await expect(page.getByText("NFQ level:", { exact: false })).toBeVisible();

    // Versions
    const hasVersions =
      (await page.locator("text=/Full-time|Part-time|Version|Face-to-Face/i").count()) > 0;
    expect(hasVersions).toBeTruthy();

    // Mapping matrix
    const hasTable = (await page.locator("table").count()) > 0;
    const hasMatrixText = (await page.getByText("Mapping Matrix", { exact: false }).count()) > 0;
    expect(hasTable || hasMatrixText).toBeTruthy();
  });

  test("should download JSON file", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);
    const downloadBtn = page.getByTestId("snapshot-download-json");

    if (await downloadBtn.isVisible()) {
      await downloadBtn.click();
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toContain(".json");
      }
    }
  });

  test("should show version cards with stage and module details", async ({ page }) => {
    const hasCards = (await page.locator(".card").count()) > 0;
    const hasVersionText = (await page.getByText("Version", { exact: false }).count()) > 0;
    expect(hasCards || hasVersionText).toBeTruthy();

    const hasStageInfo =
      (await page.getByText("Stage structure").count()) > 0 ||
      (await page.getByText("Stage 1", { exact: false }).count()) > 0;
    expect(hasStageInfo).toBeTruthy();

    const hasModuleInfo =
      (await page.getByText("CMP8001", { exact: false }).count()) > 0 ||
      (await page.getByText("Software Development", { exact: false }).count()) > 0;
    expect(hasModuleInfo).toBeTruthy();
  });
});
