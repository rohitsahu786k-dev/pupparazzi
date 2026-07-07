import { ClientSidebar } from "@/components/layout/client-sidebar";
import { DashboardLayoutShell } from "@/components/layout/dashboard-layout-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Dashboard",
  description: "Pupparazzi Club customer dashboard.",
  path: "/dashboard",
  noIndex: true,
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayoutShell sidebar={<ClientSidebar />}>
      {children}
    </DashboardLayoutShell>
  );
}
