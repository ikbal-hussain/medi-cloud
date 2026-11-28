import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';

export const DEMO = {
  admin: { email: 'admin@city.com', password: 'admin123' },
  doctor: { email: 'doc@city.com', password: 'doc123' },
  receptionist: { email: 'nurse@city.com', password: 'nurse123' },
  otherAdmin: { email: 'admin@galaxy.com', password: 'admin123' },
} as const;

export const unique = () => Date.now().toString(36).slice(-6);

/** A session token for a demo user, straight from the API. */
export async function tokenFor(request: APIRequestContext, who: { email: string; password: string }) {
  const res = await request.post(`${API_URL}/auth/login`, { data: who });
  expect(res.ok(), `login as ${who.email}`).toBeTruthy();
  return ((await res.json()) as { token: string }).token;
}

/** Registers a patient through the API, so a test doesn't depend on another test having done it. */
export async function createPatient(
  request: APIRequestContext,
  who: { email: string; password: string },
  name: string,
) {
  const res = await request.post(`${API_URL}/patients`, {
    headers: { Authorization: `Bearer ${await tokenFor(request, who)}` },
    data: {
      name,
      age: 40,
      gender: 'Female',
      type: 'IPD',
      phoneNumber: '555-0199',
      address: 'Ward 3',
      admissionDate: '2026-11-27',
    },
  });
  expect(res.ok(), 'create patient').toBeTruthy();
}

/** Logs in through the API and opens the app with that session (fast path for tests not about login). */
export async function openAs(page: Page, who: { email: string; password: string }) {
  const token = await tokenFor(page.request, who);
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
  const card = page
    .locator('div.rounded-xl')
    .filter({ has: page.getByText(label, { exact: true }) })
    .first();
  return (await card.locator('p.text-3xl').innerText()).trim();
}
