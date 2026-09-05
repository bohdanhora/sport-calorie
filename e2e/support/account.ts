import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'playwright-password';

/** Creates a brand new account, which always lands on the onboarding wizard. */
export const registerAccount = async (page: Page, prefix: string): Promise<void> => {
  await page.goto('/register');
  await page.getByLabel('Email').fill(`${prefix}-${Date.now()}@sport-calorie.test`);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
};

/** Answers the first-run wizard with body data every screen can work from. */
export const completeOnboarding = async (page: Page): Promise<void> => {
  await expect(page.getByRole('heading', { name: 'Welcome to Sport Calorie' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await page.getByRole('combobox', { name: 'Sex' }).click();
  await page.getByRole('option', { name: 'Male', exact: true }).click();
  await page.getByLabel('Date of birth').fill('1994-06-15');
  await page.getByRole('spinbutton', { name: 'Height' }).fill('180');
  await page.getByRole('spinbutton', { name: 'Current weight' }).fill('80');
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Your goal' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page.getByRole('heading', { name: 'You are set' })).toBeVisible();
  await page.getByRole('button', { name: 'Start logging' }).click();
};
