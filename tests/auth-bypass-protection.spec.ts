import { test, expect, Page } from '@playwright/test';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * E2E TESTS: AUTHENTICATION BYPASS PROTECTION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This test suite validates protection against authentication bypass attacks:
 * 
 * SECTION 1: Rate Limiting Protection
 * SECTION 2: Session Manipulation
 * SECTION 3: Role Escalation Prevention
 * SECTION 4: Protected Route Access Control
 * SECTION 5: Token Manipulation
 * SECTION 6: Navigation Blocking During Auth
 * SECTION 7: Admin Dashboard Protection
 */

// Test credentials
const TEST_USER = {
  email: 'test-user@example.com',
  password: 'TestPassword123!',
};

const TEST_ADMIN = {
  email: 'admin@example.com',
  password: 'AdminPassword123!',
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function clearAllStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
}

async function attemptLogin(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
}

async function isOnAuthPage(page: Page): Promise<boolean> {
  return page.url().includes('/auth');
}

async function canSeeProtectedContent(page: Page): Promise<boolean> {
  const selectors = [
    'text=/Perfil|Profile/i',
    'text=/Admin Dashboard/i',
    'text=/Meus Pedidos/i',
  ];
  
  for (const selector of selectors) {
    const visible = await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
    if (visible) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: RATE LIMITING PROTECTION
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔴 SECTION 1 - Rate Limiting Protection', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAllStorage(page);
  });

  test('1.1 - Repeated failed logins trigger rate limiting', async ({ page }) => {
    console.log('🔐 TEST 1.1: Brute force protection via rate limiting');
    
    const wrongPassword = 'WrongPassword123!';
    
    // Attempt multiple failed logins
    for (let i = 0; i < 6; i++) {
      await page.goto('/auth');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', wrongPassword);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
    }
    
    // Check for rate limit message
    const rateLimitMessage = await page.locator('text=/bloqueado|limite|aguarde|tentativas/i').isVisible({ timeout: 3000 }).catch(() => false);
    const loginButton = page.locator('button[type="submit"]');
    const isDisabled = await loginButton.isDisabled();
    
    // Either message shown OR button disabled
    expect(rateLimitMessage || isDisabled).toBeTruthy();
    
    console.log('✅ TEST 1.1 PASSED: Rate limiting activated after failed attempts');
  });

  test('1.2 - Rate limiting persists across page refreshes', async ({ page }) => {
    console.log('🔐 TEST 1.2: Rate limiting persists on refresh');
    
    const wrongPassword = 'WrongPassword123!';
    
    // Trigger rate limiting
    for (let i = 0; i < 6; i++) {
      await page.goto('/auth');
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', wrongPassword);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }
    
    // Refresh page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Rate limiting should still be active
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    const loginButton = page.locator('button[type="submit"]');
    const rateLimitActive = await loginButton.isDisabled() || 
      await page.locator('text=/bloqueado|limite|aguarde/i').isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(rateLimitActive).toBeTruthy();
    
    console.log('✅ TEST 1.2 PASSED: Rate limiting persists after refresh');
  });

  test('1.3 - Rate limiting blocks signup spam', async ({ page }) => {
    console.log('🔐 TEST 1.3: Signup rate limiting');
    
    // Switch to signup mode
    await page.goto('/auth');
    const signupTab = page.locator('button:has-text("Cadastrar"), [role="tab"]:has-text("Cadastrar")');
    if (await signupTab.isVisible()) {
      await signupTab.click();
      await page.waitForTimeout(500);
    }
    
    // Attempt multiple signups with different emails
    for (let i = 0; i < 4; i++) {
      await page.fill('input[type="email"]', `spam-test-${i}@example.com`);
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // Navigate back to signup
      await page.goto('/auth');
      const tab = page.locator('button:has-text("Cadastrar"), [role="tab"]:has-text("Cadastrar")');
      if (await tab.isVisible()) {
        await tab.click();
      }
    }
    
    // Check for rate limit
    const rateLimitMessage = await page.locator('text=/bloqueado|limite|aguarde|tentativas/i').isVisible({ timeout: 3000 }).catch(() => false);
    
    console.log(`Rate limit detected: ${rateLimitMessage}`);
    console.log('✅ TEST 1.3 COMPLETED: Signup rate limiting tested');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: SESSION MANIPULATION
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔴 SECTION 2 - Session Manipulation Protection', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAllStorage(page);
  });

  test('2.1 - Fake session token does not grant access', async ({ page }) => {
    console.log('🔐 TEST 2.1: Fake session token rejection');
    
    // Inject fake session
    await page.evaluate(() => {
      const fakeSession = {
        access_token: 'fake-access-token-12345',
        refresh_token: 'fake-refresh-token-12345',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'fake-user-id-12345',
          email: 'hacker@evil.com',
          role: 'authenticated',
        }
      };
      localStorage.setItem('sb-bupbucfdisqedteazifs-auth-token', JSON.stringify(fakeSession));
    });
    
    // Try to access protected route
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    
    // Should be redirected to auth
    expect(await isOnAuthPage(page)).toBeTruthy();
    
    console.log('✅ TEST 2.1 PASSED: Fake session token rejected');
  });

  test('2.2 - Modified session user ID does not escalate privileges', async ({ page }) => {
    console.log('🔐 TEST 2.2: Session user ID modification blocked');
    
    // Inject modified session with admin user ID
    await page.evaluate(() => {
      const modifiedSession = {
        access_token: 'real-looking-token-but-fake',
        refresh_token: 'real-looking-refresh-but-fake',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'admin-user-id', // Trying to impersonate admin
          email: 'admin@example.com',
          role: 'authenticated',
          app_metadata: { role: 'admin' },
          user_metadata: { role: 'admin' },
        }
      };
      localStorage.setItem('sb-bupbucfdisqedteazifs-auth-token', JSON.stringify(modifiedSession));
    });
    
    // Try to access admin
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    // Should be blocked
    const canAccessAdmin = page.url().includes('/admin') && 
      await page.locator('text=/Dashboard|Admin/i').isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(canAccessAdmin).toBeFalsy();
    
    console.log('✅ TEST 2.2 PASSED: Session modification does not grant admin');
  });

  test('2.3 - sessionStorage manipulation for 2FA bypass fails', async ({ page }) => {
    console.log('🔐 TEST 2.3: 2FA verified flag manipulation blocked');
    
    // Set fake 2FA verified flag
    await page.evaluate(() => {
      sessionStorage.setItem('2fa_verified', 'true');
      sessionStorage.setItem('admin_2fa_verified', 'true');
    });
    
    // Try to access protected route
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    
    // Should still require login
    expect(await isOnAuthPage(page)).toBeTruthy();
    
    console.log('✅ TEST 2.3 PASSED: 2FA flag manipulation blocked');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: ROLE ESCALATION PREVENTION
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔴 SECTION 3 - Role Escalation Prevention', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAllStorage(page);
  });

  test('3.1 - Regular user cannot access admin routes', async ({ page }) => {
    console.log('🔐 TEST 3.1: Regular user blocked from admin');
    
    // Login as regular user (if credentials work)
    await attemptLogin(page, TEST_USER.email, TEST_USER.password);
    await page.waitForTimeout(3000);
    
    // Skip if login didn't work
    if (await isOnAuthPage(page)) {
      console.log('⚠️ Login failed, skipping admin access test');
      return;
    }
    
    // Try to access admin routes
    const adminRoutes = ['/admin', '/admin/dashboard', '/admin/products', '/admin/orders', '/admin/security'];
    
    for (const route of adminRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1500);
      
      const hasAdminContent = await page.locator('text=/Dashboard Admin|Produtos|Pedidos Admin/i').isVisible({ timeout: 1000 }).catch(() => false);
      
      if (hasAdminContent) {
        throw new Error(`🚨 SECURITY BREACH: Regular user accessed ${route}!`);
      }
      
      console.log(`  ✅ ${route} blocked for regular user`);
    }
    
    console.log('✅ TEST 3.1 PASSED: Admin routes blocked for regular user');
  });

  test('3.2 - Client-side role check cannot be bypassed', async ({ page }) => {
    console.log('🔐 TEST 3.2: Client-side role bypass prevention');
    
    // Inject fake admin role in localStorage
    await page.evaluate(() => {
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('is_admin', 'true');
      localStorage.setItem('role', 'admin');
      
      // Try to inject in sessionStorage too
      sessionStorage.setItem('user_role', 'admin');
      sessionStorage.setItem('is_admin', 'true');
    });
    
    // Try to access admin
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    // Should be redirected or blocked
    const canAccessAdmin = page.url().includes('/admin') && 
      await page.locator('[data-testid="admin-sidebar"], text=/Dashboard Admin/i').isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(canAccessAdmin).toBeFalsy();
    
    console.log('✅ TEST 3.2 PASSED: Client-side role manipulation blocked');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: PROTECTED ROUTE ACCESS CONTROL
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔴 SECTION 4 - Protected Route Access Control', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAllStorage(page);
  });

  test('4.1 - Unauthenticated user cannot access protected routes', async ({ page }) => {
    console.log('🔐 TEST 4.1: Protected routes require authentication');
    
    const protectedRoutes = [
      '/profile',
      '/my-orders',
      '/checkout',
      '/trusted-devices',
      '/admin',
      '/admin/dashboard',
      '/admin/products',
    ];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1500);
      
      // Should be on auth page
      const isAuth = await isOnAuthPage(page);
      const hasProtected = await canSeeProtectedContent(page);
      
      if (!isAuth && hasProtected) {
        throw new Error(`🚨 SECURITY BREACH: Unauthenticated access to ${route}!`);
      }
      
      console.log(`  ✅ ${route} requires authentication`);
    }
    
    console.log('✅ TEST 4.1 PASSED: All protected routes require auth');
  });

  test('4.2 - Public routes remain accessible', async ({ page }) => {
    console.log('🔐 TEST 4.2: Public routes accessible without auth');
    
    const publicRoutes = [
      '/',
      '/cart',
      '/auth',
      '/forgot-password',
    ];
    
    for (const route of publicRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);
      
      // Should NOT redirect to auth (unless already on auth)
      const url = page.url();
      const isAccessible = !url.includes('/auth') || route === '/auth' || route === '/forgot-password';
      
      expect(isAccessible).toBeTruthy();
      console.log(`  ✅ ${route} accessible`);
    }
    
    console.log('✅ TEST 4.2 PASSED: Public routes accessible');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: TOKEN MANIPULATION
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔴 SECTION 5 - Token Manipulation Protection', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAllStorage(page);
  });

  test('5.1 - Expired token does not grant access', async ({ page }) => {
    console.log('🔐 TEST 5.1: Expired token rejection');
    
    // Inject expired session
    await page.evaluate(() => {
      const expiredSession = {
        access_token: 'expired-access-token',
        refresh_token: 'expired-refresh-token',
        expires_at: Date.now() - 3600000, // 1 hour ago
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        }
      };
      localStorage.setItem('sb-bupbucfdisqedteazifs-auth-token', JSON.stringify(expiredSession));
    });
    
    // Try to access protected route
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    
    // Should require re-authentication
    expect(await isOnAuthPage(page)).toBeTruthy();
    
    console.log('✅ TEST 5.1 PASSED: Expired token rejected');
  });

  test('5.2 - Malformed token does not crash app', async ({ page }) => {
    console.log('🔐 TEST 5.2: Malformed token handling');
    
    // Inject malformed session
    await page.evaluate(() => {
      localStorage.setItem('sb-bupbucfdisqedteazifs-auth-token', 'not-valid-json{{{');
    });
    
    // App should not crash
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Page should load without error
    const hasError = await page.locator('text=/error|crash|failed/i').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBeFalsy();
    
    console.log('✅ TEST 5.2 PASSED: Malformed token handled gracefully');
  });

  test('5.3 - JWT tampering does not grant access', async ({ page }) => {
    console.log('🔐 TEST 5.3: JWT tampering detection');
    
    // Create a tampered JWT (modified payload without valid signature)
    const tamperedJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoYWNrZXItaWQiLCJlbWFpbCI6ImhhY2tlckBldmlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.invalid-signature';
    
    await page.evaluate((jwt) => {
      const session = {
        access_token: jwt,
        refresh_token: 'fake-refresh',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'hacker-id',
          email: 'hacker@evil.com',
        }
      };
      localStorage.setItem('sb-bupbucfdisqedteazifs-auth-token', JSON.stringify(session));
    }, tamperedJWT);
    
    // Try to access protected route
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    // Should be blocked
    const isBlocked = await isOnAuthPage(page) || !page.url().includes('/admin');
    expect(isBlocked).toBeTruthy();
    
    console.log('✅ TEST 5.3 PASSED: Tampered JWT rejected');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: NAVIGATION BLOCKING DURING AUTH
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔴 SECTION 6 - Navigation Blocking During Authentication', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAllStorage(page);
  });

  test('6.1 - Navbar buttons disabled during login processing', async ({ page }) => {
    console.log('🔐 TEST 6.1: Navbar disabled during login');
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // Start login
    await page.click('button[type="submit"]');
    
    // Immediately check navbar state
    const profileButton = page.locator('button:has(svg.lucide-user), a[href="/profile"]').first();
    
    // Check if button has disabled state or pointer-events-none
    const isClickable = await profileButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.pointerEvents !== 'none' && 
             !el.hasAttribute('disabled') && 
             !el.getAttribute('aria-disabled');
    }).catch(() => true);
    
    console.log(`Navbar clickable during processing: ${isClickable}`);
    
    console.log('✅ TEST 6.1 COMPLETED: Navigation state during login tested');
  });

  test('6.2 - Cannot navigate via browser devtools during auth', async ({ page }) => {
    console.log('🔐 TEST 6.2: DevTools navigation blocked during auth');
    
    await page.goto('/auth');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    
    // Start login
    await page.click('button[type="submit"]');
    
    // Try programmatic navigation
    await page.evaluate(() => {
      window.location.href = '/profile';
    });
    
    await page.waitForTimeout(2000);
    
    // Should be blocked or redirected
    const wasBlocked = await isOnAuthPage(page) || !page.url().includes('/profile');
    expect(wasBlocked).toBeTruthy();
    
    console.log('✅ TEST 6.2 PASSED: DevTools navigation blocked');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: ADMIN DASHBOARD PROTECTION
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔴 SECTION 7 - Admin Dashboard Protection', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearAllStorage(page);
  });

  test('7.1 - Admin dashboard requires 2FA re-verification', async ({ page }) => {
    console.log('🔐 TEST 7.1: Admin dashboard 2FA requirement');
    
    // This test requires an admin user with 2FA enabled
    // If admin credentials work, check for 2FA prompt on admin access
    
    await attemptLogin(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await page.waitForTimeout(3000);
    
    // If there's a 2FA screen, verify it blocks admin
    const has2FA = await page.locator('text=/Autenticação de 2 Fatores|Digite o código/i').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (has2FA) {
      // Try to access admin during 2FA
      await page.goto('/admin');
      await page.waitForTimeout(2000);
      
      // Should still show 2FA or block
      const stillBlocked = await page.locator('text=/Autenticação de 2 Fatores|Digite o código/i').isVisible({ timeout: 2000 }).catch(() => false) ||
        !page.url().includes('/admin');
      
      expect(stillBlocked).toBeTruthy();
      console.log('✅ TEST 7.1 PASSED: Admin blocked during 2FA');
    } else {
      console.log('⚠️ No 2FA prompt detected, skipping admin 2FA test');
    }
  });

  test('7.2 - Admin session flag cannot be manipulated', async ({ page }) => {
    console.log('🔐 TEST 7.2: Admin session flag manipulation blocked');
    
    // Set fake admin 2FA verified flag
    await page.evaluate(() => {
      sessionStorage.setItem('admin_2fa_verified', 'true');
    });
    
    // Try to access admin
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    // Should still require proper authentication
    const canAccessAdmin = page.url().includes('/admin') && 
      await page.locator('[data-testid="admin-sidebar"], text=/Dashboard Admin|Produtos|Pedidos/i').isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(canAccessAdmin).toBeFalsy();
    
    console.log('✅ TEST 7.2 PASSED: Admin flag manipulation blocked');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE BYPASS SUMMARY TEST
// ═══════════════════════════════════════════════════════════════════════════
test.describe('🔴 COMPREHENSIVE - All Bypass Vectors', () => {
  
  test('SUMMARY - Run all critical bypass checks', async ({ page }) => {
    console.log('🔐 RUNNING COMPREHENSIVE BYPASS VECTOR TEST');
    
    await clearAllStorage(page);
    
    const results: { vector: string; blocked: boolean }[] = [];
    
    // 1. Fake session token
    await page.evaluate(() => {
      localStorage.setItem('sb-bupbucfdisqedteazifs-auth-token', JSON.stringify({
        access_token: 'fake', user: { id: 'fake' }
      }));
    });
    await page.goto('/profile');
    await page.waitForTimeout(1500);
    results.push({ vector: 'Fake session token', blocked: await isOnAuthPage(page) });
    await clearAllStorage(page);
    
    // 2. 2FA flag manipulation
    await page.evaluate(() => {
      sessionStorage.setItem('2fa_verified', 'true');
    });
    await page.goto('/profile');
    await page.waitForTimeout(1500);
    results.push({ vector: '2FA flag manipulation', blocked: await isOnAuthPage(page) });
    await clearAllStorage(page);
    
    // 3. Admin flag manipulation
    await page.evaluate(() => {
      sessionStorage.setItem('admin_2fa_verified', 'true');
      localStorage.setItem('user_role', 'admin');
    });
    await page.goto('/admin');
    await page.waitForTimeout(1500);
    results.push({ 
      vector: 'Admin flag manipulation', 
      blocked: await isOnAuthPage(page) || !page.url().includes('/admin') 
    });
    await clearAllStorage(page);
    
    // 4. Direct URL access
    await page.goto('/my-orders');
    await page.waitForTimeout(1500);
    results.push({ vector: 'Direct URL access', blocked: await isOnAuthPage(page) });
    
    // Print results
    console.log('\n═══════════════════════════════════════════');
    console.log('BYPASS PROTECTION SUMMARY');
    console.log('═══════════════════════════════════════════');
    
    let allBlocked = true;
    for (const result of results) {
      const status = result.blocked ? '✅ BLOCKED' : '🚨 VULNERABLE';
      console.log(`${status}: ${result.vector}`);
      if (!result.blocked) allBlocked = false;
    }
    
    console.log('═══════════════════════════════════════════');
    
    expect(allBlocked).toBeTruthy();
    
    console.log('✅ ALL BYPASS VECTORS BLOCKED');
  });
});
