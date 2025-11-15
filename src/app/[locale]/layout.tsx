import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { draftMode } from 'next/headers';
import { locales } from '@/lib/i18n/config';
import { notFound } from 'next/navigation';
import { LayoutWrapper } from '@/components/LayoutWrapper';
import { LocaleHtml } from '@/components/LocaleHtml';

type Props = {
  children: React.ReactNode;
  params: { locale: string } | Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: Props) {
  // Handle both sync and async params (Next.js 15+ uses Promise, 16 might be sync)
  const resolvedParams = params instanceof Promise ? await params : params;
  const { locale } = resolvedParams;
  const isValidLocale = locales.some((cur) => cur === locale);
  if (!isValidLocale) notFound();

  const messages = await getMessages();
  const { isEnabled } = await draftMode();

  return (
    <NextIntlClientProvider messages={messages}>
      <LocaleHtml>
        <LayoutWrapper showPreviewBanner={isEnabled}>
          {children}
        </LayoutWrapper>
      </LocaleHtml>
    </NextIntlClientProvider>
  );
}

