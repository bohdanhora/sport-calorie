import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'playwright-password';

/** Creates a brand new account, which always lands on the onboarding wizard. */
export const registerAccount = async (page: Page, prefix: string): Promise<void> => {
  await page.goto('/register');
  await page.getByLabel('Email').fill(`${prefix}-${Date.now()}@sport-calorie.test`);
  // The field carries a "Show password" toggle, whose label also says Password.
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
};

/**
 * Answers the date of birth. It is a calendar popover rather than a native date
 * input, so the month and year come off its selects and the day off the grid.
 */
export const pickBirthDate = async (page: Page, label = 'Date of birth'): Promise<void> => {
  await page.getByLabel(label).click();
  // The calendar's month and year are the only native selects the wizard puts on
  // screen, so they can be taken in order and the language does not matter.
  const selects = page.locator('select');

  await selects.nth(1).selectOption('1994');
  // Month options are indexed from zero: June is 5 in every language.
  await selects.nth(0).selectOption('5');
  await page.getByRole('gridcell').filter({ hasText: /^15$/ }).click();
};

/** Answers the first-run wizard with body data every screen can work from. */
export const completeOnboarding = async (page: Page): Promise<void> => {
  await expect(page.getByRole('heading', { name: 'Welcome to Sport Calorie' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await page.getByRole('combobox', { name: 'Sex' }).click();
  await page.getByRole('option', { name: 'Male', exact: true }).click();
  await pickBirthDate(page);
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
