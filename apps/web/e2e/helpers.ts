import { expect, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';

export const DEMO = {
  admin: { email: 'admin@city.com', password: 'admin123' },
  doctor: { email: 'doc@city.com', password: 'doc123' },
  receptionist: { email: 'nurse@city.com', password: 'nurse123' },
  otherAdmin: { email: 'admin@galaxy.com', password: 'admin123' },
} as const;

export const unique = () => Date.now().toString(36).slice(-6);

/** Logs in through the API and opens the app with that session (fast path for tests not about login). */
export async function openAs(page: Page, who: { email: string; password: string }) {
  const res = await page.request.post(`${API_URL}/auth/login`, { data: who });
  expect(res.ok()).toBeTruthy();
  const { token } = (await res.json()) as { token: string };
  await page.addInitScript((t) => window.localStorage.setItem('auth_token', t), token);
  await page.goto('/');
  await expect(page.getByText(/Welcome back/)).toBeVisible();
}

/** Console errors from the app itself (the browser's own "Failed to load resource" lines are expected for 4xx). */
export function collectAppErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
  });
  return errors;
}

/** The number shown on a dashboard stat card. */
export async function stat(page: Page, label: string) {
  const card = page.locator('div.rounded-xl').filter({ has: page.getByText(label, { exact: true }) }).first();
  return (await card.locator('p.text-3xl').innerText()).trim();
}
