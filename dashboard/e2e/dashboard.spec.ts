import { test, expect } from '@playwright/test';

test.describe('CapyMate Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dashboard page loads with title', async ({ page }) => {
    await expect(page).toHaveTitle(/CapyMate/);
    const heading = page.locator('h1');
    await expect(heading).toContainText('CapyMate Dashboard');
  });

  test('status card renders', async ({ page }) => {
    const statusCard = page.locator('section.dashboard-card:has-text("Agent Status")');
    await expect(statusCard).toBeVisible();

    const heading = statusCard.locator('h2');
    await expect(heading).toContainText('Agent Status');
  });

  test('allocation chart area renders', async ({ page }) => {
    const allocationChart = page.locator('section.dashboard-card:has-text("Portfolio Allocation")');
    await expect(allocationChart).toBeVisible();

    const heading = allocationChart.locator('h2');
    await expect(heading).toContainText('Portfolio Allocation');
  });

  test('trade history area renders', async ({ page }) => {
    const tradeHistory = page.locator('section.dashboard-card:has-text("Trade History")');
    await expect(tradeHistory).toBeVisible();

    const heading = tradeHistory.locator('h2');
    await expect(heading).toContainText('Trade History');
  });

  test('API connection indicator is present', async ({ page }) => {
    const connectionIndicator = page.locator('header').locator('span', { hasText: /API (Connected|Disconnected)/ });
    await expect(connectionIndicator).toBeVisible();
  });
});
