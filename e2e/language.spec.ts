import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding, pickBirthDate, registerAccount } from './support/account';

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

test('the language chosen on the first screen carries through the wizard', async ({ page }) => {
  await registerAccount(page, 'lang-first-run');

  await expect(page.getByRole('heading', { name: 'Welcome to Sport Calorie' })).toBeVisible();
  await page.getByRole('radio', { name: 'ru', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'Добро пожаловать в Sport Calorie' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();

  await page.getByRole('combobox', { name: 'Пол' }).click();
  await page.getByRole('option', { name: 'Мужской', exact: true }).click();
  await pickBirthDate(page, 'Дата рождения');
  await page.getByRole('spinbutton', { name: 'Рост' }).fill('180');
  await page.getByRole('spinbutton', { name: 'Текущий вес' }).fill('80');
  await page.getByRole('button', { name: 'Дальше', exact: true }).click();

  await page.getByRole('button', { name: 'Дальше', exact: true }).click();

  // Nothing was touched on the preferences step, so the language saved is the
  // one picked on the opening screen.
  await page.getByRole('button', { name: 'Завершить' }).click();
  await expect(page.getByRole('heading', { name: 'Всё готово' })).toBeVisible();
  await page.getByRole('button', { name: 'Начать' }).click();

  await expect(page.getByRole('heading', { name: 'Сегодня' })).toBeVisible();

  // It reached the profile, not just the browser's cookie.
  await page.goto('/settings');
  await expect(page.getByRole('combobox', { name: 'Язык' })).toContainText('Русский');
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
