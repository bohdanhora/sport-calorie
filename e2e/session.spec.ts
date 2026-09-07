import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding, PASSWORD, registerAccount } from './support/account';

/**
 * The phone kept landing back on the sign-in screen after a reload while the
 * desktop stayed signed in: Safari refuses the cross-site refresh cookie, so
 * emptying the cookie jar is a fair impression of what it does to a session.
 *
 * One account for the whole file, because registration and sign-in share a rate
 * limit with every other suite here.
 */
test.describe.configure({ mode: 'serial' });

let page: Page;
let email: string;

test.beforeAll(async ({ browser }) => {
  page = await (await browser.newContext()).newPage();

  email = `session-${Date.now()}@sport-calorie.test`;
  await registerAccount(page, 'session', email);
  await completeOnboarding(page);
});

test.afterAll(async () => {
  await page.context().close();
});

test('survives a reload after the browser throws the cookie away', async () => {
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  await page.context().clearCookies();
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('signing out ends the session for good', async () => {
  // Below `lg` the sidebar is gone, so settings is the way out on a phone.
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await expect(page).toHaveURL(/\/login$/);

  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});

test('signing back in starts a session the reload keeps', async () => {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();

  await page.context().clearCookies();
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});
