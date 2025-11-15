import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

import { locales, defaultLocale } from '../src/lib/i18n/config';

const middleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

// Test URLs
const testUrls = [
  'http://localhost:3000/',
  'http://localhost:3000/explore',
  'http://localhost:3000/en/explore',
  'http://localhost:3000/ko/explore',
];

testUrls.forEach(url => {
  const request = new NextRequest(url);
  const response = middleware(request);
  
  console.log('Input:', url);
  console.log('Output:', response.headers.get('location') || 'same page');
  console.log('---');
});

