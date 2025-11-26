import { test, expect, Page, Browser } from '@playwright/test';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPREHENSIVE 2FA SECURITY TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This test suite validates ALL 11 critical security sections for 2FA:
 * 
 * SECTION 1: Normal 2FA flow (login → 2FA → access)
 * SECTION 2: Race condition during "Processing..." state
 * SECTION 3: Direct URL navigation bypass attempts
 * SECTION 4: Multi-tab/window access attempts
 * SECTION 5: Page refresh (F5) during 2FA
 * SECTION 6: Cookie manipulation (remember device)
 * SECTION 7: Extreme state bypass attempts
 * SECTION 8: Users without 2FA
 * SECTION 9: Admin users with 2FA
 * SECTION 10: Time/delay stress tests
 * SECTION 11: Post-2FA verification access
 */

// ═══════════════════════════════════════════════════════════════════════════
// TEST CREDENTIALS - UPDATE WITH YOUR TEST USERS
// ═══════════════════════════════════════════════════════════════════════════
const TEST_USERS = {
  with2FA: {
    email: 'test-2fa@example.com',
    password: 'TestPassword123!',
    totpSecret: 'JBSWY3DPEHPK3PXP' // Base32 encoded TOTP secret
  },
  without2FA: {
    email: 'test-no-2fa@example.com',
    password: 'TestPassword123!'
  },
  admin2FA: {
    email: 'admin-2fa@example.com',
    password: 'AdminPassword123!',
    totpSecret: 'JBSWY3DPEHPK3PXP'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate TOTP code using otplib
 * Install: npm install otplib
 */
function generateTOTP(secret: string): string {
  const { authenticator } = require('otplib');
  return authenticator.generate(secret);
}

/**
 * Login with credentials only (stops before 2FA)
 */
async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
}

/**
 * Complete 2FA verification
 */
async function complete2FA(page: Page, totpSecret: string) {
  const code = generateTOTP(totpSecret);
  await page.waitForSelector('text=/Autenticação de 2 Fatores|Digite o código/i', { timeout: 5000 });
  
  // Fill OTP code (6 digits)
  const inputs = await page.locator('input[id*="pin-input"]').all();
  for (let i = 0; i < code.length; i++) {
    await inputs[i].fill(code[i]);
  }
  
  await page.click('button:has-text("Verificar")');
  await page.waitForTimeout(2000);
}

/**
 * Check if on 2FA verification screen
 */
async function isOn2FAScreen(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('text=/Autenticação de 2 Fatores|Digite o código/i', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if protected content is visible
 */
async function hasProtectedContent(page: Page): Promise<boolean> {
  const protectedIndicators = [
    'text=/Bem-vindo|Perfil|Admin|Dashboard|Meus Pedidos/i',
    '[data-protected="true"]'
  ];
  
  for (const selector of protectedIndicators) {
    const isVisible = await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
    if (isVisible) return true;
  }
  
  return false;
}

/**
 * Verify route is blocked (must show 2FA gate or redirect to auth)
 */
async function verifyRouteBlocked(page: Page, routeName: string) {
  const is2FAVisible = await isOn2FAScreen(page);
  const isAuthPage = page.url().includes('/auth');
  const hasProtected = await hasProtectedContent(page);
  
  if (!is2FAVisible && !isAuthPage) {
    throw new Error(`🚨 SECURITY BREACH: Route ${routeName} is accessible without 2FA!`);
  }
  
  if (hasProtected) {
    throw new Error(`🚨 SECURITY BREACH: Protected content visible on ${routeName} without 2FA!`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: NORMAL 2FA FLOW
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 1 - Normal 2FA Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  });

  test('1.1 - Login with 2FA shows verification screen (not protected pages)', async ({ page }) => {
    console.log('🔐 TEST 1.1: Login → 2FA screen (NO home/profile/admin)');
    
    await loginWithCredentials(page, TEST_USERS.with2FA.email, TEST_USERS.with2FA.password);
    
    // Wait for 2FA screen
    await page.waitForTimeout(3000);
    
    // CRITICAL: Must show 2FA, NOT protected pages
    const is2FA = await isOn2FAScreen(page);
    expect(is2FA).toBeTruthy();
    
    // CRITICAL: Protected content must NOT be visible
    const hasProtected = await hasProtectedContent(page);
    expect(hasProtected).toBeFalsy();
    
    console.log('✅ TEST 1.1 PASSED: 2FA screen shown, protected pages blocked');
  });

  test('1.2 - Complete 2FA unlocks everything', async ({ page }) => {
    console.log('🔐 TEST 1.2: After correct 2FA → full access');
    
    await loginWithCredentials(page, TEST_USERS.with2FA.email, TEST_USERS.with2FA.password);
    await page.waitForTimeout(3000);
    
    // Complete 2FA
    await complete2FA(page, TEST_USERS.with2FA.totpSecret);
    await page.waitForLoadState('networkidle');
    
    // Should now be on home page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/auth');
    
    // Navbar should be enabled
    const profileButton = page.locator('button:has(svg.lucide-user)').first();
    const isDisabled = await profileButton.getAttribute('disabled');
    expect(isDisabled).toBeNull();
    
    // Can access profile
    await profileButton.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/profile');
    
    console.log('✅ TEST 1.2 PASSED: Full access after 2FA completion');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: RACE CONDITION - CLICK DURING "PROCESSING..."
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 2 - Race Condition During Processing', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  });

  test('2.1 - Cannot access profile by clicking during "Processando..."', async ({ page }) => {
    console.log('🔐 TEST 2.1: Click profile icon during "Processando..."');
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.with2FA.email);
    await page.fill('input[type="password"]', TEST_USERS.with2FA.password);
    
    // Click login and immediately try navbar
    await page.click('button[type="submit"]');
    
    // Try to click profile MULTIPLE times during processing
    const profileButton = page.locator('button:has(svg.lucide-user)').first();
    for (let i = 0; i < 10; i++) {
      await profileButton.click({ force: true, timeout: 100 }).catch(() => {});
      await page.waitForTimeout(50);
    }
    
    await page.waitForTimeout(3000);
    
    // CRITICAL: Must NOT be on profile page
    expect(page.url()).not.toContain('/profile');
    
    // Must be on 2FA screen or auth
    await verifyRouteBlocked(page, 'profile (during processing)');
    
    console.log('✅ TEST 2.1 PASSED: Profile blocked during processing');
  });

  test('2.2 - Cannot access admin by clicking during "Processando..."', async ({ page }) => {
    console.log('🔐 TEST 2.2: Click admin during "Processando..."');
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.admin2FA.email);
    await page.fill('input[type="password"]', TEST_USERS.admin2FA.password);
    
    await page.click('button[type="submit"]');
    
    // Try admin link rapidly
    const adminLink = page.locator('a[href="/admin"]').first();
    for (let i = 0; i < 10; i++) {
      await adminLink.click({ force: true, timeout: 100 }).catch(() => {});
      await page.waitForTimeout(50);
    }
    
    await page.waitForTimeout(3000);
    
    expect(page.url()).not.toContain('/admin');
    await verifyRouteBlocked(page, 'admin (during processing)');
    
    console.log('✅ TEST 2.2 PASSED: Admin blocked during processing');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: DIRECT URL NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 3 - Direct URL Navigation Bypass', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  });

  test('3.1 - Cannot access /profile via URL during 2FA', async ({ page }) => {
    console.log('🔐 TEST 3.1: Type /profile in URL bar during 2FA');
    
    await loginWithCredentials(page, TEST_USERS.with2FA.email, TEST_USERS.with2FA.password);
    await page.waitForTimeout(3000);
    
    // Direct navigation
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    
    await verifyRouteBlocked(page, '/profile');
    
    console.log('✅ TEST 3.1 PASSED: /profile blocked via URL');
  });

  test('3.2 - Cannot access /admin via URL during 2FA', async ({ page }) => {
    console.log('🔐 TEST 3.2: Type /admin in URL bar during 2FA');
    
    await loginWithCredentials(page, TEST_USERS.admin2FA.email, TEST_USERS.admin2FA.password);
    await page.waitForTimeout(3000);
    
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    await verifyRouteBlocked(page, '/admin');
    
    console.log('✅ TEST 3.2 PASSED: /admin blocked via URL');
  });

  test('3.3 - Cannot access /orders, /settings via URL during 2FA', async ({ page }) => {
    console.log('🔐 TEST 3.3: Type /orders, /settings in URL bar during 2FA');
    
    await loginWithCredentials(page, TEST_USERS.with2FA.email, TEST_USERS.with2FA.password);
    await page.waitForTimeout(3000);
    
    const routes = ['/my-orders', '/trusted-devices', '/checkout', '/cart'];
    
    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(1500);
      await verifyRouteBlocked(page, route);
      console.log(`  ✅ ${route} blocked`);
    }
    
    console.log('✅ TEST 3.3 PASSED: All protected routes blocked via URL');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: MULTI-TAB ACCESS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 4 - Multi-Tab/Window Access', () => {
  
  test('4.1 - Cannot open / in new tab during 2FA', async ({ browser }) => {
    console.log('🔐 TEST 4.1: Open / in new tab during 2FA');
    
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Login in tab 1
    await loginWithCredentials(page1, TEST_USERS.with2FA.email, TEST_USERS.with2FA.password);
    await page1.waitForTimeout(3000);
    
    // Try to access home in tab 2
    await page2.goto('/');
    await page2.waitForTimeout(2000);
    
    await verifyRouteBlocked(page2, '/ (new tab)');
    
    await context.close();
    console.log('✅ TEST 4.1 PASSED: / blocked in new tab');
  });

  test('4.2 - Cannot open /admin in new tab during 2FA', async ({ browser }) => {
    console.log('🔐 TEST 4.2: Open /admin in new tab during 2FA');
    
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    await loginWithCredentials(page1, TEST_USERS.admin2FA.email, TEST_USERS.admin2FA.password);
    await page1.waitForTimeout(3000);
    
    await page2.goto('/admin');
    await page2.waitForTimeout(2000);
    
    await verifyRouteBlocked(page2, '/admin (new tab)');
    
    await context.close();
    console.log('✅ TEST 4.2 PASSED: /admin blocked in new tab');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: PAGE REFRESH (F5)
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 5 - Page Refresh During 2FA', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  });

  test('5.1 - F5 during 2FA maintains security', async ({ page }) => {
    console.log('🔐 TEST 5.1: Press F5 during 2FA screen');
    
    await loginWithCredentials(page, TEST_USERS.with2FA.email, TEST_USERS.with2FA.password);
    await page.waitForTimeout(3000);
    
    // Verify on 2FA screen
    const is2FA = await isOn2FAScreen(page);
    expect(is2FA).toBeTruthy();
    
    // Refresh page
    await page.reload();
    await page.waitForTimeout(3000);
    
    // CRITICAL: Must still require 2FA
    await verifyRouteBlocked(page, 'after F5');
    
    console.log('✅ TEST 5.1 PASSED: F5 maintains 2FA requirement');
  });

  test('5.2 - Shift+F5 (hard refresh) during 2FA maintains security', async ({ page }) => {
    console.log('🔐 TEST 5.2: Shift+F5 (hard reload) during 2FA');
    
    await loginWithCredentials(page, TEST_USERS.with2FA.email, TEST_USERS.with2FA.password);
    await page.waitForTimeout(3000);
    
    // Hard reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    await verifyRouteBlocked(page, 'after Shift+F5');
    
    console.log('✅ TEST 5.2 PASSED: Hard reload maintains 2FA requirement');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: COOKIE MANIPULATION (Remember Device)
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 6 - Cookie Manipulation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  });

  test('6.1 - Remember device checkbox works correctly', async ({ page }) => {
    console.log('🔐 TEST 6.1: Remember device creates valid token');
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.with2FA.email);
    await page.fill('input[type="password"]', TEST_USERS.with2FA.password);
    
    // Check remember device checkbox
    const rememberCheckbox = page.locator('input[type="checkbox"]#remember-device');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Complete 2FA
    await complete2FA(page, TEST_USERS.with2FA.totpSecret);
    await page.waitForLoadState('networkidle');
    
    // Check cookie was created
    const cookies = await page.context().cookies();
    const hasDeviceCookie = cookies.some(c => c.name.includes('device_remembered'));
    expect(hasDeviceCookie).toBeTruthy();
    
    console.log('✅ TEST 6.1 PASSED: Remember device token created');
  });

  test('6.2 - Fake/corrupted cookie cannot bypass 2FA', async ({ page }) => {
    console.log('🔐 TEST 6.2: Corrupted cookie cannot bypass 2FA');
    
    // Set fake cookie
    await page.context().addCookies([{
      name: `device_remembered_${TEST_USERS.with2FA.email}`,
      value: 'FAKE_CORRUPTED_TOKEN_12345',
      domain: 'localhost',
      path: '/',
      expires: Date.now() / 1000 + 86400 * 30
    }]);
    
    await loginWithCredentials(page, TEST_USERS.with2FA.email, TEST_USERS.with2FA.password);
    await page.waitForTimeout(3000);
    
    // CRITICAL: Must still show 2FA (fake token should be invalid)
    const is2FA = await isOn2FAScreen(page);
    expect(is2FA).toBeTruthy();
    
    console.log('✅ TEST 6.2 PASSED: Fake cookie rejected, 2FA required');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: EXTREME STATE BYPASS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 7 - Extreme State Bypass Attempts', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  });

  test('7.1 - Clicking logo during 2FA does not grant access', async ({ page }) => {
    console.log('🔐 TEST 7.1: Click logo during 2FA → still blocked');
    
    await loginWithCredentials(page, TEST_USERS.with2FA.email, TEST_USERS.with2FA.password);
    await page.waitForTimeout(3000);
    
    // Click on logo/brand to try going to home
    const logo = page.locator('a[href="/"]').first();
    await logo.click();
    await page.waitForTimeout(2000);
    
    await verifyRouteBlocked(page, 'home via logo click');
    
    console.log('✅ TEST 7.1 PASSED: Logo click during 2FA blocked');
  });

  test('7.2 - Browser back button during 2FA does not grant access', async ({ page }) => {
    console.log('🔐 TEST 7.2: Browser back during 2FA → still blocked');
    
    await page.goto('/auth');
    await page.goto('/'); // Create history
    await page.goto('/auth');
    
    await page.fill('input[type="email"]', TEST_USERS.with2FA.email);
    await page.fill('input[type="password"]', TEST_USERS.with2FA.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Try back button
    await page.goBack();
    await page.waitForTimeout(2000);
    
    // Try to go home
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    await verifyRouteBlocked(page, 'home after back button');
    
    console.log('✅ TEST 7.2 PASSED: Back button cannot bypass 2FA');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: USERS WITHOUT 2FA
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 8 - Users Without 2FA', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  });

  test('8.1 - User without 2FA gets immediate access', async ({ page }) => {
    console.log('🔐 TEST 8.1: User without 2FA → direct access');
    
    await loginWithCredentials(page, TEST_USERS.without2FA.email, TEST_USERS.without2FA.password);
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    
    // Should be on home page (not auth, not 2FA)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/auth');
    
    // Should NOT see 2FA screen
    const is2FA = await isOn2FAScreen(page);
    expect(is2FA).toBeFalsy();
    
    // Can access profile immediately
    const profileButton = page.locator('button:has(svg.lucide-user)').first();
    await profileButton.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/profile');
    
    console.log('✅ TEST 8.1 PASSED: Non-2FA user has immediate access');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: ADMIN USERS WITH 2FA
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 9 - Admin Users with 2FA', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  });

  test('9.1 - Admin with 2FA cannot access admin panel during processing', async ({ page }) => {
    console.log('🔐 TEST 9.1: Admin + 2FA → cannot access admin during processing');
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USERS.admin2FA.email);
    await page.fill('input[type="password"]', TEST_USERS.admin2FA.password);
    
    await page.click('button[type="submit"]');
    
    // Try to access admin rapidly
    const adminLink = page.locator('a[href="/admin"]').first();
    for (let i = 0; i < 10; i++) {
      await adminLink.click({ force: true, timeout: 100 }).catch(() => {});
      await page.waitForTimeout(50);
    }
    
    await page.waitForTimeout(3000);
    
    await verifyRouteBlocked(page, '/admin (admin user during processing)');
    
    console.log('✅ TEST 9.1 PASSED: Admin blocked during processing');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: TIME/DELAY STRESS TESTS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 10 - Time/Delay Stress Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  });

  test('10.1 - Wait 30-40 seconds on 2FA screen, then try bypass', async ({ page }) => {
    console.log('🔐 TEST 10.1: Wait 40 seconds on 2FA → try all bypass methods');
    
    await loginWithCredentials(page, TEST_USERS.with2FA.email, TEST_USERS.with2FA.password);
    await page.waitForTimeout(3000);
    
    // Wait 40 seconds
    console.log('  ⏳ Waiting 40 seconds...');
    await page.waitForTimeout(40000);
    
    // Try profile click
    const profileButton = page.locator('button:has(svg.lucide-user)').first();
    await profileButton.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/profile');
    
    // Try URL navigation
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    await verifyRouteBlocked(page, '/admin after 40s wait');
    
    // Try refresh
    await page.reload();
    await page.waitForTimeout(2000);
    await verifyRouteBlocked(page, 'after refresh post-wait');
    
    // Try new tab (browser context)
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    await verifyRouteBlocked(page, '/profile after wait+refresh');
    
    console.log('✅ TEST 10.1 PASSED: All bypass methods blocked after delay');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11: POST-2FA VERIFICATION ACCESS
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔵 SECTION 11 - Post-2FA Access', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();
  });

  test('11.1 - After correct 2FA code, all features work', async ({ page }) => {
    console.log('🔐 TEST 11.1: After 2FA → navbar, profile, admin all work');
    
    await loginWithCredentials(page, TEST_USERS.admin2FA.email, TEST_USERS.admin2FA.password);
    await page.waitForTimeout(3000);
    
    // Complete 2FA
    await complete2FA(page, TEST_USERS.admin2FA.totpSecret);
    await page.waitForLoadState('networkidle');
    
    // Navbar should be unlocked
    const profileButton = page.locator('button:has(svg.lucide-user)').first();
    const isDisabled = await profileButton.getAttribute('disabled');
    expect(isDisabled).toBeNull();
    
    // Profile works
    await profileButton.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/profile');
    
    // Admin works (for admin user)
    await page.goto('/admin');
    await page.waitForTimeout(1500);
    expect(page.url()).toContain('/admin');
    const hasAdminContent = await page.locator('text=/Dashboard|Produtos|Pedidos/i').isVisible();
    expect(hasAdminContent).toBeTruthy();
    
    // Protected routes work
    await page.goto('/my-orders');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/my-orders');
    
    console.log('✅ TEST 11.1 PASSED: All features work after 2FA completion');
  });
});
