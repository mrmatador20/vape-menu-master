/**
 * DOMPurify wrapper — defense-in-depth XSS sanitization for user-submitted text.
 *
 * React already auto-escapes values rendered via JSX, so these helpers are an
 * extra layer applied at the INPUT boundary (before persisting to the DB) to
 * neutralize HTML/script payloads, javascript: URLs, event handlers, etc.
 *
 * Two modes:
 *  - sanitizeUserText: strips ALL HTML, returning plain text. Use for
 *    comments, reviews, responses, profile fields, addresses, names, etc.
 *  - sanitizeRichHtml: allows a small safe subset of formatting tags. Use
 *    only if you intentionally render HTML via dangerouslySetInnerHTML.
 */
import DOMPurify from 'dompurify';

/** Strip every tag/attribute. Output is safe plain text. */
export const sanitizeUserText = (input: string): string => {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  }).trim();
};

/** Allow a minimal safe HTML subset. Only for trusted rich-text scenarios. */
export const sanitizeRichHtml = (html: string): string => {
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
};
