'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Dumbbell,
  FileText,
  Calendar,
  LayoutDashboard,
  LogOut,
  CalendarCheck,
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/members', icon: Users, label: 'Members' },
  { href: '/dashboard/trainers', icon: Dumbbell, label: 'Trainers' },
  { href: '/dashboard/plans', icon: Calendar, label: 'Plans' },
  { href: '/dashboard/payments', icon: FileText, label: 'Invoicing' },
  { href: '/dashboard/attendance', icon: CalendarCheck, label: 'Attendance' },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'An error occurred while logging out.',
      });
    }
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'AD';
    const parts = email.split('@');
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarRail />
      <SidebarHeader>
        <div className="flex w-full items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
                <Dumbbell className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-semibold group-data-[collapsible=icon]:hidden">GymTrack Pro</h1>
            </Link>
          <SidebarTrigger className="hidden md:flex" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label }}
                >
                  <item.icon />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center">
           <Avatar className="h-10 w-10">
            <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm truncate">{user?.email || 'Admin User'}</span>
            <span className="text-xs text-muted-foreground">Administrator</span>
          </div>
        </div>
        
          <SidebarMenuButton tooltip={{ children: 'Logout' }} onClick={handleLogout}>
            <LogOut />
            <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </SidebarMenuButton>
        
      </SidebarFooter>
    </Sidebar>
  );
}
