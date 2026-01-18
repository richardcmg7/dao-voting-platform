import { test, expect } from '@playwright/test';

test('home page shows connect wallet CTA', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '🏛️ DAO Voting Platform' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible();
  await expect(page.getByText('Gasless voting powered by meta-transactions')).toBeVisible();
});
