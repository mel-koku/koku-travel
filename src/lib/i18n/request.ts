import { getRequestConfig } from 'next-intl/server';
import { locales } from './config';

export default getRequestConfig(async ({ locale }) => {
  const validLocale = (locale && locales.includes(locale as any)) ? locale : 'en';
  
  return {
    locale: validLocale,
    messages: (await import(`../../../messages/${validLocale}.json`)).default
  };
});

