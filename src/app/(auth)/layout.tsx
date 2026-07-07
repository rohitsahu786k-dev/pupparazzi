import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Account",
  description: "Pupparazzi Club account access.",
  path: "/login",
  noIndex: true,
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
