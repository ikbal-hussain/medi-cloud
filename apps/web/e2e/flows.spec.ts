import { expect, test } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { createPatient, DEMO, openAs, tokenFor, unique } from './helpers';

// Every test sets up its own data, so any one can run alone or be retried.
test.describe('day-to-day flows', () => {
  test('receptionist registers a patient', async ({ page }) => {
    const patient = `Asha ${unique()}`;
    await openAs(page, DEMO.receptionist);
    await page.getByRole('button', { name: 'Patients' }).click();
    await page.getByRole('button', { name: /Add Patient/ }).click();
    const form = page.locator('form');
    await form.locator('input').nth(0).fill(patient);
    await form.locator('input').nth(1).fill('29');
    await form.locator('select').nth(0).selectOption('Female');
    await form.locator('input').nth(2).fill('98640-12345');
    await form.locator('textarea').fill('Garuajhar, Assam');
    await form.locator('select').nth(1).selectOption('IPD');
    await form.locator('button[type=submit]').click();
    await expect(page.getByText(patient)).toBeVisible();
  });

  test('doctor writes a prescription', async ({ page, request }) => {
    const patient = `Bina ${unique()}`;
    await createPatient(request, DEMO.receptionist, patient);
    await openAs(page, DEMO.doctor);
    await page.getByRole('button', { name: 'Prescriptions' }).click();
    await page.getByRole('button', { name: /New Prescription/ }).click();
    const form = page.locator('form');
    const value = await form
      .locator('select option')
      .evaluateAll((options, name) => (options as HTMLOptionElement[]).find((o) => o.text.includes(name))?.value, patient);
    expect(value).toBeTruthy();
    await form.locator('select').selectOption(value!);
    await form.locator('input').first().fill('Viral fever');
    await form.locator('textarea').nth(0).fill('Paracetamol 650mg - every 6 hours for 3 days');
    await form.locator('button[type=submit]').click();
    await expect(page.getByText('Viral fever')).toBeVisible();
  });

  test('admin adds staff; a short password is refused with the reason', async ({ page }) => {
    await openAs(page, DEMO.admin);
    await page.getByRole('button', { name: 'Staff Management' }).click();
    await page.getByRole('button', { name: /Add Staff/ }).click();
    const form = page.locator('form');
    const email = `rina.${unique()}@city.com`;
    await form.locator('input[type=email]').fill(email);
    await form.locator('input:not([type=email]):not([type=password])').first().fill('Rina Das');
    await form.locator('select').selectOption('RECEPTIONIST');
    // The browser checks minLength itself; drop it so the API's own answer is what's tested.
    const password = form.locator('input[type=password]');
    await password.evaluate((el) => el.removeAttribute('minlength'));
    await password.fill('abc123');

    const dialog = page.waitForEvent('dialog');
    await form.locator('button[type=submit]').click();
    const refused = await dialog;
    expect(refused.message()).toBe('Password must be at least 8 characters');
    await refused.dismiss();

    // The form stays open after a refusal: fix the password and send it again.
    await password.fill('long-enough-1');
    await form.locator('button[type=submit]').click();
    await expect(form).toHaveCount(0);
    await expect(page.getByText(email)).toBeVisible();
  });

  test("another hospital sees none of it, in the API or the app", async ({ page, request }) => {
    const patient = `Chandra ${unique()}`;
    await createPatient(request, DEMO.receptionist, patient);

    // The API itself must not return it: the app also filters by hospital, which would hide a leak.
    const res = await request.get(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${await tokenFor(request, DEMO.otherAdmin)}` },
    });
    expect(res.ok()).toBeTruthy();
    expect(JSON.stringify(await res.json())).not.toContain(patient);

    await openAs(page, DEMO.otherAdmin);
    const loaded = page.waitForResponse((r) => r.url().endsWith('/api/patients') && r.request().method() === 'GET');
    await page.getByRole('button', { name: 'Patients' }).click();
    await loaded;
    await expect(page.getByText(patient)).toHaveCount(0);
  });

  test('a new hospital registers and lands on its dashboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /register|get started|sign up/i }).first().click();
    const inputs = page.locator('form input');
    const texts = ['Sunrise Clinic', 'Dr. Owner'];
    for (let i = 0, t = 0; i < (await inputs.count()); i++) {
      const type = await inputs.nth(i).getAttribute('type');
      await inputs.nth(i).fill(type === 'email' ? `owner.${unique()}@sunrise.test` : type === 'password' ? 'long-enough-1' : texts[t++]!);
    }
    await page.locator('form button[type=submit]').click();
    await expect(page.getByText('Sunrise Clinic').first()).toBeVisible();
    await expect(page.getByText(/Welcome back/)).toBeVisible();
  });
});
