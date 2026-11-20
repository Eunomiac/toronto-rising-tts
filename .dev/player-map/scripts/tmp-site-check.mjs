import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.maplibregl-canvas');
await page.waitForTimeout(4000);
await page.getByRole('button', { name: 'Sites' }).click();
const names = await page.locator('.icon-rail__option').allTextContents();
console.log(JSON.stringify({ menu: names.slice(0, 8), menuCount: names.length, errors }, null, 2));
await page.screenshot({ path: 'C:/Users/Owner/AppData/Local/Temp/tr-sites-menu.png' });
await page.getByRole('button', { name: 'Casa Loma' }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: 'C:/Users/Owner/AppData/Local/Temp/tr-sites-casa.png' });
await page.getByRole('button', { name: 'Map Layers' }).click();
await page.getByRole('button', { name: 'West Queen West' }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: 'C:/Users/Owner/AppData/Local/Temp/tr-sites-district.png' });
await browser.close();
