// Localization middleware disabled for now
// To re-enable localization, uncomment the code below and remove the pass-through middleware

// import createMiddleware from 'next-intl/middleware';
// import { locales, defaultLocale } from './src/lib/i18n/config';

// export default createMiddleware({
//   locales,
//   defaultLocale,
//   localePrefix: 'always'
// });

// export const config = {
//   matcher: ['/((?!api|studio|_next|_static|_vercel|.*\\..*).*)']
// };

// Minimal pass-through middleware (required by Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Pass through without any modifications
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - studio (Sanity Studio)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|studio).*)',
  ],
};

