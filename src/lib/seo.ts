import type { Locale } from '../i18n/data';

export const SITE_URL = 'https://tenants10.com';

// og:locale uses the underscore region form; en keeps the existing en_GB
// convention already used site-wide, de/fr/it use _CH since this is
// explicitly a Swiss product.
export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_GB',
  de: 'de_CH',
  fr: 'fr_CH',
  it: 'it_CH',
};

/** Absolute URL for a given locale's home page. */
export function localePath(locale: Locale): string {
  return locale === 'en' ? '/' : `/${locale}/`;
}

/** Absolute URL for a given locale's legal page (routeKey e.g. 'terms'). */
export function legalPath(locale: Locale, routeKey: string): string {
  return locale === 'en' ? `/${routeKey}/` : `/${locale}/${routeKey}/`;
}

/** hreflang <link> entries (4 locales + x-default) for a route, given a
 * function that maps a locale to its path for that route. */
export function hreflangLinks(pathFor: (locale: Locale) => string) {
  const locales: Locale[] = ['en', 'de', 'fr', 'it'];
  const links = locales.map((hl) => ({
    hreflang: hl,
    href: new URL(pathFor(hl), SITE_URL).toString(),
  }));
  links.push({ hreflang: 'x-default', href: new URL(pathFor('en'), SITE_URL).toString() });
  return links;
}
