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
  Settings,
  HelpCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
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

const settingsNavItem = { href: '/dashboard/settings', icon: Settings, label: 'Settings' };

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
        <SidebarMenu className="p-2">
            <SidebarMenuItem key={settingsNavItem.href}>
                <Link href={settingsNavItem.href}>
                    <SidebarMenuButton
                        isActive={pathname.startsWith(settingsNavItem.href)}
                        tooltip={{ children: settingsNavItem.label }}
                    >
                        <settingsNavItem.icon />
                        <span className="group-data-[collapsible=icon]:hidden">{settingsNavItem.label}</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-auto w-full items-center justify-start gap-3 p-2 text-left"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold">
                  {user?.email || 'Admin User'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Administrator
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-56"
            sideOffset={10}
          >
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
              <Link href="/dashboard/settings#help">
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help Center</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
