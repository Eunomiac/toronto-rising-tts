import { expect, test, type Route } from '@playwright/test';

async function relayThroughTestRunner(route: Route) {
  const response = await fetch(route.request().url());
  const body = Buffer.from(await response.arrayBuffer());
  await route.fulfill({
    status: response.status,
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    body,
  });
}

test('loads the real map and supports pointer and keyboard-friendly selection', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL === 'string' && baseURL.startsWith('https://')) {
    const origin = new URL(baseURL).origin;
    // Codex Chromium cannot reach the public internet directly. Relaying the
    // deployed origin preserves the public URL while Node fetches live assets.
    await page.route(`${origin}/**`, relayThroughTestRunner);
    const health = await page.request.get(`${origin}/api/health`);
    expect(health.status()).toBe(200);
    await expect(health.json()).resolves.toMatchObject({ ok: true, service: 'toronto-rising-player-map' });
  }
  // The Codex browser is denied direct internet access. Relay OpenFreeMap through
  // the test runner so this still exercises the real style, tiles, and glyphs.
  await page.route('https://tiles.openfreemap.org/**', relayThroughTestRunner);
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText;
    // MapLibre cancels obsolete vector tiles when fitBounds changes the camera.
    if (errorText === 'net::ERR_ABORTED' && request.url().endsWith('.pbf')) return;
    failedRequests.push(`${request.method()} ${request.url()}: ${errorText}`);
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Toronto Rising' })).toBeVisible();
  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('status')).toContainText('Street map ready', { timeout: 30_000 });

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
  await expect(page).toHaveURL(/district=Rosedale/);

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
