import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-muted/30 overflow-hidden">
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header for Admin could go here */}
        <header className="h-16 border-b bg-background flex items-center justify-between px-6 shadow-sm z-10">
          <h2 className="text-lg font-semibold text-foreground">Admin Portal</h2>
          <div className="flex items-center gap-4">
             {/* Admin avatar or quick actions */}
             <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">A</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
