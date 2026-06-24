import { AdminLayoutShell } from "@/components/layout/admin-layout-shell";
import { StaffSidebar } from "@/components/layout/staff-sidebar";

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
