import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';

async function relayThroughTestRunner(route: Route) {
  let response: Response | undefined;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(route.request().url());
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 150));
    }
  }
  if (!response) throw new Error(`Unable to relay ${route.request().url()}`);
  const body = Buffer.from(await response.arrayBuffer());
  await route.fulfill({
    status: response.status,
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    body,
  });
}

async function prepareNetwork(page: Page, testInfo: TestInfo) {
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL === 'string' && baseURL.startsWith('https://')) {
    const origin = new URL(baseURL).origin;
    await page.route(`${origin}/**`, relayThroughTestRunner);
  }
  await page.route('https://tiles.openfreemap.org/**', relayThroughTestRunner);
}

test('loads the real map and supports pointer and keyboard-friendly selection', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const baseURL = testInfo.project.use.baseURL;
  await prepareNetwork(page, testInfo);
  if (typeof baseURL === 'string' && baseURL.startsWith('https://')) {
    const origin = new URL(baseURL).origin;
    const health = await page.request.get(`${origin}/api/health`);
    expect(health.status()).toBe(200);
    await expect(health.json()).resolves.toMatchObject({ ok: true, service: 'toronto-rising-player-map' });
  }
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText;
    // MapLibre cancels obsolete vector tiles when fitBounds changes the camera.
    if (errorText === 'net::ERR_ABORTED' && request.url().endsWith('.pbf')) return;
    failedRequests.push(`${request.method()} ${request.url()}: ${errorText}`);
  });

  await page.goto('/');
  await expect(page.getByLabel('Choose a district')).toBeVisible();
  await expect(page.getByRole('button', { name: /Debug notes/ })).toHaveCount(0);
  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.map-surface__status')).toContainText('Street map ready', { timeout: 30_000 });

  if (testInfo.project.name === 'desktop-chromium') {
    // Focus a compact, simple district first so the pointer check does not
    // depend on one arbitrary viewport percentage continuing to cross a shape.
    await page.getByLabel('Choose a district').selectOption('YongeDundasHospital');
    await page.getByRole('button', { name: 'Close district details' }).click();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    let districtPoint: { x: number; y: number } | null = null;
    for (const yRatio of [0.32, 0.38, 0.44, 0.5, 0.56]) {
      for (const xRatio of [0.38, 0.44, 0.5, 0.56, 0.62]) {
        const point = { x: box!.x + box!.width * xRatio, y: box!.y + box!.height * yRatio };
        await page.mouse.move(point.x, point.y);
        if (await canvas.evaluate((element) => getComputedStyle(element).cursor) === 'pointer') {
          districtPoint = point;
          break;
        }
      }
      if (districtPoint) break;
    }
    expect(districtPoint).not.toBeNull();
    await expect(canvas).toHaveCSS('cursor', 'pointer');
    await page.mouse.click(districtPoint!.x, districtPoint!.y);
    await expect(page).toHaveURL(/district=[A-Za-z]+/);
    await expect(page.getByTestId('selected-district')).toBeVisible();
  }

  await page.getByLabel('Choose a district').selectOption('Rosedale');
  await expect(page.getByTestId('selected-district')).toContainText('Rosedale');
  await expect(page.getByTestId('selected-district')).toContainText('Hunting difficulty6');
  await expect(page.getByTestId('selected-district')).toContainText('Phlegmatic');
  await expect(page.getByTestId('selected-district')).toContainText('Melancholic');
  await expect(page).toHaveURL(/district=Rosedale/);

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test('visual calibration mode updates and remembers exact adjustments', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  await prepareNetwork(page, testInfo);
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });

  await page.goto('/?calibrate=1');
  await expect(page.getByRole('heading', { name: 'Visual calibration' })).toBeVisible();
  await expect(page.locator('.map-surface__status')).toContainText('Street map ready', { timeout: 30_000 });

  const horizontalScale = page.getByLabel('Horizontal scale', { exact: true });
  await horizontalScale.fill('0.9975');
  await page.getByLabel('East / west shift (m)', { exact: true }).fill('-12');
  await expect(page.getByTestId('calibration-result')).toContainText('"horizontalScale": 0.9975');
  await expect(page.getByTestId('calibration-result')).toContainText('"offsetEastMetres": -12');

  await page.reload();
  await expect(page.getByLabel('Horizontal scale', { exact: true })).toHaveValue('0.9975');
  await expect(page.getByLabel('East / west shift (m)', { exact: true })).toHaveValue('-12');
  await expect(page.getByRole('heading', { name: 'Visual calibration' })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
