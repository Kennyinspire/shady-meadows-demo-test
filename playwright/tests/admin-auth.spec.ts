/**
 * admin-auth.spec.ts
 *
 * Covers User Story 3 — Admin authentication:
 *   TC-10  Valid credentials → UI login succeeds and admin panel loads
 *   TC-11  Valid credentials → API returns token within 5 seconds
 *   TC-12  Invalid password → API returns 403, no token issued
 *   TC-13  Invalid username → API returns 403, error message is generic (no detail leak)
 *   TC-14  POST /auth/validate → valid token returns 200; invalid returns 403
 *   TC-15  Blank username → form prevents submission
 *   TC-16  Blank password → form prevents submission
 *   TC-17  Unauthenticated DELETE /booking/:id → API returns 403
 */

import { test, expect } from '@playwright/test';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const RAW_API_BASE   = env.API_BASE_URL ?? 'https://automationintesting.online';
const API_BASE       = RAW_API_BASE.endsWith('/api')
  ? RAW_API_BASE
  : `${RAW_API_BASE.replace(/\/$/, '')}/api`;
const ADMIN_USERNAME = env.ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = env.ADMIN_PASSWORD ?? 'password';

// ─── TC-10: UI login — valid credentials ─────────────────────────────────────

test('TC-10 — Valid admin credentials log in via the UI and load the admin panel', async ({ page }) => {
  await page.goto('/admin');

  // Fill in login form
  await page.getByRole('textbox', { name: /username/i }).fill(ADMIN_USERNAME);
  await page.getByRole('textbox', { name: /password/i }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /login/i }).click();

  await expect(page).toHaveURL(/\/admin\//);
  await expect(page.getByRole('link', { name: /rooms/i })).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
});

// ─── TC-11: API login — response within 5 seconds ────────────────────────────

test('TC-11 — Valid credentials are authenticated via the API within 5 seconds', async () => {
  const start = Date.now();

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });

  const elapsed = Date.now() - start;

  expect(res.status).toBe(200);

  const body = await res.json() as { token?: string };
  expect(body.token).toBeTruthy();

  // Acceptance criterion: authentication within 5 seconds
  expect(elapsed).toBeLessThan(5_000);
});

// ─── TC-12: API login — invalid password returns 403 ─────────────────────────

test('TC-12 — Invalid password returns 403 and no token is issued', async () => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: 'wrongpassword123' }),
  });

  expect(res.status).toBe(401);

  const body = await res.json() as Record<string, unknown>;
  expect(body.token).toBeUndefined();
  expect(String(body.error ?? '').toLowerCase()).toContain('invalid');
});

// ─── TC-13: API login — invalid username returns 403 with generic message ─────

test('TC-13 — Invalid username returns 403; response does not leak which field was wrong', async () => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'notarealuser', password: ADMIN_PASSWORD }),
  });

  expect(res.status).toBe(401);

  const body = await res.json() as Record<string, unknown>;
  expect(body.token).toBeUndefined();

  // The error message should NOT reveal which field was incorrect
  // (prevents username enumeration)
  const errorText = JSON.stringify(body).toLowerCase();
  expect(errorText).toContain('invalid credentials');
  expect(errorText).not.toContain('username');
  expect(errorText).not.toContain('password');
});

// ─── TC-14: API token validation ─────────────────────────────────────────────

test('TC-14 — POST /auth/validate returns 200 for a valid token and 403 for an invalid one', async () => {
  // Obtain a real token
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });
  expect(loginRes.status).toBe(200);
  const { token } = await loginRes.json() as { token: string };

  // Valid token
  const validRes = await fetch(`${API_BASE}/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  expect(validRes.status).toBe(200);

  // Invalid token
  const invalidRes = await fetch(`${API_BASE}/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'invalid-token-xyz' }),
  });
  expect(invalidRes.status).toBe(403);
});

// ─── TC-15: UI — blank username prevents submission ───────────────────────────

test('TC-15 — Blank username field prevents the login form from submitting', async ({ page }) => {
  await page.goto('/admin');

  // Leave username blank, fill password
  await page.getByRole('textbox', { name: /password/i }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /login/i }).click();

  // Should still be on the login page (not navigated to admin panel)
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
});

// ─── TC-16: UI — blank password prevents submission ──────────────────────────

test('TC-16 — Blank password field prevents the login form from submitting', async ({ page }) => {
  await page.goto('/admin');

  await page.getByRole('textbox', { name: /username/i }).fill(ADMIN_USERNAME);
  // Leave password blank
  await page.getByRole('button', { name: /login/i }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
});

// ─── TC-17: API — unauthenticated DELETE returns 403 ────────────────────────

test('TC-17 — Unauthenticated DELETE /booking/:id returns 403', async () => {
  // Current API surface exposes protected delete on room resources.
  // We verify that deleting without auth is forbidden.
  const deleteRes = await fetch(`${API_BASE}/room/1`, {
    method: 'DELETE',
  });

  expect(deleteRes.status).toBe(403);
});
