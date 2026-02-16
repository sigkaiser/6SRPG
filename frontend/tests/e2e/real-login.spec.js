import { test, expect } from '@playwright/test';
import { bootstrapSession, e2eAuthConfig } from './helpers/auth';

test.describe('auth real login flow', () => {
  test('logs in through UI and reaches protected guild route', async ({ page, request }) => {
    // Seed deterministic credentials, then verify login using the real UI path.
    const payload = await bootstrapSession(request);

    await page.goto('/');

    await page.getByRole('button', { name: 'Login' }).first().click();
    await page.locator('#login-email').fill(e2eAuthConfig.email);
    await page.locator('#login-password').fill(e2eAuthConfig.password);
    await page.locator('form').getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('This is your base of operations. Visit the Guild or brave the Dungeon!')).toBeVisible();
    await page.getByRole('button', { name: 'Guild' }).click();
    await expect(page).toHaveURL(/\/guild$/);
    await expect(page.getByRole('heading', { name: 'Guild' })).toBeVisible();
    await expect(page.getByText(`Welcome, ${payload.user.username}!`)).toBeVisible();
  });
});

