import { Html, Head, Main, NextScript } from 'next/document';
import { APP_NAME, APP_TAGLINE } from '../lib/branding';

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#090b10" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="application-name" content={APP_NAME} />
        <meta name="description" content={APP_TAGLINE} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="bg-surface-950 text-zinc-100">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
