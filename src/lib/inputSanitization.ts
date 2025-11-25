/**
 * Input Sanitization Utilities
 * 
 * SECURITY: These utilities help prevent XSS and injection attacks
 * by sanitizing user input before rendering or processing.
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * 
 * @param str - The string to escape
 * @returns The escaped string safe for HTML rendering
 */
export const escapeHtml = (str: string): string => {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return str.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
};

/**
 * Removes potentially dangerous HTML tags and attributes
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  return sanitized;
};

/**
 * Validates and sanitizes email addresses
 * 
 * @param email - The email to validate
 * @returns Sanitized email or null if invalid
 */
export const sanitizeEmail = (email: string): string | null => {
  const trimmed = email.trim().toLowerCase();
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return null;
  }
  
  // Additional checks to prevent header injection
  if (trimmed.includes('\n') || trimmed.includes('\r')) {
    return null;
  }
  
  return trimmed;
};

/**
 * Sanitizes phone numbers by removing non-numeric characters
 * 
 * @param phone - The phone number to sanitize
 * @returns Sanitized phone number with only digits
 */
export const sanitizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Sanitizes CEP (Brazilian postal code)
 * 
 * @param cep - The CEP to sanitize
 * @returns Sanitized CEP with only digits
 */
export const sanitizeCep = (cep: string): string => {
  return cep.replace(/\D/g, '').substring(0, 8);
};

/**
 * Validates and sanitizes URLs
 * 
 * @param url - The URL to validate
 * @param allowedProtocols - Array of allowed protocols (default: ['http', 'https'])
 * @returns Sanitized URL or null if invalid
 */
export const sanitizeUrl = (
  url: string, 
  allowedProtocols: string[] = ['http', 'https']
): string | null => {
  try {
    const parsedUrl = new URL(url);
    
    // Check if protocol is allowed
    const protocol = parsedUrl.protocol.replace(':', '');
    if (!allowedProtocols.includes(protocol)) {
      return null;
    }
    
    return parsedUrl.toString();
  } catch {
    return null;
  }
};

/**
 * Removes SQL injection patterns from input
 * Note: This is a defense-in-depth measure. Always use parameterized queries!
 * 
 * @param input - The input to sanitize
 * @returns Sanitized input
 */
export const sanitizeSqlInput = (input: string): string => {
  // Remove common SQL injection patterns
  return input
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, '') // Remove multi-line comment end
    .replace(/\bor\b|\band\b/gi, '') // Remove OR/AND keywords
    .replace(/\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b/gi, ''); // Remove SQL keywords
};

/**
 * Limits string length to prevent buffer overflow attacks
 * 
 * @param str - The string to limit
 * @param maxLength - Maximum allowed length
 * @returns Truncated string
 */
export const limitLength = (str: string, maxLength: number): string => {
  return str.substring(0, maxLength);
};

/**
 * Validates that input contains only alphanumeric characters
 * 
 * @param input - The input to validate
 * @returns True if valid, false otherwise
 */
export const isAlphanumeric = (input: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(input);
};

/**
 * Sanitizes file names to prevent directory traversal attacks
 * 
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove directory traversal patterns
  let sanitized = filename.replace(/\.\./g, '');
  
  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Limit to safe characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  return sanitized;
};
