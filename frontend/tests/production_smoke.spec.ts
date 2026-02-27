import { test, expect } from '@playwright/test';

test.describe('Production Smoke Tests', () => {
  test('Landing page loads successfully', async ({ page }) => {
    await page.goto('/');
    // Check for some text from the landing page
    await expect(page).toHaveTitle(/DairyDay|Dairy Management/i);
  });

  test('Login page is accessible', async ({ page }) => {
    await page.goto('/en/login');
    // Check for login form elements
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Sign-up page is accessible', async ({ page }) => {
    await page.goto('/en/signup');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
  });
});
