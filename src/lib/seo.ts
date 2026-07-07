import type { Metadata } from "next";

export const SITE_URL = "https://pupparazziclub.in";
export const SITE_NAME = "Pupparazzi Club";
export const DEFAULT_SEO_TITLE = "Pupparazzi Club - Premium Pet Care in Ahmedabad";
export const DEFAULT_SEO_DESCRIPTION =
  "Premium pet boarding, grooming, swimming, training, daycare, and pet care services in Ahmedabad.";
export const DEFAULT_OG_IMAGE = "/hero-dog.png";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function pageMetadata({
  title,
  description = DEFAULT_SEO_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
}: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      images: [{ url: absoluteUrl(image), width: 1200, height: 630, alt: SITE_NAME }],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(image)],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
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
}
