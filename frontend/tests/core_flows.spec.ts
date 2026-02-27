import { test, expect } from '@playwright/test';

test.describe('Core Business Flows', () => {
  // We use a mock or a known test user if possible, or just verify UI states
  
  test('Admin: Navigate and filter bills', async ({ page }) => {
    // This test assumes an admin session is already active or login is performed
    await page.goto('/en/login');
    await page.fill('input[name="username"]', 'admin@dairy.com');
    await page.fill('input[name="password"]', 'admin123'); // Example credentials
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/admin\/daily-entry/);
    
    await page.goto('/en/admin/bills');
    await expect(page.locator('h1')).toContainText(/Bills/i);
    
    // Test filtering
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test User');
      // Wait for debounce/filtering
      await page.waitForTimeout(500);
    }
  });

  test('Customer: View dashboard and payment options', async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="username"]', 'user@dairy.com');
    await page.fill('input[name="password"]', 'user1234');
    await page.click('button[type="submit"]');
    
    // Check for customer dashboard elements
    await expect(page.locator('.glass-card')).toBeVisible();
    
    // Navigate to payments
    await page.goto('/en/customer/payments');
    await expect(page.locator('button:has-text("Pay Now")')).toBeVisible();
  });

  test('User Settings: Change Password Modal', async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="username"]', 'user@dairy.com');
    await page.fill('input[name="password"]', 'user1234');
    await page.click('button[type="submit"]');
    
    await page.goto('/en/customer/settings');
    await page.click('button:has-text("Change Password")');
    
    await expect(page.locator('text=New Password')).toBeVisible();
  });
});
