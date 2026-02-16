import { expect } from '@playwright/test';

const backendBaseUrl = process.env.BACKEND_BASE_URL || 'http://127.0.0.1:5000';
const email = process.env.E2E_TEST_EMAIL || 'e2e-user@example.com';
const username = process.env.E2E_TEST_USERNAME || 'e2e-user';
const password = process.env.E2E_TEST_PASSWORD || 'e2e-password-123';

export const e2eAuthConfig = {
  backendBaseUrl,
  email,
  username,
  password,
};

export async function bootstrapSession(request) {
  const response = await request.post(
    `${backendBaseUrl}/api/users/e2e/bootstrap-session`,
    {
      data: { email, username, password },
    }
  );

  await expect(response, 'e2e auth helper must be enabled in backend test mode').toBeOK();

  const payload = await response.json();
  expect(payload.success).toBeTruthy();
  expect(payload.token).toBeTruthy();
  expect(payload.user?.id).toBeTruthy();
  return payload;
}

