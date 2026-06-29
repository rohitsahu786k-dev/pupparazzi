import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminLayoutShell } from "@/components/layout/admin-layout-shell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const isStaff = session?.user?.role === "STAFF";

  return (
    <AdminLayoutShell sidebar={<AdminSidebar />} title={isStaff ? "Staff Portal" : "Admin Portal"} avatarLabel={isStaff ? "S" : "A"}>
      {children}
    </AdminLayoutShell>
  );
}
