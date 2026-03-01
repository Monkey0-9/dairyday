import { test, expect } from '@playwright/test';

test('homepage has elite title and loads', async ({ page }) => {
  await page.goto('/');
  
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/DairyDay/);
  
  // Verify main heading exists
  const heading = page.locator('h1');
  await expect(heading).toBeVisible();
});

test('mobile navigation is accessible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  
  // Verify mobile-specific elements if any
  // This is a placeholder for actual mobile nav tests
});
