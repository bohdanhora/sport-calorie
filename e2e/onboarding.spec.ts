import { expect, test } from '@playwright/test';

import { completeOnboarding, pickBirthDate, registerAccount } from './support/account';

const WEIGHT_PROMPT = 'Record today’s weight';

const SETTLE_MS = 300;

test('a new account is guided through setup and gets a calculated target', async ({ page }) => {
  const dashboardLoaded = page.waitForResponse((response) => response.url().includes('/dashboard'));

  await registerAccount(page, 'onboarding');

  await expect(page.getByRole('heading', { name: 'Welcome to Sport Calorie' })).toBeVisible();
  await expect(page.getByText('Log what you eat')).toBeVisible();

  await dashboardLoaded;
  await page.waitForTimeout(SETTLE_MS);
  await expect(page.getByText(WEIGHT_PROMPT)).toBeHidden();

  await page.getByRole('radio', { name: 'ru', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Добро пожаловать в Sport Calorie' }),
  ).toBeVisible();

  await page.getByRole('radio', { name: 'en', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Sport Calorie' })).toBeVisible();

  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Choose one so the estimate is right')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Sex' }).click();
  await page.getByRole('option', { name: 'Male', exact: true }).click();
  await pickBirthDate(page);
  await page.getByRole('textbox', { name: 'Height' }).fill('180');
  await page.getByRole('textbox', { name: 'Current weight' }).fill('80');
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await page.getByRole('combobox', { name: 'Goal' }).click();
  await page.getByRole('option', { name: 'Lose weight' }).click();
  await page.getByRole('textbox', { name: 'Target weight' }).fill('75');
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page.getByRole('heading', { name: 'You are set' })).toBeVisible();
  await expect(page.getByText('BMR')).toBeVisible();

  await page.getByRole('button', { name: 'Start logging' }).click();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome to Sport Calorie' })).toBeHidden();

  await page.goto('/settings');
  await expect(page.getByRole('textbox', { name: 'Height' })).toHaveValue('180');
  await expect(page.getByText('Currently following the recommended target.')).toBeVisible();
  await expect(
    page.getByText('Current weight', { exact: true }).locator('xpath=following-sibling::p'),
  ).toContainText('80');
});

test('the guide can be opened again from settings', async ({ page }) => {
  await registerAccount(page, 'guide');
  await completeOnboarding(page);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Open', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Welcome to Sport Calorie' })).toBeVisible();
  await expect(page.getByText('Walking and workouts')).toBeVisible();

  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Welcome to Sport Calorie' })).toBeHidden();
});
