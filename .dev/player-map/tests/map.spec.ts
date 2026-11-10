import { expect, test } from '@playwright/test';

test('loads the real map and supports pointer and keyboard-friendly selection', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  // The Codex browser is denied direct internet access. Relay OpenFreeMap through
  // the test runner so this still exercises the real style, tiles, and glyphs.
  await page.route('https://tiles.openfreemap.org/**', async (route) => {
    const response = await fetch(route.request().url());
    const body = Buffer.from(await response.arrayBuffer());
    await route.fulfill({
      status: response.status,
      contentType: response.headers.get('content-type') ?? 'application/octet-stream',
      body,
    });
  });
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
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.48, box!.y + box!.height * 0.55);
    await expect(canvas).toHaveCSS('cursor', 'pointer');
    await page.mouse.click(box!.x + box!.width * 0.48, box!.y + box!.height * 0.55);
    await expect(page).toHaveURL(/district=/);
    await expect(page.getByTestId('selected-district')).toBeVisible();
  }

  await page.getByLabel('Choose a district').selectOption('Rosedale');
  await expect(page.getByTestId('selected-district')).toContainText('Rosedale');
  await expect(page).toHaveURL(/district=Rosedale/);

  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
