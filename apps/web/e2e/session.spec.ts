import { expect, test } from '@playwright/test';
import { collectAppErrors, DEMO, tokenFor } from './helpers';

test.describe('session', () => {
  test('a first visit makes no session call and logs no errors', async ({ page }) => {
    const errors = collectAppErrors(page);
    const meCalls: string[] = [];
    page.on('request', (r) => r.url().includes('/auth/me') && meCalls.push(r.url()));
    await page.goto('/');
    await expect(page.getByRole('button', { name: /login/i }).first()).toBeVisible();
    expect(meCalls).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('logs in, keeps the session across a reload, and logs out', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /login/i }).first().click();
    await page.getByRole('textbox', { name: /email/i }).or(page.locator('input[type=email]')).first().fill(DEMO.doctor.email);
    await page.locator('input[type=password]').fill(DEMO.doctor.password);
    await page.getByRole('button', { name: 'Sign In' }).last().click();
    await expect(page.getByText('Welcome back, John')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Welcome back, John')).toBeVisible();
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page.getByRole('button', { name: /login/i }).first()).toBeVisible();
  });

  test('says why a login failed', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /login/i }).first().click();
    await page.locator('input[type=email]').fill(DEMO.doctor.email);
    await page.locator('input[type=password]').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In' }).last().click();
    await expect(page.getByText('Invalid email or password')).toBeVisible();

    await page.route('**/api/auth/login', (r) => r.abort());
    await page.getByRole('button', { name: 'Sign In' }).last().click();
    await expect(page.getByText("Can't reach the server")).toBeVisible();
  });

  test('forgets a rejected token', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('auth_token', 'not.a.valid-token');
        sessionStorage.setItem('seeded', '1');
      }
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /login/i }).first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
  });

  test('shows a retry screen while the server is unreachable, then recovers', async ({ page }) => {
    const token = await tokenFor(page.request, DEMO.admin);
    await page.addInitScript((t) => localStorage.setItem('auth_token', t), token);
    await page.route('**/api/auth/me', (r) => r.abort());
    await page.goto('/');
    await expect(page.getByText("Can't reach Medi Cloud right now")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBe(token);
    await page.unroute('**/api/auth/me');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('Welcome back, Sarah')).toBeVisible();
  });
});
