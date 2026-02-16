import { test, expect } from '@playwright/test';
import { bootstrapSession, e2eAuthConfig } from './helpers/auth';

test.describe('auth bootstrap smoke', () => {
  test('bootstraps authenticated session and loads protected pages', async ({ page, request }) => {
    const payload = await bootstrapSession(request);
    const user = payload.user;
    const token = payload.token;

    await page.addInitScript(
      ({ sessionUser, sessionToken }) => {
        localStorage.setItem('currentUser', JSON.stringify(sessionUser));
        localStorage.setItem('token', sessionToken);
      },
      { sessionUser: user, sessionToken: token }
    );

    // Prime root first so app initializes with localStorage-backed auth state.
    await page.goto('/');
    await expect(page.getByText('This is your base of operations. Visit the Guild or brave the Dungeon!')).toBeVisible();
    await page.getByRole('button', { name: 'Guild' }).click();
    await expect(page).toHaveURL(/\/guild$/);
    await expect(page.getByRole('heading', { name: 'Guild' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Quest Board' })).toBeVisible();

    const userResponse = await request.get(
      `${e2eAuthConfig.backendBaseUrl}/api/users/${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    await expect(userResponse).toBeOK();
  });
});

