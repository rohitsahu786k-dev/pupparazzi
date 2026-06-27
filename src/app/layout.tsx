import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DEFAULT_BUSINESS_SETTINGS, getSetting } from "@/lib/settings";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Pupparazzi Club - Premium Pet Care in Ahmedabad",
  description: "Premium boarding, grooming, swimming, training, and daycare for pets in Ahmedabad.",
  verification: {
    google: "G6YRjxmuLqMPtE436n9AzaogelpFBzSV4iimFrbhLe4",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const business = await getSetting("business", DEFAULT_BUSINESS_SETTINGS);

  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
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

