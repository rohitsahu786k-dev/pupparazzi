import { ClientSidebar } from "@/components/layout/client-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-muted/20 overflow-hidden">
      <div className="hidden md:block">
        <ClientSidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header could go here */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
