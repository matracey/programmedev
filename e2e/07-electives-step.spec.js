// @ts-nocheck
import { programmeWithElectives } from "./fixtures/test-data.js";
import { expect, getProgrammeData, loadProgrammeData, test } from "./fixtures/test-fixtures.js";

/**
 * Electives step E2E tests — workflow-level coverage only.
 *
 * Individual field editing, heading, empty state, credit metrics, navigation,
 * accordion interactions, add/remove definitions and groups, and validation
 * warnings are covered by unit tests in ElectivesStep.test.tsx and
 * IdentityStep.test.tsx.
 */

test.describe("Step 6: Elective Definition Workflow", () => {
  test("should create definition in Identity and see it in Electives (cross-step)", async ({
    page,
  }) => {
    await page.getByTestId("title-input").fill("Test Programme with Electives");
    await page.getByTestId("level-input").fill("9");
    await page.getByTestId("total-credits-input").fill("90");
    await page.waitForTimeout(300);

    // Create definition in Identity
    await page.getByTestId("add-elective-definition-btn").click();
    await page.waitForTimeout(500);

    // Expand and name it
    const accordionHeader = page.locator('.accordion-button:has-text("ELEC1")').first();
    if (await accordionHeader.isVisible()) {
      const isCollapsed = (await accordionHeader.getAttribute("aria-expanded")) === "false";
      if (isCollapsed) {
        await accordionHeader.click();
        await page.waitForTimeout(300);
      }
    }

    const nameInput = page.getByTestId(/^elective-definition-name-/).first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill("Test Track");
    await page.waitForTimeout(600);

    // Navigate to Electives step and verify
    await page.getByTestId("step-electives").click();
    await page.waitForTimeout(500);

    await expect(page.getByRole("button", { name: /ELEC1\s+Test Track/i })).toBeVisible();
  });

  test("should persist elective definitions after page reload", async ({ page }) => {
    await page.getByTestId("add-elective-definition-btn").click();
    await page.waitForTimeout(600);

    const accordionHeader = page.locator('.accordion-button:has-text("ELEC1")').first();
    if (await accordionHeader.isVisible()) {
      const isCollapsed = (await accordionHeader.getAttribute("aria-expanded")) === "false";
      if (isCollapsed) {
        await accordionHeader.click();
        await page.waitForTimeout(300);
      }
    }

    const nameInput = page.getByTestId(/^elective-definition-name-/).first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill("Persistent Track");
    await page.waitForTimeout(800);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await page.getByTestId("step-electives").click();
    await page.waitForTimeout(400);

    await expect(page.locator('.accordion-button:has-text("Persistent Track")')).toBeVisible();
  });
});

test.describe("Step 6: Electives with Loaded Data", () => {
  test.beforeEach(async ({ page }) => {
    await loadProgrammeData(page, programmeWithElectives);
    await page.waitForTimeout(500);

    await page.getByTestId("step-electives").click();
    await page.waitForTimeout(400);
  });

  test("should display definitions with groups and modules", async ({ page }) => {
    await expect(page.locator('.badge:has-text("SPEC1")')).toBeVisible();
    await expect(page.getByText("Specialization Track", { exact: true })).toBeVisible();

    // Expand to see groups
    await page.getByRole("button", { name: "Expand all" }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText("Data Analytics Track", { exact: true })).toBeVisible();
    await expect(page.getByText("Cloud Computing Track", { exact: true })).toBeVisible();

    // Modules should appear in groups
    const hasModuleInfo =
      (await page.locator("text=/CMP90|Data Mining|Machine Learning|Cloud/i").count()) > 0;
    expect(hasModuleInfo).toBeTruthy();
  });

  test("should persist groups after page reload", async ({ page }) => {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await page.getByTestId("step-electives").click();
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: "Expand all" }).click();
    await page.waitForTimeout(400);

    await expect(page.getByText("Data Analytics Track", { exact: true })).toBeVisible();
    await expect(page.getByText("Cloud Computing Track", { exact: true })).toBeVisible();
  });
});

test.describe("Step 6: Elective Module Assignment", () => {
  test("should create elective module in Credits & Modules step", async ({ page }) => {
    await page.getByTestId("title-input").fill("Test Programme");
    await page.getByTestId("level-input").fill("8");
    await page.getByTestId("total-credits-input").fill("60");
    await page.waitForTimeout(300);

    await page.getByTestId("add-elective-definition-btn").click();
    await page.waitForTimeout(300);

    // Navigate to Credits & Modules
    await page.getByTestId("step-structure").click();
    await page.waitForTimeout(300);

    await page.getByTestId("add-module-btn").click();
    await page.waitForTimeout(300);

    await page
      .getByTestId(/^module-code-/)
      .first()
      .fill("ELEC1");
    await page
      .getByTestId(/^module-title-/)
      .first()
      .fill("Elective Module");
    await page
      .getByTestId(/^module-credits-/)
      .first()
      .fill("10");
    await page.waitForTimeout(300);

    const typeSelect = page.getByTestId(/^module-type-/).first();
    if ((await typeSelect.count()) > 0) {
      await typeSelect.selectOption("E");
      await page.waitForTimeout(600);

      const data = await getProgrammeData(page);
      const module = data.modules.find((m) => m.code === "ELEC1");
      expect(module.type).toBe("E");
    }
  });
});
