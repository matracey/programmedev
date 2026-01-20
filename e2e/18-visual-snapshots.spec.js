// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const STORAGE_KEY = "nci_pds_mvp_programme_v1";

// Load sample data files
const programmeOwnerSample = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../samples/higher-diploma-computing.json"),
    "utf-8",
  ),
);

const moduleEditorSample = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "../samples/higher-diploma-computing-module-editor-view.json",
    ),
    "utf-8",
  ),
);

/**
 * Helper to load programme data via localStorage (simulating Import JSON)
 */
async function loadProgrammeData(page, data) {
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: STORAGE_KEY, value: data },
  );

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

/**
 * Helper to navigate to a step by its number
 */
async function navigateToStep(page, stepNumber, stepTitle) {
  // Click on the step button in the workflow sidebar
  await page.click(`button:has-text("${stepNumber}. ${stepTitle}")`);
  await page.waitForTimeout(500);
}

test.describe("Visual Snapshots - Programme Owner Mode", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and clear localStorage
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Load the Programme Owner sample data
    await loadProgrammeData(page, programmeOwnerSample);
  });

  test("Step 1: Identity", async ({ page }) => {
    await navigateToStep(page, "1", "Identity");

    // Wait for content to fully render
    await expect(page.locator('h5:has-text("Identity")')).toBeVisible();

    // Take snapshot of the content area
    await expect(page.locator("body")).toHaveScreenshot("01-identity-step.png");
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "01-identity-step.yaml",
    });
  });

  test("Step 2: PLOs", async ({ page }) => {
    await navigateToStep(page, "2", "PLOs");

    await expect(
      page.locator('h5:has-text("Programme Learning Outcomes")'),
    ).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot("02-plos-step.png");
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "02-plos-step.yaml",
    });
  });

  test("Step 3: Programme Versions", async ({ page }) => {
    await navigateToStep(page, "3", "Programme Versions");

    await expect(
      page.locator('h4:has-text("Programme Versions")'),
    ).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot(
      "03-programme-versions-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "03-programme-versions-step.yaml",
    });
  });

  test("Step 4: Stage Structure", async ({ page }) => {
    await navigateToStep(page, "4", "Stage Structure");

    await expect(page.locator('h4:has-text("Stage Structure")')).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot(
      "04-stage-structure-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "04-stage-structure-step.yaml",
    });
  });

  test("Step 5: Credits & Modules", async ({ page }) => {
    await navigateToStep(page, "5", "Credits & Modules");

    await expect(
      page.locator('h5:has-text("Credits & modules")'),
    ).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot(
      "05-credits-modules-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "05-credits-modules-step.yaml",
    });
  });

  test("Step 6: MIMLOs", async ({ page }) => {
    await navigateToStep(page, "6", "MIMLOs");

    await expect(page.locator('h5:has-text("MIMLOs")')).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot("06-mimlos-step.png");
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "06-mimlos-step.yaml",
    });
  });

  test("Step 7: Effort Hours", async ({ page }) => {
    await navigateToStep(page, "7", "Effort Hours");

    await expect(page.locator('h5:has-text("Effort Hours")')).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot(
      "07-effort-hours-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "07-effort-hours-step.yaml",
    });
  });

  test("Step 8: Assessments", async ({ page }) => {
    await navigateToStep(page, "8", "Assessments");

    // Assessments uses div.h5 instead of h5
    await expect(page.locator('.h5:has-text("Assessments")')).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot(
      "08-assessments-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "08-assessments-step.yaml",
    });
  });

  test("Step 9: Reading Lists", async ({ page }) => {
    await navigateToStep(page, "9", "Reading Lists");

    await expect(page.locator('h5:has-text("Reading Lists")')).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot(
      "09-reading-lists-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "09-reading-lists-step.yaml",
    });
  });

  test("Step 10: Programme Schedule", async ({ page }) => {
    await navigateToStep(page, "10", "Programme Schedule");

    await expect(
      page.locator('h5:has-text("Programme Schedule")'),
    ).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot(
      "10-programme-schedule-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "10-programme-schedule-step.yaml",
    });
  });

  test("Step 11: Mapping", async ({ page }) => {
    await navigateToStep(page, "11", "Mapping");

    await expect(
      page.locator('h5:has-text("Map PLOs to modules")'),
    ).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot("11-mapping-step.png");
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "11-mapping-step.yaml",
    });
  });

  test("Step 12: Traceability", async ({ page }) => {
    await navigateToStep(page, "12", "Traceability");
    await page.waitForTimeout(500); // Traceability might take longer to render

    await expect(
      page.locator('h5:has-text("Traceability Matrix")'),
    ).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot(
      "12-traceability-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "12-traceability-step.yaml",
    });
  });

  test("Step 13: QQI Snapshot", async ({ page }) => {
    await navigateToStep(page, "13", "QQI Snapshot");
    await page.waitForTimeout(500);

    await expect(page.locator('h5:has-text("QQI Snapshot")')).toBeVisible();

    await expect(page.locator("body")).toHaveScreenshot(
      "13-qqi-snapshot-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "13-qqi-snapshot-step.yaml",
    });
  });
});

test.describe("Visual Snapshots - Module Editor Mode", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and clear localStorage
    await page.goto("/");
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Load the Module Editor sample data
    await loadProgrammeData(page, moduleEditorSample);
    await page.waitForTimeout(300);
  });

  test("Module Editor: MIMLOs Step", async ({ page }) => {
    // In Module Editor mode, MIMLOs is step 1
    await page.click('button:has-text("1. MIMLOs")');
    await page.waitForTimeout(500);

    await expect(page.locator("body")).toHaveScreenshot(
      "module-editor-01-mimlos-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "module-editor-01-mimlos-step.yaml",
    });
  });

  test("Module Editor: Effort Hours Step", async ({ page }) => {
    await page.click('button:has-text("2. Effort Hours")');
    await page.waitForTimeout(500);

    await expect(page.locator("body")).toHaveScreenshot(
      "module-editor-02-effort-hours-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "module-editor-02-effort-hours-step.yaml",
    });
  });

  test("Module Editor: Assessments Step", async ({ page }) => {
    await page.click('button:has-text("3. Assessments")');
    await page.waitForTimeout(500);

    await expect(page.locator("body")).toHaveScreenshot(
      "module-editor-03-assessments-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "module-editor-03-assessments-step.yaml",
    });
  });

  test("Module Editor: Reading Lists Step", async ({ page }) => {
    await page.click('button:has-text("4. Reading Lists")');
    await page.waitForTimeout(500);

    await expect(page.locator("body")).toHaveScreenshot(
      "module-editor-04-reading-lists-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "module-editor-04-reading-lists-step.yaml",
    });
  });

  test("Module Editor: Programme Schedule Step", async ({ page }) => {
    await page.click('button:has-text("5. Programme Schedule")');
    await page.waitForTimeout(500);

    await expect(page.locator("body")).toHaveScreenshot(
      "module-editor-05-schedule-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "module-editor-05-schedule-step.yaml",
    });
  });

  test("Module Editor: Mapping Step", async ({ page }) => {
    await page.click('button:has-text("6. Mapping")');
    await page.waitForTimeout(500);

    await expect(page.locator("body")).toHaveScreenshot(
      "module-editor-06-mapping-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "module-editor-06-mapping-step.yaml",
    });
  });

  test("Module Editor: Traceability Step", async ({ page }) => {
    await page.click('button:has-text("7. Traceability")');
    await page.waitForTimeout(700);

    await expect(page.locator("body")).toHaveScreenshot(
      "module-editor-07-traceability-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "module-editor-07-traceability-step.yaml",
    });
  });

  test("Module Editor: QQI Snapshot Step", async ({ page }) => {
    await page.click('button:has-text("8. QQI Snapshot")');
    await page.waitForTimeout(700);

    await expect(page.locator("body")).toHaveScreenshot(
      "module-editor-08-qqi-snapshot-step.png",
    );
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: "module-editor-08-qqi-snapshot-step.yaml",
    });
  });
});
