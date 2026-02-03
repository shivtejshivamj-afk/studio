import { DashboardNav } from '@/components/dashboard-nav';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardNav />
      <SidebarInset>
        <header className="flex h-14 items-center border-b px-6 md:hidden">
          <SidebarTrigger />
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
