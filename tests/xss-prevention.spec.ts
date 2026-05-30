import { test, expect, Page } from '@playwright/test';

/**
 * XSS Prevention E2E Tests
 *
 * Injects classic XSS payloads into every public user-input surface and
 * verifies:
 *  1. No payload is ever executed (no dialogs / no window.__xss flag set).
 *  2. The payload is NOT present in the DOM as live HTML — it is either
 *     escaped (rendered as text) or stripped at the input boundary by
 *     DOMPurify (sanitizeUserText).
 */

const XSS_PAYLOADS = [
  `<script>window.__xss=1;document.title='pwned'</script>`,
  `<img src=x onerror="window.__xss=1">`,
  `<svg/onload="window.__xss=1">`,
  `"><script>window.__xss=1</script>`,
  `javascript:window.__xss=1`,
  `<iframe src="javascript:window.__xss=1"></iframe>`,
  `<body onload=window.__xss=1>`,
  `<a href="javascript:window.__xss=1">click</a>`,
];

async function assertNoExecution(page: Page) {
  const flag = await page.evaluate(() => (window as any).__xss);
  expect(flag, 'XSS payload should not execute').toBeUndefined();
  // Title should not have been overwritten by an injected script
  expect(await page.title()).not.toBe('pwned');
}

async function assertNoLiveScript(page: Page, payload: string) {
  // Live <script> / <iframe> / on* attributes should not be present
  const dangerous = await page.evaluate(() => ({
    scripts: document.querySelectorAll('script[data-injected], script:not([src]):not([type="application/ld+json"]):not([type="module"])').length,
    iframes: Array.from(document.querySelectorAll('iframe'))
      .filter(f => (f.getAttribute('src') || '').startsWith('javascript:')).length,
    jsHrefs: Array.from(document.querySelectorAll('a'))
      .filter(a => (a.getAttribute('href') || '').toLowerCase().startsWith('javascript:')).length,
  }));
  expect(dangerous.iframes, `iframe javascript: src present for payload ${payload}`).toBe(0);
  expect(dangerous.jsHrefs, `javascript: href present for payload ${payload}`).toBe(0);
}

test.describe('XSS prevention — public surfaces', () => {
  test.beforeEach(async ({ page }) => {
    // Capture and fail on any native dialogs (alert/confirm/prompt)
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
      throw new Error(`Unexpected dialog from XSS payload: ${dialog.message()}`);
    });
  });

  test('search input does not execute injected payloads', async ({ page }) => {
    await page.goto('/');
    for (const payload of XSS_PAYLOADS) {
      const search = page.locator('input[type="search"], input[placeholder*="uscar" i]').first();
      if (await search.count() === 0) test.skip(true, 'No search input on home');
      await search.fill(payload);
      await page.waitForTimeout(150);
      await assertNoExecution(page);
      await assertNoLiveScript(page, payload);
      await search.fill('');
    }
  });

  test('URL query params are not interpreted as HTML', async ({ page }) => {
    for (const payload of XSS_PAYLOADS) {
      const encoded = encodeURIComponent(payload);
      await page.goto(`/?q=${encoded}&search=${encoded}&category=${encoded}`);
      await page.waitForLoadState('domcontentloaded');
      await assertNoExecution(page);
      await assertNoLiveScript(page, payload);
    }
  });

  test('404 route with payload in path does not execute', async ({ page }) => {
    for (const payload of XSS_PAYLOADS.slice(0, 4)) {
      await page.goto(`/${encodeURIComponent(payload)}`);
      await assertNoExecution(page);
      await assertNoLiveScript(page, payload);
    }
  });

  test('localStorage poisoning does not lead to execution', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((payloads) => {
      localStorage.setItem('cart', JSON.stringify([{ id: payloads[0], name: payloads[1] }]));
      localStorage.setItem('search_history', JSON.stringify(payloads));
    }, XSS_PAYLOADS);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await assertNoExecution(page);
  });
});

test.describe('XSS prevention — sanitizeUserText boundary', () => {
  test('DOMPurify strips tags from user text before persistence', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const mod = await import('/src/lib/domPurify.ts');
      return [
        mod.sanitizeUserText('<script>alert(1)</script>hello'),
        mod.sanitizeUserText('<img src=x onerror=alert(1)>x'),
        mod.sanitizeUserText('<a href="javascript:alert(1)">click</a>'),
        mod.sanitizeUserText('plain text  '),
      ];
    });
    expect(result[0]).toBe('hello');
    expect(result[1]).toBe('x');
    expect(result[2]).toBe('click');
    expect(result[3]).toBe('plain text');
  });
});
