'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  FileText,
  LayoutDashboard,
  LogOut,
  CalendarCheck,
  Settings,
  BarChart,
  Dumbbell,
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
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/members', icon: Users, label: 'Members' },
  { href: '/dashboard/trainers', icon: Dumbbell, label: 'Trainers' },
  { href: '/dashboard/payments', icon: FileText, label: 'Invoicing' },
  { href: '/dashboard/reports', icon: BarChart, label: 'Reports' },
  { href: '/dashboard/attendance', icon: CalendarCheck, label: 'Attendance' },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const adminProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const { data: adminProfile, isLoading: isLoadingAdminProfile } =
    useDoc<{ ownerName: string }>(adminProfileRef);
    
  const isLoading = isUserLoading || isLoadingAdminProfile;

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

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const nameParts = name.split(' ').filter(Boolean);
      if (nameParts.length > 1) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'AD';
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarRail />
      <SidebarHeader>
        <div className="flex w-full items-center justify-between">
            <Link href="/dashboard" className="group flex items-center gap-2 transition-transform hover:scale-105">
                <div className="h-8 w-8 logo-mask text-primary transition-transform duration-300 group-hover:rotate-12"></div>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-auto w-full items-center justify-start gap-3 p-2 text-left"
            >
              {isLoading ? (
                <>
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex flex-col items-start gap-1 group-data-[collapsible=icon]:hidden">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </>
              ) : (
                <>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(adminProfile?.ownerName, user?.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-semibold">
                      {adminProfile?.ownerName || 'Admin User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Administrator
                    </span>
                  </div>
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-56"
            sideOffset={10}
          >
            <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                        {isLoading ? <Skeleton className="h-4 w-20" /> : adminProfile?.ownerName || 'Admin'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                        {isUserLoading ? <Skeleton className="mt-1 h-3 w-32" /> : user?.email}
                    </p>
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
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
