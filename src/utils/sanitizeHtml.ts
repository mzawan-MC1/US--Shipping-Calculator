import DOMPurify from 'dompurify';

/**
 * Strict allowlist of HTML tags permitted in quotation rules:
 * p, br, strong, b, em, i, u, h2, h3, h4, ul, ol, li
 */
export const ALLOWED_RULE_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
] as const;

/**
 * Strict sanitization for quotation rules content:
 * - Allowed tags: p, br, strong, b, em, i, u, h2, h3, h4, ul, ol, li
 * - FORBIDS all attributes (strictly empty ALLOWED_ATTR): no style, class, onclick, href, etc.
 * - FORBIDS dangerous tags: script, iframe, form, img, object, embed, link, a, etc.
 */
export function sanitizeRuleContent(rawHtml: string): string {
  if (!rawHtml) return '';

  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [...ALLOWED_RULE_TAGS],
    ALLOWED_ATTR: [], // Strictly no attributes permitted!
    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'form',
      'img',
      'object',
      'embed',
      'link',
      'a',
      'input',
      'button',
      'svg',
      'canvas',
      'video',
      'audio',
    ],
    FORBID_ATTR: [
      'style',
      'class',
      'href',
      'src',
      'onload',
      'onerror',
      'onclick',
      'onmouseover',
      'onfocus',
      'data-*',
    ],
    RETURN_TRUSTED_TYPE: false,
  }).trim();
}
