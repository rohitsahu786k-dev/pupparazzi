import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminLayoutShell } from "@/components/layout/admin-layout-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayoutShell sidebar={<AdminSidebar />}>
      {children}
    </AdminLayoutShell>
  );
}
