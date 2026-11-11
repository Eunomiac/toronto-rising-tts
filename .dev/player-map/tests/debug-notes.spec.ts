import { expect, test, type APIRequestContext, type Page, type Route } from '@playwright/test';

async function relay(route: Route) {
  const response = await fetch(route.request().url());
  await route.fulfill({
    status: response.status,
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    body: Buffer.from(await response.arrayBuffer()),
  });
}

async function clearNotes(request: APIRequestContext) {
  const file = await request.get('/api/debug-notes');
  const body = await file.json() as { notes: Array<{ id: number }> };
  for (const note of body.notes) await request.delete(`/api/debug-notes?id=${note.id}`);
}

async function openNotes(page: Page) {
  await page.getByRole('button', { name: /Debug notes/ }).click();
}

test.beforeEach(async ({ page, request }) => {
  await clearNotes(request);
  await page.route('https://tiles.openfreemap.org/**', relay);
});

test('pins map and interface feedback, persists it, and displays agent replies', async ({ page, request }) => {
  const browserExceptions: string[] = [];
  page.on('pageerror', (error) => browserExceptions.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') browserExceptions.push(message.text()); });
  await page.goto('/?district=Rosedale');
  await expect(page.locator('.map-surface__status')).toContainText('Street map ready', { timeout: 30_000 });
  await openNotes(page);

  await page.getByRole('button', { name: 'Add note' }).click();
  const map = page.locator('.map-surface');
  const mapBox = await map.boundingBox();
  expect(mapBox).not.toBeNull();
  await page.mouse.click(mapBox!.x + mapBox!.width * 0.5, mapBox!.y + mapBox!.height * 0.45);
  await page.getByPlaceholder(/What should change here/).fill('Map note from the browser test.');
  await page.getByPlaceholder(/What should change here/).press('Enter');

  await page.getByRole('button', { name: /Adding: click anywhere/ }).click();
  await page.getByRole('button', { name: 'Add note' }).click();
  const panel = page.locator('[data-note-surface="district-panel"]');
  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  await page.mouse.click(panelBox!.x + panelBox!.width * 0.45, panelBox!.y + panelBox!.height * 0.45);
  await page.getByPlaceholder(/What should change here/).fill('Interface note from the browser test.');
  await page.getByPlaceholder(/What should change here/).press('Enter');

  await expect.poll(async () => {
    const response = await request.get('/api/debug-notes');
    return response.json();
  }).toMatchObject({
    notes: [
      { id: expect.any(Number), anchor: { kind: 'map' }, context: { selectedDistrict: 'Rosedale', map: { zoom: expect.any(Number) } } },
      { id: expect.any(Number), anchor: { kind: 'interface', surface: 'district-panel', x: expect.any(Number), y: expect.any(Number) } },
    ],
  });

  const current = await (await request.get('/api/debug-notes')).json() as { notes: Array<{ id: number; anchor: { kind: string } }> };
  const mapNoteId = current.notes.find((note) => note.anchor.kind === 'map')?.id;
  expect(mapNoteId).toEqual(expect.any(Number));
  const reply = await request.patch(`/api/debug-notes?id=${mapNoteId}`, { data: { reply: 'The agent reply is visible after refresh.' } });
  expect(reply.ok()).toBeTruthy();
  await page.reload();
  await expect(page.locator('.map-surface__status')).toContainText('Street map ready', { timeout: 30_000 });
  await openNotes(page);
  await page.getByRole('button', { name: String(mapNoteId), exact: true }).click();
  await expect(page.getByText(/The agent reply is visible after refresh/)).toBeVisible();
  expect(browserExceptions).toEqual([]);
});
