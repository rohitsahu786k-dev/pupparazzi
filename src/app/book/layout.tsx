import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Book Pet Care",
  description: "Book Pupparazzi Club grooming, boarding, swimming, training, daycare, and premium pet care appointments in Ahmedabad.",
  path: "/book",
  image: "/service-boarding-premium.png",
});

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
