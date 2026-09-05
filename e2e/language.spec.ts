import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding, registerAccount } from './support/account';

test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();

  page = await context.newPage();
  await page.goto('/register');
});

test.afterAll(async () => {
  await page.context().close();
});

test('the sign in screen can switch language before signing in', async () => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByRole('radio', { name: 'ru', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();

  await page.getByRole('radio', { name: 'uk', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Вхід' })).toBeVisible();

  await page.getByRole('radio', { name: 'en', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('the language chosen in settings is applied and remembered', async () => {
  await registerAccount(page, 'lang');
  await completeOnboarding(page);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  await page.goto('/settings');
  await page.getByRole('combobox', { name: 'Language' }).click();
  await page.getByRole('option', { name: 'Русский' }).click();
  await page.getByRole('button', { name: 'Save profile' }).click();

  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Сегодня' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Осталось' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Сегодня' })).toBeVisible();
});

test('numbers and units follow the chosen language', async () => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Ходьба' }).click();
  await page.getByRole('spinbutton', { name: 'Длительность' }).fill('45');
  await page.getByRole('spinbutton', { name: 'Дистанция' }).fill('3.7');
  await expect(page.getByText('Расчётный расход')).toBeVisible();
  await page.getByRole('button', { name: 'Записать активность' }).click();

  await expect(page.getByText('Активность записана', { exact: true })).toBeVisible();
  await expect(page.getByText('45 мин · 3,7 км · 4,9 км/ч')).toBeVisible();
});
