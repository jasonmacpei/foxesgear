import { test, expect } from '@playwright/test';

test('homepage and navigate to shop', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Premium team apparel for players and families' })).toBeVisible();
  await page.getByRole('link', { name: 'Shop Now' }).click();
  await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
});

test('checkout page renders', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
});
