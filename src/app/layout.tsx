import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DEFAULT_BUSINESS_SETTINGS, getSetting } from "@/lib/settings";
import { DEFAULT_OG_IMAGE, DEFAULT_SEO_DESCRIPTION, DEFAULT_SEO_TITLE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: DEFAULT_SEO_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_SEO_DESCRIPTION,
  keywords: [
    "pet care Ahmedabad",
    "dog grooming Ahmedabad",
    "pet boarding Ahmedabad",
    "dog boarding Ahmedabad",
    "pet swimming Ahmedabad",
    "dog daycare Ahmedabad",
    "Pupparazzi Club",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  verification: {
    google: "UlASTcFKtKMjMo9NcMEKw5VczGkJZOseVZA51HmJVjM",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", sizes: "any" },
      { url: "/favicon-32x32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=3", sizes: "16x16", type: "image/png" },
    ],
    shortcut: ["/favicon.ico?v=3"],
    apple: [{ url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE), width: 1200, height: 630, alt: SITE_NAME }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const business = await getSetting("business", DEFAULT_BUSINESS_SETTINGS);
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: SITE_NAME,
    url: SITE_URL,
    image: absoluteUrl("/pupparazzi-logo.png"),
    logo: absoluteUrl("/pupparazzi-logo.png"),
    telephone: business.phone,
    email: business.email,
    address: business.address,
    areaServed: "Ahmedabad, Gujarat, India",
    priceRange: "INR",
    sameAs: [business.instagramUrl].filter(Boolean),
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#localbusiness` },
  };

  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([localBusinessJsonLd, websiteJsonLd]) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <Providers>
          <SiteHeader business={business} />
          <main className="flex-1">{children}</main>
          <SiteFooter business={business} />
        </Providers>
      </body>
    </html>
  );
}

