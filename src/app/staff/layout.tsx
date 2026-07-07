import { AdminLayoutShell } from "@/components/layout/admin-layout-shell";
import { StaffSidebar } from "@/components/layout/staff-sidebar";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Staff Portal",
  description: "Pupparazzi Club staff portal.",
  path: "/staff",
  noIndex: true,
});

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayoutShell sidebar={<StaffSidebar />} title="Staff Portal" avatarLabel="S">
      {children}
    </AdminLayoutShell>
  );
}
