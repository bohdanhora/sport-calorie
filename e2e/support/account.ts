import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'playwright-password';

export const registerAccount = async (
  page: Page,
  prefix: string,
  email?: string,
): Promise<void> => {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email ?? `${prefix}-${Date.now()}@sport-calorie.test`);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
};

export const pickBirthDate = async (page: Page, label = 'Date of birth'): Promise<void> => {
  await page.getByLabel(label).click();
  const selects = page.locator('select');

  await selects.nth(1).selectOption('1994');
  await selects.nth(0).selectOption('5');
  await page.getByRole('gridcell').filter({ hasText: /^15$/ }).click();
};

export const completeOnboarding = async (page: Page): Promise<void> => {
  await expect(page.getByRole('heading', { name: 'Welcome to Sport Calorie' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await page.getByRole('combobox', { name: 'Sex' }).click();
  await page.getByRole('option', { name: 'Male', exact: true }).click();
  await pickBirthDate(page);
  await page.getByRole('textbox', { name: 'Height' }).fill('180');
  await page.getByRole('textbox', { name: 'Current weight' }).fill('80');
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Your goal' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page.getByRole('heading', { name: 'You are set' })).toBeVisible();
  await page.getByRole('button', { name: 'Start logging' }).click();
};
