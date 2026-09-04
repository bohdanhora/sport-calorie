import { expect, test, type Page } from '@playwright/test';

const MS_PER_DAY = 86_400_000;
const PASSWORD = 'playwright-password';

const dayOffsetFromToday = (offset: number): string =>
  new Date(Date.now() + offset * MS_PER_DAY).toISOString().slice(0, 10);

const calorieBlock = 'section[aria-labelledby="calorie-heading"]';

test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();

  page = await context.newPage();

  await page.goto('/register');
  await page.getByLabel('Email').fill(`e2e-${Date.now()}@sport-calorie.test`);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test.afterAll(async () => {
  await page.context().close();
});

test('logs food and updates the calorie balance', async () => {
  await page.goto(`/?date=${dayOffsetFromToday(-2)}`);

  await expect(page.getByText('No food logged yet')).toBeVisible();

  await page.getByRole('button', { name: 'Food', exact: true }).first().click();
  await page.getByRole('button', { name: 'Enter calories manually' }).click();
  await page.getByLabel('Name').fill('Porridge');
  await page.getByRole('spinbutton', { name: 'Amount' }).fill('250');
  await page.getByRole('spinbutton', { name: 'Calories' }).fill('420');
  await page.getByRole('button', { name: 'Add to diary' }).click();

  await expect(page.getByText('Food logged', { exact: true })).toBeVisible();
  await expect(page.locator(calorieBlock)).toContainText('420');
  await expect(page.getByText('Porridge')).toBeVisible();
});

test('records a treadmill session and derives the average speed', async () => {
  await page.goto(`/?date=${dayOffsetFromToday(-3)}`);

  await page.getByRole('button', { name: 'Walk' }).click();
  await page.getByRole('spinbutton', { name: 'Duration' }).fill('45');
  await page.getByRole('spinbutton', { name: 'Distance' }).fill('3.7');
  await expect(page.getByText('Estimated burn')).toBeVisible();
  await page.getByRole('button', { name: 'Log activity' }).click();

  await expect(page.getByText('Activity logged', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Walking' })).toBeVisible();
  await expect(page.getByText('45 min · 3.7 km · 4.9 km/h')).toBeVisible();
});

test('records a repetition workout', async () => {
  await page.goto(`/?date=${dayOffsetFromToday(-4)}`);

  await page.getByRole('button', { name: 'Workout' }).click();
  await page.getByRole('spinbutton', { name: 'Sets' }).fill('5');
  await page.getByRole('spinbutton', { name: 'Repetitions' }).fill('80');
  await expect(page.getByText('Estimated burn')).toBeVisible();
  await page.getByRole('button', { name: 'Log activity' }).click();

  await expect(page.getByText('Activity logged', { exact: true })).toBeVisible();
  await expect(page.getByText('5 sets, 80 reps')).toBeVisible();
});

test('records weight for a day', async () => {
  await page.goto(`/?date=${dayOffsetFromToday(-5)}`);

  await page.getByRole('button', { name: 'Weight' }).click();
  await page.getByRole('spinbutton', { name: 'Weight' }).fill('80.4');
  await page.getByRole('button', { name: 'Save weight' }).click();

  await expect(page.getByText('Weight recorded', { exact: true })).toBeVisible();
  await expect(page.getByText('80.4')).toBeVisible();
});

test('keeps a manually chosen calorie goal', async () => {
  await page.goto('/settings');

  await page.getByRole('spinbutton', { name: 'Daily calorie goal' }).fill('2200');
  await page.getByRole('button', { name: 'Save goal' }).click();

  await expect(page.getByText('Calorie goal updated', { exact: true })).toBeVisible();
  await expect(page.getByText('You set this manually')).toBeVisible();

  await page.goto('/');
  await expect(page.locator(calorieBlock)).toContainText('2,200');
});

test('moves between days from the header', async () => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Previous day' }).click();
  await expect(page.getByRole('heading', { name: 'Yesterday' })).toBeVisible();

  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('lists the logged days in history', async () => {
  await page.goto('/history');

  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Porridge|kcal|in/ }).first()).toBeVisible();
});
