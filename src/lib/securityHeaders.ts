/**
 * Security Headers Configuration
 * 
 * This file centralizes security header configuration for the application.
 * These headers protect against common web vulnerabilities including:
 * - XSS (Cross-Site Scripting)
 * - CSRF (Cross-Site Request Forgery)
 * - Clickjacking
 * - MIME type sniffing
 * - Information disclosure
 */

export const SECURITY_HEADERS = {
  // Prevents browsers from MIME-sniffing responses away from declared content-type
  'X-Content-Type-Options': 'nosniff',
  
  // Prevents site from being embedded in iframes (clickjacking protection)
  'X-Frame-Options': 'DENY',
  
  // Enables built-in XSS protection in browsers
  'X-XSS-Protection': '1; mode=block',
  
  // Controls how much referrer information is sent
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Controls which browser features can be used
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
} as const;

/**
 * Get all security headers as an object
 */
export const getSecurityHeaders = (): Record<string, string> => {
  return { ...SECURITY_HEADERS };
};

/**
 * Content Security Policy (CSP)
 * Note: CSP is applied via meta tag in index.html for better compatibility
 * with Vite's development server
 */
export const CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://esm.sh', 'https://deno.land'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://viacep.com.br', 'https://api.pwnedpasswords.com'],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/**
 * Convert CSP policy object to string
 */
export const cspToString = (policy: typeof CSP_POLICY): string => {
  return Object.entries(policy)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
};
