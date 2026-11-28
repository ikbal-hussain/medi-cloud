import { expect, test } from '@playwright/test';
import { collectAppErrors, DEMO, openAs, stat } from './helpers';

test.describe('what each role sees', () => {
  test('doctor: real numbers, no staff card, prescriptions named, no errors', async ({ page }) => {
    const errors = collectAppErrors(page);
    const forbidden: string[] = [];
    page.on('response', (r) => r.status() === 403 && forbidden.push(r.url()));
    await openAs(page, DEMO.doctor);
    expect(Number(await stat(page, 'Total Patients'))).toBeGreaterThanOrEqual(3);
    await expect(page.getByText('Total Staff', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Prescriptions' }).click();
    await expect(page.getByText('Acute Bronchitis')).toBeVisible();
    await expect(page.getByText('Dr. John Smith').first()).toBeVisible();
    await expect(page.getByText('Unknown Doctor')).toHaveCount(0);
    expect(forbidden).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('receptionist: no prescriptions or staff in the menu', async ({ page }) => {
    await openAs(page, DEMO.receptionist);
    await expect(page.getByRole('button', { name: 'Patients' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prescriptions' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Staff Management' })).toHaveCount(0);
  });

  test('admin: staff numbers and staff management', async ({ page }) => {
    await openAs(page, DEMO.admin);
    expect(Number(await stat(page, 'Total Staff'))).toBeGreaterThanOrEqual(3);
    await page.getByRole('button', { name: 'Staff Management' }).click();
    await expect(page.getByText('Nurse Emily Brown')).toBeVisible();
  });

  test('one failing request shows "—" and a notice instead of zeros', async ({ page }) => {
    await page.route('**/api/prescriptions', (r) =>
      r.fulfill({ status: 500, json: { error: 'boom', code: 'INTERNAL' } }),
    );
    await openAs(page, DEMO.admin);
    expect(await stat(page, 'Prescriptions')).toBe('—');
    expect(Number(await stat(page, 'Total Patients'))).toBeGreaterThanOrEqual(3);
    await expect(page.getByText("Some numbers couldn't be loaded")).toBeVisible();
  });
});
